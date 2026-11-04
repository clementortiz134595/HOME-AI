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

const intentSystemInstruction = `Tu es le routeur d'intentions de Home Core. Réponds uniquement avec un objet JSON valide, sans Markdown.
Intentions autorisées : home.turn_on, home.turn_off, gmail.search, drive.search, agenda.list, assistant.question.
Retourne exactement les champs name, parameters et sensitive. Les paramètres doivent être un objet JSON.
Utilise assistant.question pour toute demande qui ne correspond pas clairement à un outil.
Marque sensitive à true pour Gmail, Drive et agenda. Ne déclenche jamais d'action et n'invente aucun résultat.`

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
		SystemInstruction: content{Parts: []part{{Text: "Réponds en français, clairement et honnêtement, en trois phrases maximum. Va droit au but pour une réponse vocale. Si tu ne sais pas, dis-le. Ne prétends pas avoir consulté une source externe."}}},
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

// Interpret classifies a transcript into a validated Home Core intent. Gemini
// only proposes the intent; execution and confirmation remain in Home Core.
func (client *Client) Interpret(ctx context.Context, interaction model.Interaction) (model.Intent, error) {
	if client.apiKey == "" || client.model == "" {
		return model.Intent{}, fmt.Errorf("%w: provider is not configured", ErrUnavailable)
	}
	payload := generateRequest{
		SystemInstruction: content{Parts: []part{{Text: intentSystemInstruction}}},
		Contents:          []content{{Role: "user", Parts: []part{{Text: interaction.Text}}}},
		GenerationConfig:  &generationConfig{ResponseMIMEType: "application/json"},
	}
	text, err := client.generate(ctx, payload)
	if err != nil {
		return model.Intent{}, err
	}
	var intent model.Intent
	if err := json.Unmarshal([]byte(text), &intent); err != nil {
		return model.Intent{}, fmt.Errorf("%w: invalid intent JSON", ErrUnavailable)
	}
	if err := validateIntent(&intent, interaction.Text); err != nil {
		return model.Intent{}, fmt.Errorf("%w: %v", ErrUnavailable, err)
	}
	return intent, nil
}

func (client *Client) generate(ctx context.Context, payload generateRequest) (string, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("%w: encode request", ErrUnavailable)
	}
	endpoint := fmt.Sprintf("%s/models/%s:generateContent", client.baseURL, url.PathEscape(client.model))
	requestURL, err := url.Parse(endpoint)
	if err != nil {
		return "", fmt.Errorf("%w: create request URL", ErrUnavailable)
	}
	query := requestURL.Query()
	query.Set("key", client.apiKey)
	requestURL.RawQuery = query.Encode()
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, requestURL.String(), strings.NewReader(string(body)))
	if err != nil {
		return "", fmt.Errorf("%w: create request", ErrUnavailable)
	}
	request.Header.Set("Content-Type", "application/json")
	response, err := client.httpClient.Do(request)
	if err != nil {
		return "", fmt.Errorf("%w: request failed", ErrUnavailable)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return "", fmt.Errorf("%w: provider returned status %d", ErrUnavailable, response.StatusCode)
	}
	var result generateResponse
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil || len(result.Candidates) == 0 || len(result.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("%w: invalid provider response", ErrUnavailable)
	}
	text := strings.TrimSpace(result.Candidates[0].Content.Parts[0].Text)
	if text == "" {
		return "", fmt.Errorf("%w: empty provider response", ErrUnavailable)
	}
	return text, nil
}

func validateIntent(intent *model.Intent, transcript string) error {
	if intent.Name == "" {
		return errors.New("intent name is empty")
	}
	switch intent.Name {
	case "home.turn_on", "home.turn_off", "gmail.search", "drive.search", "agenda.list", "assistant.question":
	default:
		return fmt.Errorf("unsupported intent %q", intent.Name)
	}
	if intent.Parameters == nil {
		intent.Parameters = map[string]any{}
	}
	if intent.Name == "assistant.question" {
		if text, ok := intent.Parameters["text"].(string); !ok || strings.TrimSpace(text) == "" {
			intent.Parameters["text"] = strings.TrimSpace(transcript)
		}
	}
	if intent.Name == "gmail.search" || intent.Name == "drive.search" || intent.Name == "agenda.list" {
		intent.Sensitive = true
	}
	return nil
}

type generateRequest struct {
	SystemInstruction content   `json:"systemInstruction"`
	Contents          []content `json:"contents"`
	GenerationConfig  *generationConfig `json:"generationConfig,omitempty"`
}
type generationConfig struct { ResponseMIMEType string `json:"responseMimeType,omitempty"` }
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
