package application

import (
	"context"
	"errors"
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
