package application

import (
	"errors"
	"strings"

	"github.com/clementortiz/home-ai/home-core/internal/notifications/model"
)

var ErrNotConfigured = errors.New("web push is not configured")

type Repository interface {
	SavePushSubscription(model.Subscription) error
	DeletePushSubscription(string) error
	ListPushSubscriptions() ([]model.Subscription, error)
}

type Service struct {
	repository Repository
	publicKey  string
}

func NewService(repository Repository, publicKey string) *Service {
	return &Service{repository: repository, publicKey: strings.TrimSpace(publicKey)}
}
func (s *Service) PublicKey() (string, error) {
	if s.publicKey == "" {
		return "", ErrNotConfigured
	}
	return s.publicKey, nil
}
func (s *Service) Subscribe(subscription model.Subscription) error {
	if _, err := s.PublicKey(); err != nil {
		return err
	}
	if err := subscription.Validate(); err != nil {
		return err
	}
	return s.repository.SavePushSubscription(subscription)
}
func (s *Service) Unsubscribe(endpoint string) error {
	if strings.TrimSpace(endpoint) == "" {
		return errors.New("endpoint is required")
	}
	return s.repository.DeletePushSubscription(endpoint)
}
