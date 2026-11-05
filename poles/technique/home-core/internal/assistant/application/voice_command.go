package application

import (
	"context"
	"log/slog"
	"strings"
	"time"

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
	started := time.Now()
	slog.Info("voice stage starting", "stage", "transcription", "audio_bytes", len(input.Audio), "content_type", input.ContentType)
	transcript, err := command.transcriber.Transcribe(ctx, input)
	if err != nil {
		slog.Error("voice stage failed", "stage", "transcription", "duration_ms", time.Since(started).Milliseconds(), "error", err)
		return model.Answer{}, "", err
	}
	slog.Info("voice stage completed", "stage", "transcription", "duration_ms", time.Since(started).Milliseconds(), "transcript_length", len(transcript))
	if progress != nil {
		progress("thinking", transcript)
	}
	interpretStarted := time.Now()
	slog.Info("voice stage starting", "stage", "interpretation", "transcript_length", len(transcript))
	result, err := command.agent.ExecuteTranscript(ctx, transcript)
	if err != nil {
		slog.Error("voice stage failed", "stage", "interpretation_or_execution", "duration_ms", time.Since(interpretStarted).Milliseconds(), "error", err)
		return model.Answer{}, transcript, err
	}
	slog.Info("voice stage completed", "stage", "interpretation_or_execution", "duration_ms", time.Since(interpretStarted).Milliseconds(), "status", result.Status, "intent", intentName(result.Intent))
	if result.Answer != nil {
		answer := *result.Answer
		answer.ContinueConversation = answer.ConfirmationID != "" || strings.HasSuffix(strings.TrimSpace(answer.Text), "?")
		return answer, transcript, nil
	}
	return model.Answer{Text: result.Message, Provider: "home-core", Model: "deterministic-tools", Generated: false, ContinueConversation: result.Status == model.ActionConfirmation || strings.HasSuffix(strings.TrimSpace(result.Message), "?")}, transcript, nil
}

func intentName(intent *model.Intent) string {
	if intent == nil {
		return ""
	}
	return intent.Name
}
