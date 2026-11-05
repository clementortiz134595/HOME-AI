package application

import (
	"context"
	"fmt"
	"github.com/clementortiz/home-ai/home-core/internal/assistant/model"
	remindersapp "github.com/clementortiz/home-ai/home-core/internal/reminders/application"
	remindersmodel "github.com/clementortiz/home-ai/home-core/internal/reminders/model"
	"log/slog"
)

type ReminderTool struct{ service *remindersapp.Service }

func NewReminderTool(service *remindersapp.Service) ReminderTool { return ReminderTool{service} }
func (tool ReminderTool) Execute(_ context.Context, intent model.Intent) (model.ActionResult, error) {
	p := intent.Parameters
	id, _ := p["id"].(string)
	title, _ := p["title"].(string)
	date, _ := p["date"].(string)
	details, _ := p["details"].(string)
	value := remindersmodel.Reminder{Title: title, Date: date, Details: details}
	slog.Info("reminder tool invoked", "intent", intent.Name, "has_id", id != "", "title_length", len(title), "date", date, "details_present", details != "")
	switch intent.Name {
	case "reminders.create":
		created, err := tool.service.Create(value)
		if err != nil {
			slog.Error("reminder creation failed", "error", err)
			return model.ActionResult{Status: model.ActionFailed, Message: "Le rappel est invalide."}, err
		}
		slog.Info("reminder created", "reminder_id", created.ID)
		return model.ActionResult{Status: model.ActionExecuted, Message: fmt.Sprintf("Événement ajouté : %s.", created.Title)}, nil
	case "reminders.update":
		updated, err := tool.service.Update(id, value)
		if err != nil {
			return model.ActionResult{Status: model.ActionFailed, Message: "Le rappel à modifier est introuvable ou ambigu."}, err
		}
		return model.ActionResult{Status: model.ActionExecuted, Message: fmt.Sprintf("Événement modifié : %s.", updated.Title)}, nil
	case "reminders.delete":
		if id == "" {
			id = tool.service.ResolveID(title, date)
		}
		if err := tool.service.Delete(id); err != nil {
			return model.ActionResult{Status: model.ActionFailed, Message: "Le rappel à supprimer est introuvable ou ambigu."}, err
		}
		return model.ActionResult{Status: model.ActionExecuted, Message: "Événement supprimé."}, nil
	}
	return model.ActionResult{Status: model.ActionUnavailable, Message: "Action rappel indisponible."}, ErrUnsupportedIntent
}
