package elevenlabs

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
)

const defaultBaseURL = "https://api.elevenlabs.io/v1"

type Client struct {
	httpClient                    *http.Client
	baseURL, apiKey, model, voice string
}

func NewClient(httpClient *http.Client, baseURL, apiKey, model, voice string) *Client {
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	if strings.TrimSpace(baseURL) == "" {
		baseURL = defaultBaseURL
	}
	if strings.TrimSpace(model) == "" {
		model = "eleven_v4_turbo"
	}
	if strings.TrimSpace(voice) == "" {
		voice = "JBFqnCBsd6RMkjVDRZzb"
	}
	return &Client{httpClient: httpClient, baseURL: strings.TrimRight(baseURL, "/"), apiKey: apiKey, model: model, voice: voice}
}

func (client *Client) Synthesize(ctx context.Context, text string) ([]byte, error) {
	if strings.TrimSpace(client.apiKey) == "" {
		return nil, fmt.Errorf("ElevenLabs API key is not configured")
	}
	body := strings.NewReader(fmt.Sprintf(`{"text":%q,"model_id":%q,"output_format":"mp3_44100_128"}`, text, client.model))
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, client.baseURL+"/text-to-speech/"+client.voice, body)
	if err != nil {
		return nil, err
	}
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("xi-api-key", client.apiKey)
	response, err := client.httpClient.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, fmt.Errorf("ElevenLabs returned HTTP %d", response.StatusCode)
	}
	return io.ReadAll(response.Body)
}
