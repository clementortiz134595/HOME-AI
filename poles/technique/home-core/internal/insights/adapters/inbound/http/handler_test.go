package insightshttp

import (
	"encoding/json"
	"github.com/clementortiz/home-ai/home-core/internal/insights/application"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestMarketsReturnsTrackedETFs(t *testing.T) {
	rec := httptest.NewRecorder()
	NewHandler(application.NewGetMarketHistory(stubHistoryProvider{})).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/v1/insights/markets?period=year", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
	var response struct {
		ETFs []etf `json:"etfs"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatal(err)
	}
	if len(response.ETFs) != 6 || response.ETFs[0].ISIN != "LU1829219390" {
		t.Fatalf("unexpected catalog: %+v", response.ETFs)
	}
}
func TestMarketDetailReturnsHistory(t *testing.T) {
	rec := httptest.NewRecorder()
	NewHandler(application.NewGetMarketHistory(stubHistoryProvider{points: 12})).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/v1/insights/markets/PAASI?period=month", nil))
	var response struct {
		ETF     etf              `json:"etf"`
		History []map[string]any `json:"history"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatal(err)
	}
	if rec.Code != http.StatusOK || response.ETF.Symbol != "PAASI" || len(response.History) != 12 {
		t.Fatalf("unexpected detail: %+v", response)
	}
}
