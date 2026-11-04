package gmail

import (
	"encoding/base64"
	"testing"
)

func body(mime, text string) gmailPayload {
	p := gmailPayload{MimeType: mime}
	p.Body.Data = base64.RawURLEncoding.EncodeToString([]byte(text))
	return p
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
