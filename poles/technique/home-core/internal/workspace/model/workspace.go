package model

import "time"

type MailSummary struct {
	ID         string    `json:"id"`
	ThreadID   string    `json:"threadId"`
	From       string    `json:"from"`
	Subject    string    `json:"subject"`
	ReceivedAt time.Time `json:"receivedAt"`
	Snippet    string    `json:"snippet"`
}

type MailMessage struct {
	MailSummary
	Body        string           `json:"body"`
	Attachments []MailAttachment `json:"attachments,omitempty"`
}

type MailAttachment struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	MimeType string `json:"mimeType"`
	Size     int64  `json:"size"`
}

type DriveFile struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	MimeType    string    `json:"mimeType"`
	ModifiedAt  time.Time `json:"modifiedAt"`
	WebViewLink string    `json:"webViewLink"`
}

type TextDocument struct {
	DriveFile
	Content string `json:"content"`
}
