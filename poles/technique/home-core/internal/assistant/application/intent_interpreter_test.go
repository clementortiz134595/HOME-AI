package application

import (
	"context"
	"errors"
	"testing"

	"github.com/clementortiz/home-ai/home-core/internal/assistant/model"
)

func TestDeterministicInterpreterRoutesHomeCommand(t *testing.T) {
	intent, err := NewDeterministicInterpreter().Interpret(context.Background(), model.Interaction{Text: "Éteins la lumière du salon"})
	if err != nil || intent.Name != "home.turn_off" || intent.Parameters["target"] != "salon" {
		t.Fatalf("intent=%#v err=%v", intent, err)
	}
}

func TestDeterministicInterpreterRoutesPrivateSources(t *testing.T) {
	for _, test := range []struct{ text, name string }{{"cherche mes mails facture", "gmail.search"}, {"trouve le document budget dans Drive", "drive.search"}} {
		intent, err := NewDeterministicInterpreter().Interpret(context.Background(), model.Interaction{Text: test.text})
		if err != nil || intent.Name != test.name || !intent.Sensitive {
			t.Fatalf("text=%q intent=%#v err=%v", test.text, intent, err)
		}
	}
}

func TestDeterministicInterpreterRoutesAgenda(t *testing.T) {
	intent, err := NewDeterministicInterpreter().Interpret(context.Background(), model.Interaction{Text: "Quels sont mes rendez-vous demain ?"})
	if err != nil || intent.Name != "agenda.list" || intent.Parameters["period"] != "tomorrow" || !intent.Sensitive {
		t.Fatalf("intent=%#v err=%v", intent, err)
	}
}

func TestDeterministicInterpreterKeepsUnknownTextAsQuestion(t *testing.T) {
	intent, err := NewDeterministicInterpreter().Interpret(context.Background(), model.Interaction{Text: "Quel temps fera-t-il demain ?"})
	if err != nil || intent.Name != "assistant.question" || intent.Parameters["text"] != "Quel temps fera-t-il demain ?" {
		t.Fatalf("intent=%#v err=%v", intent, err)
	}
}

type registryTool struct{ called bool }

func (tool *registryTool) Execute(context.Context, model.Intent) (model.ActionResult, error) {
	tool.called = true
	return model.ActionResult{Status: model.ActionExecuted}, nil
}

func TestToolRegistryDelegatesAndRejectsUnknownTools(t *testing.T) {
	tool := &registryTool{}
	result, err := NewToolRegistry(map[string]ActionExecutor{"home.turn_on": tool}).Execute(context.Background(), model.Intent{Name: "home.turn_on"})
	if err != nil || result.Status != model.ActionExecuted || !tool.called {
		t.Fatalf("result=%#v err=%v", result, err)
	}
	result, err = NewToolRegistry(nil).Execute(context.Background(), model.Intent{Name: "unknown"})
	if !errors.Is(err, ErrUnsupportedIntent) || result.Status != model.ActionUnavailable {
		t.Fatalf("result=%#v err=%v", result, err)
	}
}

func TestConfirmationPolicyProtectsPrivateSources(t *testing.T) {
	policy := DefaultConfirmationPolicy{}
	if !policy.RequiresConfirmation(model.Intent{Name: "gmail.search"}) || !policy.RequiresConfirmation(model.Intent{Sensitive: true}) || policy.RequiresConfirmation(model.Intent{Name: "home.turn_on"}) {
		t.Fatal("unexpected confirmation policy")
	}
}

type fakeTranscriberForAgent struct{}

func (fakeTranscriberForAgent) Transcribe(context.Context, model.VoiceInput) (string, error) {
	return "Quel temps fera-t-il demain ?", nil
}

func TestNewAgentRoutesQuestionsToAnswerer(t *testing.T) {
	answerer := &fakeAnswerer{answer: model.Answer{Text: "Il fera beau."}}
	agent := NewAgent(answerer, nil, fakeTranscriberForAgent{})
	result, err := agent.Execute(context.Background(), model.VoiceInput{Audio: []byte("audio")})
	if err != nil || result.Status != model.ActionExecuted || result.Message != "Il fera beau." || answerer.question.Text != "Quel temps fera-t-il demain ?" {
		t.Fatalf("result=%#v question=%#v err=%v", result, answerer.question, err)
	}
}
