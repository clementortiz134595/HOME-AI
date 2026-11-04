package assistanthttp

import (
	"encoding/json"
	"github.com/clementortiz/home-ai/home-core/internal/assistant/application"
	"net/http"
	"strings"
)

type SpeechHandler struct{ synthesizer application.SpeechSynthesizer }

func NewSpeechHandler(synthesizer application.SpeechSynthesizer) *SpeechHandler {
	return &SpeechHandler{synthesizer: synthesizer}
}

func (handler *SpeechHandler) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost || request.URL.Path != "/v1/assistant/speech" {
		writeJSON(writer, http.StatusNotFound, map[string]string{"error": "not_found"})
		return
	}
	var input struct {
		Text string `json:"text"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(writer, request.Body, 16<<10)).Decode(&input); err != nil || strings.TrimSpace(input.Text) == "" {
		writeJSON(writer, http.StatusBadRequest, map[string]string{"error": "invalid_request"})
		return
	}
	audio, err := handler.synthesizer.Synthesize(request.Context(), input.Text)
	if err != nil {
		writeJSON(writer, http.StatusBadGateway, map[string]string{"error": "speech_unavailable"})
		return
	}
	writer.Header().Set("Content-Type", "audio/mpeg")
	writer.WriteHeader(http.StatusOK)
	_, _ = writer.Write(audio)
}
