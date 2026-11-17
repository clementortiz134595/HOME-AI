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
type HistoryReader interface {
	GetHistory(context.Context, string) ([]model.Measurement, error)
}

type InventoryEditor interface {
	UpdateDevice(context.Context, string, model.DevicePatch) (model.Device, error)
}

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
func (service Service) GetHistory(ctx context.Context, deviceID string) ([]model.Measurement, error) {
	reader, ok := service.connector.(HistoryReader)
	if !ok {
		return nil, ErrUnavailable
	}
	return reader.GetHistory(ctx, deviceID)
}
func (service Service) UpdateDevice(ctx context.Context, deviceID string, patch model.DevicePatch) (model.Device, error) {
	if deviceID == "" || (patch.Name == nil && patch.Room == nil) {
		return model.Device{}, fmt.Errorf("device update is required")
	}
	if patch.Name != nil && *patch.Name == "" {
		return model.Device{}, fmt.Errorf("device name is required")
	}
	editor, ok := service.connector.(InventoryEditor)
	if !ok {
		return model.Device{}, ErrUnavailable
	}
	return editor.UpdateDevice(ctx, deviceID, patch)
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
