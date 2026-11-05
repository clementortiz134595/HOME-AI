package application

import (
	"context"
	"testing"

	assistantmodel "github.com/clementortiz/home-ai/home-core/internal/assistant/model"
	homecontrol "github.com/clementortiz/home-ai/home-core/internal/homecontrol/application"
	homemodel "github.com/clementortiz/home-ai/home-core/internal/homecontrol/model"
)

type fakeHomeConnector struct{}

func (fakeHomeConnector) ListDevices(context.Context) ([]homemodel.Device, error) {
	return []homemodel.Device{{ID: "light.salon", Name: "Lumière salon", Room: "Salon"}}, nil
}
func (fakeHomeConnector) GetState(context.Context, string) (homemodel.DeviceState, error) {
	return homemodel.DeviceState{}, nil
}
func (fakeHomeConnector) Execute(_ context.Context, id string, action homemodel.Action) (homemodel.CommandResult, error) {
	on := action == homemodel.ActionTurnOn
	return homemodel.CommandResult{DeviceID: id, Action: action, State: homemodel.DeviceState{SwitchOn: &on}}, nil
}

func TestHomeToolResolvesRoomAndReturnsConfirmedState(t *testing.T) {
	result, err := NewHomeTool(homecontrol.NewService(fakeHomeConnector{})).Execute(context.Background(), assistantmodel.Intent{Name: "home.turn_on", Parameters: map[string]any{"target": "salon"}})
	if err != nil || result.Status != assistantmodel.ActionExecuted || result.Message != "Lumière salon allumée." {
		t.Fatalf("result=%+v err=%v", result, err)
	}
}
