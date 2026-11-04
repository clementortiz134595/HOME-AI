package application

import (
	"context"
	"errors"
	"testing"

	"github.com/clementortiz/home-ai/home-core/internal/workspace/model"
)

type providerStub struct{}

func (providerStub) SearchMail(context.Context, string) ([]model.MailSummary, error) { return nil, nil }
func (providerStub) ReadMail(context.Context, string) (model.MailMessage, error) {
	return model.MailMessage{}, nil
}
func (providerStub) SearchDrive(context.Context, string) ([]model.DriveFile, error) { return nil, nil }
func (providerStub) ReadDriveFile(context.Context, string) (model.TextDocument, error) {
	return model.TextDocument{}, nil
}
func (providerStub) WriteDriveFile(context.Context, string, string) (model.DriveFile, error) {
	return model.DriveFile{}, nil
}

func TestRegistryReturnsConfiguredProvider(t *testing.T) {
	provider := providerStub{}
	registry := NewRegistry(map[string]Provider{"family": provider})

	got, err := registry.Provider("family")
	if err != nil {
		t.Fatalf("Provider() error = %v", err)
	}
	if got == nil {
		t.Fatal("Provider() returned nil provider")
	}
}

func TestRegistryRejectsUnknownAccountWithoutLeakingCredentials(t *testing.T) {
	registry := NewRegistry(map[string]Provider{})
	_, err := registry.Provider("missing-account")
	if !errors.Is(err, ErrAccountNotConfigured) {
		t.Fatalf("Provider() error = %v, want ErrAccountNotConfigured", err)
	}
}
