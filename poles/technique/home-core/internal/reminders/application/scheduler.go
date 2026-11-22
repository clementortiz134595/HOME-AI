package application

import (
	"context"
	"log/slog"
	"time"

	"github.com/clementortiz/home-ai/home-core/internal/reminders/model"
)

// Notifier is the application port used to deliver a due reminder without
// coupling reminder rules to the Web Push implementation.
type Notifier interface {
	NotifyReminder(context.Context, model.Reminder) error
}

type Scheduler struct {
	service  *Service
	notifier Notifier
	interval time.Duration
	now      func() time.Time
}

func NewScheduler(service *Service, notifier Notifier, interval time.Duration) *Scheduler {
	if interval <= 0 {
		interval = 30 * time.Second
	}
	return &Scheduler{service: service, notifier: notifier, interval: interval, now: time.Now}
}

func (s *Scheduler) Start(ctx context.Context) {
	if s.notifier == nil {
		return
	}
	go func() {
		s.Tick(ctx)
		ticker := time.NewTicker(s.interval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				s.Tick(ctx)
			}
		}
	}()
}

func (s *Scheduler) Tick(ctx context.Context) {
	if s.notifier == nil {
		return
	}
	now := s.now()
	for _, reminder := range s.service.ClaimDueNotifications(now) {
		err := s.notifier.NotifyReminder(ctx, reminder)
		if err != nil {
			slog.Warn("reminder push delivery failed", "reminder_id", reminder.ID, "error", err)
			_ = s.service.CompleteNotification(reminder.ID, now, false)
			continue
		}
		if err := s.service.CompleteNotification(reminder.ID, now, true); err != nil {
			slog.Error("reminder notification status persistence failed", "reminder_id", reminder.ID, "error", err)
		}
	}
}
