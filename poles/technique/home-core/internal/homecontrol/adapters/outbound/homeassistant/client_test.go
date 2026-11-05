package homeassistant_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/clementortiz/home-ai/home-core/internal/homecontrol/adapters/outbound/homeassistant"
	"github.com/clementortiz/home-ai/home-core/internal/homecontrol/model"
)

func TestClientCommandsHomeAssistantAndReadsConfirmedState(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer secret" {
			t.Fatal("missing Home Assistant token")
		}
		if r.Method == http.MethodPost {
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte("[]"))
			return
		}
		_, _ = w.Write([]byte(`{"entity_id":"light.salon","state":"on","attributes":{"friendly_name":"Lumière salon","brightness":180}}`))
	}))
	defer server.Close()
	result, err := homeassistant.NewClient(server.Client(), server.URL, "secret").Execute(context.Background(), "light.salon", model.ActionTurnOn)
	if err != nil || result.State.SwitchOn == nil || !*result.State.SwitchOn || result.State.Brightness == nil || *result.State.Brightness != 180 {
		t.Fatalf("result=%+v err=%v", result, err)
	}
}
