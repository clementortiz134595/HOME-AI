package homeassistant

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestClientReadsCurrentDailyAndHourlyWeather(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer token" {
			t.Fatal("missing Home Assistant token")
		}
		switch r.URL.Path {
		case "/api/states/weather.maison":
			_, _ = w.Write([]byte(`{"state":"partlycloudy","last_updated":"2026-11-15T10:00:00Z","attributes":{"friendly_name":"Maison","temperature":18.2,"apparent_temperature":17.5,"humidity":71,"pressure":1018,"wind_speed":12.4}}`))
		case "/api/services/weather/get_forecasts":
			if r.URL.Query().Get("return_response") != "" {
				t.Fatal("return_response query missing")
			}
			var body struct {
				Type string `json:"type"`
			}
			_ = json.NewDecoder(r.Body).Decode(&body)
			if body.Type == "daily" {
				_, _ = w.Write([]byte(`{"service_response":{"weather.maison":{"forecast":[{"datetime":"2026-11-16T00:00:00Z","condition":"rainy","temperature":19,"templow":12,"precipitation_probability":80}]}}}`))
				return
			}
			_, _ = w.Write([]byte(`{"service_response":{"weather.maison":{"forecast":[{"datetime":"2026-11-15T11:00:00Z","condition":"sunny","temperature":18,"humidity":70,"pressure":1017,"wind_speed":9}]}}}`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()
	report, err := NewClient(server.Client(), server.URL, "token", "weather.maison").GetForecast(context.Background(), "La Ciotat")
	if err != nil {
		t.Fatalf("GetForecast() error = %v", err)
	}
	if report.Current.PressureHPa == nil || *report.Current.PressureHPa != 1018 {
		t.Fatalf("current = %#v", report.Current)
	}
	if len(report.Daily) != 1 || report.Daily[0].Summary != "pluie" {
		t.Fatalf("daily = %#v", report.Daily)
	}
	if len(report.Hourly) != 1 || report.Hourly[0].Summary != "ensoleille" {
		t.Fatalf("hourly = %#v", report.Hourly)
	}
}
