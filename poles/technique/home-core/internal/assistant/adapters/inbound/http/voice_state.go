package assistanthttp

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"
)

type VoiceStateHandler struct {
	mu    sync.RWMutex
	state map[string]any
}

func NewVoiceStateHandler() *VoiceStateHandler {
	return &VoiceStateHandler{state: map[string]any{"state": "idle", "updatedAt": time.Now().UTC().Format(time.RFC3339Nano)}}
}

func (handler *VoiceStateHandler) Update(state map[string]any) {
	state["updatedAt"] = time.Now().UTC().Format(time.RFC3339Nano)
	handler.mu.Lock()
	handler.state = state
	handler.mu.Unlock()
}

func (handler *VoiceStateHandler) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	switch request.Method {
	case http.MethodGet:
		handler.mu.RLock()
		state := handler.state
		handler.mu.RUnlock()
		writeJSON(writer, http.StatusOK, state)
	case http.MethodPost:
		var state map[string]any
		if err := json.NewDecoder(http.MaxBytesReader(writer, request.Body, 16<<10)).Decode(&state); err != nil {
			writeJSON(writer, http.StatusBadRequest, map[string]string{"error": "invalid_state"})
			return
		}
		if _, ok := state["state"].(string); !ok {
			writeJSON(writer, http.StatusBadRequest, map[string]string{"error": "invalid_state"})
			return
		}
		handler.Update(state)
		writeJSON(writer, http.StatusNoContent, nil)
	default:
		writeJSON(writer, http.StatusNotFound, map[string]string{"error": "not_found"})
	}
}
