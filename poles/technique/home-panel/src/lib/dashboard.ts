import type { DeviceState, HomeDevice } from "./homeControl";

export type DashboardRoom = {
  name: string;
  detail: string;
  active: boolean;
};

export type DashboardRooms =
  | { status: "ready"; rooms: DashboardRoom[] }
  | { status: "unavailable"; rooms: [] };

type DevicesReader = (signal?: AbortSignal) => Promise<HomeDevice[]>;
type StateReader = (deviceID: string, signal?: AbortSignal) => Promise<DeviceState>;

export async function loadDashboardRooms(getDevices: DevicesReader, getState: StateReader, signal?: AbortSignal): Promise<DashboardRooms> {
  try {
    const devices = await getDevices(signal);
    const entries = await Promise.all(devices.map(async (device) => [device.id, await getState(device.id, signal)] as const));
    const states = Object.fromEntries(entries) as Record<string, DeviceState>;
    return {
      status: "ready",
      rooms: Array.from(new Set(devices.map((device) => device.room))).map((room) => {
        const roomDevices = devices.filter((device) => device.room === room);
        const lights = roomDevices.filter((device) => device.kind === "light");
        const temperatureDevice = roomDevices.find((device) => states[device.id]?.temperatureC !== undefined);
        const temperature = temperatureDevice ? ` · ${Math.round(states[temperatureDevice.id].temperatureC!)}°` : "";
        return { name: room, detail: `${lights.length} lumière${lights.length > 1 ? "s" : ""}${temperature}`, active: lights.some((device) => states[device.id]?.switchOn) };
      }),
    };
  } catch {
    return { status: "unavailable", rooms: [] };
  }
}
