package webpush

import (
	"context"
	"io"
	"net/http"
	"testing"

	push "github.com/SherClockHolmes/webpush-go"
	"github.com/clementortiz/home-ai/home-core/internal/notifications/model"
	remindersmodel "github.com/clementortiz/home-ai/home-core/internal/reminders/model"
)

type repositoryStub struct{ values []model.Subscription }

func (s *repositoryStub) SavePushSubscription(value model.Subscription) error {
	s.values = append(s.values, value)
	return nil
}
func (s *repositoryStub) DeletePushSubscription(endpoint string) error {
	for i, value := range s.values {
		if value.Endpoint == endpoint {
			s.values = append(s.values[:i], s.values[i+1:]...)
			break
		}
	}
	return nil
}
func (s *repositoryStub) ListPushSubscriptions() ([]model.Subscription, error) { return s.values, nil }

func TestExpiredSubscriptionIsRemoved(t *testing.T) {
	repository := &repositoryStub{values: []model.Subscription{{Endpoint: "https://push.example/old", Keys: model.Keys{P256DH: "key", Auth: "auth"}}}}
	sender := NewSender(repository, "public", "private", "mailto:home@example.invalid")
	sender.send = func([]byte, *push.Subscription, *push.Options) (*http.Response, error) {
		return &http.Response{StatusCode: http.StatusGone, Body: io.NopCloser(nil)}, nil
	}
	if err := sender.NotifyReminder(context.Background(), remindersmodel.Reminder{ID: "r"}); err == nil {
		t.Fatal("expected delivery failure without a remaining subscription")
	}
	if len(repository.values) != 0 {
		t.Fatalf("expired subscription remains: %+v", repository.values)
	}
}
