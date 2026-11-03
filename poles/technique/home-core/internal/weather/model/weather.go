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
}

type DailyForecast struct {
	Date                     string  `json:"date"`
	MinimumCelsius           float64 `json:"minimumCelsius"`
	MaximumCelsius           float64 `json:"maximumCelsius"`
	PrecipitationProbability int     `json:"precipitationProbabilityPercent"`
	WeatherCode              int     `json:"weatherCode"`
	Summary                  string  `json:"summary"`
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

type Report struct {
	Location Location            `json:"location"`
	Current  Conditions          `json:"current"`
	Today    []DayPeriodForecast `json:"today"`
	Daily    []DailyForecast     `json:"daily"`
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
