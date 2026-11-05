package model

import "time"

type TrainStatus string

const (
	OnTime  TrainStatus = "on_time"
	Delayed TrainStatus = "delayed"
	Cancelled TrainStatus = "cancelled"
)

type Train struct {
	ID                 string      `json:"id"`
	Departure          time.Time   `json:"departure"`
	Arrival            *time.Time  `json:"arrival,omitempty"`
	ScheduledDeparture time.Time   `json:"scheduledDeparture"`
	LastUpdated        *time.Time  `json:"lastUpdated,omitempty"`
	Destination        string      `json:"destination"`
	TrainNumber        string      `json:"trainNumber"`
	CommercialMode     string      `json:"commercialMode"`
	Platform           string      `json:"platform,omitempty"`
	Status             TrainStatus `json:"status"`
	DelayMinutes       int         `json:"delayMinutes"`
	Disruption         *Disruption `json:"disruption,omitempty"`
}

type Disruption struct {
	Title       string `json:"title"`
	Cause       string `json:"cause,omitempty"`
	Effect      string `json:"effect,omitempty"`
	Information string `json:"information,omitempty"`
}
