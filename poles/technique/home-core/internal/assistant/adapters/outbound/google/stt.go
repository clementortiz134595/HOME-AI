package google

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"golang.org/x/oauth2"
	googleauth "golang.org/x/oauth2/google"

	"github.com/clementortiz/home-ai/home-core/internal/assistant/model"
)

// Transcriber uses Google Cloud Speech-to-Text synchronous recognition.
// Credentials stay in Home Core and the audio is sent only after capture ends.
type Transcriber struct {
	httpClient  *http.Client
	baseURL     string
	apiKey      string
	language    string
	project     string
	location    string
	tokenSource oauth2.TokenSource
}

func NewTranscriber(httpClient *http.Client, baseURL, apiKey, language, project, location string) *Transcriber {
	if baseURL == "" {
		baseURL = "https://speech.googleapis.com/v2/projects"
	}
	if language == "" {
		language = "fr-FR"
	}
	if location == "" {
		location = "global"
	}
	var tokenSource oauth2.TokenSource
	if credentials, err := googleauth.FindDefaultCredentials(context.Background(), "https://www.googleapis.com/auth/cloud-platform"); err == nil {
		tokenSource = credentials.TokenSource
	}
	return &Transcriber{httpClient: httpClient, baseURL: baseURL, apiKey: apiKey, language: language, project: project, location: location, tokenSource: tokenSource}
}

func (client *Transcriber) Transcribe(ctx context.Context, input model.VoiceInput) (string, error) {
	started := time.Now()
	slog.Info("stt request starting", "audio_bytes", len(input.Audio), "content_type", input.ContentType, "language", client.language)
	defer func() { slog.Info("stt request finished", "duration_ms", time.Since(started).Milliseconds()) }()
	if client.project == "" {
		return "", fmt.Errorf("google STT project is not configured")
	}
	if client.tokenSource == nil {
		return "", fmt.Errorf("google STT OAuth credentials are not configured")
	}
	payload := recognitionRequest{
		Config:  recognitionConfig{AutoDecodingConfig: map[string]any{}, LanguageCodes: []string{client.language}, Model: "chirp_3"},
		Content: base64.StdEncoding.EncodeToString(input.Audio),
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("encode google STT request: %w", err)
	}
	url := fmt.Sprintf("%s/%s/locations/%s/recognizers/_:recognize", strings.TrimRight(client.baseURL, "/"), client.project, client.location)
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("create google STT request: %w", err)
	}
	request.Header.Set("Content-Type", "application/json")
	token, err := client.tokenSource.Token()
	if err != nil {
		return "", fmt.Errorf("get google STT OAuth token: %w", err)
	}
	request.Header.Set("Authorization", "Bearer "+token.AccessToken)
	response, err := client.httpClient.Do(request)
	if err != nil {
		slog.Error("stt http request failed", "error", err)
		return "", fmt.Errorf("google STT request failed: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		detail, _ := io.ReadAll(io.LimitReader(response.Body, 2048))
		slog.Error("stt provider returned error", "status", response.StatusCode, "detail", strings.TrimSpace(string(detail)))
		return "", fmt.Errorf("google STT returned status %d", response.StatusCode)
	}
	var result recognitionResponse
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("decode google STT response: %w", err)
	}
	var transcript strings.Builder
	for _, result := range result.Results {
		if len(result.Alternatives) > 0 {
			transcript.WriteString(result.Alternatives[0].Transcript)
		}
	}
	if strings.TrimSpace(transcript.String()) == "" {
		return "", fmt.Errorf("google STT returned no transcript")
	}
	return transcript.String(), nil
}

type recognitionRequest struct {
	Config  recognitionConfig `json:"config"`
	Content string            `json:"content"`
}
type recognitionConfig struct {
	AutoDecodingConfig map[string]any `json:"autoDecodingConfig"`
	LanguageCodes      []string       `json:"languageCodes"`
	Model              string         `json:"model"`
}
type recognitionResponse struct {
	Results []struct {
		Alternatives []struct {
			Transcript string `json:"transcript"`
		} `json:"alternatives"`
	} `json:"results"`
}
