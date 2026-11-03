package openmeteo

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/clementortiz/home-ai/home-core/internal/weather/model"
)

const (
	defaultGeocodingURL = "https://geocoding-api.open-meteo.com/v1/search"
	defaultForecastURL  = "https://api.open-meteo.com/v1/forecast"
)

var ErrUnavailable = errors.New("weather provider unavailable")

type Client struct {
	httpClient   *http.Client
	geocodingURL string
	forecastURL  string
}

func NewClient(httpClient *http.Client) *Client {
	return &Client{
		httpClient:   httpClient,
		geocodingURL: defaultGeocodingURL,
		forecastURL:  defaultForecastURL,
	}
}

func (client *Client) GetForecast(ctx context.Context, city string) (model.Report, error) {
	location, err := client.findLocation(ctx, city)
	if err != nil {
		return model.Report{}, err
	}

	endpoint, err := url.Parse(client.forecastURL)
	if err != nil {
		return model.Report{}, fmt.Errorf("build forecast request: %w", err)
	}
	query := endpoint.Query()
	query.Set("latitude", strconv.FormatFloat(location.Latitude, 'f', -1, 64))
	query.Set("longitude", strconv.FormatFloat(location.Longitude, 'f', -1, 64))
	query.Set("current", "temperature_2m,apparent_temperature,weather_code,wind_speed_10m")
	query.Set("hourly", "temperature_2m,apparent_temperature,precipitation_probability,weather_code")
	query.Set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max")
	query.Set("forecast_days", "3")
	query.Set("timezone", location.Timezone)
	endpoint.RawQuery = query.Encode()

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return model.Report{}, fmt.Errorf("create forecast request: %w", err)
	}

	response, err := client.httpClient.Do(request)
	if err != nil {
		return model.Report{}, fmt.Errorf("%w: forecast request: %v", ErrUnavailable, err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return model.Report{}, fmt.Errorf("%w: forecast returned status %d", ErrUnavailable, response.StatusCode)
	}

	var payload forecastResponse
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return model.Report{}, fmt.Errorf("%w: decode forecast response: %v", ErrUnavailable, err)
	}
	return payload.toReport(location)
}

func (client *Client) findLocation(ctx context.Context, city string) (model.Location, error) {
	endpoint, err := url.Parse(client.geocodingURL)
	if err != nil {
		return model.Location{}, fmt.Errorf("build geocoding request: %w", err)
	}
	query := endpoint.Query()
	query.Set("name", city)
	query.Set("count", "1")
	query.Set("language", "fr")
	query.Set("countryCode", "FR")
	endpoint.RawQuery = query.Encode()

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return model.Location{}, fmt.Errorf("create geocoding request: %w", err)
	}

	response, err := client.httpClient.Do(request)
	if err != nil {
		return model.Location{}, fmt.Errorf("%w: geocoding request: %v", ErrUnavailable, err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return model.Location{}, fmt.Errorf("%w: geocoding returned status %d", ErrUnavailable, response.StatusCode)
	}

	var payload geocodingResponse
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return model.Location{}, fmt.Errorf("%w: decode geocoding response: %v", ErrUnavailable, err)
	}
	if len(payload.Results) == 0 {
		return model.Location{}, fmt.Errorf("%w: city %q was not found", ErrUnavailable, city)
	}

	place := payload.Results[0]
	if !strings.EqualFold(place.Name, city) || place.CountryCode != "FR" || place.Timezone == "" {
		return model.Location{}, fmt.Errorf("%w: geocoding did not return the expected French city", ErrUnavailable)
	}
	return model.Location{
		Name: place.Name, Country: place.Country, Latitude: place.Latitude,
		Longitude: place.Longitude, Timezone: place.Timezone,
	}, nil
}

type geocodingResponse struct {
	Results []struct {
		Name        string  `json:"name"`
		Country     string  `json:"country"`
		CountryCode string  `json:"country_code"`
		Latitude    float64 `json:"latitude"`
		Longitude   float64 `json:"longitude"`
		Timezone    string  `json:"timezone"`
	} `json:"results"`
}

type forecastResponse struct {
	Current struct {
		Time        string  `json:"time"`
		Temperature float64 `json:"temperature_2m"`
		Apparent    float64 `json:"apparent_temperature"`
		WeatherCode int     `json:"weather_code"`
		WindSpeed   float64 `json:"wind_speed_10m"`
	} `json:"current"`
	Daily struct {
		Time                 []string  `json:"time"`
		WeatherCode          []int     `json:"weather_code"`
		MaximumTemperature   []float64 `json:"temperature_2m_max"`
		MinimumTemperature   []float64 `json:"temperature_2m_min"`
		PrecipitationMaximum []int     `json:"precipitation_probability_max"`
	} `json:"daily"`
	Hourly struct {
		Time                     []string  `json:"time"`
		Temperature              []float64 `json:"temperature_2m"`
		Apparent                 []float64 `json:"apparent_temperature"`
		PrecipitationProbability []int     `json:"precipitation_probability"`
		WeatherCode              []int     `json:"weather_code"`
	} `json:"hourly"`
}

func (response forecastResponse) toReport(location model.Location) (model.Report, error) {
	locationTimezone, err := time.LoadLocation(location.Timezone)
	if err != nil {
		return model.Report{}, fmt.Errorf("%w: invalid location timezone", ErrUnavailable)
	}
	observedAt, err := time.ParseInLocation("2006-01-02T15:04", response.Current.Time, locationTimezone)
	if err != nil {
		return model.Report{}, fmt.Errorf("%w: invalid current weather time", ErrUnavailable)
	}

	dailyCount := len(response.Daily.Time)
	if len(response.Daily.WeatherCode) != dailyCount || len(response.Daily.MaximumTemperature) != dailyCount || len(response.Daily.MinimumTemperature) != dailyCount || len(response.Daily.PrecipitationMaximum) != dailyCount {
		return model.Report{}, fmt.Errorf("%w: incomplete daily forecast", ErrUnavailable)
	}

	daily := make([]model.DailyForecast, 0, dailyCount)
	for index, date := range response.Daily.Time {
		code := response.Daily.WeatherCode[index]
		daily = append(daily, model.DailyForecast{
			Date: date, MinimumCelsius: response.Daily.MinimumTemperature[index], MaximumCelsius: response.Daily.MaximumTemperature[index],
			PrecipitationProbability: response.Daily.PrecipitationMaximum[index], WeatherCode: code, Summary: model.WeatherSummary(code),
		})
	}

	today, err := response.todayPeriods(observedAt, locationTimezone)
	if err != nil {
		return model.Report{}, err
	}

	return model.Report{
		Location: location,
		Current: model.Conditions{
			ObservedAt: observedAt, TemperatureCelsius: response.Current.Temperature, ApparentCelsius: response.Current.Apparent,
			WindSpeedKmh: response.Current.WindSpeed, WeatherCode: response.Current.WeatherCode, Summary: model.WeatherSummary(response.Current.WeatherCode),
		},
		Today: today,
		Daily: daily,
	}, nil
}

func (response forecastResponse) todayPeriods(observedAt time.Time, locationTimezone *time.Location) ([]model.DayPeriodForecast, error) {
	hourlyCount := len(response.Hourly.Time)
	if len(response.Hourly.Temperature) != hourlyCount || len(response.Hourly.Apparent) != hourlyCount || len(response.Hourly.PrecipitationProbability) != hourlyCount || len(response.Hourly.WeatherCode) != hourlyCount {
		return nil, fmt.Errorf("%w: incomplete hourly forecast", ErrUnavailable)
	}

	type periodDefinition struct {
		name string
		hour int
	}
	periods := []periodDefinition{{name: "morning", hour: 9}, {name: "afternoon", hour: 15}, {name: "evening", hour: 21}}
	byTime := make(map[string]int, hourlyCount)
	for index, value := range response.Hourly.Time {
		byTime[value] = index
	}

	today := observedAt.In(locationTimezone).Format("2006-01-02")
	result := make([]model.DayPeriodForecast, 0, len(periods))
	for _, period := range periods {
		key := fmt.Sprintf("%sT%02d:00", today, period.hour)
		index, found := byTime[key]
		if !found {
			return nil, fmt.Errorf("%w: missing %s forecast", ErrUnavailable, period.name)
		}
		forecastAt, err := time.ParseInLocation("2006-01-02T15:04", key, locationTimezone)
		if err != nil {
			return nil, fmt.Errorf("%w: invalid %s forecast time", ErrUnavailable, period.name)
		}
		code := response.Hourly.WeatherCode[index]
		result = append(result, model.DayPeriodForecast{
			Period: period.name, ForecastAt: forecastAt, TemperatureCelsius: response.Hourly.Temperature[index],
			ApparentCelsius: response.Hourly.Apparent[index], PrecipitationProbability: response.Hourly.PrecipitationProbability[index],
			WeatherCode: code, Summary: model.WeatherSummary(code),
		})
	}
	return result, nil
}
