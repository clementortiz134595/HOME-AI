package sqlite

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	choresmodel "github.com/clementortiz/home-ai/home-core/internal/chores/model"
	costsmodel "github.com/clementortiz/home-ai/home-core/internal/costs/model"
	notificationsmodel "github.com/clementortiz/home-ai/home-core/internal/notifications/model"
	remindersmodel "github.com/clementortiz/home-ai/home-core/internal/reminders/model"
	_ "github.com/mattn/go-sqlite3"
)

type Store struct{ db *sql.DB }

func Open(path string) (*Store, error) {
	db, err := sql.Open("sqlite3", path+"?_busy_timeout=5000&_journal_mode=WAL")
	if err != nil {
		return nil, err
	}
	if _, err = db.Exec(`CREATE TABLE IF NOT EXISTS chores (id TEXT PRIMARY KEY, objective TEXT NOT NULL, date TEXT, assignees TEXT NOT NULL, frequency TEXT, interval_weeks INTEGER, alternating INTEGER NOT NULL, completed INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS reminders (id TEXT PRIMARY KEY, title TEXT NOT NULL, date TEXT NOT NULL, details TEXT); CREATE TABLE IF NOT EXISTS cost_entries (id TEXT PRIMARY KEY, occurred_at TEXT NOT NULL, category TEXT NOT NULL, amount_cents INTEGER NOT NULL CHECK(amount_cents >= 0), estimated INTEGER NOT NULL CHECK(estimated IN (0, 1))); CREATE INDEX IF NOT EXISTS cost_entries_occurred_at ON cost_entries(occurred_at); CREATE TABLE IF NOT EXISTS push_subscriptions (endpoint TEXT PRIMARY KEY, p256dh TEXT NOT NULL, auth TEXT NOT NULL, created_at TEXT NOT NULL);`); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("migrate household database: %w", err)
	}
	for _, migration := range []struct{ column, definition string }{
		{"scheduled_at", "TEXT"}, {"time_zone", "TEXT"}, {"notification_status", "TEXT"}, {"notification_sent_at", "TEXT"}, {"notification_attempted_at", "TEXT"},
	} {
		if err := ensureColumn(db, "reminders", migration.column, migration.definition); err != nil {
			_ = db.Close()
			return nil, fmt.Errorf("migrate reminders: %w", err)
		}
	}
	return &Store{db: db}, nil
}

func ensureColumn(db *sql.DB, table, column, definition string) error {
	rows, err := db.Query(`PRAGMA table_info(` + table + `)`)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var cid int
		var name, kind string
		var notNull, primaryKey int
		var defaultValue any
		if err := rows.Scan(&cid, &name, &kind, &notNull, &defaultValue, &primaryKey); err != nil {
			return err
		}
		if name == column {
			return nil
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}
	_, err = db.Exec(`ALTER TABLE ` + table + ` ADD COLUMN ` + column + ` ` + definition)
	return err
}
func (s *Store) Close() error { return s.db.Close() }
func (s *Store) ListChores() ([]choresmodel.Chore, error) {
	rows, err := s.db.Query(`SELECT id, objective, date, assignees, frequency, interval_weeks, alternating, completed FROM chores ORDER BY date, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := []choresmodel.Chore{}
	for rows.Next() {
		var c choresmodel.Chore
		var people string
		var alternating, completed int
		if err := rows.Scan(&c.ID, &c.Objective, &c.Date, &people, &c.Frequency, &c.IntervalWeeks, &alternating, &completed); err != nil {
			return nil, err
		}
		if err := json.Unmarshal([]byte(people), &c.Assignees); err != nil {
			return nil, err
		}
		c.Alternating = alternating != 0
		c.Completed = completed != 0
		result = append(result, c)
	}
	return result, rows.Err()
}
func (s *Store) SaveChore(c choresmodel.Chore) error {
	people, _ := json.Marshal(c.Assignees)
	_, err := s.db.Exec(`INSERT INTO chores(id,objective,date,assignees,frequency,interval_weeks,alternating,completed) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET objective=excluded.objective,date=excluded.date,assignees=excluded.assignees,frequency=excluded.frequency,interval_weeks=excluded.interval_weeks,alternating=excluded.alternating,completed=excluded.completed`, c.ID, c.Objective, c.Date, string(people), c.Frequency, c.IntervalWeeks, c.Alternating, c.Completed)
	return err
}
func (s *Store) DeleteChore(id string) error {
	_, err := s.db.Exec(`DELETE FROM chores WHERE id=?`, id)
	return err
}
func (s *Store) ListReminders() ([]remindersmodel.Reminder, error) {
	rows, err := s.db.Query(`SELECT id,title,date,COALESCE(details,''),COALESCE(scheduled_at,''),COALESCE(time_zone,''),COALESCE(notification_status,''),COALESCE(notification_sent_at,''),COALESCE(notification_attempted_at,'') FROM reminders ORDER BY COALESCE(scheduled_at, date),id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := []remindersmodel.Reminder{}
	for rows.Next() {
		var r remindersmodel.Reminder
		if err := rows.Scan(&r.ID, &r.Title, &r.Date, &r.Details, &r.ScheduledAt, &r.TimeZone, &r.NotificationStatus, &r.NotificationSentAt, &r.NotificationAttemptedAt); err != nil {
			return nil, err
		}
		result = append(result, r)
	}
	return result, rows.Err()
}
func (s *Store) SaveReminder(r remindersmodel.Reminder) error {
	_, err := s.db.Exec(`INSERT INTO reminders(id,title,date,details,scheduled_at,time_zone,notification_status,notification_sent_at,notification_attempted_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,date=excluded.date,details=excluded.details,scheduled_at=excluded.scheduled_at,time_zone=excluded.time_zone,notification_status=excluded.notification_status,notification_sent_at=excluded.notification_sent_at,notification_attempted_at=excluded.notification_attempted_at`, r.ID, r.Title, r.Date, r.Details, r.ScheduledAt, r.TimeZone, r.NotificationStatus, r.NotificationSentAt, r.NotificationAttemptedAt)
	return err
}

func (s *Store) SavePushSubscription(subscription notificationsmodel.Subscription) error {
	_, err := s.db.Exec(`INSERT INTO push_subscriptions(endpoint,p256dh,auth,created_at) VALUES(?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET p256dh=excluded.p256dh,auth=excluded.auth`, subscription.Endpoint, subscription.Keys.P256DH, subscription.Keys.Auth, time.Now().UTC().Format(time.RFC3339))
	return err
}
func (s *Store) DeletePushSubscription(endpoint string) error {
	_, err := s.db.Exec(`DELETE FROM push_subscriptions WHERE endpoint=?`, endpoint)
	return err
}
func (s *Store) ListPushSubscriptions() ([]notificationsmodel.Subscription, error) {
	rows, err := s.db.Query(`SELECT endpoint,p256dh,auth FROM push_subscriptions ORDER BY created_at`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := []notificationsmodel.Subscription{}
	for rows.Next() {
		var subscription notificationsmodel.Subscription
		if err := rows.Scan(&subscription.Endpoint, &subscription.Keys.P256DH, &subscription.Keys.Auth); err != nil {
			return nil, err
		}
		result = append(result, subscription)
	}
	return result, rows.Err()
}
func (s *Store) DeleteReminder(id string) error {
	_, err := s.db.Exec(`DELETE FROM reminders WHERE id=?`, id)
	return err
}

func (s *Store) ListCostEntries(from, to time.Time) ([]costsmodel.Entry, error) {
	rows, err := s.db.Query(`SELECT id, occurred_at, category, amount_cents, estimated FROM cost_entries WHERE occurred_at >= ? AND occurred_at < ? ORDER BY occurred_at, id`, from.UTC().Format(time.RFC3339), to.UTC().Format(time.RFC3339))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	entries := []costsmodel.Entry{}
	for rows.Next() {
		var entry costsmodel.Entry
		var occurredAt string
		var estimated int
		if err := rows.Scan(&entry.ID, &occurredAt, &entry.Category, &entry.AmountCents, &estimated); err != nil {
			return nil, err
		}
		if entry.OccurredAt, err = time.Parse(time.RFC3339, occurredAt); err != nil {
			return nil, fmt.Errorf("parse cost entry %q: %w", entry.ID, err)
		}
		entry.Estimated = estimated != 0
		entries = append(entries, entry)
	}
	return entries, rows.Err()
}
