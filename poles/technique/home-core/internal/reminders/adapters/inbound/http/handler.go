package remindershttp

import (
	"encoding/json"
	remindersapp "github.com/clementortiz/home-ai/home-core/internal/reminders/application"
	"net/http"
	"strings"
)

type Handler struct{ service *remindersapp.Service }

func NewHandler(service *remindersapp.Service) *Handler { return &Handler{service} }
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/v1/reminders"), "/")
	if r.Method == http.MethodGet && path == "" {
		write(w, http.StatusOK, map[string]any{"reminders": h.service.List()})
		return
	}
	write(w, http.StatusNotFound, map[string]string{"error": "not_found"})
}
func write(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
