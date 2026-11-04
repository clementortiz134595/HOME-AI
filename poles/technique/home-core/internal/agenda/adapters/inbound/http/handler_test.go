package agendahttp

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	agendaapp "github.com/clementortiz/home-ai/home-core/internal/agenda/application"
	"github.com/clementortiz/home-ai/home-core/internal/agenda/model"
)

type stubRegistry struct{ err error }

func (stub stubRegistry) ListCalendars(context.Context, string) ([]model.Calendar, error) {
	if stub.err != nil {
		return nil, stub.err
	}
	return []model.Calendar{{ID: "https://caldav.example/personal/", Name: "Personnel"}}, nil
}

func (stub stubRegistry) ListEvents(context.Context, string, string, time.Time, time.Time) ([]model.Event, error) {
	if stub.err != nil {
		return nil, stub.err
	}
	return []model.Event{{ID: "event-1", Title: "Dîner"}}, nil
}

func TestHandlerListsCalendars(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/v1/calendars/apple/personal", nil)
	NewHandler(stubRegistry{}).ServeHTTP(recorder, request)
	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusOK)
	}
}

func TestHandlerRejectsInvalidPeriod(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/v1/calendars/apple/personal/events?calendar=x&from=bad&to=bad", nil)
	NewHandler(stubRegistry{}).ServeHTTP(recorder, request)
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusBadRequest)
	}
}

func TestHandlerMapsCalendarErrors(t *testing.T) {
	for _, test := range []struct {
		name   string
		err    error
		status int
	}{
		{name: "missing account", err: agendaapp.ErrAccountNotConfigured, status: http.StatusNotFound},
		{name: "unavailable", err: errors.New("network"), status: http.StatusBadGateway},
	} {
		t.Run(test.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			request := httptest.NewRequest(http.MethodGet, "/v1/calendars/apple/personal", nil)
			NewHandler(stubRegistry{err: test.err}).ServeHTTP(recorder, request)
			if recorder.Code != test.status {
				t.Fatalf("status = %d, want %d", recorder.Code, test.status)
			}
		})
	}
}
