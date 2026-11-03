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
	transcript, err := command.transcriber.Transcribe(ctx, input)
	if err != nil {
		return model.Answer{}, "", err
	}
	result, err := command.agent.ExecuteTranscript(ctx, transcript)
	if err != nil {
		return model.Answer{}, transcript, err
	}
	return model.Answer{Text: result.Message, Provider: "home-core", Model: "deterministic-tools", Generated: false}, transcript, nil
}
