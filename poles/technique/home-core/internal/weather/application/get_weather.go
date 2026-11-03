package application

import (
	"context"
	"fmt"

	"github.com/clementortiz/home-ai/home-core/internal/weather/model"
)

type ForecastProvider interface {
	GetForecast(context.Context, string) (model.Report, error)
}

type GetWeather struct {
	provider ForecastProvider
}

func NewGetWeather(provider ForecastProvider) GetWeather {
	return GetWeather{provider: provider}
}

func (useCase GetWeather) Execute(ctx context.Context, city string) (model.Report, error) {
	if city != model.LaCiotat {
		return model.Report{}, fmt.Errorf("weather is not configured for %q", city)
	}
	return useCase.provider.GetForecast(ctx, city)
}
