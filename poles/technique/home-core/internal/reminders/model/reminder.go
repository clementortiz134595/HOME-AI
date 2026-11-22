package model

import (
	"fmt"
	"strings"
	"time"
)

// Reminder is a calendar-like household event managed by Home Core. Date is
// kept for compatibility with date-only reminders. ScheduledAt is an optional
// precise, UTC RFC3339 instant used for notifications.
type Reminder struct {
	ID                      string `json:"id"`
	Title                   string `json:"title"`
	Date                    string `json:"date"`
	Details                 string `json:"details,omitempty"`
	ScheduledAt             string `json:"scheduledAt,omitempty"`
	TimeZone                string `json:"timeZone,omitempty"`
	NotificationStatus      string `json:"notificationStatus,omitempty"`
	NotificationSentAt      string `json:"notificationSentAt,omitempty"`
	NotificationAttemptedAt string `json:"notificationAttemptedAt,omitempty"`
}

const (
	NotificationPending = "pending"
	NotificationSending = "sending"
	NotificationSent    = "sent"
)

func (r Reminder) Validate() error {
	if strings.TrimSpace(r.Title) == "" || strings.TrimSpace(r.Date) == "" {
		return fmt.Errorf("title and date are required")
	}
	if _, err := time.Parse("2006-01-02", r.Date); err != nil {
		return fmt.Errorf("date must use YYYY-MM-DD: %w", err)
	}
	if r.ScheduledAt == "" {
		return nil
	}
	if _, err := time.Parse(time.RFC3339, r.ScheduledAt); err != nil {
		return fmt.Errorf("scheduledAt must use RFC3339: %w", err)
	}
	if r.NotificationStatus == "" {
		r.NotificationStatus = NotificationPending
	}
	return nil
}

func (r Reminder) ScheduledTime() (time.Time, bool) {
	if r.ScheduledAt == "" {
		return time.Time{}, false
	}
	value, err := time.Parse(time.RFC3339, r.ScheduledAt)
	return value, err == nil
}
