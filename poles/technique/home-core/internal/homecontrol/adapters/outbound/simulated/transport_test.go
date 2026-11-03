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
	if err != nil || len(devices) != 4 {
		t.Fatalf("unexpected devices: %d, err=%v", len(devices), err)
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
