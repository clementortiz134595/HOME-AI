package model

import (
	"testing"
	"time"
)

func TestRelativeDateFrenchExpressions(t *testing.T) {
	now := time.Date(2026, time.November, 5, 19, 0, 0, 0, time.Local) // jeudi
	tests := []struct{ text, want string }{
		{"ce soir", "2026-11-05"},
		{"après-demain", "2026-11-07"},
		{"dans une semaine", "2026-11-12"},
		{"dans trois semaines", "2026-11-26"},
		{"jeudi prochain", "2026-11-12"},
		{"vendredi prochain", "2026-11-06"},
	}
	for _, test := range tests {
		got, ok := RelativeDate(test.text, now)
		if !ok || got != test.want {
			t.Errorf("RelativeDate(%q) = %q, %v; want %q", test.text, got, ok, test.want)
		}
	}
}

func TestRelativeScheduleResolvesTomorrowAtNoonInParis(t *testing.T) {
	paris, err := time.LoadLocation("Europe/Paris")
	if err != nil {
		t.Fatal(err)
	}
	now := time.Date(2026, time.November, 5, 19, 0, 0, 0, paris)
	date, scheduledAt, timeZone, ok := RelativeSchedule("demain midi", now)
	if !ok || date != "2026-11-06" || timeZone != "Europe/Paris" {
		t.Fatalf("RelativeSchedule() = %q, %q, %q, %v", date, scheduledAt, timeZone, ok)
	}
	if scheduledAt != "2026-11-06T11:00:00Z" {
		t.Fatalf("scheduledAt = %q, want Paris noon in UTC", scheduledAt)
	}
}
