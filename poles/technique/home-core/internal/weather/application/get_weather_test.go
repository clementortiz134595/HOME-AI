package application

import (
	"context"
	"errors"
	"testing"

	"github.com/clementortiz/home-ai/home-core/internal/weather/model"
)

type fakeForecastProvider struct {
	calledWith string
	report     model.Report
	err        error
}

func (provider *fakeForecastProvider) GetForecast(_ context.Context, city string) (model.Report, error) {
	provider.calledWith = city
	return provider.report, provider.err
}

func TestGetWeatherReturnsLaCiotatForecast(t *testing.T) {
	provider := &fakeForecastProvider{report: model.Report{Location: model.Location{Name: model.LaCiotat}}}
	useCase := NewGetWeather(provider)

	report, err := useCase.Execute(context.Background(), model.LaCiotat)

	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}
	if provider.calledWith != model.LaCiotat {
		t.Fatalf("provider called with %q, want %q", provider.calledWith, model.LaCiotat)
	}
	if report.Location.Name != model.LaCiotat {
		t.Fatalf("location = %q, want %q", report.Location.Name, model.LaCiotat)
	}
}

func TestGetWeatherRejectsAnotherCityWithoutCallingProvider(t *testing.T) {
	provider := &fakeForecastProvider{}
	useCase := NewGetWeather(provider)

	_, err := useCase.Execute(context.Background(), "Marseille")

	if err == nil {
		t.Fatal("Execute() error = nil, want an error")
	}
	if provider.calledWith != "" {
		t.Fatalf("provider called with %q, want no call", provider.calledWith)
	}
}

func TestGetWeatherPropagatesProviderFailure(t *testing.T) {
	want := errors.New("provider unavailable")
	provider := &fakeForecastProvider{err: want}
	useCase := NewGetWeather(provider)

	_, err := useCase.Execute(context.Background(), model.LaCiotat)

	if !errors.Is(err, want) {
		t.Fatalf("Execute() error = %v, want %v", err, want)
	}
}
