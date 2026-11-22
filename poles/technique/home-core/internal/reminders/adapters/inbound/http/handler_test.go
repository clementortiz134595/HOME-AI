package remindershttp

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	remindersapp "github.com/clementortiz/home-ai/home-core/internal/reminders/application"
)

func TestReminderHTTPMutationsReturnPersistedState(t *testing.T) {
	handler := NewHandler(remindersapp.NewService())
	create := httptest.NewRecorder()
	handler.ServeHTTP(create, httptest.NewRequest(http.MethodPost, "/v1/reminders", bytes.NewBufferString(`{"title":"Dentiste","date":"2026-11-23","scheduledAt":"2026-11-23T09:00:00Z","timeZone":"Europe/Paris"}`)))
	if create.Code != http.StatusCreated {
		t.Fatalf("create code = %d body=%s", create.Code, create.Body.String())
	}
	var created struct {
		ID          string `json:"id"`
		ScheduledAt string `json:"scheduledAt"`
	}
	if err := json.NewDecoder(create.Body).Decode(&created); err != nil {
		t.Fatal(err)
	}
	patch := httptest.NewRecorder()
	handler.ServeHTTP(patch, httptest.NewRequest(http.MethodPatch, "/v1/reminders/"+created.ID, bytes.NewBufferString(`{"details":"Cabinet Dupont"}`)))
	if patch.Code != http.StatusOK {
		t.Fatalf("patch code = %d", patch.Code)
	}
	var updated struct {
		Details     string `json:"details"`
		ScheduledAt string `json:"scheduledAt"`
	}
	_ = json.NewDecoder(patch.Body).Decode(&updated)
	if updated.Details != "Cabinet Dupont" || updated.ScheduledAt != created.ScheduledAt {
		t.Fatalf("patch lost persisted data: %+v", updated)
	}
	deleteResponse := httptest.NewRecorder()
	handler.ServeHTTP(deleteResponse, httptest.NewRequest(http.MethodDelete, "/v1/reminders/"+created.ID, nil))
	if deleteResponse.Code != http.StatusOK {
		t.Fatalf("delete code = %d", deleteResponse.Code)
	}
}
