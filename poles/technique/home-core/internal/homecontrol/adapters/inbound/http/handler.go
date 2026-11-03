package homecontrolhttp

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/clementortiz/home-ai/home-core/internal/homecontrol/application"
	"github.com/clementortiz/home-ai/home-core/internal/homecontrol/model"
)

type Handler struct{ service application.Service }

func NewHandler(service application.Service) *Handler { return &Handler{service: service} }

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/v1/home-control")
	switch {
	case r.Method == http.MethodGet && path == "/devices":
		devices, err := h.service.ListDevices(r.Context())
		if err != nil {
			writeError(w, http.StatusBadGateway, "devices_unavailable")
			return
		}
		writeJSON(w, http.StatusOK, devices)
	case r.Method == http.MethodGet && strings.HasPrefix(path, "/devices/") && strings.HasSuffix(path, "/state"):
		id := strings.TrimSuffix(strings.TrimPrefix(path, "/devices/"), "/state")
		state, err := h.service.GetState(r.Context(), id)
		if err != nil {
			writeError(w, http.StatusNotFound, "device_state_unavailable")
			return
		}
		writeJSON(w, http.StatusOK, state)
	case r.Method == http.MethodPost && strings.HasPrefix(path, "/devices/") && strings.HasSuffix(path, "/commands"):
		id := strings.TrimSuffix(strings.TrimPrefix(path, "/devices/"), "/commands")
		var body struct {
			Action model.Action `json:"action"`
		}
		if json.NewDecoder(r.Body).Decode(&body) != nil {
			writeError(w, http.StatusBadRequest, "invalid_command")
			return
		}
		result, err := h.service.Execute(r.Context(), id, body.Action)
		if err != nil {
			writeError(w, http.StatusBadRequest, "command_failed")
			return
		}
		writeJSON(w, http.StatusOK, result)
	default:
		writeError(w, http.StatusNotFound, "not_found")
	}
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
