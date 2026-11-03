package openai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/clementortiz/home-ai/home-core/internal/assistant/model"
)

const defaultBaseURL = "https://api.openai.com/v1"
const defaultModel = "gpt-4o-mini"

var ErrUnavailable = errors.New("assistant provider unavailable")

type Client struct {
	httpClient *http.Client
	baseURL    string
	apiKey     string
	model      string
	provider   string
}

func NewClient(httpClient *http.Client, baseURL, apiKey, modelName string) *Client {
	if baseURL == "" {
		baseURL = defaultBaseURL
	}
	if modelName == "" {
		modelName = defaultModel
	}
	return &Client{httpClient: httpClient, baseURL: strings.TrimRight(baseURL, "/"), apiKey: apiKey, model: modelName, provider: "openai"}
}

func (client *Client) AnswerQuestion(ctx context.Context, question model.Question) (model.Answer, error) {
	if client.apiKey == "" || client.model == "" {
		return model.Answer{}, fmt.Errorf("%w: provider is not configured", ErrUnavailable)
	}
	payload := chatRequest{Model: client.model, Messages: []message{{Role: "system", Content: "Réponds en français, clairement et honnêtement. Si tu ne sais pas, dis-le. Ne prétends pas avoir consulté une source externe."}, {Role: "user", Content: question.Text}}}
	body, err := json.Marshal(payload)
	if err != nil {
		return model.Answer{}, fmt.Errorf("%w: encode request", ErrUnavailable)
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, client.baseURL+"/chat/completions", strings.NewReader(string(body)))
	if err != nil {
		return model.Answer{}, fmt.Errorf("%w: create request", ErrUnavailable)
	}
	request.Header.Set("Authorization", "Bearer "+client.apiKey)
	request.Header.Set("Content-Type", "application/json")
	response, err := client.httpClient.Do(request)
	if err != nil {
		return model.Answer{}, fmt.Errorf("%w: request failed", ErrUnavailable)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return model.Answer{}, fmt.Errorf("%w: provider returned status %d", ErrUnavailable, response.StatusCode)
	}
	var result chatResponse
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil || len(result.Choices) == 0 || strings.TrimSpace(result.Choices[0].Message.Content) == "" {
		return model.Answer{}, fmt.Errorf("%w: invalid provider response", ErrUnavailable)
	}
	return model.Answer{Text: result.Choices[0].Message.Content, Provider: client.provider, Model: client.model, Generated: true}, nil
}

type chatRequest struct {
	Model    string    `json:"model"`
	Messages []message `json:"messages"`
}
type message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}
type chatResponse struct {
	Choices []struct {
		Message message `json:"message"`
	} `json:"choices"`
}
