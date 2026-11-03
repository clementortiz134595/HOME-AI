package application

import (
	"context"
	"errors"
	"fmt"

	"github.com/clementortiz/home-ai/home-core/internal/workspace/model"
)

var ErrAccountNotConfigured = errors.New("google workspace account is not configured")

type Provider interface {
	SearchMail(context.Context, string) ([]model.MailSummary, error)
	ReadMail(context.Context, string) (model.MailMessage, error)
	SearchDrive(context.Context, string) ([]model.DriveFile, error)
	ReadDriveFile(context.Context, string) (model.TextDocument, error)
	WriteDriveFile(context.Context, string, string) (model.DriveFile, error)
}

type Registry struct{ providers map[string]Provider }

func NewRegistry(providers map[string]Provider) Registry { return Registry{providers: providers} }

func (registry Registry) Provider(accountID string) (Provider, error) {
	provider, found := registry.providers[accountID]
	if !found {
		return nil, fmt.Errorf("%w: %s", ErrAccountNotConfigured, accountID)
	}
	return provider, nil
}
