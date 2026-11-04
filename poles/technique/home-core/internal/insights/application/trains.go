package application

import (
	"context"
	"github.com/clementortiz/home-ai/home-core/internal/insights/model"
)

type TrainProvider interface {
	Departures(context.Context) ([]model.Train, error)
}
type GetTrains struct{ provider TrainProvider }

func NewGetTrains(provider TrainProvider) *GetTrains { return &GetTrains{provider: provider} }
func (g *GetTrains) Execute(ctx context.Context) ([]model.Train, error) {
	return g.provider.Departures(ctx)
}
