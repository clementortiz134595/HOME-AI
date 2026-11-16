package model

import "time"

// Entry is a confirmed or estimated recurring cost recorded by Home Core.
// AmountCents avoids floating-point errors in financial aggregates.
type Entry struct {
	ID          string
	OccurredAt  time.Time
	Category    string
	AmountCents int64
	Estimated   bool
}

type Month struct {
	Start       time.Time `json:"start"`
	AmountCents int64     `json:"amountCents"`
}

type CategoryTotal struct {
	Category    string `json:"category"`
	AmountCents int64  `json:"amountCents"`
}

type Summary struct {
	Currency           string          `json:"currency"`
	MonthAmountCents   int64           `json:"monthAmountCents"`
	PreviousMonthCents int64           `json:"previousMonthCents"`
	ProjectionCents    int64           `json:"projectionCents"`
	LargestCategory    *CategoryTotal  `json:"largestCategory,omitempty"`
	Breakdown          []CategoryTotal `json:"breakdown"`
	History            []Month         `json:"history"`
	DataStatus         string          `json:"dataStatus"`
}
