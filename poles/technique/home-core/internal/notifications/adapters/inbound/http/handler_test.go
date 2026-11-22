package notificationshttp

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	notificationsapp "github.com/clementortiz/home-ai/home-core/internal/notifications/application"
	"github.com/clementortiz/home-ai/home-core/internal/notifications/model"
)

type repositoryStub struct{ values []model.Subscription }

func (s *repositoryStub) SavePushSubscription(value model.Subscription) error {
	s.values = append(s.values, value)
	return nil
}
func (s *repositoryStub) DeletePushSubscription(endpoint string) error {
	for index, value := range s.values {
		if value.Endpoint == endpoint {
			s.values = append(s.values[:index], s.values[index+1:]...)
			break
		}
	}
	return nil
}
func (s *repositoryStub) ListPushSubscriptions() ([]model.Subscription, error) { return s.values, nil }

func TestSubscribeAndUnsubscribe(t *testing.T) {
	repository := &repositoryStub{}
	handler := NewHandler(notificationsapp.NewService(repository, "public-key"))
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodPost, "/v1/notifications/push/subscribe", bytes.NewBufferString(`{"endpoint":"https://push.example/subscription","keys":{"p256dh":"key","auth":"auth"}}`)))
	if response.Code != http.StatusCreated || len(repository.values) != 1 {
		t.Fatalf("subscribe code=%d values=%d", response.Code, len(repository.values))
	}
	response = httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodDelete, "/v1/notifications/push/subscribe", bytes.NewBufferString(`{"endpoint":"https://push.example/subscription"}`)))
	if response.Code != http.StatusOK || len(repository.values) != 0 {
		t.Fatalf("unsubscribe code=%d values=%d", response.Code, len(repository.values))
	}
}
