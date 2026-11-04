package application

import (
	"context"
	"github.com/clementortiz/home-ai/home-core/internal/assistant/model"
	workspace "github.com/clementortiz/home-ai/home-core/internal/workspace/model"
	"testing"
	"time"
)

type scriptedModel struct {
	turns []model.Content
	seen  [][]model.Content
}

func (m *scriptedModel) Generate(_ context.Context, messages []model.Content, _ []model.ToolDefinition) (model.Content, error) {
	m.seen = append(m.seen, messages)
	result := m.turns[0]
	m.turns = m.turns[1:]
	return result, nil
}

type fakeMail struct{ searches, reads int }

func (m *fakeMail) SearchMail(context.Context, string) ([]workspace.MailSummary, error) {
	m.searches++
	return []workspace.MailSummary{{ID: "abc", Subject: "Facture"}}, nil
}
func (m *fakeMail) ReadMail(context.Context, string) (workspace.MailMessage, error) {
	m.reads++
	return workspace.MailMessage{Body: "Montant : 42 euros"}, nil
}
func call(name, key, value string) model.Content {
	return model.Content{Role: "model", Parts: []model.Part{{FunctionCall: &model.ToolCall{Name: name, Args: map[string]any{key: value}}, ThoughtSignature: "signature"}}}
}
func TestToolConversationConfirmationAndRead(t *testing.T) {
	provider := &scriptedModel{turns: []model.Content{call("gmail_search", "query", "from:edf"), call("gmail_read", "id", "abc"), {Parts: []model.Part{{Text: "42 euros"}}}}}
	mail := &fakeMail{}
	agent := NewToolConversation(provider, mail)
	ctx := context.Background()
	first, err := agent.AnswerQuestion(ctx, model.Question{Text: "Lis la facture EDF"})
	if err != nil || first.Status != model.ActionConfirmation || mail.searches != 0 {
		t.Fatalf("first=%+v err=%v", first, err)
	}
	second, err := agent.AnswerQuestion(ctx, model.Question{ConfirmationID: first.ConfirmationID})
	if err != nil || second.Status != model.ActionConfirmation || mail.searches != 1 || mail.reads != 0 {
		t.Fatalf("second=%+v err=%v", second, err)
	}
	replay, _ := agent.AnswerQuestion(ctx, model.Question{ConfirmationID: first.ConfirmationID})
	if replay.Status != model.ActionRefused {
		t.Fatal("replay accepted")
	}
	answer, err := agent.AnswerQuestion(ctx, model.Question{ConfirmationID: second.ConfirmationID})
	if err != nil || answer.Text != "42 euros" || mail.reads != 1 {
		t.Fatalf("answer=%+v err=%v", answer, err)
	}
	if provider.seen[1][1].Parts[0].ThoughtSignature != "signature" || provider.seen[2][4].Parts[0].FunctionResponse.Name != "gmail_read" {
		t.Fatal("conversation lost")
	}
}
func TestToolConversationRejectsInvalidCalls(t *testing.T) {
	for _, response := range []model.Content{call("gmail_delete", "id", "abc"), call("gmail_read", "id", "invented"), call("gmail_search", "query", ""), {Parts: []model.Part{{FunctionCall: &model.ToolCall{Name: "gmail_search", Args: map[string]any{"query": "x"}}}, {FunctionCall: &model.ToolCall{Name: "gmail_search", Args: map[string]any{"query": "y"}}}}}} {
		agent := NewToolConversation(&scriptedModel{turns: []model.Content{response}}, &fakeMail{})
		answer, err := agent.AnswerQuestion(context.Background(), model.Question{Text: "test"})
		if err != nil || answer.Status != model.ActionRefused {
			t.Fatalf("answer=%+v err=%v", answer, err)
		}
	}
}
func TestToolConfirmationExpires(t *testing.T) {
	agent := NewToolConversation(&scriptedModel{turns: []model.Content{call("gmail_search", "query", "x")}}, &fakeMail{})
	answer, _ := agent.AnswerQuestion(context.Background(), model.Question{Text: "test"})
	p := agent.pending[answer.ConfirmationID]
	p.expires = time.Now().Add(-time.Minute)
	agent.pending[answer.ConfirmationID] = p
	answer, _ = agent.AnswerQuestion(context.Background(), model.Question{ConfirmationID: answer.ConfirmationID})
	if answer.Status != model.ActionRefused {
		t.Fatal("expired accepted")
	}
}
