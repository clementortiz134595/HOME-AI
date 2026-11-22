package application

import (
	"context"
	"strings"
	"testing"

	"github.com/clementortiz/home-ai/home-core/internal/assistant/model"
	remindersapp "github.com/clementortiz/home-ai/home-core/internal/reminders/application"
)

func TestReminderToolCreatesScheduledReminder(t *testing.T) {
	service := remindersapp.NewService(nil)
	result, err := NewReminderTool(service).Execute(context.Background(), model.Intent{Name: "reminders.create", Parameters: map[string]any{
		"title":       "sortir les poubelles",
		"date":        "2026-11-06",
		"scheduledAt": "2026-11-06T11:00:00Z",
		"timeZone":    "Europe/Paris",
	}})
	if err != nil || result.Status != model.ActionExecuted || !strings.Contains(result.Message, "06/11 à 12:00") {
		t.Fatalf("result=%+v err=%v", result, err)
	}
	reminders := service.List()
	if len(reminders) != 1 || reminders[0].ScheduledAt != "2026-11-06T11:00:00Z" || reminders[0].TimeZone != "Europe/Paris" {
		t.Fatalf("stored reminder = %+v", reminders)
	}
}
