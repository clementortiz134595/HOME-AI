package zigbee_test

import (
	"context"
	"github.com/clementortiz/home-ai/home-core/internal/homecontrol/adapters/outbound/zigbee"
	"github.com/clementortiz/home-ai/home-core/internal/homecontrol/model"
	"testing"
)

type transport struct{ written bool }

func (t *transport) ListDevices(context.Context) ([]model.Device, error) {
	return []model.Device{{ID: "plug-1", Protocol: model.ProtocolZigbee, Kind: model.DeviceKindPlug}}, nil
}
func (t *transport) ReadState(context.Context, string) (model.DeviceState, error) {
	return model.DeviceState{Online: true}, nil
}
func (t *transport) WriteSwitch(_ context.Context, _ string, on bool) (model.DeviceState, error) {
	t.written = on
	return model.DeviceState{Online: true, SwitchOn: &on}, nil
}
func TestAdapterMapsSwitchCommandToTransport(t *testing.T) {
	tx := &transport{}
	result, err := zigbee.NewAdapter(tx).Execute(context.Background(), "plug-1", model.ActionTurnOn)
	if err != nil || !tx.written || result.State.SwitchOn == nil || !*result.State.SwitchOn {
		t.Fatalf("unexpected result: %+v, err=%v", result, err)
	}
}
