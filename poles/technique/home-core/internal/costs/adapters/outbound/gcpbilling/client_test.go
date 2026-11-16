package gcpbilling

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"golang.org/x/oauth2"
)

func TestListCostEntriesQueriesAggregatedBillingData(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.Header.Get("Authorization") != "Bearer test-token" {
			t.Fatalf("authorization = %q", request.Header.Get("Authorization"))
		}
		body, err := io.ReadAll(request.Body)
		if err != nil {
			t.Fatal(err)
		}
		if !strings.Contains(string(body), "UNNEST(credits)") || !strings.Contains(string(body), "@from") {
			t.Fatalf("query is not the expected aggregate: %s", body)
		}
		_, _ = writer.Write([]byte(`{"jobComplete":true,"rows":[{"f":[{"v":"2026-11-01T00:00:00Z"},{"v":"Cloud Run"},{"v":"EUR"},{"v":"123"}]}]}`))
	}))
	defer server.Close()

	client := &Client{httpClient: server.Client(), table: "project_id.billing_export.gcp_billing_export_resource_v1", endpoint: server.URL, tokenSource: oauth2.StaticTokenSource(&oauth2.Token{AccessToken: "test-token"})}
	entries, err := client.ListCostEntries(time.Date(2026, time.November, 1, 0, 0, 0, 0, time.UTC), time.Date(2026, time.December, 1, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 1 || entries[0].Category != "Cloud Run" || entries[0].AmountCents != 123 {
		t.Fatalf("unexpected entries: %#v", entries)
	}
}

func TestListCostEntriesRejectsOtherCurrency(t *testing.T) {
	client := &Client{httpClient: &http.Client{Transport: roundTripper(func(*http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader(`{"jobComplete":true,"rows":[{"f":[{"v":"2026-11-01T00:00:00Z"},{"v":"Cloud Run"},{"v":"USD"},{"v":"123"}]}]}`))}, nil
	})}, table: "project_id.billing_export.gcp_billing_export_resource_v1", tokenSource: oauth2.StaticTokenSource(&oauth2.Token{AccessToken: "test-token"})}
	_, err := client.ListCostEntries(time.Now().AddDate(0, -1, 0), time.Now())
	if err == nil || !strings.Contains(err.Error(), "unsupported") {
		t.Fatalf("error = %v", err)
	}
}

type roundTripper func(*http.Request) (*http.Response, error)

func (roundTrip roundTripper) RoundTrip(request *http.Request) (*http.Response, error) {
	return roundTrip(request)
}
