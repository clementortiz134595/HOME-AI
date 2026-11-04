package navitia

import (
	"context"
	"github.com/clementortiz/home-ai/home-core/internal/insights/model"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestClientMapsRealtimeDepartureAndDisruption(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/gare/87751784.json" {
			t.Errorf("path = %s", r.URL.Path)
		}
		_, _ = w.Write([]byte(`{"noms":{"87751008":"Marseille Saint-Charles"},"passages":[{"n":"881234","d":29400,"rd":900,"v":"2","de":"87751008","pr":"regionalRail"}]}`))
	}))
	defer server.Close()
	trains, err := NewClient(server.Client(), server.URL, "87751784").Departures(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if len(trains) != 1 {
		t.Fatalf("got %d trains", len(trains))
	}
	train := trains[0]
	if train.Status != model.Delayed || train.DelayMinutes != 15 || train.Platform != "2" {
		t.Fatalf("unexpected train: %+v", train)
	}
	if train.Destination != "Marseille Saint-Charles" {
		t.Fatalf("destination = %s", train.Destination)
	}
}
