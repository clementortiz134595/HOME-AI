package model

import "time"

type Calendar struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	ReadOnly bool   `json:"readOnly"`
}

type Event struct {
	ID         string    `json:"id"`
	CalendarID string    `json:"calendarId"`
	Title      string    `json:"title"`
	StartsAt   time.Time `json:"startsAt"`
	EndsAt     time.Time `json:"endsAt"`
	AllDay     bool      `json:"allDay"`
}
