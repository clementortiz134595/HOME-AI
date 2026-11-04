package simulated_test

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/clementortiz/home-ai/home-core/internal/homecontrol/adapters/outbound/simulated"
)

func TestTransportLoadsRoomsDevicesAndConfirmedState(t *testing.T) {
	path := filepath.Join("..", "..", "..", "..", "..", "..", "zigbee-simulator", "code", "fixtures", "maison-demo.json")
	transport, err := simulated.NewTransportFromFile(path)
	if err != nil {
		t.Fatal(err)
	}
	devices, err := transport.ListDevices(context.Background())
	if err != nil || len(devices) != 8 {
		t.Fatalf("unexpected devices: %d, err=%v", len(devices), err)
	}
	byID := make(map[string]struct {
		room         string
		capabilities []string
	}, len(devices))
	for _, device := range devices {
		capabilities := make([]string, 0, len(device.Capabilities))
		for _, capability := range device.Capabilities {
			capabilities = append(capabilities, string(capability))
		}
		byID[device.ID] = struct {
			room         string
			capabilities []string
		}{room: device.Room, capabilities: capabilities}
	}
	if device, ok := byID["light-cuisine-main"]; !ok || device.room != "Cuisine" || len(device.capabilities) != 2 {
		t.Fatalf("missing kitchen light in inventory: %+v", device)
	}
	if device, ok := byID["plug-salon-tv"]; !ok || device.room != "Salon" {
		t.Fatalf("missing living room plug in inventory: %+v", device)
	}
	if device, ok := byID["sensor-cuisine-temperature"]; !ok || device.room != "Cuisine" {
		t.Fatalf("missing kitchen temperature sensor in inventory: %+v", device)
	}
	state, err := transport.ReadState(context.Background(), "light-salon-main")
	if err != nil || state.SwitchOn == nil || *state.SwitchOn {
		t.Fatalf("unexpected initial state: %+v, err=%v", state, err)
	}
	state, err = transport.WriteSwitch(context.Background(), "light-salon-main", true)
	if err != nil || state.SwitchOn == nil || !*state.SwitchOn {
		t.Fatalf("unexpected confirmed state: %+v, err=%v", state, err)
	}
}
