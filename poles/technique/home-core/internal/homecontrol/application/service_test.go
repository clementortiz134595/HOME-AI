package application_test

import (
	"context"
	"github.com/clementortiz/home-ai/home-core/internal/homecontrol/application"
	"github.com/clementortiz/home-ai/home-core/internal/homecontrol/model"
	"testing"
)

type connector struct{ action model.Action }

func (c *connector) ListDevices(context.Context) ([]model.Device, error) { return nil, nil }
func (c *connector) GetState(context.Context, string) (model.DeviceState, error) {
	return model.DeviceState{}, nil
}
func (c *connector) Execute(_ context.Context, id string, action model.Action) (model.CommandResult, error) {
	c.action = action
	on := action == model.ActionTurnOn
	return model.CommandResult{DeviceID: id, Action: action, State: model.DeviceState{DeviceID: id, Online: true, SwitchOn: &on}}, nil
}
func TestExecuteReturnsConfirmedState(t *testing.T) {
	c := &connector{}
	result, err := application.NewService(c).Execute(context.Background(), "plug-1", model.ActionTurnOn)
	if err != nil || c.action != model.ActionTurnOn || result.State.SwitchOn == nil || !*result.State.SwitchOn {
		t.Fatalf("unexpected result: %+v, err=%v", result, err)
	}
}
func TestExecuteRejectsUnknownAction(t *testing.T) {
	_, err := application.NewService(&connector{}).Execute(context.Background(), "plug-1", "dim")
	if err != application.ErrUnsupportedAction {
		t.Fatalf("expected unsupported action, got %v", err)
	}
}
