import { describe, expect, it, vi } from "vitest";

import { loadDashboardRooms } from "../src/lib/dashboard";
import { setChoreCompleted } from "../src/lib/homeControl";

describe("dashboard home state", () => {
  it("reports Home Core as unavailable when devices cannot be loaded", async () => {
    const result = await loadDashboardRooms(vi.fn().mockRejectedValue(new Error("offline")), vi.fn());

    expect(result).toEqual({ status: "unavailable", rooms: [] });
  });
});

describe("chore completion", () => {
  it("rejects when Home Core does not confirm the update", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    await expect(setChoreCompleted("kitchen", true)).rejects.toThrow("chore_update_failed");
  });
});
