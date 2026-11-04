package navitia

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/clementortiz/home-ai/home-core/internal/insights/model"
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
		Passed      bool   `json:"p"`
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
		if d.Departure == 0 || d.Passed {
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
		if !strings.Contains(strings.ToLower(destination), "marseille") { continue }
		trains = append(trains, model.Train{ID: d.Number, Departure: departure, ScheduledDeparture: scheduled, Destination: destination, TrainNumber: d.Number, CommercialMode: d.Category, Platform: d.Platform, Status: status, DelayMinutes: d.Delay / 60, Disruption: disruption})
	}
	return trains, nil
}
