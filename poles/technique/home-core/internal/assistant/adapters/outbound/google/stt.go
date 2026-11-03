package google

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/clementortiz/home-ai/home-core/internal/assistant/model"
)

// Transcriber uses Google Cloud Speech-to-Text synchronous recognition.
// Credentials stay in Home Core and the audio is sent only after capture ends.
type Transcriber struct {
	httpClient *http.Client
	baseURL    string
	apiKey     string
	language   string
	project    string
	location   string
}

func NewTranscriber(httpClient *http.Client, baseURL, apiKey, language, project, location string) *Transcriber {
	if baseURL == "" {
		baseURL = "https://speech.googleapis.com/v2/projects"
	}
	if language == "" {
		language = "fr-FR"
	}
	if location == "" {
		location = "eu"
	}
	return &Transcriber{httpClient: httpClient, baseURL: baseURL, apiKey: apiKey, language: language, project: project, location: location}
}

func (client *Transcriber) Transcribe(ctx context.Context, input model.VoiceInput) (string, error) {
	started := time.Now()
	slog.Info("stt request starting", "audio_bytes", len(input.Audio), "content_type", input.ContentType, "language", client.language)
	defer func() { slog.Info("stt request finished", "duration_ms", time.Since(started).Milliseconds()) }()
	if client.apiKey == "" {
		return "", fmt.Errorf("google STT provider is not configured")
	}
	if client.project == "" {
		return "", fmt.Errorf("google STT project is not configured")
	}
	payload := recognitionRequest{
		Config: recognitionConfig{AutoDecodingConfig: map[string]any{}, LanguageCodes: []string{client.language}, Model: "chirp_3"},
		Audio:  recognitionAudio{Content: base64.StdEncoding.EncodeToString(input.Audio)},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("encode google STT request: %w", err)
	}
	url := fmt.Sprintf("%s/%s/locations/%s/recognizers/_:recognize?key=%s", strings.TrimRight(client.baseURL, "/"), client.project, client.location, client.apiKey)
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("create google STT request: %w", err)
	}
	request.Header.Set("Content-Type", "application/json")
	response, err := client.httpClient.Do(request)
	if err != nil {
		slog.Error("stt http request failed", "error", err)
		return "", fmt.Errorf("google STT request failed: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		slog.Error("stt provider returned error", "status", response.StatusCode)
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
	Config recognitionConfig `json:"config"`
	Audio  recognitionAudio  `json:"audio"`
}
type recognitionConfig struct {
	AutoDecodingConfig map[string]any `json:"autoDecodingConfig"`
	LanguageCodes      []string       `json:"languageCodes"`
	Model              string         `json:"model"`
}
type recognitionAudio struct {
	Content string `json:"content"`
}
type recognitionResponse struct {
	Results []struct {
		Alternatives []struct {
			Transcript string `json:"transcript"`
		} `json:"alternatives"`
	} `json:"results"`
}
