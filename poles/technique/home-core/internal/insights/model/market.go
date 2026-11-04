package model

import "time"

type MarketPoint struct {
	Time  time.Time
	Value float64
}

type MarketHistory struct {
	Points []MarketPoint
	Status string
}
