package application

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/clementortiz/home-ai/home-core/internal/assistant/model"
)

var ErrUnsupportedIntent = errors.New("assistant intent is not supported")

// DeterministicInterpreter routes commands that can be safely recognized
// without asking an LLM. Unknown text remains a question for the AI provider.
type DeterministicInterpreter struct{}

func NewDeterministicInterpreter() DeterministicInterpreter { return DeterministicInterpreter{} }

func (DeterministicInterpreter) Interpret(_ context.Context, interaction model.Interaction) (model.Intent, error) {
	text := strings.TrimSpace(strings.ToLower(interaction.Text))
	if text == "" {
		return model.Intent{}, ErrEmptyTranscript
	}
	if action, ok := switchCommand(text); ok {
		return action, nil
	}
	if strings.Contains(text, "agenda") || strings.Contains(text, "calendrier") || strings.Contains(text, "rendez-vous") || strings.Contains(text, "rendez vous") {
		return model.Intent{Name: "agenda.list", Parameters: map[string]any{"period": calendarPeriod(text)}, Sensitive: true}, nil
	}
	if strings.Contains(text, "mail") || strings.Contains(text, "gmail") {
		return model.Intent{Name: "gmail.search", Parameters: map[string]any{"query": cleanSearch(text, "mail", "gmail")}, Sensitive: true}, nil
	}
	if strings.Contains(text, "drive") || strings.Contains(text, "document") || strings.Contains(text, "fichier") {
		return model.Intent{Name: "drive.search", Parameters: map[string]any{"query": cleanSearch(text, "drive", "document", "fichier")}, Sensitive: true}, nil
	}
	return model.Intent{Name: "assistant.question", Parameters: map[string]any{"text": strings.TrimSpace(interaction.Text)}}, nil
}

func calendarPeriod(text string) string {
	switch {
	case strings.Contains(text, "demain"):
		return "tomorrow"
	case strings.Contains(text, "semaine"):
		return "week"
	default:
		return "today"
	}
}

var switchPattern = regexp.MustCompile(`^(?:allume|éteins|eteins|éteindre|eteindre|allumer)\s+(?:la|le|les)?\s*(?:lumière|lumiere|lampe|prise|appareil)?\s*(?:du|de|des|dans le|dans la|dans les)?\s*(.+)$`)

func switchCommand(text string) (model.Intent, bool) {
	match := switchPattern.FindStringSubmatch(text)
	if len(match) != 2 {
		return model.Intent{}, false
	}
	action := "home.turn_on"
	if strings.HasPrefix(text, "étein") || strings.HasPrefix(text, "etein") {
		action = "home.turn_off"
	}
	return model.Intent{Name: action, Parameters: map[string]any{"target": strings.TrimSpace(match[1])}}, true
}

func cleanSearch(text string, words ...string) string {
	for _, word := range words {
		text = strings.ReplaceAll(text, " "+word+" ", " ")
		text = strings.TrimPrefix(text, word+" ")
		text = strings.TrimSuffix(text, " "+word)
	}
	for _, word := range []string{"regarde", "regarder", "cherche", "chercher", "lis", "lire", "mes", "mails", "emails", "messages", "dans", "ma", "boîte", "boite"} {
		text = strings.ReplaceAll(text, " "+word+" ", " ")
		text = strings.TrimPrefix(text, word+" ")
	}
	return strings.TrimSpace(strings.TrimLeft(text, " :,-"))
}

// ToolRegistry is the application-level boundary for controlled actions.
type ToolRegistry struct{ tools map[string]ActionExecutor }

func NewToolRegistry(tools map[string]ActionExecutor) ToolRegistry { return ToolRegistry{tools: tools} }

func (registry ToolRegistry) Execute(ctx context.Context, intent model.Intent) (model.ActionResult, error) {
	tool, ok := registry.tools[intent.Name]
	if !ok {
		return model.ActionResult{Status: model.ActionUnavailable, Message: fmt.Sprintf("La capacité %q est indisponible.", intent.Name)}, ErrUnsupportedIntent
	}
	return tool.Execute(ctx, intent)
}

type DefaultConfirmationPolicy struct{}

func (DefaultConfirmationPolicy) RequiresConfirmation(intent model.Intent) bool {
	return intent.Sensitive || strings.HasPrefix(intent.Name, "gmail.") || strings.HasPrefix(intent.Name, "drive.")
}

// NewAgent assembles the application brain. The interpreter may use an
// external model, but Home Core keeps validation, confirmation and execution.
func NewAgent(answerer QuestionAnswerer, interpreter IntentInterpreter, tools map[string]ActionExecutor, transcriber AudioTranscriber) VoiceInteraction {
	registryTools := make(map[string]ActionExecutor, len(tools)+1)
	for name, tool := range tools {
		registryTools[name] = tool
	}
	registryTools["assistant.question"] = questionTool{answerer: NewAskQuestion(answerer)}
	if interpreter == nil {
		interpreter = NewDeterministicInterpreter()
	}
	return NewVoiceInteraction(transcriber, interpreter, NewToolRegistry(registryTools), DefaultConfirmationPolicy{})
}

type questionTool struct{ answerer AskQuestion }

func (tool questionTool) Execute(ctx context.Context, intent model.Intent) (model.ActionResult, error) {
	text, ok := intent.Parameters["text"].(string)
	if !ok {
		return model.ActionResult{Status: model.ActionFailed, Message: "La question est invalide."}, ErrEmptyQuestion
	}
	answer, err := tool.answerer.Execute(ctx, model.Question{Text: text})
	if err != nil {
		return model.ActionResult{Status: model.ActionUnavailable, Message: "La réponse IA est indisponible."}, err
	}
	return model.ActionResult{Status: model.ActionExecuted, Message: answer.Text}, nil
}
