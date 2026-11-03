package assistanthttp

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"
)

type VoiceStatus struct {
	State      string `json:"state"`
	Transcript string `json:"transcript,omitempty"`
	Answer     string `json:"answer,omitempty"`
	UpdatedAt  string `json:"updatedAt"`
}

type VoiceStatusStore struct {
	mu     sync.RWMutex
	status VoiceStatus
}

func NewVoiceStatusStore() *VoiceStatusStore {
	return &VoiceStatusStore{status: VoiceStatus{State: "idle", UpdatedAt: time.Now().UTC().Format(time.RFC3339Nano)}}
}

func (store *VoiceStatusStore) Handler() http.Handler {
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.Method == http.MethodGet {
			store.mu.RLock()
			status := store.status
			store.mu.RUnlock()
			if status.State != "idle" {
				if updated, err := time.Parse(time.RFC3339Nano, status.UpdatedAt); err == nil && time.Since(updated) > 20*time.Second {
					status = VoiceStatus{State: "idle", UpdatedAt: time.Now().UTC().Format(time.RFC3339Nano)}
				}
			}
			writeVoiceJSON(writer, http.StatusOK, status)
			return
		}
		if request.Method == http.MethodPost {
			var status VoiceStatus
			if err := json.NewDecoder(http.MaxBytesReader(writer, request.Body, 16<<10)).Decode(&status); err != nil {
				writeVoiceJSON(writer, http.StatusBadRequest, map[string]string{"error": "invalid_voice_status"})
				return
			}
			status.UpdatedAt = time.Now().UTC().Format(time.RFC3339Nano)
			store.mu.Lock()
			store.status = status
			store.mu.Unlock()
			writeVoiceJSON(writer, http.StatusNoContent, nil)
			return
		}
		writeVoiceJSON(writer, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
	})
}

func writeVoiceJSON(writer http.ResponseWriter, status int, body any) {
	writer.Header().Set("Cache-Control", "no-store")
	if body == nil {
		writer.WriteHeader(status)
		return
	}
	writer.Header().Set("Content-Type", "application/json; charset=utf-8")
	writer.WriteHeader(status)
	_ = json.NewEncoder(writer).Encode(body)
}
