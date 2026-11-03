package assistanthttp

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/clementortiz/home-ai/home-core/internal/assistant/application"
	"github.com/clementortiz/home-ai/home-core/internal/assistant/model"
)

type stubAnswerer struct{}

func (stubAnswerer) AnswerQuestion(context.Context, model.Question) (model.Answer, error) {
	return model.Answer{Text: "Réponse"}, nil
}

func TestHandlerAnswersQuestion(t *testing.T) {
	handler := NewHandler(application.NewAskQuestion(stubAnswerer{}))
	request := httptest.NewRequest(http.MethodPost, "/v1/assistant/questions", strings.NewReader(`{"text":"Qui est Napoléon Bonaparte ?"}`))
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d", response.Code)
	}
}

func TestHandlerRejectsMalformedQuestion(t *testing.T) {
	handler := NewHandler(application.NewAskQuestion(stubAnswerer{}))
	request := httptest.NewRequest(http.MethodPost, "/v1/assistant/questions", strings.NewReader(`{"question":"x"}`))
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusBadRequest {
		t.Fatalf("status = %d", response.Code)
	}
}
