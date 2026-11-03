package google

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/clementortiz/home-ai/home-core/internal/assistant/model"
)

func TestTranscriberSendsGoogleSpeechRequest(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.URL.Query().Get("key") != "secret" || request.URL.Path != "/v1/speech:recognize" {
			t.Fatalf("unexpected request: %s", request.URL.String())
		}
		var payload recognitionRequest
		if err := json.NewDecoder(request.Body).Decode(&payload); err != nil {
			t.Fatal(err)
		}
		decoded, _ := base64.StdEncoding.DecodeString(payload.Audio.Content)
		if string(decoded) != "audio" || payload.Config.Encoding != "WEBM_OPUS" || payload.Config.LanguageCode != "fr-FR" {
			t.Fatalf("unexpected payload: %#v", payload)
		}
		_, _ = writer.Write([]byte(`{"results":[{"alternatives":[{"transcript":"Qui est Napoléon ?"}]}]}`))
	}))
	defer server.Close()

	text, err := NewTranscriber(server.Client(), server.URL+"/v1/speech:recognize", "secret", "fr-FR").Transcribe(context.Background(), model.VoiceInput{Audio: []byte("audio")})
	if err != nil || text != "Qui est Napoléon ?" {
		t.Fatalf("text=%q err=%v", text, err)
	}
}
