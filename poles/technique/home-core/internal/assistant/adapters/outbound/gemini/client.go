package gemini

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/clementortiz/home-ai/home-core/internal/assistant/model"
)

const defaultBaseURL = "https://generativelanguage.googleapis.com/v1beta"
const defaultModel = "gemini-3.8-flash"

var ErrUnavailable = errors.New("assistant provider unavailable")

type Client struct {
	httpClient *http.Client
	baseURL    string
	apiKey     string
	model      string
}

func NewClient(httpClient *http.Client, baseURL, apiKey, modelName string) *Client {
	if baseURL == "" {
		baseURL = defaultBaseURL
	}
	if modelName == "" {
		modelName = defaultModel
	}
	return &Client{httpClient: httpClient, baseURL: strings.TrimRight(baseURL, "/"), apiKey: apiKey, model: modelName}
}

func (client *Client) AnswerQuestion(ctx context.Context, question model.Question) (model.Answer, error) {
	if client.apiKey == "" || client.model == "" {
		return model.Answer{}, fmt.Errorf("%w: provider is not configured", ErrUnavailable)
	}
	payload := generateRequest{
		SystemInstruction: content{Parts: []part{{Text: "Réponds en français, clairement et honnêtement. Si tu ne sais pas, dis-le. Ne prétends pas avoir consulté une source externe."}}},
		Contents:          []content{{Role: "user", Parts: []part{{Text: question.Text}}}},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return model.Answer{}, fmt.Errorf("%w: encode request", ErrUnavailable)
	}

	endpoint := fmt.Sprintf("%s/models/%s:generateContent", client.baseURL, url.PathEscape(client.model))
	requestURL, err := url.Parse(endpoint)
	if err != nil {
		return model.Answer{}, fmt.Errorf("%w: create request URL", ErrUnavailable)
	}
	query := requestURL.Query()
	query.Set("key", client.apiKey)
	requestURL.RawQuery = query.Encode()
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, requestURL.String(), strings.NewReader(string(body)))
	if err != nil {
		return model.Answer{}, fmt.Errorf("%w: create request", ErrUnavailable)
	}
	request.Header.Set("Content-Type", "application/json")
	response, err := client.httpClient.Do(request)
	if err != nil {
		return model.Answer{}, fmt.Errorf("%w: request failed", ErrUnavailable)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return model.Answer{}, fmt.Errorf("%w: provider returned status %d", ErrUnavailable, response.StatusCode)
	}
	var result generateResponse
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil || len(result.Candidates) == 0 || len(result.Candidates[0].Content.Parts) == 0 || strings.TrimSpace(result.Candidates[0].Content.Parts[0].Text) == "" {
		return model.Answer{}, fmt.Errorf("%w: invalid provider response", ErrUnavailable)
	}
	return model.Answer{Text: result.Candidates[0].Content.Parts[0].Text, Provider: "gemini", Model: client.model, Generated: true}, nil
}

type generateRequest struct {
	SystemInstruction content   `json:"systemInstruction"`
	Contents          []content `json:"contents"`
}
type content struct {
	Role  string `json:"role,omitempty"`
	Parts []part `json:"parts"`
}
type part struct {
	Text string `json:"text"`
}
type generateResponse struct {
	Candidates []struct {
		Content content `json:"content"`
	} `json:"candidates"`
}
