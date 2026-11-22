package model

import (
	"regexp"
	"strconv"
	"strings"
	"time"
)

var weeksPattern = regexp.MustCompile(`dans ([0-9]+) semaines?`)
var clockPattern = regexp.MustCompile(`(?:à|a|vers)\s*([0-9]{1,2})(?:h(?:([0-9]{2}))?|:([0-9]{2})|\s*heures?)`)

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

// RelativeSchedule resolves the common French date-and-time expressions used
// by voice reminders. The household runs in Europe/Paris unless the process
// already has a more specific local timezone configured.
func RelativeSchedule(text string, now time.Time) (date, scheduledAt, timeZone string, ok bool) {
	location, err := time.LoadLocation("Europe/Paris")
	if err != nil {
		location = now.Location()
	}
	now = now.In(location)
	date, ok = RelativeDate(text, now)
	if !ok {
		return "", "", "", false
	}
	hour, minute, hasTime := reminderClock(text)
	if !hasTime {
		return date, "", "", true
	}
	day, err := time.ParseInLocation("2006-01-02", date, location)
	if err != nil {
		return "", "", "", false
	}
	instant := time.Date(day.Year(), day.Month(), day.Day(), hour, minute, 0, 0, location)
	return date, instant.UTC().Format(time.RFC3339), location.String(), true
}

func reminderClock(text string) (hour, minute int, ok bool) {
	text = strings.ToLower(text)
	switch {
	case strings.Contains(text, "midi"):
		return 12, 0, true
	case strings.Contains(text, "minuit"):
		return 0, 0, true
	}
	match := clockPattern.FindStringSubmatch(text)
	if len(match) != 4 {
		return 0, 0, false
	}
	hour, err := strconv.Atoi(match[1])
	if err != nil || hour > 23 {
		return 0, 0, false
	}
	minuteText := match[2]
	if minuteText == "" {
		minuteText = match[3]
	}
	if minuteText != "" {
		minute, err = strconv.Atoi(minuteText)
		if err != nil || minute > 59 {
			return 0, 0, false
		}
	}
	return hour, minute, true
}

// RemoveReminderClock removes only the spoken clock expression from a title.
func RemoveReminderClock(text string) string { return clockPattern.ReplaceAllString(text, "") }
