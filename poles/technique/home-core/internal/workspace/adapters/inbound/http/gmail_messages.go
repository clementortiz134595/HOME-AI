package workspacehttp

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"

	"github.com/clementortiz/home-ai/home-core/internal/workspace/model"
)

type GmailMessagesHandler struct {
	provider interface {
		SearchMail(rctx context.Context, query string) ([]model.MailSummary, error)
		ReadMail(rctx context.Context, id string) (model.MailMessage, error)
		ReadMailAttachment(rctx context.Context, messageID, attachmentID string) ([]byte, error)
	}
}

func NewGmailMessagesHandler(provider interface {
	SearchMail(context.Context, string) ([]model.MailSummary, error)
	ReadMail(context.Context, string) (model.MailMessage, error)
	ReadMailAttachment(context.Context, string, string) ([]byte, error)
}) *GmailMessagesHandler {
	return &GmailMessagesHandler{provider: provider}
}

func (handler *GmailMessagesHandler) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		http.NotFound(writer, request)
		return
	}
	if content, mimeType, ok := handler.attachment(request); ok {
		writer.Header().Set("Content-Type", mimeType)
		writer.Header().Set("Content-Disposition", "inline")
		_, _ = writer.Write(content)
		return
	}
	if request.URL.Path != "/v1/workspace/google/gmail/messages" {
		http.NotFound(writer, request)
		return
	}
	query := request.URL.Query().Get("q")
	if query == "" {
		query = "newer_than:30d"
	}
	summaries, err := handler.provider.SearchMail(request.Context(), query)
	if err != nil {
		writer.Header().Set("Content-Type", "application/json")
		writer.WriteHeader(http.StatusBadGateway)
		_ = json.NewEncoder(writer).Encode(map[string]string{"error": "gmail_unavailable"})
		return
	}
	// Speech-to-text and contact names often differ by one character from the
	// sender header (for example Tejirian/Tedjirian). When a plain multi-word
	// query yields nothing, retry its first name token so the caller still gets
	// the whole conversation rather than unrelated recent mail.
	if len(summaries) == 0 && !strings.ContainsAny(query, ":{}()") {
		parts := strings.Fields(query)
		if len(parts) > 1 && len([]rune(parts[0])) > 2 {
			summaries, err = handler.provider.SearchMail(request.Context(), parts[0])
			if err != nil {
				writer.Header().Set("Content-Type", "application/json")
				writer.WriteHeader(http.StatusBadGateway)
				_ = json.NewEncoder(writer).Encode(map[string]string{"error": "gmail_unavailable"})
				return
			}
		}
	}
	messages := make([]model.MailMessage, 0, len(summaries))
	for _, summary := range summaries {
		message, readErr := handler.provider.ReadMail(request.Context(), summary.ID)
		if readErr != nil {
			continue
		}
		messages = append(messages, message)
	}
	writer.Header().Set("Content-Type", "application/json")
	writer.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(writer).Encode(map[string]any{"messages": messages})
}

func (handler *GmailMessagesHandler) attachment(request *http.Request) ([]byte, string, bool) {
	parts := strings.Split(strings.TrimPrefix(request.URL.Path, "/v1/workspace/google/gmail/messages/"), "/")
	if len(parts) != 3 || parts[1] != "attachments" || parts[0] == "" || parts[2] == "" {
		return nil, "", false
	}
	content, err := handler.provider.ReadMailAttachment(request.Context(), parts[0], parts[2])
	if err != nil {
		slog.Warn("gmail attachment content unavailable", "error", err)
		return nil, "", false
	}
	mimeType := request.URL.Query().Get("mime")
	if !strings.Contains(mimeType, "/") {
		mimeType = "application/octet-stream"
	}
	return content, mimeType, true
}
