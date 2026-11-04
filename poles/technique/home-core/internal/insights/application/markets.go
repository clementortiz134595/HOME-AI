package application

import (
	"context"
	"github.com/clementortiz/home-ai/home-core/internal/insights/model"
)

type MarketHistoryProvider interface {
	History(context.Context, string, string) (model.MarketHistory, error)
}

type GetMarketHistory struct{ provider MarketHistoryProvider }

func NewGetMarketHistory(provider MarketHistoryProvider) *GetMarketHistory {
	return &GetMarketHistory{provider: provider}
}

func (g *GetMarketHistory) Execute(ctx context.Context, symbol, period string) (model.MarketHistory, error) {
	return g.provider.History(ctx, symbol, period)
}
