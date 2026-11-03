package google

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/clementortiz/home-ai/home-core/internal/assistant/model"
)

// Transcriber uses Google Cloud Speech-to-Text synchronous recognition.
// Credentials stay in Home Core and the audio is sent only after capture ends.
type Transcriber struct {
	httpClient *http.Client
	baseURL    string
	apiKey     string
	language   string
}

func NewTranscriber(httpClient *http.Client, baseURL, apiKey, language string) *Transcriber {
	if baseURL == "" {
		baseURL = "https://speech.googleapis.com/v1/speech:recognize"
	}
	if language == "" {
		language = "fr-FR"
	}
	return &Transcriber{httpClient: httpClient, baseURL: baseURL, apiKey: apiKey, language: language}
}

func (client *Transcriber) Transcribe(ctx context.Context, input model.VoiceInput) (string, error) {
	if client.apiKey == "" {
		return "", fmt.Errorf("google STT provider is not configured")
	}
	payload := recognitionRequest{
		Config: recognitionConfig{Encoding: "WEBM_OPUS", LanguageCode: client.language, Model: "latest_short"},
		Audio:  recognitionAudio{Content: base64.StdEncoding.EncodeToString(input.Audio)},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("encode google STT request: %w", err)
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, client.baseURL+"?key="+client.apiKey, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("create google STT request: %w", err)
	}
	request.Header.Set("Content-Type", "application/json")
	response, err := client.httpClient.Do(request)
	if err != nil {
		return "", fmt.Errorf("google STT request failed: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
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
	Encoding     string `json:"encoding"`
	LanguageCode string `json:"languageCode"`
	Model        string `json:"model"`
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
