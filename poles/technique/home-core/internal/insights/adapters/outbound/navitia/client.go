package navitia

import (
	"archive/zip"
	"bufio"
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"github.com/clementortiz/home-ai/home-core/internal/insights/model"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Client struct {
	http         *http.Client
	baseURL, uic string
}

func NewClient(h *http.Client, baseURL, uic string) *Client {
	return &Client{http: h, baseURL: strings.TrimRight(baseURL, "/"), uic: uic}
}

type response struct {
	Passages []struct {
		Number      string `json:"n"`
		Departure   int    `json:"d"`
		Delay       int    `json:"rd"`
		Platform    string `json:"v"`
		Destination string `json:"de"`
		Cancelled   bool   `json:"x"`
		Passed      int    `json:"p"`
		Category    string `json:"pr"`
	} `json:"passages"`
	Names map[string]string `json:"noms"`
}

func (c *Client) Departures(ctx context.Context) ([]model.Train, error) {
	u := fmt.Sprintf("%s/gare/%s.json", c.baseURL, url.PathEscape(c.uic))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Home-AI/1.0")
	res, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Train Nomade returned HTTP %d", res.StatusCode)
	}
	var p response
	if err := json.NewDecoder(res.Body).Decode(&p); err != nil {
		return nil, err
	}
	now := time.Now().In(time.Local)
	midnight := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.Local)
	trains := make([]model.Train, 0, len(p.Passages))
	for _, d := range p.Passages {
		if d.Departure == 0 || d.Passed != 0 {
			continue
		}
		scheduled := midnight.Add(time.Duration(d.Departure) * time.Second)
		departure := scheduled.Add(time.Duration(d.Delay) * time.Second)
		status := model.OnTime
		if d.Delay > 0 {
			status = model.Delayed
		}
		var disruption *model.Disruption
		if d.Cancelled {
			disruption = &model.Disruption{Title: "Train supprimé", Effect: "CANCELLED"}
		}
		destination := p.Names[d.Destination]
		if !strings.Contains(strings.ToLower(destination), "marseille") {
			continue
		}
		trains = append(trains, model.Train{ID: d.Number, Departure: departure, ScheduledDeparture: scheduled, Destination: destination, TrainNumber: d.Number, CommercialMode: d.Category, Platform: d.Platform, Status: status, DelayMinutes: d.Delay / 60, Disruption: disruption})
	}
	seen := make(map[string]bool, len(trains))
	for _, train := range trains {
		seen[train.ID] = true
	}
	for day := 0; len(trains) < 4 && day < 2; day++ {
		extra, err := c.scheduledDepartures(ctx, midnight.AddDate(0, 0, day), 4-len(trains), seen)
		if err == nil {
			trains = append(trains, extra...)
			for _, train := range extra {
				seen[train.ID] = true
			}
		}
	}
	return trains, nil
}

type gtfsTrip struct{ serviceID, headsign string }

func (c *Client) scheduledDepartures(ctx context.Context, from time.Time, limit int, seen map[string]bool) ([]model.Train, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://eu.ftp.opendatasoft.com/sncf/plandata/Export_OpenData_SNCF_GTFS_NewTripId.zip", nil)
	if err != nil {
		return nil, err
	}
	res, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("SNCF GTFS returned HTTP %d", res.StatusCode)
	}
	body, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}
	archive, err := zip.NewReader(bytes.NewReader(body), int64(len(body)))
	if err != nil {
		return nil, err
	}
	trips := map[string]gtfsTrip{}
	f := fileIn(archive, "trips.txt")
	if f == nil {
		return nil, fmt.Errorf("trips.txt missing")
	}
	r, err := csvReader(f)
	if err != nil {
		return nil, err
	}
	_, _ = r.Read()
	for {
		row, e := r.Read()
		if e == io.EOF {
			break
		}
		if e != nil || len(row) < 4 {
			continue
		}
		trips[row[2]] = gtfsTrip{serviceID: row[1], headsign: row[3]}
	}
	serviceDates := map[string]bool{}
	f = fileIn(archive, "calendar_dates.txt")
	if f == nil {
		return nil, fmt.Errorf("calendar_dates.txt missing")
	}
	r, err = csvReader(f)
	if err != nil {
		return nil, err
	}
	_, _ = r.Read()
	for {
		row, e := r.Read()
		if e == io.EOF {
			break
		}
		if e != nil || len(row) < 3 || row[1] != from.Format("20060102") {
			continue
		}
		serviceDates[row[0]] = row[2] == "1"
	}
	result := make([]model.Train, 0, limit)
	f = fileIn(archive, "stop_times.txt")
	if f == nil {
		return nil, fmt.Errorf("stop_times.txt missing")
	}
	r, err = csvReader(f)
	if err != nil {
		return nil, err
	}
	_, _ = r.Read()
	for {
		row, e := r.Read()
		if e == io.EOF {
			break
		}
		if e != nil || len(row) < 4 || row[3] != c.uic {
			continue
		}
		trip, ok := trips[row[0]]
		if !ok || !serviceDates[trip.serviceID] || seen[row[0]] || !strings.Contains(strings.ToLower(trip.headsign), "marseille") {
			continue
		}
		departure, e := gtfsTime(row[2], from)
		if e != nil || !departure.After(time.Now().In(time.Local)) {
			continue
		}
		result = append(result, model.Train{ID: row[0], Departure: departure, ScheduledDeparture: departure, Destination: trip.headsign, TrainNumber: row[0], CommercialMode: "TER", Status: model.OnTime})
		if len(result) >= limit {
			return result, nil
		}
	}
	return result, nil
}
func fileIn(a *zip.Reader, name string) *zip.File {
	for _, f := range a.File {
		if f.Name == name {
			return f
		}
	}
	return nil
}
func csvReader(f *zip.File) (*csv.Reader, error) {
	rc, e := f.Open()
	if e != nil {
		return nil, e
	}
	return csv.NewReader(bufio.NewReader(rc)), nil
}
func gtfsTime(value string, day time.Time) (time.Time, error) {
	var h, m, s int
	if _, e := fmt.Sscanf(value, "%d:%d:%d", &h, &m, &s); e != nil {
		return time.Time{}, e
	}
	return time.Date(day.Year(), day.Month(), day.Day(), 0, 0, 0, 0, time.Local).Add(time.Duration(h)*time.Hour + time.Duration(m)*time.Minute + time.Duration(s)*time.Second), nil
}
