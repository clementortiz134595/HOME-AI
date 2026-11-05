package application

import (
	"context"
	"github.com/clementortiz/home-ai/home-core/internal/assistant/model"
	workspace "github.com/clementortiz/home-ai/home-core/internal/workspace/model"
	"testing"
)

type scriptedModel struct {
	turns []model.Content
	seen  [][]model.Content
	tools [][]model.ToolDefinition
}

func (m *scriptedModel) Generate(_ context.Context, messages []model.Content, definitions []model.ToolDefinition) (model.Content, error) {
	m.seen = append(m.seen, messages)
	m.tools = append(m.tools, definitions)
	result := m.turns[0]
	m.turns = m.turns[1:]
	return result, nil
}

type fakeMail struct{ searches, reads int }

type fakeDrive struct{ searches, reads int }

func (d *fakeDrive) SearchDrive(context.Context, string) ([]workspace.DriveFile, error) {
	d.searches++
	return []workspace.DriveFile{{ID: "file-1", Name: "Assurance habitation"}}, nil
}
func (d *fakeDrive) ReadDriveFile(context.Context, string) (workspace.TextDocument, error) {
	d.reads++
	return workspace.TextDocument{Content: "Contrat habitation"}, nil
}

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
func TestToolConversationAutoApprovesWorkspaceAndReads(t *testing.T) {
	provider := &scriptedModel{turns: []model.Content{call("gmail_search", "query", "from:edf"), call("gmail_read", "id", "abc"), {Parts: []model.Part{{Text: "42 euros"}}}}}
	mail := &fakeMail{}
	agent := NewToolConversation(provider, mail)
	ctx := context.Background()
	first, err := agent.AnswerQuestion(ctx, model.Question{Text: "Lis le mail de facture EDF"})
	if err != nil || first.Text != "42 euros" || first.Status != model.ActionExecuted || mail.searches != 1 || mail.reads != 1 {
		t.Fatalf("first=%+v err=%v", first, err)
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
func TestToolConversationAutoApprovesDrive(t *testing.T) {
	drive := &fakeDrive{}
	provider := &scriptedModel{turns: []model.Content{call("drive_search", "query", "assurance"), {Parts: []model.Part{{Text: "Le document est trouvé."}}}}}
	agent := NewToolConversation(provider, nil, drive)
	first, err := agent.AnswerQuestion(context.Background(), model.Question{Text: "Trouve le document d’assurance dans Drive"})
	if err != nil || first.Text != "Le document est trouvé." || first.Status != model.ActionExecuted || drive.searches != 1 {
		t.Fatalf("first=%+v err=%v", first, err)
	}
}

func TestToolConversationDoesNotExposeWorkspaceForNews(t *testing.T) {
	provider := &scriptedModel{turns: []model.Content{{Parts: []model.Part{{Text: "Je ne peux pas consulter les actualités en direct."}}}}}
	agent := NewToolConversation(provider, &fakeMail{}, &fakeDrive{})
	answer, err := agent.AnswerQuestion(context.Background(), model.Question{Text: "Quelles sont les actualités aux États-Unis ?"})
	if err != nil || answer.Status != model.ActionExecuted {
		t.Fatalf("answer=%+v err=%v", answer, err)
	}
	if len(provider.tools) != 1 || len(provider.tools[0]) != 0 {
		t.Fatalf("workspace tools must not be available for news: %+v", provider.tools)
	}
}

func TestMergedRouterKeepsHouseholdToolsAndDelegatesGmail(t *testing.T) {
	for _, name := range []string{"chores.create", "reminders.create", "gmail.search"} {
		router := modelToolInterpreter{fallback: fakeInterpreter{intent: model.Intent{Name: name}}}
		intent, err := router.Interpret(context.Background(), model.Interaction{Text: "ma demande"})
		if err != nil {
			t.Fatal(err)
		}
		expected := name
		if name == "gmail.search" {
			expected = "assistant.question"
		}
		if intent.Name != expected {
			t.Fatalf("%s became %s", name, intent.Name)
		}
	}
}

func TestMergedRouterDelegatesDrive(t *testing.T) {
	router := modelToolInterpreter{fallback: fakeInterpreter{intent: model.Intent{Name: "drive.search"}}}
	intent, err := router.Interpret(context.Background(), model.Interaction{Text: "ma demande"})
	if err != nil || intent.Name != "assistant.question" || intent.Parameters["text"] != "ma demande" {
		t.Fatalf("drive intent was not delegated: %+v err=%v", intent, err)
	}
}

func TestNormalizeToolNameAcceptsIntentAliases(t *testing.T) {
	for input, expected := range map[string]string{
		"gmail.search": "gmail_search",
		"gmail.read":   "gmail_read",
		"drive.search": "drive_search",
		"drive.read":   "drive_read",
		"drive_search": "drive_search",
	} {
		if got := normalizeToolName(input); got != expected {
			t.Fatalf("%s normalized to %s, expected %s", input, got, expected)
		}
	}
}
