package application

import (
	"context"

	"github.com/clementortiz/home-ai/home-core/internal/assistant/model"
)

type VoiceCommand struct {
	transcriber AudioTranscriber
	agent       VoiceInteraction
}

func NewVoiceCommand(transcriber AudioTranscriber, agent VoiceInteraction) VoiceCommand {
	return VoiceCommand{transcriber: transcriber, agent: agent}
}

func (command VoiceCommand) Execute(ctx context.Context, input model.VoiceInput) (model.Answer, string, error) {
	return command.ExecuteWithProgress(ctx, input, nil)
}

// ExecuteWithProgress exposes pipeline stages to the HTTP adapter without
// coupling the voice use case to transport concerns.
func (command VoiceCommand) ExecuteWithProgress(ctx context.Context, input model.VoiceInput, progress func(string, string)) (model.Answer, string, error) {
	transcript, err := command.transcriber.Transcribe(ctx, input)
	if err != nil {
		return model.Answer{}, "", err
	}
	if progress != nil {
		progress("thinking", transcript)
	}
	result, err := command.agent.ExecuteTranscript(ctx, transcript)
	if err != nil {
		return model.Answer{}, transcript, err
	}
	if result.Answer != nil {
		return *result.Answer, transcript, nil
	}
	return model.Answer{Text: result.Message, Provider: "home-core", Model: "deterministic-tools", Generated: false}, transcript, nil
}
