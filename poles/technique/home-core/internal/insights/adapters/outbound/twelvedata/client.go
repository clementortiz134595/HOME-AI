package twelvedata

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/clementortiz/home-ai/home-core/internal/insights/model"
)

type Client struct {
	http   *http.Client
	base   string
	apiKey string
	mu     sync.Mutex
	cache  map[string]cachedHistory
}

type cachedHistory struct {
	history   model.MarketHistory
	expiresAt time.Time
}

type response struct {
	Values []struct {
		Date  string `json:"datetime"`
		Close string `json:"close"`
	} `json:"values"`
	Status  string `json:"status"`
	Message string `json:"message"`
}

func NewClient(httpClient *http.Client, baseURL, apiKey string) *Client {
	if baseURL == "" {
		baseURL = "https://api.twelvedata.com"
	}
	return &Client{http: httpClient, base: strings.TrimRight(baseURL, "/"), apiKey: apiKey, cache: make(map[string]cachedHistory)}
}

func (c *Client) History(ctx context.Context, symbol, period string) (model.MarketHistory, error) {
	if strings.TrimSpace(c.apiKey) == "" {
		return model.MarketHistory{Status: "unavailable"}, fmt.Errorf("twelve data API key is not configured")
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
	case "year":
		limit = 365
	default:
		period = "year"
	}
	u, _ := url.Parse(c.base + "/time_series")
	q := u.Query()
	q.Set("symbol", symbol)
	q.Set("interval", "1day")
	q.Set("outputsize", strconv.Itoa(limit))
	q.Set("order", "ASC")
	q.Set("apikey", c.apiKey)
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
		return model.MarketHistory{Status: "unavailable"}, fmt.Errorf("twelve data returned HTTP %d", res.StatusCode)
	}
	var payload response
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		return model.MarketHistory{Status: "unavailable"}, err
	}
	if payload.Status == "error" || len(payload.Values) == 0 {
		return model.MarketHistory{Status: "unavailable"}, fmt.Errorf("twelve data: %s", payload.Message)
	}
	history := model.MarketHistory{Status: "live", Points: make([]model.MarketPoint, 0, len(payload.Values))}
	for _, point := range payload.Values {
		parsed, err := time.Parse("2006-01-02", point.Date)
		if err != nil {
			continue
		}
		value, err := strconv.ParseFloat(point.Close, 64)
		if err != nil {
			continue
		}
		history.Points = append(history.Points, model.MarketPoint{Time: parsed, Value: value})
	}
	if len(history.Points) == 0 {
		return model.MarketHistory{Status: "unavailable"}, fmt.Errorf("twelve data returned no usable points")
	}
	c.mu.Lock()
	c.cache[key] = cachedHistory{history: history, expiresAt: time.Now().Add(6 * time.Hour)}
	c.mu.Unlock()
	return history, nil
}
