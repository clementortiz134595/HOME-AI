package application

import (
	"context"
	"errors"
	"testing"

	"github.com/clementortiz/home-ai/home-core/internal/assistant/model"
)

type fakeTranscriber struct {
	text string
	err  error
}

func (f fakeTranscriber) Transcribe(context.Context, model.VoiceInput) (string, error) {
	return f.text, f.err
}

type fakeInterpreter struct {
	intent model.Intent
	err    error
}

func (f fakeInterpreter) Interpret(context.Context, model.Interaction) (model.Intent, error) {
	return f.intent, f.err
}

type fakeExecutor struct {
	result model.ActionResult
	called bool
}

func (f *fakeExecutor) Execute(context.Context, model.Intent) (model.ActionResult, error) {
	f.called = true
	return f.result, nil
}

type confirmationPolicy struct{ required bool }

func (p confirmationPolicy) RequiresConfirmation(model.Intent) bool { return p.required }

func TestVoiceInteractionTranscribesAndExecutes(t *testing.T) {
	executor := &fakeExecutor{result: model.ActionResult{Status: model.ActionExecuted, Message: "Lampe allumée."}}
	useCase := NewVoiceInteraction(fakeTranscriber{text: " Allume la lumière du salon "}, fakeInterpreter{intent: model.Intent{Name: "home.turn_on", Parameters: map[string]any{"room": "salon"}}}, executor, confirmationPolicy{})
	result, err := useCase.Execute(context.Background(), model.VoiceInput{Audio: []byte("audio")})
	if err != nil || result.Status != model.ActionExecuted || !executor.called || result.Intent.Name != "home.turn_on" {
		t.Fatalf("result=%#v err=%v", result, err)
	}
}

func TestVoiceInteractionRequiresConfirmationBeforeExecution(t *testing.T) {
	executor := &fakeExecutor{}
	useCase := NewVoiceInteraction(fakeTranscriber{text: "Lis mes mails"}, fakeInterpreter{intent: model.Intent{Name: "gmail.list"}}, executor, confirmationPolicy{required: true})
	result, err := useCase.Execute(context.Background(), model.VoiceInput{Audio: []byte("audio")})
	if err != nil || result.Status != model.ActionConfirmation || executor.called {
		t.Fatalf("result=%#v err=%v", result, err)
	}
}

func TestVoiceInteractionRejectsEmptyAudio(t *testing.T) {
	_, err := NewVoiceInteraction(fakeTranscriber{}, fakeInterpreter{}, &fakeExecutor{}, confirmationPolicy{}).Execute(context.Background(), model.VoiceInput{})
	if !errors.Is(err, ErrEmptyAudio) {
		t.Fatalf("error=%v", err)
	}
}
