package gmail

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"

	"github.com/clementortiz/home-ai/home-core/internal/workspace/model"
)

const scope = "https://www.googleapis.com/auth/gmail.readonly"
const driveScope = "https://www.googleapis.com/auth/drive.readonly"

type Client struct {
	config *oauth2.Config
	store  *fileTokenStore
	http   *http.Client
	mu     sync.Mutex
}

type fileTokenStore struct {
	path string
	mu   sync.Mutex
}

func NewClient(httpClient *http.Client, clientID, clientSecret, redirectURL, tokenPath string) (*Client, error) {
	if clientID == "" || clientSecret == "" || redirectURL == "" || tokenPath == "" {
		return nil, errors.New("Gmail OAuth is not configured")
	}
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	return &Client{config: &oauth2.Config{ClientID: clientID, ClientSecret: clientSecret, Endpoint: google.Endpoint, RedirectURL: redirectURL, Scopes: []string{scope, driveScope}}, store: &fileTokenStore{path: tokenPath}, http: httpClient}, nil
}

func (client *Client) SearchDrive(ctx context.Context, query string) ([]model.DriveFile, error) {
	token, err := client.token(ctx)
	if err != nil {
		return nil, err
	}
	q := "trashed = false"
	if strings.TrimSpace(query) != "" {
		q += " and name contains '" + strings.ReplaceAll(strings.ReplaceAll(query, "'", "\\'"), "\\", "\\\\") + "'"
	}
	request, _ := http.NewRequestWithContext(ctx, http.MethodGet, "https://www.googleapis.com/drive/v3/files?"+url.Values{"q": []string{q}, "pageSize": []string{"10"}, "orderBy": []string{"modifiedTime desc"}, "fields": []string{"files(id,name,mimeType,modifiedTime,webViewLink)"}}.Encode(), nil)
	response, err := client.httpClient(token).Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.StatusCode/100 != 2 {
		return nil, fmt.Errorf("Drive search returned status %d", response.StatusCode)
	}
	var listed struct {
		Files []struct{ ID, Name, MimeType, ModifiedTime, WebViewLink string } `json:"files"`
	}
	if err := json.NewDecoder(response.Body).Decode(&listed); err != nil {
		return nil, err
	}
	files := make([]model.DriveFile, 0, len(listed.Files))
	for _, file := range listed.Files {
		modified, _ := time.Parse(time.RFC3339, file.ModifiedTime)
		files = append(files, model.DriveFile{ID: file.ID, Name: file.Name, MimeType: file.MimeType, ModifiedAt: modified, WebViewLink: file.WebViewLink})
	}
	return files, nil
}

func (client *Client) ReadDriveFile(ctx context.Context, id string) (model.TextDocument, error) {
	token, err := client.token(ctx)
	if err != nil {
		return model.TextDocument{}, err
	}
	request, _ := http.NewRequestWithContext(ctx, http.MethodGet, "https://www.googleapis.com/drive/v3/files/"+url.PathEscape(id)+"?fields=id,name,mimeType,modifiedTime,webViewLink", nil)
	response, err := client.httpClient(token).Do(request)
	if err != nil {
		return model.TextDocument{}, err
	}
	defer response.Body.Close()
	if response.StatusCode/100 != 2 {
		return model.TextDocument{}, fmt.Errorf("Drive file metadata returned status %d", response.StatusCode)
	}
	var raw struct{ ID, Name, MimeType, ModifiedTime, WebViewLink string }
	if err := json.NewDecoder(response.Body).Decode(&raw); err != nil {
		return model.TextDocument{}, err
	}
	modified, _ := time.Parse(time.RFC3339, raw.ModifiedTime)
	file := model.DriveFile{ID: raw.ID, Name: raw.Name, MimeType: raw.MimeType, ModifiedAt: modified, WebViewLink: raw.WebViewLink}
	if file.MimeType == "application/vnd.google-apps.document" {
		return client.readDriveContent(ctx, file, "https://www.googleapis.com/drive/v3/files/"+url.PathEscape(id)+"/export?mimeType=text/plain")
	}
	return client.readDriveContent(ctx, file, "https://www.googleapis.com/drive/v3/files/"+url.PathEscape(id)+"?alt=media")
}

func (client *Client) readDriveContent(ctx context.Context, file model.DriveFile, endpoint string) (model.TextDocument, error) {
	token, err := client.token(ctx)
	if err != nil {
		return model.TextDocument{}, err
	}
	request, _ := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	response, err := client.httpClient(token).Do(request)
	if err != nil {
		return model.TextDocument{}, err
	}
	defer response.Body.Close()
	if response.StatusCode/100 != 2 {
		return model.TextDocument{}, fmt.Errorf("Drive file read returned status %d", response.StatusCode)
	}
	data, err := io.ReadAll(io.LimitReader(response.Body, 1<<20))
	if err != nil {
		return model.TextDocument{}, err
	}
	return model.TextDocument{DriveFile: file, Content: string(data)}, nil
}

func (client *Client) AuthorizationURL(state string) string {
	// Google asks for consent the first time. The offline refresh token is
	// persisted by fileTokenStore, so subsequent sessions reuse the grant.
	return client.config.AuthCodeURL(state, oauth2.AccessTypeOffline)
}

func (client *Client) OAuthStatePath() string { return client.store.path + ".oauth-state" }

func (client *Client) Exchange(ctx context.Context, code string) error {
	token, err := client.config.Exchange(ctx, code)
	if err != nil {
		return err
	}
	return client.store.save(token)
}

func (client *Client) SearchMail(ctx context.Context, query string) ([]model.MailSummary, error) {
	token, err := client.token(ctx)
	if err != nil {
		return nil, err
	}
	request, _ := http.NewRequestWithContext(ctx, http.MethodGet, "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q="+url.QueryEscape(query), nil)
	response, err := client.httpClient(token).Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.StatusCode/100 != 2 {
		return nil, fmt.Errorf("Gmail search returned status %d", response.StatusCode)
	}
	var listed struct {
		Messages []struct {
			ID string `json:"id"`
		} `json:"messages"`
	}
	if err := json.NewDecoder(response.Body).Decode(&listed); err != nil {
		return nil, err
	}
	results := make([]model.MailSummary, 0, len(listed.Messages))
	for _, message := range listed.Messages {
		summary, err := client.readSummary(ctx, token, message.ID)
		if err != nil {
			return nil, err
		}
		results = append(results, summary)
	}
	return results, nil
}

func (client *Client) ReadMail(ctx context.Context, id string) (model.MailMessage, error) {
	token, err := client.token(ctx)
	if err != nil {
		return model.MailMessage{}, err
	}
	request, _ := http.NewRequestWithContext(ctx, http.MethodGet, "https://gmail.googleapis.com/gmail/v1/users/me/messages/"+url.PathEscape(id)+"?format=full", nil)
	response, err := client.httpClient(token).Do(request)
	if err != nil {
		return model.MailMessage{}, err
	}
	defer response.Body.Close()
	if response.StatusCode/100 != 2 {
		return model.MailMessage{}, fmt.Errorf("Gmail message returned status %d", response.StatusCode)
	}
	var message gmailMessage
	if err := json.NewDecoder(response.Body).Decode(&message); err != nil {
		return model.MailMessage{}, err
	}
	summary := message.summary()
	return model.MailMessage{MailSummary: summary, Body: decodeBody(message.Payload), Attachments: attachments(message.Payload)}, nil
}

func (client *Client) ReadMailAttachment(ctx context.Context, messageID, attachmentID string) ([]byte, error) {
	token, err := client.token(ctx)
	if err != nil {
		return nil, err
	}
	endpoint := "https://gmail.googleapis.com/gmail/v1/users/me/messages/" + url.PathEscape(messageID) + "/attachments/" + url.PathEscape(attachmentID)
	request, _ := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	response, err := client.httpClient(token).Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.StatusCode/100 != 2 {
		return nil, fmt.Errorf("Gmail attachment returned status %d", response.StatusCode)
	}
	var payload struct{ Data string `json:"data"` }
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return nil, err
	}
	return base64.RawURLEncoding.DecodeString(strings.TrimRight(payload.Data, "="))
}

func (client *Client) readSummary(ctx context.Context, token *oauth2.Token, id string) (model.MailSummary, error) {
	request, _ := http.NewRequestWithContext(ctx, http.MethodGet, "https://gmail.googleapis.com/gmail/v1/users/me/messages/"+url.PathEscape(id)+"?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date", nil)
	response, err := client.httpClient(token).Do(request)
	if err != nil {
		return model.MailSummary{}, err
	}
	defer response.Body.Close()
	if response.StatusCode/100 != 2 {
		return model.MailSummary{}, fmt.Errorf("Gmail message returned status %d", response.StatusCode)
	}
	var message gmailMessage
	if err := json.NewDecoder(response.Body).Decode(&message); err != nil {
		return model.MailSummary{}, err
	}
	return message.summary(), nil
}

func (client *Client) token(ctx context.Context) (*oauth2.Token, error) {
	client.mu.Lock()
	defer client.mu.Unlock()
	token, err := client.store.load()
	if err != nil {
		return nil, err
	}
	if token.Valid() {
		return token, nil
	}
	refreshed, err := client.config.TokenSource(ctx, token).Token()
	if err != nil {
		return nil, err
	}
	if err := client.store.save(refreshed); err != nil {
		return nil, err
	}
	return refreshed, nil
}
func (client *Client) httpClient(token *oauth2.Token) *http.Client {
	return &http.Client{Timeout: client.http.Timeout, Transport: &oauth2.Transport{Source: oauth2.StaticTokenSource(token), Base: client.http.Transport}}
}

func (store *fileTokenStore) load() (*oauth2.Token, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	data, err := os.ReadFile(store.path)
	if err != nil {
		return nil, err
	}
	var token oauth2.Token
	if err := json.Unmarshal(data, &token); err != nil {
		return nil, err
	}
	return &token, nil
}
func (store *fileTokenStore) save(token *oauth2.Token) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	if err := os.MkdirAll(filepath.Dir(store.path), 0o700); err != nil {
		return err
	}
	data, _ := json.Marshal(token)
	temp := store.path + ".tmp"
	if err := os.WriteFile(temp, data, 0o600); err != nil {
		return err
	}
	return os.Rename(temp, store.path)
}

type gmailMessage struct {
	ID           string       `json:"id"`
	ThreadID     string       `json:"threadId"`
	Snippet      string       `json:"snippet"`
	InternalDate string       `json:"internalDate"`
	Payload      gmailPayload `json:"payload"`
}
type gmailPayload struct {
	MimeType string                         `json:"mimeType"`
	Filename string                         `json:"filename"`
	Headers  []struct{ Name, Value string } `json:"headers"`
	Body     struct {
		Data         string `json:"data"`
		AttachmentID string `json:"attachmentId"`
		Size         int64  `json:"size"`
	} `json:"body"`
	Parts []gmailPayload `json:"parts"`
}

func (message gmailMessage) summary() model.MailSummary {
	headers := map[string]string{}
	for _, header := range message.Payload.Headers {
		headers[strings.ToLower(header.Name)] = header.Value
	}
	received, _ := time.Parse(time.RFC3339, headers["date"])
	if received.IsZero() && message.InternalDate != "" {
		milliseconds, _ := time.ParseDuration(message.InternalDate + "ms")
		received = time.Unix(0, milliseconds.Nanoseconds())
	}
	return model.MailSummary{ID: message.ID, ThreadID: message.ThreadID, From: headers["from"], Subject: headers["subject"], ReceivedAt: received, Snippet: message.Snippet}
}
func decodeBody(payload gmailPayload) string {
	// Prefer the text alternative and never read attachment bodies.
	if body := decodeMIMEBody(payload, "text/plain"); body != "" {
		return body
	}
	return decodeMIMEBody(payload, "text/html")
}
func decodeMIMEBody(payload gmailPayload, mimeType string) string {
	if payload.Filename != "" {
		return ""
	}
	if payload.MimeType == mimeType && payload.Body.Data != "" {
		data, err := base64.RawURLEncoding.DecodeString(strings.TrimRight(payload.Body.Data, "="))
		if err == nil {
			return string(data)
		}
	}
	var bodies []string
	for _, part := range payload.Parts {
		if body := decodeMIMEBody(part, mimeType); body != "" {
			bodies = append(bodies, body)
		}
	}
	return strings.Join(bodies, "\n")
}

func attachments(payload gmailPayload) []model.MailAttachment {
	items := make([]model.MailAttachment, 0)
	var visit func(gmailPayload)
	visit = func(part gmailPayload) {
		if part.Filename != "" {
			items = append(items, model.MailAttachment{ID: part.Body.AttachmentID, Name: part.Filename, MimeType: part.MimeType, Size: part.Body.Size})
		}
		for _, child := range part.Parts {
			visit(child)
		}
	}
	visit(payload)
	return items
}
