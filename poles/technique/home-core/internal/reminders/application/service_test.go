package application

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/clementortiz/home-ai/home-core/internal/reminders/model"
)

func TestServiceCreateUpdateAndDelete(t *testing.T) {
	service := NewService()
	created, err := service.Create(model.Reminder{Title: "Sortir les bacs", Date: "2026-11-05"})
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if created.ID != "reminder-1" {
		t.Fatalf("Create() ID = %q, want reminder-1", created.ID)
	}

	updated, err := service.Update(created.ID, model.Reminder{Details: "Avant 8h"})
	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}
	if updated.Title != created.Title || updated.Date != created.Date || updated.Details != "Avant 8h" {
		t.Fatalf("Update() = %+v, unexpectedly replaced unchanged fields", updated)
	}

	if err := service.Delete(created.ID); err != nil {
		t.Fatalf("Delete() error = %v", err)
	}
	if err := service.Delete(created.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("second Delete() error = %v, want ErrNotFound", err)
	}
}

func TestServiceKeepsDateOnlyReminderCompatible(t *testing.T) {
	service := NewService()
	created, err := service.Create(model.Reminder{Title: "Appeler Mamie", Date: "2026-11-22"})
	if err != nil {
		t.Fatal(err)
	}
	if created.ScheduledAt != "" || created.NotificationStatus != "" {
		t.Fatalf("date-only reminder unexpectedly scheduled: %+v", created)
	}
	if claimed := service.ClaimDueNotifications(time.Date(2026, 11, 23, 0, 0, 0, 0, time.UTC)); len(claimed) != 0 {
		t.Fatalf("date-only reminder must not be pushed: %+v", claimed)
	}
}

func TestSchedulerSendsDueReminderOnlyOnce(t *testing.T) {
	service := NewService()
	created, err := service.Create(model.Reminder{Title: "Prendre un médicament", Date: "2026-11-22", ScheduledAt: "2026-11-22T08:00:00Z"})
	if err != nil {
		t.Fatal(err)
	}
	notifier := &notifierStub{}
	scheduler := NewScheduler(service, notifier, time.Minute)
	scheduler.now = func() time.Time { return time.Date(2026, 11, 22, 8, 1, 0, 0, time.UTC) }
	scheduler.Tick(context.Background())
	scheduler.Tick(context.Background())
	if notifier.calls != 1 {
		t.Fatalf("notifier calls = %d, want 1", notifier.calls)
	}
	updated := service.List()[0]
	if updated.ID != created.ID || updated.NotificationStatus != model.NotificationSent {
		t.Fatalf("notification was not marked sent: %+v", updated)
	}
}

type notifierStub struct {
	calls int
	err   error
}

func (s *notifierStub) NotifyReminder(context.Context, model.Reminder) error { s.calls++; return s.err }

func TestServiceRejectsIncompleteReminder(t *testing.T) {
	service := NewService()
	for _, reminder := range []model.Reminder{{Date: "2026-11-05"}, {Title: "Sortir les bacs"}} {
		if _, err := service.Create(reminder); err == nil {
			t.Fatalf("Create(%+v) accepted an incomplete reminder", reminder)
		}
	}
	if _, err := service.Update("missing", model.Reminder{Title: "x"}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("Update() error = %v, want ErrNotFound", err)
	}
}

func TestServiceResolvesReminderByTitleAndDate(t *testing.T) {
	service := NewService()
	created, err := service.Create(model.Reminder{Title: "Sortir les bacs", Date: "2026-11-05"})
	if err != nil {
		t.Fatal(err)
	}
	updated, err := service.Update("", model.Reminder{Title: "sortir les bacs", Date: created.Date, Details: "Avant 8h"})
	if err != nil || updated.ID != created.ID || updated.Details != "Avant 8h" {
		t.Fatalf("updated=%+v err=%v", updated, err)
	}
}
