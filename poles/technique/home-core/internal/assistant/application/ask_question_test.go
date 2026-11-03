package application

import (
	"context"
	"errors"
	"testing"

	"github.com/clementortiz/home-ai/home-core/internal/assistant/model"
)

type fakeAnswerer struct {
	answer   model.Answer
	err      error
	question model.Question
}

func (fake *fakeAnswerer) AnswerQuestion(_ context.Context, question model.Question) (model.Answer, error) {
	fake.question = question
	return fake.answer, fake.err
}

func TestAskQuestionTrimsAndDelegates(t *testing.T) {
	answerer := &fakeAnswerer{answer: model.Answer{Text: "Napoléon Bonaparte..."}}
	answer, err := NewAskQuestion(answerer).Execute(context.Background(), model.Question{Text: "  Qui est Napoléon Bonaparte ?  "})
	if err != nil || answer.Text == "" || answerer.question.Text != "Qui est Napoléon Bonaparte ?" {
		t.Fatalf("answer=%#v question=%#v err=%v", answer, answerer.question, err)
	}
}

func TestAskQuestionRejectsEmptyQuestion(t *testing.T) {
	_, err := NewAskQuestion(&fakeAnswerer{}).Execute(context.Background(), model.Question{Text: "  "})
	if !errors.Is(err, ErrEmptyQuestion) {
		t.Fatalf("error = %v", err)
	}
}
