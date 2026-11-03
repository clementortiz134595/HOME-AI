package application

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/clementortiz/home-ai/home-core/internal/agenda/model"
)

type fakeCalendarProvider struct {
	calendars []model.Calendar
	events    []model.Event
	err       error
}

func (provider fakeCalendarProvider) ListCalendars(context.Context) ([]model.Calendar, error) {
	return provider.calendars, provider.err
}

func (provider fakeCalendarProvider) ListEvents(context.Context, string, time.Time, time.Time) ([]model.Event, error) {
	return provider.events, provider.err
}

func TestRegistryListsCalendarsForConfiguredAccount(t *testing.T) {
	registry := NewRegistry(map[string]CalendarProvider{
		"personal": fakeCalendarProvider{calendars: []model.Calendar{{ID: "/calendars/personal/", Name: "Personnel"}}},
	})

	calendars, err := registry.ListCalendars(context.Background(), "personal")

	if err != nil || len(calendars) != 1 || calendars[0].Name != "Personnel" {
		t.Fatalf("ListCalendars() = %#v, %v", calendars, err)
	}
}

func TestRegistryRejectsUnknownAccount(t *testing.T) {
	registry := NewRegistry(nil)

	_, err := registry.ListCalendars(context.Background(), "personal")

	if !errors.Is(err, ErrAccountNotConfigured) {
		t.Fatalf("ListCalendars() error = %v", err)
	}
}

func TestRegistryRejectsInvalidEventPeriod(t *testing.T) {
	registry := NewRegistry(map[string]CalendarProvider{"personal": fakeCalendarProvider{}})
	now := time.Now()

	_, err := registry.ListEvents(context.Background(), "personal", "calendar", now, now)

	if !errors.Is(err, ErrInvalidPeriod) {
		t.Fatalf("ListEvents() error = %v", err)
	}
}
