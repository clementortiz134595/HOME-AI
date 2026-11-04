package assistanthttp

import (
	"context"
	"io"
	"net/http"
)

type WakeHandler struct {
	detector interface {
		Detect(context.Context, []byte) (bool, error)
	}
	state *VoiceStateHandler
}

func NewWakeHandler(detector interface {
	Detect(context.Context, []byte) (bool, error)
}, state *VoiceStateHandler) *WakeHandler {
	return &WakeHandler{detector: detector, state: state}
}

func (handler *WakeHandler) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost || request.URL.Path != "/v1/assistant/wake" {
		writeJSON(writer, http.StatusNotFound, map[string]string{"error": "not_found"})
		return
	}
	if handler.detector == nil {
		writeJSON(writer, http.StatusServiceUnavailable, map[string]string{"error": "wake_word_unavailable"})
		return
	}
	frame, err := io.ReadAll(http.MaxBytesReader(writer, request.Body, 256<<10))
	if err != nil || len(frame) == 0 {
		writeJSON(writer, http.StatusBadRequest, map[string]string{"error": "invalid_audio"})
		return
	}
	detected, err := handler.detector.Detect(request.Context(), frame)
	if err != nil {
		writeJSON(writer, http.StatusBadGateway, map[string]string{"error": "wake_word_unavailable"})
		return
	}
	if detected && handler.state != nil {
		handler.state.Update(map[string]any{"state": "listening"})
	}
	writeJSON(writer, http.StatusOK, map[string]any{"detected": detected})
}
