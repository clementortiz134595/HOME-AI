package model

import (
	"regexp"
	"strconv"
	"strings"
	"time"
)

var weeksPattern = regexp.MustCompile(`dans ([0-9]+) semaines?`)

// RelativeDate resolves the French relative date expressions used by voice
// reminders. It deliberately returns a date only; time-of-day is not part of
// the current reminder model.
func RelativeDate(text string, now time.Time) (string, bool) {
	text = strings.ToLower(text)
	date := now
	switch {
	case strings.Contains(text, "après-demain"), strings.Contains(text, "apres-demain"):
		date = date.AddDate(0, 0, 2)
	case strings.Contains(text, "demain"):
		date = date.AddDate(0, 0, 1)
	case strings.Contains(text, "aujourd'hui"), strings.Contains(text, "aujourd hui"), strings.Contains(text, "ce soir"):
	case strings.Contains(text, "dans une semaine"):
		date = date.AddDate(0, 0, 7)
	default:
		weeksText := ""
		if match := weeksPattern.FindStringSubmatch(text); len(match) == 2 {
			weeksText = match[1]
		}
		for word, value := range map[string]int{"une": 1, "deux": 2, "trois": 3, "quatre": 4} {
			if strings.Contains(text, "dans "+word+" semaine") {
				weeksText = strconv.Itoa(value)
			}
		}
		if weeksText != "" {
			weeks, err := strconv.Atoi(weeksText)
			if err != nil || weeks < 1 {
				return "", false
			}
			date = date.AddDate(0, 0, weeks*7)
		} else {
			weekdays := []string{"dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"}
			for offset, weekday := range weekdays {
				if strings.Contains(text, weekday+" prochain") || strings.Contains(text, weekday+" prochaine") {
					delta := (offset - int(date.Weekday()) + 7) % 7
					if delta == 0 {
						delta = 7
					}
					date = date.AddDate(0, 0, delta)
					return date.Format("2006-01-02"), true
				}
			}
			return "", false
		}
	}
	return date.Format("2006-01-02"), true
}
