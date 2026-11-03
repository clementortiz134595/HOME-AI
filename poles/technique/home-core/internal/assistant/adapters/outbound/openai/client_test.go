package openai

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/clementortiz/home-ai/home-core/internal/assistant/model"
)

func TestClientAnswersQuestionWithoutLeakingCredentials(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.URL.Path != "/v1/chat/completions" || request.Header.Get("Authorization") != "Bearer secret" {
			t.Fatalf("unexpected request: %s %s", request.URL.Path, request.Header.Get("Authorization"))
		}
		writer.Header().Set("Content-Type", "application/json")
		_, _ = writer.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"Napoléon Bonaparte était..."}}]}`))
	}))
	defer server.Close()

	answer, err := NewClient(server.Client(), server.URL+"/v1", "secret", "test-model").AnswerQuestion(context.Background(), model.Question{Text: "Qui est Napoléon Bonaparte ?"})
	if err != nil || answer.Text == "" || answer.Provider != "openai" {
		t.Fatalf("answer=%#v err=%v", answer, err)
	}
}
