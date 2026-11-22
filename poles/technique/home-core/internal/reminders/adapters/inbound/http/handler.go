package remindershttp

import (
	"encoding/json"
	"errors"
	remindersapp "github.com/clementortiz/home-ai/home-core/internal/reminders/application"
	"github.com/clementortiz/home-ai/home-core/internal/reminders/model"
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
	if r.Method == http.MethodPost && path == "" {
		var value model.Reminder
		if !decode(w, r, &value) {
			return
		}
		created, err := h.service.Create(value)
		if err != nil {
			write(w, http.StatusBadRequest, map[string]string{"error": "invalid_reminder"})
			return
		}
		write(w, http.StatusCreated, created)
		return
	}
	if r.Method == http.MethodPatch && path != "" {
		var patch struct {
			Title       *string `json:"title"`
			Date        *string `json:"date"`
			Details     *string `json:"details"`
			ScheduledAt *string `json:"scheduledAt"`
			TimeZone    *string `json:"timeZone"`
		}
		if !decode(w, r, &patch) {
			return
		}
		value := model.Reminder{}
		clearScheduledAt := patch.ScheduledAt != nil && *patch.ScheduledAt == ""
		if patch.Title != nil {
			value.Title = *patch.Title
		}
		if patch.Date != nil {
			value.Date = *patch.Date
		}
		if patch.Details != nil {
			value.Details = *patch.Details
		}
		if patch.ScheduledAt != nil {
			value.ScheduledAt = *patch.ScheduledAt
		}
		if patch.TimeZone != nil {
			value.TimeZone = *patch.TimeZone
		}
		updated, err := h.service.Patch(path, value, clearScheduledAt, patch.Details != nil)
		if err != nil {
			if errors.Is(err, remindersapp.ErrNotFound) {
				write(w, http.StatusNotFound, map[string]string{"error": "not_found"})
			} else {
				write(w, http.StatusBadRequest, map[string]string{"error": "invalid_reminder"})
			}
			return
		}
		write(w, http.StatusOK, updated)
		return
	}
	if r.Method == http.MethodDelete && path != "" {
		if err := h.service.Delete(path); err != nil {
			if errors.Is(err, remindersapp.ErrNotFound) {
				write(w, http.StatusNotFound, map[string]string{"error": "not_found"})
			} else {
				write(w, http.StatusBadRequest, map[string]string{"error": "invalid_reminder"})
			}
			return
		}
		write(w, http.StatusOK, map[string]string{"status": "deleted"})
		return
	}
	write(w, http.StatusNotFound, map[string]string{"error": "not_found"})
}
func decode(w http.ResponseWriter, r *http.Request, target any) bool {
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 32<<10)).Decode(target); err != nil {
		write(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return false
	}
	return true
}
func write(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
