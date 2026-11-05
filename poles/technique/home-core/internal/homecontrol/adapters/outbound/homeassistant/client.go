package homeassistant

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/clementortiz/home-ai/home-core/internal/homecontrol/model"
)

// Client adapts Home Assistant's REST API to the Home Core home-control port.
// Entity IDs are deliberately used as stable device IDs at this boundary.
type Client struct {
	baseURL string
	token   string
	http    *http.Client
}

func NewClient(httpClient *http.Client, baseURL, token string) *Client {
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 10 * time.Second}
	}
	return &Client{baseURL: strings.TrimRight(baseURL, "/"), token: token, http: httpClient}
}

type state struct {
	EntityID    string         `json:"entity_id"`
	State       string         `json:"state"`
	Attributes  map[string]any `json:"attributes"`
	LastChanged time.Time      `json:"last_changed"`
}

func (client *Client) ListDevices(ctx context.Context) ([]model.Device, error) {
	var states []state
	if err := client.get(ctx, "/api/states", &states); err != nil {
		return nil, err
	}
	devices := make([]model.Device, 0, len(states))
	for _, item := range states {
		kind, capabilities, ok := deviceKind(item.EntityID)
		if !ok {
			continue
		}
		devices = append(devices, model.Device{
			ID: item.EntityID, Name: attributeString(item.Attributes, "friendly_name", item.EntityID),
			Room: attributeString(item.Attributes, "area_name", ""), Protocol: "home_assistant", Kind: kind, Capabilities: capabilities,
		})
	}
	return devices, nil
}

func (client *Client) GetState(ctx context.Context, deviceID string) (model.DeviceState, error) {
	var item state
	if err := client.get(ctx, "/api/states/"+deviceID, &item); err != nil {
		return model.DeviceState{}, err
	}
	return toDeviceState(item), nil
}

func (client *Client) Execute(ctx context.Context, deviceID string, action model.Action) (model.CommandResult, error) {
	domain := strings.SplitN(deviceID, ".", 2)[0]
	if domain != "light" && domain != "switch" {
		return model.CommandResult{}, fmt.Errorf("entity does not support switch commands: %s", deviceID)
	}
	var ignored any
	if err := client.post(ctx, "/api/services/"+domain+"/"+string(action), map[string]any{"entity_id": deviceID}, &ignored); err != nil {
		return model.CommandResult{}, err
	}
	state, err := client.GetState(ctx, deviceID)
	if err != nil {
		return model.CommandResult{}, fmt.Errorf("read confirmed Home Assistant state: %w", err)
	}
	return model.CommandResult{DeviceID: deviceID, Action: action, State: state}, nil
}

func (client *Client) get(ctx context.Context, path string, target any) error {
	return client.do(ctx, http.MethodGet, path, nil, target)
}

func (client *Client) post(ctx context.Context, path string, body, target any) error {
	return client.do(ctx, http.MethodPost, path, body, target)
}

func (client *Client) do(ctx context.Context, method, path string, body, target any) error {
	var reader strings.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = *strings.NewReader(string(data))
	}
	req, err := http.NewRequestWithContext(ctx, method, client.baseURL+path, &reader)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+client.token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := client.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("Home Assistant returned HTTP %d", resp.StatusCode)
	}
	if target == nil {
		return nil
	}
	return json.NewDecoder(resp.Body).Decode(target)
}

func deviceKind(entityID string) (model.DeviceKind, []model.Capability, bool) {
	switch strings.SplitN(entityID, ".", 2)[0] {
	case "light":
		return model.DeviceKindLight, []model.Capability{model.CapabilitySwitch, model.CapabilityBrightness}, true
	case "switch":
		return model.DeviceKindPlug, []model.Capability{model.CapabilitySwitch}, true
	case "sensor":
		return model.DeviceKindTemperatureSensor, []model.Capability{model.CapabilityTemperature}, true
	default:
		return "", nil, false
	}
}

func toDeviceState(item state) model.DeviceState {
	on := item.State == "on"
	state := model.DeviceState{DeviceID: item.EntityID, Online: item.State != "unavailable" && item.State != "unknown", SwitchOn: &on, ObservedAt: item.LastChanged}
	if brightness, ok := item.Attributes["brightness"].(float64); ok {
		value := int(brightness)
		state.Brightness = &value
	}
	if temperature, ok := item.Attributes["temperature"].(float64); ok {
		state.TemperatureC = &temperature
	}
	return state
}

func attributeString(attributes map[string]any, key, fallback string) string {
	if value, ok := attributes[key].(string); ok && value != "" {
		return value
	}
	return fallback
}
