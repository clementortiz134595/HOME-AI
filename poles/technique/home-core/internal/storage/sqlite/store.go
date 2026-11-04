package sqlite

import (
	"database/sql"
	"encoding/json"
	"fmt"

	choresmodel "github.com/clementortiz/home-ai/home-core/internal/chores/model"
	remindersmodel "github.com/clementortiz/home-ai/home-core/internal/reminders/model"
	_ "github.com/mattn/go-sqlite3"
)

type Store struct{ db *sql.DB }

func Open(path string) (*Store, error) {
	db, err := sql.Open("sqlite3", path+"?_busy_timeout=5000&_journal_mode=WAL")
	if err != nil {
		return nil, err
	}
	if _, err = db.Exec(`CREATE TABLE IF NOT EXISTS chores (id TEXT PRIMARY KEY, objective TEXT NOT NULL, date TEXT, assignees TEXT NOT NULL, frequency TEXT, interval_weeks INTEGER, alternating INTEGER NOT NULL, completed INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS reminders (id TEXT PRIMARY KEY, title TEXT NOT NULL, date TEXT NOT NULL, details TEXT);`); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("migrate household database: %w", err)
	}
	return &Store{db: db}, nil
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
	rows, err := s.db.Query(`SELECT id,title,date,details FROM reminders ORDER BY date,id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := []remindersmodel.Reminder{}
	for rows.Next() {
		var r remindersmodel.Reminder
		if err := rows.Scan(&r.ID, &r.Title, &r.Date, &r.Details); err != nil {
			return nil, err
		}
		result = append(result, r)
	}
	return result, rows.Err()
}
func (s *Store) SaveReminder(r remindersmodel.Reminder) error {
	_, err := s.db.Exec(`INSERT INTO reminders(id,title,date,details) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,date=excluded.date,details=excluded.details`, r.ID, r.Title, r.Date, r.Details)
	return err
}
func (s *Store) DeleteReminder(id string) error {
	_, err := s.db.Exec(`DELETE FROM reminders WHERE id=?`, id)
	return err
}
