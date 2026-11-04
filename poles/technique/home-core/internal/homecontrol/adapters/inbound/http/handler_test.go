package homecontrolhttp

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/clementortiz/home-ai/home-core/internal/homecontrol/adapters/outbound/simulated"
	"github.com/clementortiz/home-ai/home-core/internal/homecontrol/adapters/outbound/zigbee"
	"github.com/clementortiz/home-ai/home-core/internal/homecontrol/application"
	"github.com/clementortiz/home-ai/home-core/internal/homecontrol/model"
)

func TestSimulatorToCoreToPanelFlow(t *testing.T) {
	fixture := filepath.Join("..", "..", "..", "..", "..", "..", "zigbee-simulator", "code", "fixtures", "maison-demo.json")
	transport, err := simulated.NewTransportFromFile(fixture)
	if err != nil {
		t.Fatal(err)
	}
	handler := NewHandler(application.NewService(zigbee.NewAdapter(transport)))

	request := httptest.NewRequest(http.MethodGet, "/v1/home-control/devices/light-salon-main/state", nil)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("state request status = %d, want 200", response.Code)
	}
	var initial model.DeviceState
	if err := json.NewDecoder(response.Body).Decode(&initial); err != nil {
		t.Fatal(err)
	}
	if initial.SwitchOn == nil || *initial.SwitchOn {
		t.Fatalf("initial simulator state = %+v, want switch off", initial)
	}

	// Use a real request body while keeping the test focused on the HTTP contract.
	command := httptest.NewRequest(http.MethodPost, "/v1/home-control/devices/light-salon-main/commands", io.NopCloser(strings.NewReader(`{"action":"turn_on"}`)))
	command.Header.Set("Content-Type", "application/json")
	response = httptest.NewRecorder()
	handler.ServeHTTP(response, command)
	if response.Code != http.StatusOK {
		t.Fatalf("command status = %d, body = %s", response.Code, response.Body.String())
	}

	var result model.CommandResult
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}
	if result.State.SwitchOn == nil || !*result.State.SwitchOn {
		t.Fatalf("command result = %+v, want confirmed switch on", result)
	}

	request = httptest.NewRequest(http.MethodGet, "/v1/home-control/devices/light-salon-main/state", nil)
	response = httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	var panelState model.DeviceState
	if err := json.NewDecoder(response.Body).Decode(&panelState); err != nil {
		t.Fatal(err)
	}
	if panelState.SwitchOn == nil || !*panelState.SwitchOn {
		t.Fatalf("panel state = %+v, want switch on", panelState)
	}
}
