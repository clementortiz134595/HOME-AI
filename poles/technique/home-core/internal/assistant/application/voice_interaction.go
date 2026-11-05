package application

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"

	"github.com/clementortiz/home-ai/home-core/internal/assistant/model"
)

var (
	ErrEmptyAudio      = errors.New("assistant audio is empty")
	ErrEmptyTranscript = errors.New("assistant transcript is empty")
)

type AudioTranscriber interface {
	Transcribe(context.Context, model.VoiceInput) (string, error)
}

type IntentInterpreter interface {
	Interpret(context.Context, model.Interaction) (model.Intent, error)
}

type ActionExecutor interface {
	Execute(context.Context, model.Intent) (model.ActionResult, error)
}

type ConfirmationPolicy interface {
	RequiresConfirmation(model.Intent) bool
}

type VoiceInteraction struct {
	transcriber AudioTranscriber
	interpreter IntentInterpreter
	executor    ActionExecutor
	policy      ConfirmationPolicy
}

func NewVoiceInteraction(transcriber AudioTranscriber, interpreter IntentInterpreter, executor ActionExecutor, policy ConfirmationPolicy) VoiceInteraction {
	return VoiceInteraction{transcriber: transcriber, interpreter: interpreter, executor: executor, policy: policy}
}

func (useCase VoiceInteraction) Execute(ctx context.Context, input model.VoiceInput) (model.ActionResult, error) {
	if len(input.Audio) == 0 {
		return model.ActionResult{}, ErrEmptyAudio
	}
	transcript, err := useCase.transcriber.Transcribe(ctx, input)
	if err != nil {
		return model.ActionResult{Status: model.ActionUnavailable, Message: "La transcription vocale est indisponible."}, fmt.Errorf("transcribe audio: %w", err)
	}
	transcript = strings.TrimSpace(transcript)
	if transcript == "" {
		return model.ActionResult{}, ErrEmptyTranscript
	}
	intent, err := useCase.interpreter.Interpret(ctx, model.Interaction{Text: transcript, Source: "voice"})
	if err != nil {
		slog.Error("voice intent interpretation failed", "transcript_length", len(transcript), "error", err)
		return model.ActionResult{Status: model.ActionFailed, Message: "Je n’ai pas compris la demande."}, fmt.Errorf("interpret interaction: %w", err)
	}
	slog.Info("voice intent interpreted", "intent", intent.Name, "sensitive", intent.Sensitive, "parameter_names", parameterNames(intent.Parameters))
	if useCase.policy != nil && useCase.policy.RequiresConfirmation(intent) {
		return model.ActionResult{Status: model.ActionConfirmation, Message: "Cette action nécessite votre confirmation.", Intent: &intent}, nil
	}
	result, err := useCase.executor.Execute(ctx, intent)
	if err != nil {
		slog.Error("voice action execution failed", "intent", intent.Name, "status", result.Status, "error", err)
		return model.ActionResult{Status: model.ActionFailed, Message: "L’action n’a pas pu être exécutée.", Intent: &intent}, fmt.Errorf("execute intent %q: %w", intent.Name, err)
	}
	result.Intent = &intent
	return result, nil
}

func parameterNames(parameters map[string]any) []string {
	names := make([]string, 0, len(parameters))
	for name := range parameters {
		names = append(names, name)
	}
	return names
}

func (useCase VoiceInteraction) ExecuteTranscript(ctx context.Context, transcript string) (model.ActionResult, error) {
	transcript = strings.TrimSpace(transcript)
	if transcript == "" {
		return model.ActionResult{}, ErrEmptyTranscript
	}
	intent, err := useCase.interpreter.Interpret(ctx, model.Interaction{Text: transcript, Source: "voice"})
	if err != nil {
		return model.ActionResult{Status: model.ActionFailed, Message: "Je n’ai pas compris la demande."}, fmt.Errorf("interpret interaction: %w", err)
	}
	if useCase.policy != nil && useCase.policy.RequiresConfirmation(intent) {
		return model.ActionResult{Status: model.ActionConfirmation, Message: "Cette action nécessite votre confirmation.", Intent: &intent}, nil
	}
	result, err := useCase.executor.Execute(ctx, intent)
	if err != nil {
		return model.ActionResult{Status: model.ActionFailed, Message: "L’action n’a pas pu être exécutée.", Intent: &intent}, fmt.Errorf("execute intent %q: %w", intent.Name, err)
	}
	result.Intent = &intent
	return result, nil
}
