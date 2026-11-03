package gemini

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/clementortiz/home-ai/home-core/internal/assistant/model"
)

func TestClientAnswersQuestion(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.URL.Path != "/v1beta/models/gemini-test:generateContent" {
			t.Fatalf("path = %q", request.URL.Path)
		}
		if request.URL.Query().Get("key") != "secret" {
			t.Fatalf("missing API key")
		}
		writer.Header().Set("Content-Type", "application/json")
		_, _ = writer.Write([]byte(`{"candidates":[{"content":{"role":"model","parts":[{"text":"Napoléon Bonaparte était..."}]}}]}`))
	}))
	defer server.Close()

	answer, err := NewClient(server.Client(), server.URL+"/v1beta", "secret", "gemini-test").AnswerQuestion(context.Background(), model.Question{Text: "Qui est Napoléon Bonaparte ?"})
	if err != nil || answer.Text == "" || answer.Provider != "gemini" {
		t.Fatalf("answer=%#v err=%v", answer, err)
	}
}
