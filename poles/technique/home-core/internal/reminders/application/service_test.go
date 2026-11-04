package application

import (
	"errors"
	"testing"

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
