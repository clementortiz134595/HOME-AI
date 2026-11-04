package application

import ("errors"; "fmt"; "strings"; "sync"; "github.com/clementortiz/home-ai/home-core/internal/reminders/model")
var ErrNotFound = errors.New("reminder not found")
type Service struct { mu sync.RWMutex; reminders map[string]model.Reminder; next int }
func NewService() *Service { return &Service{reminders: map[string]model.Reminder{}} }
func (s *Service) Create(value model.Reminder) (model.Reminder, error) { if strings.TrimSpace(value.Title)=="" || strings.TrimSpace(value.Date)=="" { return model.Reminder{}, errors.New("title and date are required") }; s.mu.Lock(); defer s.mu.Unlock(); s.next++; value.ID=fmt.Sprintf("reminder-%d",s.next); s.reminders[value.ID]=value; return value,nil }
func (s *Service) Update(id string, patch model.Reminder) (model.Reminder,error) { s.mu.Lock(); defer s.mu.Unlock(); value,ok:=s.reminders[id]; if !ok{return model.Reminder{},ErrNotFound}; if patch.Title!=""{value.Title=patch.Title};if patch.Date!=""{value.Date=patch.Date};if patch.Details!=""{value.Details=patch.Details};s.reminders[id]=value;return value,nil }
func (s *Service) Delete(id string) error { s.mu.Lock();defer s.mu.Unlock();if _,ok:=s.reminders[id];!ok{return ErrNotFound};delete(s.reminders,id);return nil }
