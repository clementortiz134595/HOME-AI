package applecaldav

import (
	"fmt"
	"strings"
	"time"

	"github.com/clementortiz/home-ai/home-core/internal/agenda/model"
)

func parseICalendarEvents(data, calendarID string) ([]model.Event, error) {
	lines := unfoldICalendarLines(data)
	events := make([]model.Event, 0)
	var properties map[string]string
	var parameters map[string]string

	for _, line := range lines {
		switch line {
		case "BEGIN:VEVENT":
			properties = make(map[string]string)
			parameters = make(map[string]string)
		case "END:VEVENT":
			if properties == nil {
				continue
			}
			event, err := eventFromProperties(properties, parameters, calendarID)
			if err != nil {
				return nil, err
			}
			events = append(events, event)
			properties = nil
		default:
			if properties == nil {
				continue
			}
			key, value, found := strings.Cut(line, ":")
			if !found {
				continue
			}
			name, rawParameters, _ := strings.Cut(key, ";")
			if name == "UID" || name == "SUMMARY" || name == "DTSTART" || name == "DTEND" {
				properties[name] = value
			}
			if name == "DTSTART" || name == "DTEND" {
				for _, parameter := range strings.Split(rawParameters, ";") {
					parameterName, parameterValue, hasValue := strings.Cut(parameter, "=")
					if hasValue && parameterName == "TZID" {
						parameters[name] = parameterValue
					}
				}
			}
		}
	}
	return events, nil
}

func eventFromProperties(properties, parameters map[string]string, calendarID string) (model.Event, error) {
	uid := properties["UID"]
	start, allDay, err := parseICalendarTime(properties["DTSTART"], parameters["DTSTART"])
	if err != nil || uid == "" {
		return model.Event{}, fmt.Errorf("%w: invalid iCalendar event", ErrUnavailable)
	}
	end, _, err := parseICalendarTime(properties["DTEND"], parameters["DTEND"])
	if err != nil {
		return model.Event{}, fmt.Errorf("%w: invalid iCalendar event end", ErrUnavailable)
	}
	return model.Event{ID: uid, CalendarID: calendarID, Title: properties["SUMMARY"], StartsAt: start, EndsAt: end, AllDay: allDay}, nil
}

func parseICalendarTime(value, timezone string) (time.Time, bool, error) {
	if len(value) == len("20060102") {
		parsed, err := time.Parse("20060102", value)
		return parsed, true, err
	}
	if strings.HasSuffix(value, "Z") {
		parsed, err := time.Parse("20060102T150405Z", value)
		return parsed, false, err
	}
	location := time.UTC
	if timezone != "" {
		loaded, err := time.LoadLocation(timezone)
		if err != nil {
			return time.Time{}, false, err
		}
		location = loaded
	}
	parsed, err := time.ParseInLocation("20060102T150405", value, location)
	return parsed, false, err
}

func unfoldICalendarLines(data string) []string {
	rawLines := strings.FieldsFunc(data, func(r rune) bool { return r == '\r' || r == '\n' })
	lines := make([]string, 0, len(rawLines))
	for _, line := range rawLines {
		if len(lines) > 0 && (strings.HasPrefix(line, " ") || strings.HasPrefix(line, "\t")) {
			lines[len(lines)-1] += strings.TrimLeft(line, " \t")
			continue
		}
		lines = append(lines, line)
	}
	return lines
}
