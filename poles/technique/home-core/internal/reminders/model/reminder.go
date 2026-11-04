package model

// Reminder is a calendar-like household event managed by Home Core.
type Reminder struct { ID string `json:"id"`; Title string `json:"title"`; Date string `json:"date"`; Details string `json:"details,omitempty"` }
