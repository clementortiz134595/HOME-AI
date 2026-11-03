package openmeteo

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/clementortiz/home-ai/home-core/internal/weather/model"
)

func TestClientGetsLaCiotatForecast(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		switch request.URL.Path {
		case "/geocoding":
			if got := request.URL.Query().Get("countryCode"); got != "FR" {
				t.Fatalf("countryCode = %q, want FR", got)
			}
			_, _ = writer.Write([]byte(`{"results":[{"name":"La Ciotat","country":"France","country_code":"FR","latitude":43.1748,"longitude":5.6045,"timezone":"Europe/Paris"}]}`))
		case "/forecast":
			if got := request.URL.Query().Get("timezone"); got != "Europe/Paris" {
				t.Fatalf("timezone = %q, want Europe/Paris", got)
			}
			if got := request.URL.Query().Get("hourly"); got == "" {
				t.Fatal("hourly query is missing")
			}
			_, _ = writer.Write([]byte(`{"current":{"time":"2026-11-03T10:00","temperature_2m":18.2,"apparent_temperature":17.5,"weather_code":2,"wind_speed_10m":12.4},"hourly":{"time":["2026-11-03T09:00","2026-11-03T15:00","2026-11-03T21:00"],"temperature_2m":[16.2,20.1,14.8],"apparent_temperature":[15.6,19.5,14.0],"precipitation_probability":[5,10,25],"weather_code":[2,1,3]},"daily":{"time":["2026-11-03","2026-11-04"],"weather_code":[2,61],"temperature_2m_max":[20.1,17.4],"temperature_2m_min":[13.3,12.1],"precipitation_probability_max":[5,70]}}`))
		default:
			http.NotFound(writer, request)
		}
	}))
	defer server.Close()

	client := NewClient(server.Client())
	client.geocodingURL = server.URL + "/geocoding"
	client.forecastURL = server.URL + "/forecast"

	report, err := client.GetForecast(context.Background(), model.LaCiotat)

	if err != nil {
		t.Fatalf("GetForecast() error = %v", err)
	}
	if report.Current.Summary != "partiellement nuageux" {
		t.Fatalf("current summary = %q", report.Current.Summary)
	}
	if len(report.Daily) != 2 || report.Daily[1].Summary != "pluie faible" {
		t.Fatalf("daily = %#v", report.Daily)
	}
	if len(report.Today) != 3 || report.Today[0].Period != "morning" || report.Today[2].ForecastAt.Hour() != 21 {
		t.Fatalf("today = %#v", report.Today)
	}
}

func TestClientReturnsUnavailableWhenProviderFails(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		http.Error(writer, "unavailable", http.StatusServiceUnavailable)
	}))
	defer server.Close()

	client := NewClient(server.Client())
	client.geocodingURL = server.URL

	_, err := client.GetForecast(context.Background(), model.LaCiotat)

	if err == nil || !strings.Contains(err.Error(), ErrUnavailable.Error()) {
		t.Fatalf("GetForecast() error = %v, want unavailable error", err)
	}
}
