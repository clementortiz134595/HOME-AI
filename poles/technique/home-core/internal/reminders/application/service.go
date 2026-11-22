package application

import (
	"errors"
	"fmt"
	"github.com/clementortiz/home-ai/home-core/internal/reminders/model"
	"log/slog"
	"strconv"
	"strings"
	"sync"
	"time"
)

var ErrNotFound = errors.New("reminder not found")
var ErrAmbiguous = errors.New("reminder selector is ambiguous")

type Repository interface {
	ListReminders() ([]model.Reminder, error)
	SaveReminder(model.Reminder) error
	DeleteReminder(string) error
}
type Service struct {
	mu         sync.RWMutex
	reminders  map[string]model.Reminder
	next       int
	repository Repository
}

func NewService(repositories ...Repository) *Service {
	s := &Service{reminders: map[string]model.Reminder{}}
	if len(repositories) > 0 && repositories[0] != nil {
		s.repository = repositories[0]
		if values, err := s.repository.ListReminders(); err == nil {
			for _, value := range values {
				s.reminders[value.ID] = value
				if strings.HasPrefix(value.ID, "reminder-") {
					if number, parseErr := strconv.Atoi(strings.TrimPrefix(value.ID, "reminder-")); parseErr == nil && number > s.next {
						s.next = number
					}
				}
			}
		}
	}
	return s
}

func (s *Service) List() []model.Reminder {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make([]model.Reminder, 0, len(s.reminders))
	for _, value := range s.reminders {
		result = append(result, value)
	}
	return result
}
func (s *Service) Create(value model.Reminder) (model.Reminder, error) {
	slog.Info("reminder service create", "title_length", len(value.Title), "date", value.Date, "repository_configured", s.repository != nil)
	if err := value.Validate(); err != nil {
		slog.Warn("reminder validation failed", "reason", "title_and_date_required")
		return model.Reminder{}, err
	}
	if value.ScheduledAt != "" && value.NotificationStatus == "" {
		value.NotificationStatus = model.NotificationPending
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.next++
	value.ID = fmt.Sprintf("reminder-%d", s.next)
	s.reminders[value.ID] = value
	if s.repository != nil {
		if err := s.repository.SaveReminder(value); err != nil {
			slog.Error("reminder persistence failed", "reminder_id", value.ID, "error", err)
			return model.Reminder{}, err
		}
	}
	return value, nil
}
func (s *Service) Update(id string, patch model.Reminder) (model.Reminder, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if id == "" {
		id = s.resolveID(patch.Title, patch.Date)
		if id == "" {
			return model.Reminder{}, ErrNotFound
		}
		if id == "ambiguous" {
			return model.Reminder{}, ErrAmbiguous
		}
	}
	value, ok := s.reminders[id]
	if !ok {
		return model.Reminder{}, ErrNotFound
	}
	if patch.Title != "" {
		value.Title = patch.Title
	}
	if patch.Date != "" {
		value.Date = patch.Date
	}
	if patch.Details != "" {
		value.Details = patch.Details
	}
	if patch.ScheduledAt != "" {
		if _, ok := patch.ScheduledTime(); !ok {
			return model.Reminder{}, errors.New("scheduledAt must use RFC3339")
		}
		value.ScheduledAt = patch.ScheduledAt
		value.TimeZone = patch.TimeZone
		value.NotificationStatus = model.NotificationPending
		value.NotificationSentAt = ""
		value.NotificationAttemptedAt = ""
	}
	s.reminders[id] = value
	if s.repository != nil {
		if err := s.repository.SaveReminder(value); err != nil {
			return model.Reminder{}, err
		}
	}
	return value, nil
}

// Patch applies an HTTP mutation, including explicitly clearing a scheduled
// notification while preserving date-only reminders.
func (s *Service) Patch(id string, patch model.Reminder, clearScheduledAt, setDetails bool) (model.Reminder, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	value, ok := s.reminders[id]
	if !ok {
		return model.Reminder{}, ErrNotFound
	}
	if patch.Title != "" {
		value.Title = patch.Title
	}
	if patch.Date != "" {
		value.Date = patch.Date
	}
	if setDetails {
		value.Details = patch.Details
	}
	if clearScheduledAt {
		value.ScheduledAt, value.TimeZone = "", ""
		value.NotificationStatus, value.NotificationSentAt, value.NotificationAttemptedAt = "", "", ""
	} else if patch.ScheduledAt != "" {
		if _, ok := patch.ScheduledTime(); !ok {
			return model.Reminder{}, errors.New("scheduledAt must use RFC3339")
		}
		value.ScheduledAt, value.TimeZone = patch.ScheduledAt, patch.TimeZone
		value.NotificationStatus, value.NotificationSentAt, value.NotificationAttemptedAt = model.NotificationPending, "", ""
	}
	if err := value.Validate(); err != nil {
		return model.Reminder{}, err
	}
	s.reminders[id] = value
	if s.repository != nil {
		if err := s.repository.SaveReminder(value); err != nil {
			return model.Reminder{}, err
		}
	}
	return value, nil
}

// ClaimDueNotifications marks due reminders as sending before any network
// request. A stale claim is retried after five minutes following a restart.
func (s *Service) ClaimDueNotifications(now time.Time) []model.Reminder {
	s.mu.Lock()
	defer s.mu.Unlock()
	claimed := []model.Reminder{}
	for id, value := range s.reminders {
		dueAt, hasTime := value.ScheduledTime()
		if !hasTime || dueAt.After(now) || value.NotificationStatus == model.NotificationSent {
			continue
		}
		if value.NotificationStatus == model.NotificationSending {
			attempted, err := time.Parse(time.RFC3339, value.NotificationAttemptedAt)
			if err == nil && attempted.Add(5*time.Minute).After(now) {
				continue
			}
		}
		value.NotificationStatus = model.NotificationSending
		value.NotificationAttemptedAt = now.UTC().Format(time.RFC3339)
		if s.repository != nil && s.repository.SaveReminder(value) != nil {
			continue
		}
		s.reminders[id] = value
		claimed = append(claimed, value)
	}
	return claimed
}

func (s *Service) CompleteNotification(id string, now time.Time, delivered bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	value, ok := s.reminders[id]
	if !ok {
		return ErrNotFound
	}
	if delivered {
		value.NotificationStatus = model.NotificationSent
		value.NotificationSentAt = now.UTC().Format(time.RFC3339)
	} else {
		value.NotificationStatus = model.NotificationPending
	}
	s.reminders[id] = value
	if s.repository != nil {
		return s.repository.SaveReminder(value)
	}
	return nil
}

func (s *Service) ResolveID(title, date string) string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.resolveID(title, date)
}

func (s *Service) resolveID(title, date string) string {
	match := ""
	for id, value := range s.reminders {
		if strings.EqualFold(strings.TrimSpace(value.Title), strings.TrimSpace(title)) && (date == "" || value.Date == date) {
			if match != "" {
				return "ambiguous"
			}
			match = id
		}
	}
	return match
}
func (s *Service) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.reminders[id]; !ok {
		return ErrNotFound
	}
	delete(s.reminders, id)
	if s.repository != nil {
		return s.repository.DeleteReminder(id)
	}
	return nil
}
