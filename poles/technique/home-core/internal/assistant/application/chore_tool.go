package application

import (
	"context"
	"fmt"

	"github.com/clementortiz/home-ai/home-core/internal/assistant/model"
	choresapp "github.com/clementortiz/home-ai/home-core/internal/chores/application"
	choresmodel "github.com/clementortiz/home-ai/home-core/internal/chores/model"
)

type ChoreTool struct{ service *choresapp.Service }

func NewChoreTool(service *choresapp.Service) ChoreTool { return ChoreTool{service: service} }
func (tool ChoreTool) Execute(_ context.Context, intent model.Intent) (model.ActionResult, error) {
	p := intent.Parameters
	switch intent.Name {
	case "chores.create":
		chore, err := tool.service.Create(choreFromParameters(p))
		if err != nil {
			return model.ActionResult{Status: model.ActionFailed, Message: "La tâche ménagère est invalide."}, err
		}
		return model.ActionResult{Status: model.ActionExecuted, Message: fmt.Sprintf("Tâche ajoutée : %s.", chore.Objective)}, nil
	case "chores.update":
		id, _ := p["id"].(string)
		chore, err := tool.service.Update(id, choreFromParameters(p))
		if err != nil {
			return model.ActionResult{Status: model.ActionFailed, Message: "La tâche à modifier est introuvable."}, err
		}
		return model.ActionResult{Status: model.ActionExecuted, Message: fmt.Sprintf("Tâche modifiée : %s.", chore.Objective)}, nil
	case "chores.delete":
		id, _ := p["id"].(string)
		if id == "" {
			objective, _ := p["objective"].(string)
			date, _ := p["date"].(string)
			id = tool.service.ResolveID(objective, date)
		}
		if err := tool.service.Delete(id); err != nil {
			return model.ActionResult{Status: model.ActionFailed, Message: "La tâche à supprimer est introuvable ou ambiguë."}, err
		}
		return model.ActionResult{Status: model.ActionExecuted, Message: "Tâche ménagère supprimée."}, nil
	}
	return model.ActionResult{Status: model.ActionUnavailable, Message: "Action ménagère indisponible."}, ErrUnsupportedIntent
}
func choreFromParameters(p map[string]any) choresmodel.Chore {
	assignees := []string{}
	if values, ok := p["assignees"].([]any); ok {
		for _, value := range values {
			if person, ok := value.(string); ok {
				assignees = append(assignees, person)
			}
		}
	}
	frequency, _ := p["frequency"].(string)
	objective, _ := p["objective"].(string)
	date, _ := p["date"].(string)
	alternating, _ := p["alternating"].(bool)
	interval, _ := p["intervalWeeks"].(float64)
	return choresmodel.Chore{Objective: objective, Date: date, Assignees: assignees, Frequency: frequency, IntervalWeeks: int(interval), Alternating: alternating}
}
