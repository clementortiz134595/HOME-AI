package homeassistant

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/clementortiz/home-ai/home-core/internal/weather/model"
)

var ErrUnavailable = errors.New("home assistant weather unavailable")

type Client struct {
	http                     *http.Client
	baseURL, token, entityID string
}

func NewClient(httpClient *http.Client, baseURL, token, entityID string) *Client {
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 15 * time.Second}
	}
	return &Client{http: httpClient, baseURL: strings.TrimRight(baseURL, "/"), token: token, entityID: entityID}
}

type stateResponse struct {
	State      string `json:"state"`
	Attributes struct {
		FriendlyName        string   `json:"friendly_name"`
		Temperature         *float64 `json:"temperature"`
		ApparentTemperature *float64 `json:"apparent_temperature"`
		Humidity            *float64 `json:"humidity"`
		Pressure            *float64 `json:"pressure"`
		WindSpeed           *float64 `json:"wind_speed"`
		WindBearing         *float64 `json:"wind_bearing"`
		WindGustSpeed       *float64 `json:"wind_gust_speed"`
		CloudCoverage       *float64 `json:"cloud_coverage"`
		UVIndex             *float64 `json:"uv_index"`
		Visibility          *float64 `json:"visibility"`
	} `json:"attributes"`
	LastUpdated time.Time `json:"last_updated"`
}

type forecastResponse struct {
	ServiceResponse map[string]struct {
		Forecast []forecast `json:"forecast"`
	} `json:"service_response"`
}

type forecast struct {
	Datetime                 time.Time `json:"datetime"`
	Condition                string    `json:"condition"`
	Temperature              *float64  `json:"temperature"`
	Templow                  *float64  `json:"templow"`
	ApparentTemperature      *float64  `json:"apparent_temperature"`
	Humidity                 *float64  `json:"humidity"`
	Pressure                 *float64  `json:"pressure"`
	PrecipitationProbability *float64  `json:"precipitation_probability"`
	Precipitation            *float64  `json:"precipitation"`
	WindSpeed                *float64  `json:"wind_speed"`
	WindBearing              *float64  `json:"wind_bearing"`
	WindGustSpeed            *float64  `json:"wind_gust_speed"`
	CloudCoverage            *float64  `json:"cloud_coverage"`
	UVIndex                  *float64  `json:"uv_index"`
	Visibility               *float64  `json:"visibility"`
}

func (c *Client) GetForecast(ctx context.Context, city string) (model.Report, error) {
	if c.baseURL == "" || c.token == "" || c.entityID == "" {
		return model.Report{}, fmt.Errorf("%w: configuration is incomplete", ErrUnavailable)
	}
	var current stateResponse
	if err := c.request(ctx, http.MethodGet, "/api/states/"+c.entityID, nil, &current); err != nil {
		return model.Report{}, err
	}
	daily, err := c.forecasts(ctx, "daily")
	if err != nil {
		return model.Report{}, err
	}
	hourly, err := c.forecasts(ctx, "hourly")
	if err != nil {
		return model.Report{}, err
	}
	name := current.Attributes.FriendlyName
	if name == "" {
		name = city
	}
	apparent := current.Attributes.ApparentTemperature
	if apparent == nil {
		apparent = current.Attributes.Temperature
	}
	return model.Report{Location: model.Location{Name: name, Timezone: "Europe/Paris"}, Current: model.Conditions{ObservedAt: current.LastUpdated, TemperatureCelsius: value(current.Attributes.Temperature), ApparentCelsius: value(apparent), WindSpeedKmh: value(current.Attributes.WindSpeed), Summary: model.WeatherConditionSummary(current.State), HumidityPercent: current.Attributes.Humidity, PressureHPa: current.Attributes.Pressure, WindBearingDegrees: current.Attributes.WindBearing, WindGustKmh: current.Attributes.WindGustSpeed, CloudCoverage: current.Attributes.CloudCoverage, UVIndex: current.Attributes.UVIndex, VisibilityKm: current.Attributes.Visibility}, Daily: toDaily(daily), Hourly: toHourly(hourly)}, nil
}

func (c *Client) forecasts(ctx context.Context, kind string) ([]forecast, error) {
	var response forecastResponse
	if err := c.request(ctx, http.MethodPost, "/api/services/weather/get_forecasts?return_response", map[string]any{"entity_id": c.entityID, "type": kind}, &response); err != nil {
		return nil, err
	}
	entry, found := response.ServiceResponse[c.entityID]
	if !found {
		return nil, fmt.Errorf("%w: no %s forecast for %s", ErrUnavailable, kind, c.entityID)
	}
	return entry.Forecast, nil
}

func (c *Client) request(ctx context.Context, method, path string, body any, target any) error {
	var reader *strings.Reader
	if body != nil {
		payload, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = strings.NewReader(string(payload))
	} else {
		reader = strings.NewReader("")
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, reader)
	if err != nil {
		return fmt.Errorf("%w: create request: %v", ErrUnavailable, err)
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("%w: request: %v", ErrUnavailable, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("%w: Home Assistant returned HTTP %d", ErrUnavailable, resp.StatusCode)
	}
	if err := json.NewDecoder(resp.Body).Decode(target); err != nil {
		return fmt.Errorf("%w: decode response: %v", ErrUnavailable, err)
	}
	return nil
}

func toDaily(items []forecast) []model.DailyForecast {
	result := make([]model.DailyForecast, 0, len(items))
	for _, item := range items {
		result = append(result, model.DailyForecast{Date: item.Datetime.In(time.Local).Format("2006-01-02"), MinimumCelsius: value(item.Templow), MaximumCelsius: value(item.Temperature), PrecipitationProbability: int(value(item.PrecipitationProbability)), Summary: model.WeatherConditionSummary(item.Condition), Condition: item.Condition, HumidityPercent: item.Humidity, PressureHPa: item.Pressure, WindSpeedKmh: item.WindSpeed, WindBearingDegrees: item.WindBearing, WindGustKmh: item.WindGustSpeed, PrecipitationMillimeters: item.Precipitation})
	}
	return result
}
func toHourly(items []forecast) []model.HourlyForecast {
	result := make([]model.HourlyForecast, 0, len(items))
	for _, item := range items {
		result = append(result, model.HourlyForecast{ForecastAt: item.Datetime, Condition: item.Condition, Summary: model.WeatherConditionSummary(item.Condition), TemperatureCelsius: item.Temperature, ApparentCelsius: item.ApparentTemperature, HumidityPercent: item.Humidity, PressureHPa: item.Pressure, PrecipitationProbability: item.PrecipitationProbability, PrecipitationMillimeters: item.Precipitation, WindSpeedKmh: item.WindSpeed, WindBearingDegrees: item.WindBearing, WindGustKmh: item.WindGustSpeed, CloudCoverage: item.CloudCoverage, UVIndex: item.UVIndex, VisibilityKm: item.Visibility})
	}
	return result
}
func value(number *float64) float64 {
	if number == nil {
		return 0
	}
	return *number
}
