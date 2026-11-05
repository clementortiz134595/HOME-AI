package application

import (
	"errors"
	"fmt"
	"github.com/clementortiz/home-ai/home-core/internal/reminders/model"
	"log/slog"
	"strconv"
	"strings"
	"sync"
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
	if strings.TrimSpace(value.Title) == "" || strings.TrimSpace(value.Date) == "" {
		slog.Warn("reminder validation failed", "reason", "title_and_date_required")
		return model.Reminder{}, errors.New("title and date are required")
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
	s.reminders[id] = value
	if s.repository != nil {
		if err := s.repository.SaveReminder(value); err != nil {
			return model.Reminder{}, err
		}
	}
	return value, nil
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
