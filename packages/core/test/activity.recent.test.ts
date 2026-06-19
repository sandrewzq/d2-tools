import { describe, expect, it } from "vitest";
import { summarizeRecentActivities } from "../src/activities/recent.js";

describe("recent activity summary", () => {
  it("groups completed PvE and PvP activities", () => {
    const summary = summarizeRecentActivities([
      { mode: "pve", completed: true, period: "2026-06-19T00:00:00.000Z" },
      { mode: "pve", completed: false, period: "2026-06-19T01:00:00.000Z" },
      { mode: "pvp", completed: true, period: "2026-06-19T02:00:00.000Z" }
    ]);

    expect(summary.total).toBe(3);
    expect(summary.pve.completed).toBe(1);
    expect(summary.pvp.completed).toBe(1);
    expect(summary.latest_period).toBe("2026-06-19T02:00:00.000Z");
  });
});
