package assistanthttp

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/clementortiz/home-ai/home-core/internal/assistant/application"
	"github.com/clementortiz/home-ai/home-core/internal/assistant/model"
)

type Handler struct {
	ask application.AskQuestion
}

type VoiceHandler struct {
	ask interface {
		Execute(context.Context, model.VoiceInput) (model.Answer, string, error)
	}
}

func NewVoiceHandler(ask interface {
	Execute(context.Context, model.VoiceInput) (model.Answer, string, error)
}) *VoiceHandler {
	return &VoiceHandler{ask: ask}
}

func (handler *VoiceHandler) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	started := time.Now()
	slog.Info("voice request received", "method", request.Method, "path", request.URL.Path, "content_type", request.Header.Get("Content-Type"), "content_length", request.ContentLength)
	defer func() { slog.Info("voice request finished", "duration_ms", time.Since(started).Milliseconds()) }()
	if request.Method != http.MethodPost || request.URL.Path != "/v1/assistant/voice" {
		writeJSON(writer, http.StatusNotFound, map[string]string{"error": "not_found"})
		return
	}
	audio, err := io.ReadAll(http.MaxBytesReader(writer, request.Body, 10<<20))
	slog.Info("voice audio read", "bytes", len(audio), "read_error", err)
	if err != nil || len(audio) == 0 {
		writeJSON(writer, http.StatusBadRequest, map[string]string{"error": "invalid_audio"})
		return
	}
	answer, transcript, err := handler.ask.Execute(request.Context(), model.VoiceInput{Audio: audio, ContentType: request.Header.Get("Content-Type")})
	if err != nil {
		slog.Error("voice pipeline failed", "error", err, "audio_bytes", len(audio))
		if errors.Is(err, application.ErrEmptyTranscript) {
			writeJSON(writer, http.StatusUnprocessableEntity, map[string]string{"error": "empty_transcript"})
			return
		}
		writeJSON(writer, http.StatusBadGateway, map[string]string{"error": "voice_unavailable"})
		return
	}
	slog.Info("voice pipeline succeeded", "transcript_length", len(transcript), "answer_length", len(answer.Text))
	writeJSON(writer, http.StatusOK, map[string]any{"transcript": transcript, "answer": answer})
}

func NewHandler(ask application.AskQuestion) *Handler { return &Handler{ask: ask} }

func (handler *Handler) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost || request.URL.Path != "/v1/assistant/questions" {
		writeJSON(writer, http.StatusNotFound, map[string]string{"error": "not_found"})
		return
	}
	var question model.Question
	decoder := json.NewDecoder(http.MaxBytesReader(writer, request.Body, 16<<10))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&question); err != nil {
		writeJSON(writer, http.StatusBadRequest, map[string]string{"error": "invalid_request"})
		return
	}
	answer, err := handler.ask.Execute(request.Context(), question)
	if err != nil {
		if errors.Is(err, application.ErrEmptyQuestion) {
			writeJSON(writer, http.StatusBadRequest, map[string]string{"error": "empty_question"})
			return
		}
		writeJSON(writer, http.StatusBadGateway, map[string]string{"error": "assistant_unavailable"})
		return
	}
	writeJSON(writer, http.StatusOK, answer)
}

func writeJSON(writer http.ResponseWriter, status int, body any) {
	writer.Header().Set("Content-Type", "application/json; charset=utf-8")
	writer.WriteHeader(status)
	_ = json.NewEncoder(writer).Encode(body)
}
