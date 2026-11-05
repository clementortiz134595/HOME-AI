package application

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"

	"github.com/clementortiz/home-ai/home-core/internal/assistant/model"
	workspace "github.com/clementortiz/home-ai/home-core/internal/workspace/model"
)

type ToolModel interface {
	Generate(context.Context, []model.Content, []model.ToolDefinition) (model.Content, error)
}
type MailReader interface {
	MailSearcher
	ReadMail(context.Context, string) (workspace.MailMessage, error)
}
type DriveReader interface {
	SearchDrive(context.Context, string) ([]workspace.DriveFile, error)
	ReadDriveFile(context.Context, string) (workspace.TextDocument, error)
}
type pendingCall struct {
	messages []model.Content
	call     model.ToolCall
	expires  time.Time
	steps    int
}
type ToolConversation struct {
	provider ToolModel
	mail     MailReader
	drive    DriveReader
	mu       sync.Mutex
	pending  map[string]pendingCall
	trusted  map[string]bool
}

func NewToolConversation(provider ToolModel, mail MailReader, drives ...DriveReader) *ToolConversation {
	var drive DriveReader
	if len(drives) > 0 {
		drive = drives[0]
	}
	trusted := map[string]bool{}
	// Workspace access is an explicit product capability. OAuth already gates
	// the account, so Gmail/Drive tool calls do not interrupt every request.
	if mail != nil {
		trusted["gmail_search"], trusted["gmail_read"] = true, true
	}
	if drive != nil {
		trusted["drive_search"], trusted["drive_read"] = true, true
	}
	return &ToolConversation{provider: provider, mail: mail, drive: drive, pending: map[string]pendingCall{}, trusted: trusted}
}
func (agent *ToolConversation) definitions(question string) []model.ToolDefinition {
	schema := func(key string) map[string]any {
		return map[string]any{"type": "OBJECT", "properties": map[string]any{key: map[string]any{"type": "STRING"}}, "required": []string{key}}
	}
	definitions := make([]model.ToolDefinition, 0, 4)
	if agent.mail != nil && mentionsMail(question) {
		definitions = append(definitions,
			model.ToolDefinition{Name: "gmail_search", Description: "Recherche les mails avec une requête Gmail. Renvoie les identifiants, expéditeurs et objets.", Parameters: schema("query")},
			model.ToolDefinition{Name: "gmail_read", Description: "Lit le contenu d’un mail à partir d’un identifiant retourné par gmail_search.", Parameters: schema("id")},
		)
	}
	if agent.drive != nil && mentionsDrive(question) {
		definitions = append(definitions, model.ToolDefinition{Name: "drive_search", Description: "Recherche les fichiers Google Drive par nom.", Parameters: schema("query")}, model.ToolDefinition{Name: "drive_read", Description: "Lit le contenu texte d’un fichier Google Drive trouvé précédemment.", Parameters: schema("id")})
	}
	return definitions
}

func mentionsMail(question string) bool {
	text := strings.ToLower(question)
	return strings.Contains(text, "mail") || strings.Contains(text, "gmail") || strings.Contains(text, "courriel") || strings.Contains(text, "email") || strings.Contains(text, "e-mail")
}

func mentionsDrive(question string) bool {
	text := strings.ToLower(question)
	return strings.Contains(text, "drive") || strings.Contains(text, "document") || strings.Contains(text, "fichier")
}

func (agent *ToolConversation) allowsTool(question, name string) bool {
	for _, definition := range agent.definitions(question) {
		if definition.Name == name {
			return true
		}
	}
	return false
}
func (agent *ToolConversation) AnswerQuestion(ctx context.Context, question model.Question) (model.Answer, error) {
	messages := []model.Content{{Role: "user", Parts: []model.Part{{Text: question.Text}}}}
	steps := 0
	gmailQuery := ""
	if question.ConfirmationID != "" {
		agent.mu.Lock()
		pending, ok := agent.pending[question.ConfirmationID]
		delete(agent.pending, question.ConfirmationID)
		agent.mu.Unlock()
		if !ok || time.Now().After(pending.expires) {
			return model.Answer{Text: "Cette confirmation a expiré ou a déjà été utilisée.", Status: model.ActionRefused}, nil
		}
		result, err := agent.execute(ctx, pending.call)
		if err != nil {
			slog.Warn("workspace tool execution failed", "tool", pending.call.Name, "error", err)
			return model.Answer{Text: "L’accès à la source demandée a échoué. Vous pouvez relancer la demande.", Status: model.ActionUnavailable}, nil
		}
		if question.RememberSession {
			agent.mu.Lock()
			agent.trusted[pending.call.Name] = true
			if strings.HasPrefix(pending.call.Name, "gmail_") {
				agent.trusted["gmail_search"] = true
				agent.trusted["gmail_read"] = true
			}
			if strings.HasPrefix(pending.call.Name, "drive_") {
				agent.trusted["drive_search"] = true
				agent.trusted["drive_read"] = true
			}
			agent.mu.Unlock()
		}
		messages = append(pending.messages, model.Content{Role: "user", Parts: []model.Part{{FunctionResponse: &model.ToolResponse{Name: pending.call.Name, Response: result}}}})
		steps = pending.steps
	}
	if steps > 6 {
		return model.Answer{Text: "La limite d’appels est atteinte. Précisez votre demande.", Status: model.ActionRefused}, nil
	}
	response, err := agent.provider.Generate(ctx, messages, agent.definitions(question.Text))
	if err != nil {
		return model.Answer{}, err
	}
	messages = append(messages, response)
	var calls []model.ToolCall
	var answer strings.Builder
	for _, part := range response.Parts {
		if part.FunctionCall != nil {
			call := *part.FunctionCall
			call.Name = normalizeToolName(call.Name)
			calls = append(calls, call)
		}
		if !part.Thought {
			answer.WriteString(part.Text)
		}
	}
	if len(calls) == 0 {
		if strings.TrimSpace(answer.String()) == "" {
			return model.Answer{}, ErrUnavailable
		}
		return model.Answer{Text: answer.String(), Provider: "gemini", Generated: true, Status: model.ActionExecuted}, nil
	}
	// A single approval never authorizes additional parallel calls.
	if steps >= 6 || len(calls) != 1 || !agent.allowsTool(question.Text, calls[0].Name) || agent.validate(calls[0], messages[:len(messages)-1]) != nil {
		if len(calls) == 1 {
			slog.Warn("assistant tool call rejected", "tool", calls[0].Name, "argument_count", len(calls[0].Args), "argument_names", toolArgumentNames(calls[0]))
		} else {
			slog.Warn("assistant tool calls rejected", "call_count", len(calls), "step", steps)
		}
		return model.Answer{Text: "L’appel proposé n’est pas autorisé. Reformulez votre demande.", Status: model.ActionRefused}, nil
	}
	agent.mu.Lock()
	trusted := agent.trusted[calls[0].Name]
	agent.mu.Unlock()
	for trusted {
		if calls[0].Name == "gmail_search" {
			gmailQuery, _ = calls[0].Args["query"].(string)
		}
		result, err := agent.execute(ctx, calls[0])
		if err != nil {
			return model.Answer{Text: "L’accès à cette source a échoué. Vous pouvez relancer la demande.", Status: model.ActionUnavailable}, nil
		}
		messages = append(messages, model.Content{Role: "user", Parts: []model.Part{{FunctionResponse: &model.ToolResponse{Name: calls[0].Name, Response: result}}}})
		response, err = agent.provider.Generate(ctx, messages, agent.definitions(question.Text))
		if err != nil {
			return model.Answer{}, err
		}
		messages = append(messages, response)
		answer.Reset()
		calls = nil
		for _, part := range response.Parts {
			if part.FunctionCall != nil {
				calls = append(calls, *part.FunctionCall)
			}
			if !part.Thought {
				answer.WriteString(part.Text)
			}
		}
		if len(calls) != 1 {
			if len(calls) == 0 && strings.TrimSpace(answer.String()) != "" {
				return model.Answer{Text: answer.String(), Provider: "gemini", Generated: true, Status: model.ActionExecuted, GmailQuery: gmailQuery}, nil
			}
			break
		}
		if !agent.allowsTool(question.Text, calls[0].Name) || agent.validate(calls[0], messages[:len(messages)-1]) != nil {
			break
		}
		agent.mu.Lock()
		trusted = agent.trusted[calls[0].Name]
		agent.mu.Unlock()
		if strings.TrimSpace(answer.String()) != "" {
			return model.Answer{Text: answer.String(), Provider: "gemini", Generated: true, Status: model.ActionExecuted, GmailQuery: gmailQuery}, nil
		}
	}
	token := make([]byte, 32)
	if _, err := rand.Read(token); err != nil {
		return model.Answer{}, err
	}
	id := hex.EncodeToString(token)
	agent.mu.Lock()
	defer agent.mu.Unlock()
	for key, p := range agent.pending {
		if time.Now().After(p.expires) {
			delete(agent.pending, key)
		}
	}
	if len(agent.pending) >= 100 {
		return model.Answer{}, ErrUnavailable
	}
	agent.pending[id] = pendingCall{messages: messages, call: calls[0], expires: time.Now().Add(5 * time.Minute), steps: steps + 1}
	time.AfterFunc(5*time.Minute, func() {
		agent.mu.Lock()
		delete(agent.pending, id)
		agent.mu.Unlock()
	})
	description := fmt.Sprintf("la recherche de mails « %s »", calls[0].Args["query"])
	if strings.HasPrefix(calls[0].Name, "drive_") {
		description = fmt.Sprintf("la recherche de fichiers Drive « %s »", calls[0].Args["query"])
	}
	if calls[0].Name == "gmail_read" {
		description = "la lecture du mail sélectionné"
	}
	if calls[0].Name == "drive_read" {
		description = "la lecture du fichier Drive sélectionné"
	}
	return model.Answer{Text: fmt.Sprintf("Confirmez %s. Le résultat sera envoyé à Gemini pour répondre à votre demande.", description), Status: model.ActionConfirmation, ConfirmationID: id, Provider: "home-core"}, nil
}

func toolArgumentNames(call model.ToolCall) []string {
	names := make([]string, 0, len(call.Args))
	for name := range call.Args {
		names = append(names, name)
	}
	return names
}

func normalizeToolName(name string) string {
	switch name {
	case "gmail.search":
		return "gmail_search"
	case "gmail.read":
		return "gmail_read"
	case "drive.search":
		return "drive_search"
	case "drive.read":
		return "drive_read"
	default:
		return name
	}
}

func (agent *ToolConversation) validate(call model.ToolCall, history []model.Content) error {
	if (agent.mail == nil && agent.drive == nil) || len(call.Args) != 1 {
		return ErrUnsupportedIntent
	}
	key := "query"
	if call.Name == "gmail_read" {
		key = "id"
	} else if call.Name == "drive_read" {
		key = "id"
	} else if call.Name != "gmail_search" && call.Name != "drive_search" {
		return ErrUnsupportedIntent
	}
	if strings.HasPrefix(call.Name, "gmail_") && agent.mail == nil || strings.HasPrefix(call.Name, "drive_") && agent.drive == nil {
		return ErrUnsupportedIntent
	}
	value, ok := call.Args[key].(string)
	if !ok || strings.TrimSpace(value) == "" || len(value) > 1024 {
		return ErrUnsupportedIntent
	}
	if key == "id" {
		found := false
		for _, message := range history {
			for _, p := range message.Parts {
				if p.FunctionResponse != nil && p.FunctionResponse.Name == "gmail_search" {
					if mails, ok := p.FunctionResponse.Response["mails"].([]workspace.MailSummary); ok {
						for _, mail := range mails {
							if mail.ID == value {
								found = true
							}
						}
					}
					if p.FunctionResponse != nil && p.FunctionResponse.Name == "drive_search" {
						if files, ok := p.FunctionResponse.Response["files"].([]workspace.DriveFile); ok {
							for _, file := range files {
								if file.ID == value {
									found = true
								}
							}
						}
					}
				}
			}
		}
		if !found {
			return ErrUnsupportedIntent
		}
	}
	return nil
}
func (agent *ToolConversation) execute(ctx context.Context, call model.ToolCall) (map[string]any, error) {
	switch call.Name {
	case "gmail_search":
		mails, err := agent.mail.SearchMail(ctx, call.Args["query"].(string))
		if len(mails) > 10 {
			mails = mails[:10]
		}
		return map[string]any{"mails": mails}, err
	case "gmail_read":
		mail, err := agent.mail.ReadMail(ctx, call.Args["id"].(string))
		if len(mail.Body) > 32000 {
			mail.Body = string([]rune(mail.Body)[:min(8000, len([]rune(mail.Body)))])
		}
		return map[string]any{"mail": mail}, err
	case "drive_search":
		files, err := agent.drive.SearchDrive(ctx, call.Args["query"].(string))
		if len(files) > 10 {
			files = files[:10]
		}
		return map[string]any{"files": files}, err
	case "drive_read":
		file, err := agent.drive.ReadDriveFile(ctx, call.Args["id"].(string))
		if len(file.Content) > 32000 {
			file.Content = string([]rune(file.Content)[:8000])
		}
		return map[string]any{"file": file}, err
	}
	return nil, ErrUnsupportedIntent
}
