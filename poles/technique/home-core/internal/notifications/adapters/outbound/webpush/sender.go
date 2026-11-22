package webpush

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	push "github.com/SherClockHolmes/webpush-go"
	notificationsapp "github.com/clementortiz/home-ai/home-core/internal/notifications/application"
	remindersmodel "github.com/clementortiz/home-ai/home-core/internal/reminders/model"
)

type Sender struct {
	repository                     notificationsapp.Repository
	publicKey, privateKey, subject string
	send                           func([]byte, *push.Subscription, *push.Options) (*http.Response, error)
}

func NewSender(repository notificationsapp.Repository, publicKey, privateKey, subject string) *Sender {
	return &Sender{repository: repository, publicKey: publicKey, privateKey: privateKey, subject: subject, send: push.SendNotification}
}
func (s *Sender) Configured() bool { return s.publicKey != "" && s.privateKey != "" && s.subject != "" }

func (s *Sender) NotifyReminder(ctx context.Context, reminder remindersmodel.Reminder) error {
	if !s.Configured() {
		return notificationsapp.ErrNotConfigured
	}
	subscriptions, err := s.repository.ListPushSubscriptions()
	if err != nil {
		return err
	}
	if len(subscriptions) == 0 {
		return errors.New("no push subscriptions")
	}
	// Notification content is intentionally generic: reminders may contain
	// personal information and lock-screen notifications are not private.
	payload, _ := json.Marshal(map[string]any{"title": "Home AI", "body": "Un rappel est arrivé à échéance.", "url": "/?view=reminders"})
	delivered := false
	var failures []string
	for _, subscription := range subscriptions {
		if err := ctx.Err(); err != nil {
			return err
		}
		response, sendErr := s.send(payload, &push.Subscription{Endpoint: subscription.Endpoint, Keys: push.Keys{P256dh: subscription.Keys.P256DH, Auth: subscription.Keys.Auth}}, &push.Options{Subscriber: s.subject, VAPIDPublicKey: s.publicKey, VAPIDPrivateKey: s.privateKey, TTL: 60})
		if response != nil && response.Body != nil {
			response.Body.Close()
		}
		if response != nil && (response.StatusCode == http.StatusGone || response.StatusCode == http.StatusNotFound) {
			_ = s.repository.DeletePushSubscription(subscription.Endpoint)
			continue
		}
		if sendErr != nil {
			failures = append(failures, sendErr.Error())
			continue
		}
		if response == nil || response.StatusCode < 200 || response.StatusCode >= 300 {
			failures = append(failures, "push endpoint rejected notification")
			continue
		}
		delivered = true
	}
	if delivered {
		return nil
	}
	return fmt.Errorf("no notification delivered: %s", strings.Join(failures, "; "))
}
