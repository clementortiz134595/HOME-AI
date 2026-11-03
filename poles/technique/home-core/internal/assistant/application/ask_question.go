package application

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/clementortiz/home-ai/home-core/internal/assistant/model"
)

var (
	ErrEmptyQuestion = errors.New("assistant question is empty")
	ErrUnavailable   = errors.New("assistant provider unavailable")
)

type QuestionAnswerer interface {
	AnswerQuestion(context.Context, model.Question) (model.Answer, error)
}

type AskQuestion struct {
	answerer QuestionAnswerer
}

func NewAskQuestion(answerer QuestionAnswerer) AskQuestion {
	return AskQuestion{answerer: answerer}
}

func (useCase AskQuestion) Execute(ctx context.Context, question model.Question) (model.Answer, error) {
	question.Text = strings.TrimSpace(question.Text)
	if question.Text == "" {
		return model.Answer{}, ErrEmptyQuestion
	}
	return useCase.answerer.AnswerQuestion(ctx, question)
}

// AskTranscribedQuestion turns a voice transcript into the same question flow
// as the text endpoint. This keeps provider and policy handling in one place.
type AskTranscribedQuestion struct {
	transcriber AudioTranscriber
	ask         AskQuestion
}

func NewAskTranscribedQuestion(transcriber AudioTranscriber, answerer QuestionAnswerer) AskTranscribedQuestion {
	return AskTranscribedQuestion{transcriber: transcriber, ask: NewAskQuestion(answerer)}
}

func (useCase AskTranscribedQuestion) Execute(ctx context.Context, input model.VoiceInput) (model.Answer, string, error) {
	if len(input.Audio) == 0 {
		return model.Answer{}, "", ErrEmptyAudio
	}
	transcript, err := useCase.transcriber.Transcribe(ctx, input)
	if err != nil {
		return model.Answer{}, "", fmt.Errorf("transcribe audio: %w", err)
	}
	transcript = strings.TrimSpace(transcript)
	if transcript == "" {
		return model.Answer{}, "", ErrEmptyTranscript
	}
	answer, err := useCase.ask.Execute(ctx, model.Question{Text: transcript})
	return answer, transcript, err
}
