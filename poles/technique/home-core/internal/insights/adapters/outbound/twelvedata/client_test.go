package twelvedata

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHistoryParsesAndCachesDailyValues(t *testing.T) {
	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok","values":[{"datetime":"2026-01-02","close":"10.50"},{"datetime":"2026-01-03","close":"11.25"}]}`))
	}))
	defer server.Close()
	client := NewClient(server.Client(), server.URL, "test-key")
	first, err := client.History(context.Background(), "PAASI:PAR", "month")
	if err != nil {
		t.Fatal(err)
	}
	second, err := client.History(context.Background(), "PAASI:PAR", "month")
	if err != nil {
		t.Fatal(err)
	}
	if len(first.Points) != 2 || first.Status != "live" || second.Status != "cached" || calls != 1 {
		t.Fatalf("unexpected histories: first=%+v second=%+v calls=%d", first, second, calls)
	}
}

func TestHistoryRequiresAPIKey(t *testing.T) {
	client := NewClient(http.DefaultClient, "http://invalid", "")
	if _, err := client.History(context.Background(), "PAASI:PAR", "year"); err == nil {
		t.Fatal("expected missing API key error")
	}
}
