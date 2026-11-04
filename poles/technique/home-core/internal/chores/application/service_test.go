package application

import (
	"errors"
	"testing"

	"github.com/clementortiz/home-ai/home-core/internal/chores/model"
)

func TestServiceValidatesAndUpdatesChore(t *testing.T) {
	service := NewService()
	created, err := service.Create(model.Chore{Objective: "Nettoyer la cuisine", Assignees: []string{"clement"}, Frequency: "weekly"})
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	updated, err := service.Update(created.ID, model.Chore{Date: "2026-11-08", IntervalWeeks: 2})
	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}
	if updated.Objective != created.Objective || updated.Date != "2026-11-08" || updated.IntervalWeeks != 2 {
		t.Fatalf("Update() = %+v, unexpected partial update", updated)
	}

	completed, err := service.SetCompleted(created.ID, true)
	if err != nil || !completed.Completed {
		t.Fatalf("SetCompleted() = %+v, %v; want completed", completed, err)
	}
	if _, err := service.Update(created.ID, model.Chore{Assignees: []string{"clement"}, Alternating: true}); err == nil {
		t.Fatal("Update() accepted alternating chore with one assignee")
	}
	if err := service.Delete("missing"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("Delete() error = %v, want ErrNotFound", err)
	}
}

func TestServiceRejectsInvalidChore(t *testing.T) {
	service := NewService()
	cases := []model.Chore{
		{Assignees: []string{"clement"}},
		{Objective: "Ranger", Assignees: nil},
		{Objective: "Ranger", Assignees: []string{"clement"}, Frequency: "daily"},
		{Objective: "Ranger", Assignees: []string{"clement"}, Alternating: true},
	}
	for _, chore := range cases {
		if _, err := service.Create(chore); err == nil {
			t.Fatalf("Create(%+v) accepted invalid chore", chore)
		}
	}
}

func TestServiceResolvesChoreByObjectiveAndRejectsAmbiguity(t *testing.T) {
	service := NewService()
	first, err := service.Create(model.Chore{Objective: "Nettoyer la cuisine", Assignees: []string{"clement"}})
	if err != nil {
		t.Fatal(err)
	}
	updated, err := service.Update("", model.Chore{Objective: "nettoyer la cuisine", Date: first.Date})
	if err != nil || updated.ID != first.ID {
		t.Fatalf("updated=%+v err=%v", updated, err)
	}
	if _, err := service.Create(model.Chore{Objective: "Nettoyer la cuisine", Assignees: []string{"lise"}}); err != nil {
		t.Fatal(err)
	}
	if _, err := service.Update("", model.Chore{Objective: "Nettoyer la cuisine"}); !errors.Is(err, ErrAmbiguous) {
		t.Fatalf("Update() error=%v, want ErrAmbiguous", err)
	}
}
