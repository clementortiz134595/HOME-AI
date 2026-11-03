package agendahttp

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	agendaapp "github.com/clementortiz/home-ai/home-core/internal/agenda/application"
)

type Handler struct {
	registry agendaapp.Registry
}

func NewHandler(registry agendaapp.Registry) *Handler {
	return &Handler{registry: registry}
}

func (handler *Handler) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	parts := strings.Split(strings.TrimPrefix(request.URL.Path, "/v1/calendars/apple/"), "/")
	if len(parts) == 1 && parts[0] != "" && request.Method == http.MethodGet {
		handler.listCalendars(writer, request, parts[0])
		return
	}
	if len(parts) == 2 && parts[0] != "" && parts[1] == "events" && request.Method == http.MethodGet {
		handler.listEvents(writer, request, parts[0])
		return
	}
	writeJSON(writer, http.StatusNotFound, map[string]string{"error": "not_found"})
}

func (handler *Handler) listCalendars(writer http.ResponseWriter, request *http.Request, accountID string) {
	calendars, err := handler.registry.ListCalendars(request.Context(), accountID)
	if err != nil {
		writeCalendarError(writer, err)
		return
	}
	writeJSON(writer, http.StatusOK, map[string]any{"accountId": accountID, "calendars": calendars})
}

func (handler *Handler) listEvents(writer http.ResponseWriter, request *http.Request, accountID string) {
	calendarID := request.URL.Query().Get("calendar")
	from, err := time.Parse(time.RFC3339, request.URL.Query().Get("from"))
	if err != nil {
		writeJSON(writer, http.StatusBadRequest, map[string]string{"error": "invalid_period"})
		return
	}
	to, err := time.Parse(time.RFC3339, request.URL.Query().Get("to"))
	if err != nil {
		writeJSON(writer, http.StatusBadRequest, map[string]string{"error": "invalid_period"})
		return
	}
	events, err := handler.registry.ListEvents(request.Context(), accountID, calendarID, from, to)
	if err != nil {
		writeCalendarError(writer, err)
		return
	}
	writeJSON(writer, http.StatusOK, map[string]any{"accountId": accountID, "calendarId": calendarID, "events": events})
}

func writeCalendarError(writer http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, agendaapp.ErrAccountNotConfigured):
		writeJSON(writer, http.StatusNotFound, map[string]string{"error": "account_not_configured"})
	case errors.Is(err, agendaapp.ErrInvalidPeriod):
		writeJSON(writer, http.StatusBadRequest, map[string]string{"error": "invalid_period"})
	default:
		writeJSON(writer, http.StatusBadGateway, map[string]string{"error": "calendar_unavailable"})
	}
}

func writeJSON(writer http.ResponseWriter, status int, body any) {
	writer.Header().Set("Content-Type", "application/json; charset=utf-8")
	writer.WriteHeader(status)
	_ = json.NewEncoder(writer).Encode(body)
}
