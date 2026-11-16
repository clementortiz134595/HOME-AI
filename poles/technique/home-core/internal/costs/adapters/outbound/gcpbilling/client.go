// Package gcpbilling adapts the BigQuery Cloud Billing export to the costs port.
package gcpbilling

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

	"golang.org/x/oauth2"
	googleauth "golang.org/x/oauth2/google"

	"github.com/clementortiz/home-ai/home-core/internal/costs/model"
)

const bigQueryScope = "https://www.googleapis.com/auth/bigquery"

var tableNamePattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9_-]*\.[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*$`)

// Client reads an aggregated, detailed Cloud Billing export. It never returns
// individual usage rows to the application or the caller.
type Client struct {
	httpClient  *http.Client
	table       string
	tokenSource oauth2.TokenSource
	endpoint    string
}

// NewClient creates a BigQuery-backed costs repository. table must be a fully
// qualified project.dataset.table identifier from the Cloud Billing export.
func NewClient(httpClient *http.Client, table string) (*Client, error) {
	if !tableNamePattern.MatchString(table) {
		return nil, fmt.Errorf("invalid GCP billing table identifier")
	}
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	credentials, err := googleauth.FindDefaultCredentials(context.Background(), bigQueryScope)
	if err != nil {
		return nil, fmt.Errorf("find Google application credentials: %w", err)
	}
	return &Client{httpClient: httpClient, table: table, tokenSource: credentials.TokenSource, endpoint: "https://bigquery.googleapis.com"}, nil
}

func (client *Client) ListCostEntries(from, to time.Time) ([]model.Entry, error) {
	if client.tokenSource == nil {
		return nil, fmt.Errorf("Google application credentials are not configured")
	}
	token, err := client.tokenSource.Token()
	if err != nil {
		return nil, fmt.Errorf("get Google access token: %w", err)
	}
	payload, err := json.Marshal(queryRequest{Query: client.query(), UseLegacySQL: false, ParameterMode: "named", QueryParameters: []queryParameter{
		timestampParameter("from", from),
		timestampParameter("to", to),
	}})
	if err != nil {
		return nil, fmt.Errorf("encode BigQuery request: %w", err)
	}
	endpoint := client.endpoint
	if endpoint == "" {
		endpoint = "https://bigquery.googleapis.com"
	}
	request, err := http.NewRequestWithContext(context.Background(), http.MethodPost, strings.TrimRight(endpoint, "/")+"/bigquery/v2/projects/"+client.project()+"/queries", bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("create BigQuery request: %w", err)
	}
	request.Header.Set("Authorization", "Bearer "+token.AccessToken)
	request.Header.Set("Content-Type", "application/json")
	response, err := client.httpClient.Do(request)
	if err != nil {
		return nil, fmt.Errorf("query GCP billing export: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		detail, _ := io.ReadAll(io.LimitReader(response.Body, 2048))
		return nil, fmt.Errorf("BigQuery billing query returned status %d: %s", response.StatusCode, strings.TrimSpace(string(detail)))
	}
	var result queryResponse
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode BigQuery billing response: %w", err)
	}
	if !result.JobComplete {
		return nil, fmt.Errorf("BigQuery billing query did not complete")
	}
	entries := make([]model.Entry, 0, len(result.Rows))
	for index, row := range result.Rows {
		if len(row.Fields) != 4 {
			return nil, fmt.Errorf("decode BigQuery billing row %d", index)
		}
		month, err := time.Parse(time.RFC3339, row.Fields[0].Value)
		if err != nil {
			return nil, fmt.Errorf("parse BigQuery billing month: %w", err)
		}
		currency := row.Fields[2].Value
		if currency != "EUR" {
			return nil, fmt.Errorf("unsupported GCP billing currency %q", currency)
		}
		var amountCents int64
		if _, err := fmt.Sscan(row.Fields[3].Value, &amountCents); err != nil {
			return nil, fmt.Errorf("parse BigQuery billing amount: %w", err)
		}
		if amountCents == 0 {
			continue
		}
		entries = append(entries, model.Entry{
			ID:          fmt.Sprintf("gcp-%s-%d", row.Fields[0].Value, index),
			OccurredAt:  month,
			Category:    row.Fields[1].Value,
			AmountCents: amountCents,
		})
	}
	return entries, nil
}

func (client *Client) project() string { return strings.SplitN(client.table, ".", 2)[0] }

func (client *Client) query() string {
	return "SELECT FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', TIMESTAMP_TRUNC(usage_start_time, MONTH, 'UTC')) AS month, service.description AS category, currency, CAST(ROUND(SUM(cost + IFNULL((SELECT SUM(credit.amount) FROM UNNEST(credits) AS credit), 0)) * 100) AS INT64) AS amount_cents FROM `" + client.table + "` WHERE usage_start_time >= @from AND usage_start_time < @to GROUP BY month, category, currency ORDER BY month, category"
}

func timestampParameter(name string, value time.Time) queryParameter {
	return queryParameter{Name: name, ParameterType: queryParameterType{Type: "TIMESTAMP"}, ParameterValue: queryParameterValue{Value: value.UTC().Format(time.RFC3339)}}
}

type queryRequest struct {
	Query           string           `json:"query"`
	UseLegacySQL    bool             `json:"useLegacySql"`
	ParameterMode   string           `json:"parameterMode"`
	QueryParameters []queryParameter `json:"queryParameters"`
}

type queryParameter struct {
	Name           string              `json:"name"`
	ParameterType  queryParameterType  `json:"parameterType"`
	ParameterValue queryParameterValue `json:"parameterValue"`
}
type queryParameterType struct {
	Type string `json:"type"`
}
type queryParameterValue struct {
	Value string `json:"value"`
}

type queryResponse struct {
	JobComplete bool       `json:"jobComplete"`
	Rows        []queryRow `json:"rows"`
}
type queryRow struct {
	Fields []queryField `json:"f"`
}
type queryField struct {
	Value string `json:"v"`
}
