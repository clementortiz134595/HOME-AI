package simulated

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/clementortiz/home-ai/home-core/internal/homecontrol/model"
)

var ErrRouteUnavailable = errors.New("simulated zigbee route unavailable")

type fixture struct {
	Rooms   []struct{ ID, Name string } `json:"rooms"`
	Devices []fixtureDevice             `json:"devices"`
}

type fixtureDevice struct {
	ID, RoomID, Kind string
	Capabilities     []string       `json:"capabilities"`
	State            map[string]any `json:"state"`
	Available        bool           `json:"available"`
}

type Transport struct {
	mu       sync.RWMutex
	devices  map[string]fixtureDevice
	rooms    map[string]string
	observed map[string]model.DeviceState
}

func NewTransportFromFile(path string) (*Transport, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read zigbee fixture: %w", err)
	}
	var source fixture
	if err := json.Unmarshal(data, &source); err != nil {
		return nil, fmt.Errorf("decode zigbee fixture: %w", err)
	}
	t := &Transport{devices: make(map[string]fixtureDevice), rooms: make(map[string]string), observed: make(map[string]model.DeviceState)}
	for _, room := range source.Rooms {
		t.rooms[room.ID] = room.Name
	}
	for _, device := range source.Devices {
		t.devices[device.ID] = device
		state := model.DeviceState{DeviceID: device.ID, Online: device.Available, ObservedAt: time.Now().UTC()}
		if on, ok := device.State["on"].(bool); ok {
			state.SwitchOn = &on
		}
		if brightness, ok := device.State["brightness"].(float64); ok {
			value := int(brightness)
			state.Brightness = &value
		}
		if temperature, ok := device.State["temperatureC"].(float64); ok {
			state.TemperatureC = &temperature
		}
		t.observed[device.ID] = state
	}
	return t, nil
}

func (t *Transport) ListDevices(context.Context) ([]model.Device, error) {
	t.mu.RLock()
	defer t.mu.RUnlock()
	devices := make([]model.Device, 0, len(t.devices))
	for _, device := range t.devices {
		capabilities := make([]model.Capability, 0, len(device.Capabilities))
		for _, capability := range device.Capabilities {
			capabilities = append(capabilities, model.Capability(capability))
		}
		devices = append(devices, model.Device{ID: device.ID, Name: device.ID, Room: t.rooms[device.RoomID], Protocol: model.ProtocolZigbee, Kind: model.DeviceKind(device.Kind), Capabilities: capabilities})
	}
	return devices, nil
}

func (t *Transport) ReadState(_ context.Context, deviceID string) (model.DeviceState, error) {
	t.mu.RLock()
	defer t.mu.RUnlock()
	state, ok := t.observed[deviceID]
	if !ok {
		return model.DeviceState{}, fmt.Errorf("%w: %s", applicationErrDeviceNotFound(), deviceID)
	}
	return state, nil
}

func (t *Transport) WriteSwitch(_ context.Context, deviceID string, on bool) (model.DeviceState, error) {
	t.mu.Lock()
	defer t.mu.Unlock()
	device, ok := t.devices[deviceID]
	if !ok {
		return model.DeviceState{}, fmt.Errorf("device not found: %s", deviceID)
	}
	if !device.Available {
		return model.DeviceState{}, ErrRouteUnavailable
	}
	state := t.observed[deviceID]
	state.SwitchOn = &on
	state.Online = true
	state.ObservedAt = time.Now().UTC()
	t.observed[deviceID] = state
	return state, nil
}

// Kept local to avoid coupling the outbound adapter to application errors.
func applicationErrDeviceNotFound() error { return errors.New("home control device not found") }
