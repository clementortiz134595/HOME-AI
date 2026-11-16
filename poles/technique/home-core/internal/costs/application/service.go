package application

import (
	"sort"
	"time"

	"github.com/clementortiz/home-ai/home-core/internal/costs/model"
)

type Repository interface {
	ListCostEntries(from, to time.Time) ([]model.Entry, error)
}

type Service struct {
	repository Repository
	now        func() time.Time
}

func NewService(repository Repository) *Service {
	return &Service{repository: repository, now: time.Now}
}

func (s *Service) Summary() (model.Summary, error) {
	now := s.now().UTC()
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	from := monthStart.AddDate(0, -11, 0)
	to := monthStart.AddDate(0, 1, 0)
	entries, err := s.repository.ListCostEntries(from, to)
	if err != nil {
		return model.Summary{}, err
	}

	monthly := make(map[time.Time]int64, 12)
	for start := from; start.Before(to); start = start.AddDate(0, 1, 0) {
		monthly[start] = 0
	}
	breakdown := map[string]int64{}
	for _, entry := range entries {
		start := time.Date(entry.OccurredAt.UTC().Year(), entry.OccurredAt.UTC().Month(), 1, 0, 0, 0, 0, time.UTC)
		monthly[start] += entry.AmountCents
		if start.Equal(monthStart) {
			breakdown[entry.Category] += entry.AmountCents
		}
	}

	history := make([]model.Month, 0, 12)
	for start := from; start.Before(to); start = start.AddDate(0, 1, 0) {
		history = append(history, model.Month{Start: start, AmountCents: monthly[start]})
	}
	current := monthly[monthStart]
	previous := monthly[monthStart.AddDate(0, -1, 0)]
	result := model.Summary{Currency: "EUR", MonthAmountCents: current, PreviousMonthCents: previous, Breakdown: []model.CategoryTotal{}, History: history, DataStatus: "empty"}
	if len(entries) == 0 {
		return result, nil
	}
	result.DataStatus = "available"
	daysInMonth := time.Date(now.Year(), now.Month()+1, 0, 0, 0, 0, 0, time.UTC).Day()
	if now.Day() > 0 {
		result.ProjectionCents = current * int64(daysInMonth) / int64(now.Day())
	}
	for category, amount := range breakdown {
		result.Breakdown = append(result.Breakdown, model.CategoryTotal{Category: category, AmountCents: amount})
	}
	sort.Slice(result.Breakdown, func(i, j int) bool { return result.Breakdown[i].AmountCents > result.Breakdown[j].AmountCents })
	if len(result.Breakdown) > 0 {
		largest := result.Breakdown[0]
		result.LargestCategory = &largest
	}
	return result, nil
}
