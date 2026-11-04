package eodhd

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/clementortiz/home-ai/home-core/internal/insights/model"
)

type Client struct {
	http         *http.Client
	base, apiKey string
	mu           sync.Mutex
	cache        map[string]cachedHistory
}
type cachedHistory struct {
	history   model.MarketHistory
	expiresAt time.Time
}
type point struct {
	Date          string  `json:"date"`
	AdjustedClose float64 `json:"adjusted_close"`
}

func NewClient(httpClient *http.Client, baseURL, apiKey string) *Client {
	if baseURL == "" {
		baseURL = "https://eodhd.com/api"
	}
	return &Client{http: httpClient, base: strings.TrimRight(baseURL, "/"), apiKey: apiKey, cache: make(map[string]cachedHistory)}
}

func (c *Client) History(ctx context.Context, symbol, period string) (model.MarketHistory, error) {
	if strings.TrimSpace(c.apiKey) == "" {
		return model.MarketHistory{Status: "unavailable"}, fmt.Errorf("EODHD API key is not configured")
	}
	key := symbol + ":" + period
	c.mu.Lock()
	cached, ok := c.cache[key]
	c.mu.Unlock()
	if ok && time.Now().Before(cached.expiresAt) {
		cached.history.Status = "cached"
		return cached.history, nil
	}
	limit := 365
	switch period {
	case "day":
		limit = 5
	case "month":
		limit = 31
	}
	from := time.Now().AddDate(0, 0, -limit-10).Format("2006-01-02")
	u, _ := url.Parse(c.base + "/eod/" + url.PathEscape(symbol))
	q := u.Query()
	q.Set("from", from)
	q.Set("api_token", c.apiKey)
	q.Set("fmt", "json")
	q.Set("period", "d")
	q.Set("order", "a")
	u.RawQuery = q.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return model.MarketHistory{Status: "unavailable"}, err
	}
	res, err := c.http.Do(req)
	if err != nil {
		return model.MarketHistory{Status: "unavailable"}, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return model.MarketHistory{Status: "unavailable"}, fmt.Errorf("EODHD returned HTTP %d", res.StatusCode)
	}
	var values []point
	if err := json.NewDecoder(res.Body).Decode(&values); err != nil {
		return model.MarketHistory{Status: "unavailable"}, err
	}
	history := model.MarketHistory{Status: "live", Points: make([]model.MarketPoint, 0, len(values))}
	for _, value := range values {
		parsed, err := time.Parse("2006-01-02", value.Date)
		if err != nil || value.AdjustedClose <= 0 {
			continue
		}
		history.Points = append(history.Points, model.MarketPoint{Time: parsed, Value: value.AdjustedClose})
	}
	if len(history.Points) == 0 {
		return model.MarketHistory{Status: "unavailable"}, fmt.Errorf("EODHD returned no usable points")
	}
	if len(history.Points) > limit {
		history.Points = history.Points[len(history.Points)-limit:]
	}
	c.mu.Lock()
	c.cache[key] = cachedHistory{history: history, expiresAt: time.Now().Add(24 * time.Hour)}
	c.mu.Unlock()
	return history, nil
}
