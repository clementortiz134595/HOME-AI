package application

import (
	"errors"
	"fmt"
	"strings"
	"sync"

	"github.com/clementortiz/home-ai/home-core/internal/chores/model"
)

var ErrNotFound = errors.New("chore not found")

type Service struct { mu sync.RWMutex; chores map[string]model.Chore; next int }

func NewService() *Service { return &Service{chores: make(map[string]model.Chore)} }

func (s *Service) List() []model.Chore { s.mu.RLock(); defer s.mu.RUnlock(); result := make([]model.Chore, 0, len(s.chores)); for _, chore := range s.chores { result = append(result, chore) }; return result }

func (s *Service) Create(chore model.Chore) (model.Chore, error) {
	if err := validate(chore); err != nil { return model.Chore{}, err }
	s.mu.Lock(); defer s.mu.Unlock(); s.next++; chore.ID = fmt.Sprintf("chore-%d", s.next); s.chores[chore.ID] = chore; return chore, nil
}

func (s *Service) Update(id string, patch model.Chore) (model.Chore, error) {
	s.mu.Lock(); defer s.mu.Unlock(); current, ok := s.chores[id]; if !ok { return model.Chore{}, ErrNotFound }
	if strings.TrimSpace(patch.Objective) != "" { current.Objective = patch.Objective }; if patch.Date != "" { current.Date = patch.Date }; if len(patch.Assignees) > 0 { current.Assignees = patch.Assignees }; if patch.Frequency != "" { current.Frequency = patch.Frequency }; if patch.IntervalWeeks != 0 { current.IntervalWeeks = patch.IntervalWeeks }; if patch.Alternating { current.Alternating = true }
	if err := validate(current); err != nil { return model.Chore{}, err }; s.chores[id] = current; return current, nil
}

func (s *Service) Delete(id string) error { s.mu.Lock(); defer s.mu.Unlock(); if _, ok := s.chores[id]; !ok { return ErrNotFound }; delete(s.chores, id); return nil }

func (s *Service) SetCompleted(id string, completed bool) (model.Chore, error) { s.mu.Lock(); defer s.mu.Unlock(); chore, ok := s.chores[id]; if !ok { return model.Chore{}, ErrNotFound }; chore.Completed = completed; s.chores[id] = chore; return chore, nil }

func validate(chore model.Chore) error { if strings.TrimSpace(chore.Objective) == "" { return errors.New("objective is required") }; if len(chore.Assignees) == 0 { return errors.New("at least one assignee is required") }; if chore.Alternating && len(chore.Assignees) < 2 { return errors.New("an alternating chore needs two assignees") }; if chore.Frequency != "" && chore.Frequency != "weekly" { return errors.New("unsupported frequency") }; return nil }
