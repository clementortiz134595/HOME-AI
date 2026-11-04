package gemini

import (
	"context"
	"encoding/json"
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
		if request.Header.Get("x-goog-api-key") != "secret" {
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

func TestClientToolProtocol(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var payload generateRequest
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatal(err)
		}
		if len(payload.Tools) != 1 || payload.Tools[0].FunctionDeclarations[0].Name != "gmail_search" {
			t.Fatalf("tools=%+v", payload.Tools)
		}
		if payload.Contents[1].Parts[0].ThoughtSignature != "opaque" || payload.Contents[2].Parts[0].FunctionResponse.Name != "gmail_search" {
			t.Fatal("tool history missing")
		}
		_, _ = w.Write([]byte(`{"candidates":[{"content":{"parts":[{"functionCall":{"name":"gmail_read","args":{"id":"abc"}},"thoughtSignature":"next"}]}}]}`))
	}))
	defer server.Close()
	client := NewClient(server.Client(), server.URL, "secret", "test")
	result, err := client.Generate(context.Background(), []model.Content{
		{Role: "user", Parts: []model.Part{{Text: "facture"}}},
		{Role: "model", Parts: []model.Part{{FunctionCall: &model.ToolCall{Name: "gmail_search", Args: map[string]any{"query": "facture"}}, ThoughtSignature: "opaque"}}},
		{Role: "user", Parts: []model.Part{{FunctionResponse: &model.ToolResponse{Name: "gmail_search", Response: map[string]any{"mails": []any{}}}}}},
	}, []model.ToolDefinition{{Name: "gmail_search"}})
	if err != nil || result.Parts[0].FunctionCall.Name != "gmail_read" || result.Parts[0].ThoughtSignature != "next" {
		t.Fatalf("result=%+v err=%v", result, err)
	}
}
