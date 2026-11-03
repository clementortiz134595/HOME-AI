package weatherhttp

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/clementortiz/home-ai/home-core/internal/weather/adapters/outbound/openmeteo"
	weatherapp "github.com/clementortiz/home-ai/home-core/internal/weather/application"
	"github.com/clementortiz/home-ai/home-core/internal/weather/model"
)

type stubForecastProvider struct {
	report model.Report
	err    error
}

func (provider stubForecastProvider) GetForecast(_ context.Context, _ string) (model.Report, error) {
	return provider.report, provider.err
}

func TestHandlerServesLaCiotatWeather(t *testing.T) {
	handler := NewHandler(weatherapp.NewGetWeather(stubForecastProvider{
		report: model.Report{Location: model.Location{Name: model.LaCiotat}},
	}))

	request := httptest.NewRequest(http.MethodGet, "/v1/weather/la-ciotat", nil)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusOK)
	}
	if got := response.Header().Get("Content-Type"); got != "application/json; charset=utf-8" {
		t.Fatalf("Content-Type = %q", got)
	}
}

func TestHandlerReturnsBadGatewayWhenWeatherIsUnavailable(t *testing.T) {
	handler := NewHandler(weatherapp.NewGetWeather(stubForecastProvider{err: openmeteo.ErrUnavailable}))

	request := httptest.NewRequest(http.MethodGet, "/v1/weather/la-ciotat", nil)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusBadGateway {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusBadGateway)
	}
}

func TestHandlerDoesNotExposeUnknownRoutes(t *testing.T) {
	handler := NewHandler(weatherapp.NewGetWeather(stubForecastProvider{err: errors.New("should not be called")}))

	request := httptest.NewRequest(http.MethodGet, "/v1/weather/marseille", nil)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusNotFound)
	}
}
