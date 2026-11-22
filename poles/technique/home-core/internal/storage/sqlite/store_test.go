package sqlite

import (
	"database/sql"
	"path/filepath"
	"testing"
)

func TestOpenMigratesLegacyDateOnlyReminder(t *testing.T) {
	path := filepath.Join(t.TempDir(), "home-core.sqlite")
	db, err := sql.Open("sqlite3", path); if err != nil { t.Fatal(err) }
	if _, err := db.Exec(`CREATE TABLE reminders (id TEXT PRIMARY KEY, title TEXT NOT NULL, date TEXT NOT NULL, details TEXT); INSERT INTO reminders(id,title,date,details) VALUES ('reminder-1','Ancien rappel','2026-11-22','');`); err != nil { t.Fatal(err) }; _ = db.Close()
	store, err := Open(path); if err != nil { t.Fatal(err) }; defer store.Close()
	values, err := store.ListReminders(); if err != nil { t.Fatal(err) }
	if len(values) != 1 || values[0].ScheduledAt != "" { t.Fatalf("legacy reminder changed: %+v", values) }
}
