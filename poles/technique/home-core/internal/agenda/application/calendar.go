package application

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/clementortiz/home-ai/home-core/internal/agenda/model"
)

var (
	ErrAccountNotConfigured = errors.New("calendar account is not configured")
	ErrInvalidPeriod        = errors.New("calendar period is invalid")
)

type CalendarProvider interface {
	ListCalendars(context.Context) ([]model.Calendar, error)
	ListEvents(context.Context, string, time.Time, time.Time) ([]model.Event, error)
}

type Registry struct {
	providers map[string]CalendarProvider
}

func NewRegistry(providers map[string]CalendarProvider) Registry {
	return Registry{providers: providers}
}

func (registry Registry) ListCalendars(ctx context.Context, accountID string) ([]model.Calendar, error) {
	provider, err := registry.providerFor(accountID)
	if err != nil {
		return nil, err
	}
	return provider.ListCalendars(ctx)
}

func (registry Registry) ListEvents(ctx context.Context, accountID, calendarID string, from, to time.Time) ([]model.Event, error) {
	if calendarID == "" || !to.After(from) {
		return nil, ErrInvalidPeriod
	}
	provider, err := registry.providerFor(accountID)
	if err != nil {
		return nil, err
	}
	return provider.ListEvents(ctx, calendarID, from, to)
}

func (registry Registry) providerFor(accountID string) (CalendarProvider, error) {
	provider, found := registry.providers[accountID]
	if !found {
		return nil, fmt.Errorf("%w: %s", ErrAccountNotConfigured, accountID)
	}
	return provider, nil
}
