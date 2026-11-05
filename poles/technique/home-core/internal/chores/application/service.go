package application

import (
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/clementortiz/home-ai/home-core/internal/chores/model"
)

var ErrNotFound = errors.New("chore not found")
var ErrAmbiguous = errors.New("chore selector is ambiguous")

type Service struct {
	mu         sync.RWMutex
	chores     map[string]model.Chore
	next       int
	repository Repository
}
type Repository interface {
	ListChores() ([]model.Chore, error)
	SaveChore(model.Chore) error
	DeleteChore(string) error
}

func NewService(repositories ...Repository) *Service {
	s := &Service{chores: make(map[string]model.Chore)}
	if len(repositories) > 0 && repositories[0] != nil {
		s.repository = repositories[0]
		if values, err := repositories[0].ListChores(); err == nil {
			for _, value := range values {
				s.chores[value.ID] = value
			}
		}
	}
	if s.repository != nil && len(s.chores) == 0 {
		for _, chore := range DefaultChores(time.Now()) {
			_, _ = s.Create(chore)
		}
	}
	return s
}

func (s *Service) List() []model.Chore {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make([]model.Chore, 0, len(s.chores))
	for _, chore := range s.chores {
		result = append(result, chore)
	}
	return result
}

// Weekly returns only occurrences due in the ISO week containing weekStart.
// Date is the recurrence anchor; assignments rotate by occurrence, not by calendar month.
func (s *Service) Weekly(weekStart time.Time) []model.Chore {
	s.mu.RLock()
	defer s.mu.RUnlock()
	start := dateOnly(weekStart)
	for start.Weekday() != time.Monday {
		start = start.AddDate(0, 0, -1)
	}
	end := start.AddDate(0, 0, 7)
	result := make([]model.Chore, 0)
	for _, chore := range s.chores {
		anchor, err := time.Parse("2006-01-02", chore.Date)
		if err != nil {
			continue
		}
		for day := start; day.Before(end); day = day.AddDate(0, 0, 1) {
			if !occursOn(chore, anchor, day) {
				continue
			}
			occurrence := chore
			occurrence.DueDate = day.Format("2006-01-02")
			occurrence.Completed = false
			if chore.Alternating && len(chore.Assignees) > 0 {
				occurrence.Assignees = []string{chore.Assignees[occurrenceIndex(chore, anchor, day)%len(chore.Assignees)]}
			}
			result = append(result, occurrence)
		}
	}
	sort.Slice(result, func(i, j int) bool { return result[i].DueDate+result[i].ID < result[j].DueDate+result[j].ID })
	return result
}

func dateOnly(value time.Time) time.Time {
	y, m, d := value.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, value.Location())
}
func occursOn(chore model.Chore, anchor, day time.Time) bool {
	if day.Before(anchor) {
		return false
	}
	days := int(day.Sub(anchor).Hours() / 24)
	switch chore.Frequency {
	case "daily":
		return true
	case "every_3_days":
		return days%3 == 0
	case "weekly", "weekend":
		if chore.Frequency == "weekend" {
			return day.Weekday() == time.Saturday
		}
		return days%7 == 0
	case "every_15_days":
		return days%15 == 0
	case "monthly":
		return day.Day() == anchor.Day()
	case "every_3_months":
		return day.Day() == anchor.Day() && ((day.Year()-anchor.Year())*12+int(day.Month()-anchor.Month()))%3 == 0
	case "every_6_months":
		return day.Day() == anchor.Day() && ((day.Year()-anchor.Year())*12+int(day.Month()-anchor.Month()))%6 == 0
	case "":
		return day.Equal(anchor)
	default:
		return chore.IntervalWeeks > 0 && days%(chore.IntervalWeeks*7) == 0
	}
}
func occurrenceIndex(chore model.Chore, anchor, day time.Time) int {
	days := int(day.Sub(anchor).Hours() / 24)
	switch chore.Frequency {
	case "monthly":
		return (day.Year()-anchor.Year())*12 + int(day.Month()-anchor.Month())
	case "every_3_months":
		return ((day.Year()-anchor.Year())*12 + int(day.Month()-anchor.Month())) / 3
	case "every_6_months":
		return ((day.Year()-anchor.Year())*12 + int(day.Month()-anchor.Month())) / 6
	}
	if chore.Frequency == "weekly" || chore.Frequency == "weekend" {
		return days / 7
	}
	return days
}

func (s *Service) Create(chore model.Chore) (model.Chore, error) {
	if err := validate(chore); err != nil {
		return model.Chore{}, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.next++
	chore.ID = fmt.Sprintf("chore-%d", s.next)
	s.chores[chore.ID] = chore
	if s.repository != nil {
		if err := s.repository.SaveChore(chore); err != nil {
			return model.Chore{}, err
		}
	}
	return chore, nil
}

func (s *Service) Update(id string, patch model.Chore) (model.Chore, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if id == "" {
		id = s.resolveID(patch.Objective, patch.Date)
		if id == "" {
			return model.Chore{}, ErrNotFound
		}
		if id == "ambiguous" {
			return model.Chore{}, ErrAmbiguous
		}
	}
	current, ok := s.chores[id]
	if !ok {
		return model.Chore{}, ErrNotFound
	}
	if strings.TrimSpace(patch.Objective) != "" {
		current.Objective = patch.Objective
	}
	if patch.Date != "" {
		current.Date = patch.Date
	}
	if len(patch.Assignees) > 0 {
		current.Assignees = patch.Assignees
	}
	if patch.Frequency != "" {
		current.Frequency = patch.Frequency
	}
	if patch.IntervalWeeks != 0 {
		current.IntervalWeeks = patch.IntervalWeeks
	}
	if patch.Alternating {
		current.Alternating = true
	}
	if err := validate(current); err != nil {
		return model.Chore{}, err
	}
	s.chores[id] = current
	if s.repository != nil {
		if err := s.repository.SaveChore(current); err != nil {
			return model.Chore{}, err
		}
	}
	return current, nil
}

func (s *Service) ResolveID(objective, date string) string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.resolveID(objective, date)
}

func (s *Service) resolveID(objective, date string) string {
	match := ""
	for id, value := range s.chores {
		if strings.EqualFold(strings.TrimSpace(value.Objective), strings.TrimSpace(objective)) && (date == "" || value.Date == date) {
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
	if _, ok := s.chores[id]; !ok {
		return ErrNotFound
	}
	delete(s.chores, id)
	if s.repository != nil {
		return s.repository.DeleteChore(id)
	}
	return nil
}

func (s *Service) SetCompleted(id string, completed bool) (model.Chore, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	chore, ok := s.chores[id]
	if !ok {
		return model.Chore{}, ErrNotFound
	}
	chore.Completed = completed
	s.chores[id] = chore
	if s.repository != nil {
		if err := s.repository.SaveChore(chore); err != nil {
			return model.Chore{}, err
		}
	}
	return chore, nil
}

func validate(chore model.Chore) error {
	if strings.TrimSpace(chore.Objective) == "" {
		return errors.New("objective is required")
	}
	if len(chore.Assignees) == 0 {
		return errors.New("at least one assignee is required")
	}
	if chore.Alternating && len(chore.Assignees) < 2 {
		return errors.New("an alternating chore needs two assignees")
	}
	if chore.Frequency != "" && !map[string]bool{"daily": true, "every_3_days": true, "weekly": true, "weekend": true, "every_15_days": true, "monthly": true, "every_3_months": true, "every_6_months": true}[chore.Frequency] {
		return errors.New("unsupported frequency")
	}
	return nil
}
