package notificationshttp

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	notificationsapp "github.com/clementortiz/home-ai/home-core/internal/notifications/application"
	"github.com/clementortiz/home-ai/home-core/internal/notifications/model"
)

type testSender interface {
	SendTest(context.Context) error
}

type Handler struct {
	service *notificationsapp.Service
	tester  testSender
}

func NewHandler(service *notificationsapp.Service, testers ...testSender) *Handler {
	var tester testSender
	if len(testers) > 0 {
		tester = testers[0]
	}
	return &Handler{service: service, tester: tester}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/v1/notifications/push"), "/")
	switch {
	case r.Method == http.MethodGet && path == "config":
		key, err := h.service.PublicKey()
		if err != nil {
			write(w, http.StatusServiceUnavailable, map[string]string{"error": "push_not_configured"})
			return
		}
		write(w, http.StatusOK, map[string]string{"publicKey": key})
	case r.Method == http.MethodPost && path == "subscribe":
		var subscription model.Subscription
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10)).Decode(&subscription); err != nil {
			write(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
			return
		}
		if err := h.service.Subscribe(subscription); err != nil {
			if errors.Is(err, notificationsapp.ErrNotConfigured) {
				write(w, http.StatusServiceUnavailable, map[string]string{"error": "push_not_configured"})
			} else {
				write(w, http.StatusBadRequest, map[string]string{"error": "invalid_subscription"})
			}
			return
		}
		write(w, http.StatusCreated, map[string]string{"status": "subscribed"})
	case r.Method == http.MethodDelete && path == "subscribe":
		var request struct {
			Endpoint string `json:"endpoint"`
		}
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8<<10)).Decode(&request); err != nil {
			write(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
			return
		}
		if err := h.service.Unsubscribe(request.Endpoint); err != nil {
			write(w, http.StatusBadRequest, map[string]string{"error": "invalid_subscription"})
			return
		}
		write(w, http.StatusOK, map[string]string{"status": "unsubscribed"})
	case r.Method == http.MethodPost && path == "test":
		if h.tester == nil {
			write(w, http.StatusServiceUnavailable, map[string]string{"error": "push_not_configured"})
			return
		}
		if err := h.tester.SendTest(r.Context()); err != nil {
			if errors.Is(err, notificationsapp.ErrNotConfigured) {
				write(w, http.StatusServiceUnavailable, map[string]string{"error": "push_not_configured"})
			} else {
				write(w, http.StatusBadGateway, map[string]string{"error": "push_delivery_failed"})
			}
			return
		}
		write(w, http.StatusOK, map[string]string{"status": "sent"})
	default:
		write(w, http.StatusNotFound, map[string]string{"error": "not_found"})
	}
}

func write(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
