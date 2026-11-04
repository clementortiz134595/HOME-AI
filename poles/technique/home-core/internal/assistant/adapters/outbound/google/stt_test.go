package google

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"golang.org/x/oauth2"

	"github.com/clementortiz/home-ai/home-core/internal/assistant/model"
)

func TestTranscriberSendsGoogleSpeechRequest(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.URL.Query().Get("key") != "" || request.URL.Path != "/v2/projects/project/locations/global/recognizers/_:recognize" || request.Header.Get("Authorization") != "Bearer test-token" {
			t.Fatalf("unexpected request: %s", request.URL.String())
		}
		var payload recognitionRequest
		if err := json.NewDecoder(request.Body).Decode(&payload); err != nil {
			t.Fatal(err)
		}
		decoded, _ := base64.StdEncoding.DecodeString(payload.Content)
		if string(decoded) != "audio" || payload.Config.Model != "chirp_3" || payload.Config.LanguageCodes[0] != "fr-FR" {
			t.Fatalf("unexpected payload: %#v", payload)
		}
		_, _ = writer.Write([]byte(`{"results":[{"alternatives":[{"transcript":"Qui est Napoléon ?"}]}]}`))
	}))
	defer server.Close()

	transcriber := NewTranscriber(server.Client(), server.URL+"/v2/projects", "secret", "fr-FR", "project", "global")
	transcriber.tokenSource = oauth2.StaticTokenSource(&oauth2.Token{AccessToken: "test-token"})
	text, err := transcriber.Transcribe(context.Background(), model.VoiceInput{Audio: []byte("audio")})
	if err != nil || text != "Qui est Napoléon ?" {
		t.Fatalf("text=%q err=%v", text, err)
	}
}
