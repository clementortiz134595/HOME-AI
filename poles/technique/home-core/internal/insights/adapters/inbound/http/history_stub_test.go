package insightshttp

import (
	"context"
	"github.com/clementortiz/home-ai/home-core/internal/insights/model"
	"time"
)

type stubHistoryProvider struct{ points int }

func (s stubHistoryProvider) History(context.Context, string, string) (model.MarketHistory, error) {
	points := make([]model.MarketPoint, s.points)
	for i := range points {
		points[i] = model.MarketPoint{Time: time.Date(2026, 1, i+1, 0, 0, 0, 0, time.UTC), Value: float64(i + 1)}
	}
	return model.MarketHistory{Points: points, Status: "live"}, nil
}
