package assistanthttp

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/clementortiz/home-ai/home-core/internal/assistant/application"
	"github.com/clementortiz/home-ai/home-core/internal/assistant/model"
)

type Handler struct {
	ask application.AskQuestion
}

type VoiceHandler struct {
	ask application.AskTranscribedQuestion
}

func NewVoiceHandler(ask application.AskTranscribedQuestion) *VoiceHandler {
	return &VoiceHandler{ask: ask}
}

func (handler *VoiceHandler) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost || request.URL.Path != "/v1/assistant/voice" {
		writeJSON(writer, http.StatusNotFound, map[string]string{"error": "not_found"})
		return
	}
	audio, err := io.ReadAll(http.MaxBytesReader(writer, request.Body, 10<<20))
	if err != nil || len(audio) == 0 {
		writeJSON(writer, http.StatusBadRequest, map[string]string{"error": "invalid_audio"})
		return
	}
	answer, transcript, err := handler.ask.Execute(request.Context(), model.VoiceInput{Audio: audio, ContentType: request.Header.Get("Content-Type")})
	if err != nil {
		if errors.Is(err, application.ErrEmptyTranscript) {
			writeJSON(writer, http.StatusUnprocessableEntity, map[string]string{"error": "empty_transcript"})
			return
		}
		writeJSON(writer, http.StatusBadGateway, map[string]string{"error": "voice_unavailable"})
		return
	}
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
