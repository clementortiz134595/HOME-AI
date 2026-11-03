package workspacehttp

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"

	"github.com/clementortiz/home-ai/home-core/internal/workspace/adapters/outbound/gmail"
)

type GmailOAuthHandler struct {
	client *gmail.Client
	state  string
}

func NewGmailOAuthHandler(client *gmail.Client) *GmailOAuthHandler {
	stateBytes := make([]byte, 24)
	_, _ = rand.Read(stateBytes)
	return &GmailOAuthHandler{client: client, state: hex.EncodeToString(stateBytes)}
}

func (handler *GmailOAuthHandler) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	switch {
	case request.Method == http.MethodGet && request.URL.Path == "/v1/workspace/google/gmail/oauth/connect":
		http.Redirect(writer, request, handler.client.AuthorizationURL(handler.state), http.StatusFound)
	case request.Method == http.MethodGet && request.URL.Path == "/v1/workspace/google/gmail/oauth/callback":
		if request.URL.Query().Get("state") != handler.state {
			http.Error(writer, "invalid oauth state", http.StatusBadRequest)
			return
		}
		if err := handler.client.Exchange(request.Context(), request.URL.Query().Get("code")); err != nil {
			http.Error(writer, "oauth exchange failed", http.StatusBadGateway)
			return
		}
		writer.WriteHeader(http.StatusOK)
		_, _ = writer.Write([]byte("Gmail connecté à Home Core. Vous pouvez fermer cette page."))
	default:
		http.NotFound(writer, request)
	}
}
