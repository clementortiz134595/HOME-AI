package gmail

import (
	"encoding/base64"
	"net/http"
	"net/url"
	"testing"
)

func body(mime, text string) gmailPayload {
	p := gmailPayload{MimeType: mime}
	p.Body.Data = base64.RawURLEncoding.EncodeToString([]byte(text))
	return p
}

func TestAuthorizationURLDoesNotForceRepeatedConsent(t *testing.T) {
	client, err := NewClient(http.DefaultClient, "client", "secret", "http://localhost/callback", t.TempDir()+"/token.json")
	if err != nil {
		t.Fatal(err)
	}
	parsed, err := url.Parse(client.AuthorizationURL("state"))
	if err != nil {
		t.Fatal(err)
	}
	if got := parsed.Query().Get("prompt"); got != "" {
		t.Fatalf("prompt = %q, want omitted", got)
	}
	if parsed.Query().Get("access_type") != "offline" {
		t.Fatalf("access_type = %q", parsed.Query().Get("access_type"))
	}
}
func TestDecodeBodyPrefersTextAndSkipsAttachments(t *testing.T) {
	attachment := body("text/plain", "secret attachment")
	attachment.Filename = "file.txt"
	p := gmailPayload{MimeType: "multipart/mixed", Parts: []gmailPayload{attachment, {MimeType: "multipart/alternative", Parts: []gmailPayload{body("text/html", "<b>HTML</b>"), body("text/plain", "Facture : 42 euros")}}}}
	if got := decodeBody(p); got != "Facture : 42 euros" {
		t.Fatalf("body=%q", got)
	}
	if got := decodeBody(body("text/html", "<p>Message</p>")); got != "<p>Message</p>" {
		t.Fatalf("html=%q", got)
	}
}
