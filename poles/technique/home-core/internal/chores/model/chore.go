package model

// Chore is a household task. Assignees contains one person for a simple task
// or an ordered rotation for recurring tasks.
type Chore struct {
	ID          string   `json:"id"`
	Objective   string   `json:"objective"`
	Date        string   `json:"date,omitempty"`
	Assignees   []string `json:"assignees"`
	Frequency   string   `json:"frequency,omitempty"`
	IntervalWeeks int    `json:"intervalWeeks,omitempty"`
	Alternating bool     `json:"alternating,omitempty"`
}
