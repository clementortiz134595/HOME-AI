package model

import (
	"errors"
	"net/url"
	"strings"
)

// Subscription is the minimum persistent Web Push material. It deliberately
// excludes account data, browser identifiers and notification contents.
type Subscription struct {
	Endpoint string `json:"endpoint"`
	Keys     Keys   `json:"keys"`
}

type Keys struct {
	P256DH string `json:"p256dh"`
	Auth   string `json:"auth"`
}

func (s Subscription) Validate() error {
	parsed, err := url.Parse(s.Endpoint)
	if err != nil || parsed.Scheme != "https" || parsed.Host == "" {
		return errors.New("a HTTPS endpoint is required")
	}
	if strings.TrimSpace(s.Keys.P256DH) == "" || strings.TrimSpace(s.Keys.Auth) == "" {
		return errors.New("push subscription keys are required")
	}
	return nil
}
