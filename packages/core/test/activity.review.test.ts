import { describe, expect, it } from "vitest";
import { buildActivityReview } from "../src/activities/review.js";
import type { BungieActivityHistoryEntry } from "../src/activities/history.js";
import type { DefinitionComponentData } from "../src/manifest/definitions.js";

function makeActivity(overrides: Partial<BungieActivityHistoryEntry> = {}): BungieActivityHistoryEntry {
  return {
    period: "2026-06-25T10:00:00Z",
    activityDetails: {
      referenceId: 100,
      modes: [4],
    },
    values: {
      completed: { basic: { value: 1 } },
    },
    ...overrides,
  };
}

describe("activity review", () => {
  const defs: DefinitionComponentData = {
    "100": { displayProperties: { name: "最后一愿" } },
    "200": { displayProperties: { name: "预言" } },
    "300": { displayProperties: { name: "军火交易商" } },
  };

  it("groups activities by type", () => {
    const activities = [
      makeActivity({ activityDetails: { referenceId: 100, modes: [4] } }),
      makeActivity({ activityDetails: { referenceId: 200, modes: [82] } }),
      makeActivity({ activityDetails: { referenceId: 300, modes: [18] } }),
    ];

    const review = buildActivityReview(activities, defs);

    expect(review.total_activities).toBe(3);
    expect(review.groups).toHaveLength(3);
    expect(review.groups.find((g) => g.type === "raid")?.total).toBe(1);
    expect(review.groups.find((g) => g.type === "dungeon")?.total).toBe(1);
    expect(review.groups.find((g) => g.type === "strike")?.total).toBe(1);
  });

  it("tracks completion rate", () => {
    const activities = [
      makeActivity({
        activityDetails: { referenceId: 100, modes: [4] },
        values: { completed: { basic: { value: 1 } } },
      }),
      makeActivity({
        activityDetails: { referenceId: 100, modes: [4] },
        values: { completed: { basic: { value: 0 } } },
      }),
    ];

    const review = buildActivityReview(activities, defs);

    expect(review.completed_count).toBe(1);
    expect(review.completion_rate).toBe(50);
    const raidGroup = review.groups.find((g) => g.type === "raid");
    expect(raidGroup?.completion_rate).toBe(50);
  });

  it("adds readable status, duration and key stats to timeline entries", () => {
    const review = buildActivityReview([
      makeActivity({
        values: {
          completed: { basic: { value: 1 } },
          activityDurationSeconds: { basic: { value: 725, displayValue: "12m 5s" } },
          kills: { basic: { value: 42 } },
          deaths: { basic: { value: 3 } },
          assists: { basic: { value: 11 } },
        },
      })
    ], defs);

    expect(review.recent_10[0]).toMatchObject({
      status_label: "已完成",
      duration_label: "12m 5s",
      key_stats: ["击杀 42", "死亡 3", "助攻 11"]
    });
  });

  it("counts completions in a row from most recent", () => {
    const activities = [
      makeActivity({ period: "2026-06-25T12:00:00Z", values: { completed: { basic: { value: 1 } } } }),
      makeActivity({ period: "2026-06-25T11:00:00Z", values: { completed: { basic: { value: 1 } } } }),
      makeActivity({ period: "2026-06-25T10:00:00Z", values: { completed: { basic: { value: 0 } } } }),
      makeActivity({ period: "2026-06-25T09:00:00Z", values: { completed: { basic: { value: 1 } } } }),
    ];

    const review = buildActivityReview(activities, defs);
    expect(review.completions_in_a_row).toBe(2);
  });

  it("returns recent_10 in chronological order from API", () => {
    const activities = Array.from({ length: 15 }, (_, i) =>
      makeActivity({
        period: `2026-06-25T${String(10 + i).padStart(2, "0")}:00:00Z`,
        activityDetails: { referenceId: 100, modes: [4] },
      })
    );

    const review = buildActivityReview(activities, defs);
    expect(review.recent_10).toHaveLength(10);
    expect(review.recent_10[0].period).toBe("2026-06-25T10:00:00Z");
  });

  it("handles empty activity list", () => {
    const review = buildActivityReview([], defs);
    expect(review.total_activities).toBe(0);
    expect(review.completion_rate).toBe(0);
    expect(review.groups).toHaveLength(0);
    expect(review.recent_10).toHaveLength(0);
    expect(review.completions_in_a_row).toBe(0);
  });

  it("labels activity types in Chinese", () => {
    const activities = [
      makeActivity({ activityDetails: { modes: [4] } }),
      makeActivity({ activityDetails: { modes: [5] } }),
      makeActivity({ activityDetails: { modes: [63] } }),
      makeActivity({ activityDetails: { modes: [999] } }),
    ];

    const review = buildActivityReview(activities, defs);
    const labels = review.groups.map((g) => g.label);
    expect(labels).toContain("突袭");
    expect(labels).toContain("熔炉竞技场");
    expect(labels).toContain("智谋");
    expect(labels).toContain("其他");
  });
});
