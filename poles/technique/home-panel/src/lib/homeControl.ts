export type HomeDevice = {
  id: string;
  name: string;
  room: string;
  kind: string;
  capabilities: string[];
};

export type DeviceState = {
  deviceId: string;
  online: boolean;
  switchOn?: boolean;
  brightness?: number;
  temperatureC?: number;
  observedAt: string;
};

export async function getHomeDevices(signal?: AbortSignal): Promise<HomeDevice[]> {
  const response = await fetch("/v1/home-control/devices", { signal });
  if (!response.ok) throw new Error("home_control_unavailable");
  return response.json() as Promise<HomeDevice[]>;
}

export async function getDeviceState(deviceId: string, signal?: AbortSignal): Promise<DeviceState> {
  const response = await fetch(`/v1/home-control/devices/${encodeURIComponent(deviceId)}/state`, { signal });
  if (!response.ok) throw new Error("device_state_unavailable");
  return response.json() as Promise<DeviceState>;
}

export async function setDeviceSwitch(deviceId: string, on: boolean): Promise<DeviceState> {
  const response = await fetch(`/v1/home-control/devices/${encodeURIComponent(deviceId)}/commands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: on ? "turn_on" : "turn_off" }),
  });
  if (!response.ok) throw new Error("device_command_failed");
  const result = await response.json() as { state: DeviceState };
  return result.state;
}
