package homeassistant

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/clementortiz/home-ai/home-core/internal/homecontrol/model"
	"github.com/gorilla/websocket"
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
	LastUpdated time.Time      `json:"last_updated"`
}

type entityRegistryEntry struct {
	EntityID string `json:"entity_id"`
	ID       string `json:"id"`
	Name     string `json:"name"`
	AreaID   string `json:"area_id"`
	DeviceID string `json:"device_id"`
}

type deviceRegistryEntry struct {
	ID     string `json:"id"`
	AreaID string `json:"area_id"`
}

type areaRegistryEntry struct {
	ID   string `json:"area_id"`
	Name string `json:"name"`
}

type registrySnapshot struct {
	Entities map[string]entityRegistryEntry
	Devices  map[string]deviceRegistryEntry
	Areas    map[string]areaRegistryEntry
}

func (client *Client) ListDevices(ctx context.Context) ([]model.Device, error) {
	var states []state
	if err := client.get(ctx, "/api/states", &states); err != nil {
		return nil, err
	}
	registry, err := client.getRegistry(ctx)
	if err != nil {
		registry = registrySnapshot{Entities: map[string]entityRegistryEntry{}, Devices: map[string]deviceRegistryEntry{}, Areas: map[string]areaRegistryEntry{}}
	}
	devices := make([]model.Device, 0, len(states))
	for _, item := range states {
		kind, capabilities, ok := deviceKind(item.EntityID, item.Attributes)
		if !ok {
			continue
		}
		name := attributeString(item.Attributes, "friendly_name", item.EntityID)
		room := attributeString(item.Attributes, "area_name", "")
		if entry, ok := registry.Entities[item.EntityID]; ok {
			if entry.Name != "" {
				name = entry.Name
			}
			areaID := entry.AreaID
			if areaID == "" && entry.DeviceID != "" {
				areaID = registry.Devices[entry.DeviceID].AreaID
			}
			if area, ok := registry.Areas[areaID]; ok {
				room = area.Name
			}
		}
		devices = append(devices, model.Device{ID: item.EntityID, Name: name, Room: room, Protocol: "home_assistant", Kind: kind, Capabilities: capabilities})
	}
	return devices, nil
}

func (client *Client) UpdateDevice(ctx context.Context, deviceID string, patch model.DevicePatch) (model.Device, error) {
	registry, err := client.getRegistry(ctx)
	if err != nil {
		return model.Device{}, err
	}
	entry, ok := registry.Entities[deviceID]
	if !ok {
		return model.Device{}, fmt.Errorf("Home Assistant entity not found: %s", deviceID)
	}
	if patch.Name != nil {
		if err := client.websocketCommand(ctx, "config/entity_registry/update", map[string]any{"entity_id": deviceID, "name": *patch.Name}, nil); err != nil {
			return model.Device{}, err
		}
	}
	if patch.Room != nil {
		areaID, err := client.resolveAreaID(ctx, registry, *patch.Room)
		if err != nil {
			return model.Device{}, err
		}
		if entry.DeviceID != "" {
			err = client.websocketCommand(ctx, "config/device_registry/update", map[string]any{"device_id": entry.DeviceID, "area_id": areaID}, nil)
		} else {
			err = client.websocketCommand(ctx, "config/entity_registry/update", map[string]any{"entity_id": deviceID, "area_id": areaID}, nil)
		}
		if err != nil {
			return model.Device{}, err
		}
	}
	devices, err := client.ListDevices(ctx)
	if err != nil {
		return model.Device{}, err
	}
	for _, device := range devices {
		if device.ID == deviceID {
			return device, nil
		}
	}
	return model.Device{}, fmt.Errorf("updated Home Assistant entity not found: %s", deviceID)
}

func (client *Client) GetState(ctx context.Context, deviceID string) (model.DeviceState, error) {
	var item state
	if err := client.get(ctx, "/api/states/"+deviceID, &item); err != nil {
		return model.DeviceState{}, err
	}
	result := toDeviceState(item)
	if strings.HasPrefix(deviceID, "sensor.") && attributeString(item.Attributes, "device_class", "") == "temperature" {
		var states []state
		if err := client.get(ctx, "/api/states", &states); err != nil {
			return model.DeviceState{}, err
		}
		prefix := strings.TrimSuffix(deviceID, "_temperature")
		for _, sibling := range states {
			if !strings.HasPrefix(sibling.EntityID, prefix+"_") {
				continue
			}
			value, err := strconv.ParseFloat(sibling.State, 64)
			if err != nil {
				continue
			}
			switch attributeString(sibling.Attributes, "device_class", "") {
			case "humidity":
				result.HumidityPercent = &value
			case "battery":
				result.BatteryPercent = &value
			}
		}
	}
	return result, nil
}

func (client *Client) GetHistory(ctx context.Context, deviceID string) ([]model.Measurement, error) {
	if !strings.HasPrefix(deviceID, "sensor.") {
		return nil, fmt.Errorf("history unsupported for %s", deviceID)
	}
	var states []state
	if err := client.get(ctx, "/api/states", &states); err != nil {
		return nil, err
	}
	humidityID := ""
	prefix := strings.TrimSuffix(deviceID, "_temperature") + "_"
	for _, item := range states {
		if strings.HasPrefix(item.EntityID, prefix) && attributeString(item.Attributes, "device_class", "") == "humidity" {
			humidityID = item.EntityID
			break
		}
	}
	if humidityID == "" {
		return nil, fmt.Errorf("humidity sensor unavailable for %s", deviceID)
	}
	var series [][]state
	from := time.Now().Add(-24 * time.Hour).UTC().Format(time.RFC3339)
	if err := client.get(ctx, "/api/history/period/"+from+"?filter_entity_id="+deviceID+","+humidityID, &series); err != nil {
		return nil, err
	}
	points := make([]model.Measurement, 0)
	for _, entries := range series {
		for _, item := range entries {
			value, err := strconv.ParseFloat(item.State, 64)
			if err != nil {
				continue
			}
			if item.EntityID == deviceID {
				points = append(points, model.Measurement{ObservedAt: observationTime(item), TemperatureC: &value})
			}
			if item.EntityID == humidityID {
				points = append(points, model.Measurement{ObservedAt: observationTime(item), HumidityPercent: &value})
			}
		}
	}
	sort.Slice(points, func(i, j int) bool { return points[i].ObservedAt.Before(points[j].ObservedAt) })
	return points, nil
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

func (client *Client) getRegistry(ctx context.Context) (registrySnapshot, error) {
	var entities []entityRegistryEntry
	if err := client.websocketCommand(ctx, "config/entity_registry/list", nil, &entities); err != nil {
		return registrySnapshot{}, err
	}
	var devices []deviceRegistryEntry
	if err := client.websocketCommand(ctx, "config/device_registry/list", nil, &devices); err != nil {
		return registrySnapshot{}, err
	}
	var areas []areaRegistryEntry
	if err := client.websocketCommand(ctx, "config/area_registry/list", nil, &areas); err != nil {
		return registrySnapshot{}, err
	}
	snapshot := registrySnapshot{Entities: make(map[string]entityRegistryEntry, len(entities)), Devices: make(map[string]deviceRegistryEntry, len(devices)), Areas: make(map[string]areaRegistryEntry, len(areas))}
	for _, entry := range entities {
		snapshot.Entities[entry.EntityID] = entry
	}
	for _, entry := range devices {
		snapshot.Devices[entry.ID] = entry
	}
	for _, entry := range areas {
		snapshot.Areas[entry.ID] = entry
	}
	return snapshot, nil
}

func (client *Client) resolveAreaID(ctx context.Context, registry registrySnapshot, room string) (string, error) {
	if room == "" {
		return "", nil
	}
	for _, area := range registry.Areas {
		if strings.EqualFold(area.Name, room) {
			return area.ID, nil
		}
	}
	var area areaRegistryEntry
	if err := client.websocketCommand(ctx, "config/area_registry/create", map[string]any{"name": room}, &area); err != nil {
		return "", err
	}
	if area.ID == "" {
		return "", fmt.Errorf("Home Assistant returned an empty area id")
	}
	return area.ID, nil
}

func (client *Client) websocketCommand(ctx context.Context, command string, fields map[string]any, target any) error {
	endpoint, err := url.Parse(client.baseURL)
	if err != nil {
		return err
	}
	if endpoint.Scheme == "https" {
		endpoint.Scheme = "wss"
	} else {
		endpoint.Scheme = "ws"
	}
	endpoint.Path = strings.TrimRight(endpoint.Path, "/") + "/api/websocket"
	connection, _, err := websocket.DefaultDialer.DialContext(ctx, endpoint.String(), nil)
	if err != nil {
		return err
	}
	defer connection.Close()
	if err := connection.SetReadDeadline(time.Now().Add(10 * time.Second)); err != nil {
		return err
	}
	var greeting struct {
		Type string `json:"type"`
	}
	if err := connection.ReadJSON(&greeting); err != nil {
		return err
	}
	if greeting.Type != "auth_required" {
		return fmt.Errorf("unexpected Home Assistant websocket greeting: %s", greeting.Type)
	}
	if err := connection.WriteJSON(map[string]any{"type": "auth", "access_token": client.token}); err != nil {
		return err
	}
	var authenticated struct {
		Type    string `json:"type"`
		Message string `json:"message"`
	}
	if err := connection.ReadJSON(&authenticated); err != nil {
		return err
	}
	if authenticated.Type != "auth_ok" {
		return fmt.Errorf("Home Assistant websocket authentication failed: %s", authenticated.Message)
	}
	request := map[string]any{"id": 1, "type": command}
	for key, value := range fields {
		request[key] = value
	}
	if err := connection.WriteJSON(request); err != nil {
		return err
	}
	for {
		var response struct {
			ID      int             `json:"id"`
			Type    string          `json:"type"`
			Success bool            `json:"success"`
			Result  json.RawMessage `json:"result"`
			Error   struct {
				Code    string `json:"code"`
				Message string `json:"message"`
			} `json:"error"`
		}
		if err := connection.ReadJSON(&response); err != nil {
			return err
		}
		if response.Type != "result" || response.ID != 1 {
			continue
		}
		if !response.Success {
			return fmt.Errorf("Home Assistant websocket command %s failed: %s", command, response.Error.Message)
		}
		if target != nil && len(response.Result) > 0 {
			return json.Unmarshal(response.Result, target)
		}
		return nil
	}
}

func deviceKind(entityID string, attributes map[string]any) (model.DeviceKind, []model.Capability, bool) {
	switch strings.SplitN(entityID, ".", 2)[0] {
	case "light":
		return model.DeviceKindLight, []model.Capability{model.CapabilitySwitch, model.CapabilityBrightness}, true
	case "switch":
		return model.DeviceKindPlug, []model.Capability{model.CapabilitySwitch}, true
	case "sensor":
		if attributeString(attributes, "device_class", "") != "temperature" {
			return "", nil, false
		}
		return model.DeviceKindTemperatureSensor, []model.Capability{model.CapabilityTemperature}, true
	default:
		return "", nil, false
	}
}

func toDeviceState(item state) model.DeviceState {
	state := model.DeviceState{DeviceID: item.EntityID, Online: item.State != "unavailable" && item.State != "unknown", ObservedAt: observationTime(item)}
	if !strings.HasPrefix(item.EntityID, "sensor.") {
		on := item.State == "on"
		state.SwitchOn = &on
	}
	if brightness, ok := item.Attributes["brightness"].(float64); ok {
		value := int(brightness)
		state.Brightness = &value
	}
	if temperature, ok := item.Attributes["temperature"].(float64); ok {
		state.TemperatureC = &temperature
	}
	if attributeString(item.Attributes, "device_class", "") == "temperature" {
		if value, err := strconv.ParseFloat(item.State, 64); err == nil {
			state.TemperatureC = &value
		}
	}
	return state
}

func observationTime(item state) time.Time {
	if !item.LastUpdated.IsZero() {
		return item.LastUpdated
	}
	return item.LastChanged
}

func attributeString(attributes map[string]any, key, fallback string) string {
	if value, ok := attributes[key].(string); ok && value != "" {
		return value
	}
	return fallback
}
