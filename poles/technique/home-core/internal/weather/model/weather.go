package model

import "time"

const LaCiotat = "La Ciotat"

type Location struct {
	Name      string  `json:"name"`
	Country   string  `json:"country"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Timezone  string  `json:"timezone"`
}

type Conditions struct {
	ObservedAt         time.Time `json:"observedAt"`
	TemperatureCelsius float64   `json:"temperatureCelsius"`
	ApparentCelsius    float64   `json:"apparentCelsius"`
	WindSpeedKmh       float64   `json:"windSpeedKmh"`
	WeatherCode        int       `json:"weatherCode"`
	Summary            string    `json:"summary"`
	HumidityPercent    *float64  `json:"humidityPercent,omitempty"`
	PressureHPa        *float64  `json:"pressureHPa,omitempty"`
	WindBearingDegrees *float64  `json:"windBearingDegrees,omitempty"`
	WindGustKmh        *float64  `json:"windGustKmh,omitempty"`
	CloudCoverage      *float64  `json:"cloudCoveragePercent,omitempty"`
	UVIndex            *float64  `json:"uvIndex,omitempty"`
	VisibilityKm       *float64  `json:"visibilityKm,omitempty"`
}

type DailyForecast struct {
	Date                     string   `json:"date"`
	MinimumCelsius           float64  `json:"minimumCelsius"`
	MaximumCelsius           float64  `json:"maximumCelsius"`
	PrecipitationProbability int      `json:"precipitationProbabilityPercent"`
	WeatherCode              int      `json:"weatherCode"`
	Summary                  string   `json:"summary"`
	Condition                string   `json:"condition,omitempty"`
	HumidityPercent          *float64 `json:"humidityPercent,omitempty"`
	PressureHPa              *float64 `json:"pressureHPa,omitempty"`
	WindSpeedKmh             *float64 `json:"windSpeedKmh,omitempty"`
	WindBearingDegrees       *float64 `json:"windBearingDegrees,omitempty"`
	WindGustKmh              *float64 `json:"windGustKmh,omitempty"`
	PrecipitationMillimeters *float64 `json:"precipitationMillimeters,omitempty"`
}

type DayPeriodForecast struct {
	Period                   string    `json:"period"`
	ForecastAt               time.Time `json:"forecastAt"`
	TemperatureCelsius       float64   `json:"temperatureCelsius"`
	ApparentCelsius          float64   `json:"apparentCelsius"`
	PrecipitationProbability int       `json:"precipitationProbabilityPercent"`
	WeatherCode              int       `json:"weatherCode"`
	Summary                  string    `json:"summary"`
}

// HourlyForecast deliberately preserves only stable, unit-normalized weather
// fields. A Home Assistant provider may omit values its source does not expose.
type HourlyForecast struct {
	ForecastAt               time.Time `json:"forecastAt"`
	Condition                string    `json:"condition"`
	Summary                  string    `json:"summary"`
	TemperatureCelsius       *float64  `json:"temperatureCelsius,omitempty"`
	ApparentCelsius          *float64  `json:"apparentCelsius,omitempty"`
	HumidityPercent          *float64  `json:"humidityPercent,omitempty"`
	PressureHPa              *float64  `json:"pressureHPa,omitempty"`
	PrecipitationProbability *float64  `json:"precipitationProbabilityPercent,omitempty"`
	PrecipitationMillimeters *float64  `json:"precipitationMillimeters,omitempty"`
	WindSpeedKmh             *float64  `json:"windSpeedKmh,omitempty"`
	WindBearingDegrees       *float64  `json:"windBearingDegrees,omitempty"`
	WindGustKmh              *float64  `json:"windGustKmh,omitempty"`
	CloudCoverage            *float64  `json:"cloudCoveragePercent,omitempty"`
	UVIndex                  *float64  `json:"uvIndex,omitempty"`
	VisibilityKm             *float64  `json:"visibilityKm,omitempty"`
}

type Report struct {
	Location Location            `json:"location"`
	Current  Conditions          `json:"current"`
	Today    []DayPeriodForecast `json:"today"`
	Daily    []DailyForecast     `json:"daily"`
	Hourly   []HourlyForecast    `json:"hourly"`
}

func WeatherConditionSummary(condition string) string {
	summaries := map[string]string{"clear-night": "nuit claire", "cloudy": "couvert", "fog": "brouillard", "hail": "grele", "lightning": "orage", "lightning-rainy": "orage pluvieux", "partlycloudy": "partiellement nuageux", "pouring": "forte pluie", "rainy": "pluie", "snowy": "neige", "snowy-rainy": "neige et pluie", "sunny": "ensoleille", "windy": "venteux", "windy-variant": "venteux et nuageux", "exceptional": "conditions exceptionnelles"}
	if summary, found := summaries[condition]; found {
		return summary
	}
	return "conditions inconnues"
}

func WeatherSummary(code int) string {
	summaries := map[int]string{
		0:  "ciel degage",
		1:  "principalement degage",
		2:  "partiellement nuageux",
		3:  "couvert",
		45: "brouillard",
		48: "brouillard givrant",
		51: "bruine faible",
		53: "bruine moderee",
		55: "bruine dense",
		61: "pluie faible",
		63: "pluie moderee",
		65: "forte pluie",
		71: "neige faible",
		73: "neige moderee",
		75: "fortes chutes de neige",
		80: "averses faibles",
		81: "averses moderees",
		82: "averses violentes",
		95: "orage",
		96: "orage avec grele faible",
		99: "orage avec forte grele",
	}
	if summary, found := summaries[code]; found {
		return summary
	}
	return "conditions inconnues"
}
