package model

import "time"

type Protocol string

const ProtocolZigbee Protocol = "zigbee"

type DeviceKind string

const (
	DeviceKindPlug              DeviceKind = "plug"
	DeviceKindLight             DeviceKind = "light"
	DeviceKindTemperatureSensor DeviceKind = "temperature_sensor"
)

type Capability string

const (
	CapabilitySwitch      Capability = "switch"
	CapabilityCurrent     Capability = "current"
	CapabilityPower       Capability = "power"
	CapabilityBrightness  Capability = "brightness"
	CapabilityTemperature Capability = "temperature"
)

type Device struct {
	ID           string       `json:"id"`
	Name         string       `json:"name"`
	Room         string       `json:"room,omitempty"`
	Protocol     Protocol     `json:"protocol"`
	Kind         DeviceKind   `json:"kind"`
	Capabilities []Capability `json:"capabilities"`
}

type DevicePatch struct {
	Name *string `json:"name,omitempty"`
	Room *string `json:"room,omitempty"`
}

type DeviceState struct {
	DeviceID        string    `json:"deviceId"`
	Online          bool      `json:"online"`
	SwitchOn        *bool     `json:"switchOn,omitempty"`
	CurrentAmps     *float64  `json:"currentAmps,omitempty"`
	PowerWatts      *float64  `json:"powerWatts,omitempty"`
	Brightness      *int      `json:"brightness,omitempty"`
	TemperatureC    *float64  `json:"temperatureC,omitempty"`
	HumidityPercent *float64  `json:"humidityPercent,omitempty"`
	BatteryPercent  *float64  `json:"batteryPercent,omitempty"`
	ObservedAt      time.Time `json:"observedAt"`
}

type Measurement struct {
	ObservedAt      time.Time `json:"observedAt"`
	TemperatureC    *float64  `json:"temperatureC,omitempty"`
	HumidityPercent *float64  `json:"humidityPercent,omitempty"`
}

type Action string

const (
	ActionTurnOn  Action = "turn_on"
	ActionTurnOff Action = "turn_off"
)

type CommandResult struct {
	DeviceID string      `json:"deviceId"`
	Action   Action      `json:"action"`
	State    DeviceState `json:"state"`
}
