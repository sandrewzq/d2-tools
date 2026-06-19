import { describe, expect, it } from "vitest";
import { summarizeRaidAndDungeonActivities } from "../src/activities/raidSummary.js";

describe("raid and dungeon summary", () => {
  it("counts completed raid and dungeon runs", () => {
    const summary = summarizeRaidAndDungeonActivities([
      { activity_name: "救赎花园", activity_type: "raid", completed: true, period: "2026-06-18T00:00:00.000Z" },
      { activity_name: "救赎花园", activity_type: "raid", completed: false, period: "2026-06-19T00:00:00.000Z" },
      { activity_name: "预言", activity_type: "dungeon", completed: true, period: "2026-06-17T00:00:00.000Z" }
    ]);

    expect(summary.entries).toEqual([
      { activity_name: "救赎花园", activity_type: "raid", completions: 1, attempts: 2, last_completed_at: "2026-06-18T00:00:00.000Z" },
      { activity_name: "预言", activity_type: "dungeon", completions: 1, attempts: 1, last_completed_at: "2026-06-17T00:00:00.000Z" }
    ]);
  });
});
