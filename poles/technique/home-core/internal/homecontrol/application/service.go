package application

import (
	"context"
	"errors"
	"fmt"

	"github.com/clementortiz/home-ai/home-core/internal/homecontrol/model"
)

var (
	ErrDeviceNotFound    = errors.New("home control device not found")
	ErrUnsupportedAction = errors.New("home control action is not supported")
	ErrUnavailable       = errors.New("home control device unavailable")
)

type Connector interface {
	ListDevices(context.Context) ([]model.Device, error)
	GetState(context.Context, string) (model.DeviceState, error)
	Execute(context.Context, string, model.Action) (model.CommandResult, error)
}

type Service struct{ connector Connector }

func NewService(connector Connector) Service { return Service{connector: connector} }
func (service Service) ListDevices(ctx context.Context) ([]model.Device, error) {
	return service.connector.ListDevices(ctx)
}
func (service Service) GetState(ctx context.Context, deviceID string) (model.DeviceState, error) {
	if deviceID == "" {
		return model.DeviceState{}, fmt.Errorf("device id is required")
	}
	return service.connector.GetState(ctx, deviceID)
}
func (service Service) Execute(ctx context.Context, deviceID string, action model.Action) (model.CommandResult, error) {
	if deviceID == "" {
		return model.CommandResult{}, fmt.Errorf("device id is required")
	}
	if action != model.ActionTurnOn && action != model.ActionTurnOff {
		return model.CommandResult{}, ErrUnsupportedAction
	}
	return service.connector.Execute(ctx, deviceID, action)
}
