package application

import (
	"context"
	"fmt"
	"strings"

	"github.com/clementortiz/home-ai/home-core/internal/assistant/model"
	workspacemodel "github.com/clementortiz/home-ai/home-core/internal/workspace/model"
)

type MailSearcher interface {
	SearchMail(context.Context, string) ([]workspacemodel.MailSummary, error)
}

type GmailSearchTool struct{ searcher MailSearcher }

func NewGmailSearchTool(searcher MailSearcher) GmailSearchTool {
	return GmailSearchTool{searcher: searcher}
}

func (tool GmailSearchTool) Execute(ctx context.Context, intent model.Intent) (model.ActionResult, error) {
	query, _ := intent.Parameters["query"].(string)
	query = strings.TrimSpace(query)
	if query == "" {
		query = "newer_than:30d"
	}
	results, err := tool.searcher.SearchMail(ctx, query)
	if err != nil {
		return model.ActionResult{Status: model.ActionUnavailable, Message: "Gmail est indisponible ou non connecté."}, err
	}
	if len(results) == 0 {
		return model.ActionResult{Status: model.ActionExecuted, Message: "Je n’ai trouvé aucun mail correspondant."}, nil
	}
	message := fmt.Sprintf("J’ai trouvé %d mail(s). ", len(results))
	for index, mail := range results {
		if index == 3 {
			break
		}
		message += fmt.Sprintf("%s : %s. ", mail.From, mail.Subject)
	}
	return model.ActionResult{Status: model.ActionExecuted, Message: message}, nil
}
