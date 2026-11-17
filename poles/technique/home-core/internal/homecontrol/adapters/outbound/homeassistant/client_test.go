package homeassistant_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
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

func TestListDevicesOmitsSystemSensors(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer secret" {
			t.Fatal("missing Home Assistant token")
		}
		_, _ = w.Write([]byte(`[
			{"entity_id":"sensor.backup_last_successful","state":"unknown","attributes":{"friendly_name":"Backup dernier succès","device_class":"timestamp"}},
			{"entity_id":"sensor.cuisine_temperature","state":"21.2","attributes":{"friendly_name":"Température cuisine","device_class":"temperature"}},
			{"entity_id":"light.cuisine","state":"on","attributes":{"friendly_name":"Lumière cuisine"}}
		]`))
	}))
	defer server.Close()

	devices, err := homeassistant.NewClient(server.Client(), server.URL, "secret").ListDevices(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if len(devices) != 2 || devices[0].ID != "sensor.cuisine_temperature" || devices[1].ID != "light.cuisine" {
		t.Fatalf("unexpected devices: %#v", devices)
	}
}

func TestTemperatureSensorStateIncludesMeasurementsWithoutSwitchState(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/states/sensor.chambre_temperature" {
			_, _ = w.Write([]byte(`{"entity_id":"sensor.chambre_temperature","state":"20.6","last_changed":"2026-11-17T18:00:00Z","attributes":{"device_class":"temperature"}}`))
			return
		}
		_, _ = w.Write([]byte(`[
			{"entity_id":"sensor.chambre_temperature","state":"20.6","attributes":{"device_class":"temperature"}},
			{"entity_id":"sensor.chambre_humidite","state":"53.7","attributes":{"device_class":"humidity"}},
			{"entity_id":"sensor.chambre_batterie","state":"100","attributes":{"device_class":"battery"}}
		]`))
	}))
	defer server.Close()

	state, err := homeassistant.NewClient(server.Client(), server.URL, "secret").GetState(context.Background(), "sensor.chambre_temperature")
	if err != nil || state.SwitchOn != nil || state.TemperatureC == nil || *state.TemperatureC != 20.6 || state.HumidityPercent == nil || *state.HumidityPercent != 53.7 || state.BatteryPercent == nil || *state.BatteryPercent != 100 {
		t.Fatalf("state=%+v err=%v", state, err)
	}
}

func TestTemperatureSensorHistoryReturnsSeparateTemperatureAndHumiditySeries(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/states" {
			_, _ = w.Write([]byte(`[
				{"entity_id":"sensor.chambre_temperature","state":"20.6","attributes":{"device_class":"temperature"}},
				{"entity_id":"sensor.chambre_humidity","state":"53.7","attributes":{"device_class":"humidity"}}
			]`))
			return
		}
		if !strings.HasPrefix(r.URL.Path, "/api/history/period/") {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if got := r.URL.Query().Get("filter_entity_id"); got != "sensor.chambre_temperature,sensor.chambre_humidity" {
			t.Fatalf("filter_entity_id=%q", got)
		}
		_, _ = w.Write([]byte(`[
			[{"entity_id":"sensor.chambre_temperature","state":"20.6","last_changed":"2026-11-17T18:00:00Z"}],
			[{"entity_id":"sensor.chambre_humidity","state":"53.7","last_changed":"2026-11-17T18:05:00Z"}]
		]`))
	}))
	defer server.Close()

	history, err := homeassistant.NewClient(server.Client(), server.URL, "secret").GetHistory(context.Background(), "sensor.chambre_temperature")
	if err != nil || len(history) != 2 || history[0].TemperatureC == nil || *history[0].TemperatureC != 20.6 || history[1].HumidityPercent == nil || *history[1].HumidityPercent != 53.7 {
		t.Fatalf("history=%+v err=%v", history, err)
	}
}
