package zigbee

import (
	"context"
	"github.com/clementortiz/home-ai/home-core/internal/homecontrol/model"
)

// Transport is the boundary to a future Zigbee coordinator or bridge.
type Transport interface {
	ListDevices(context.Context) ([]model.Device, error)
	ReadState(context.Context, string) (model.DeviceState, error)
	WriteSwitch(context.Context, string, bool) (model.DeviceState, error)
}

type Adapter struct{ transport Transport }

func NewAdapter(transport Transport) Adapter { return Adapter{transport: transport} }
func (adapter Adapter) ListDevices(ctx context.Context) ([]model.Device, error) {
	return adapter.transport.ListDevices(ctx)
}
func (adapter Adapter) GetState(ctx context.Context, deviceID string) (model.DeviceState, error) {
	return adapter.transport.ReadState(ctx, deviceID)
}
func (adapter Adapter) Execute(ctx context.Context, deviceID string, action model.Action) (model.CommandResult, error) {
	state, err := adapter.transport.WriteSwitch(ctx, deviceID, action == model.ActionTurnOn)
	if err != nil {
		return model.CommandResult{}, err
	}
	return model.CommandResult{DeviceID: deviceID, Action: action, State: state}, nil
}
