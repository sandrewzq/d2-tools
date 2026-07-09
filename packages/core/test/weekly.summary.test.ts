import { describe, expect, it } from "vitest";
import { buildWeeklyLiveDataFromBungie } from "../src/weekly/liveData";
import { buildWeeklySummary } from "../src/weekly/summary";

describe("weekly summary", () => {
  it("classifies Bungie milestone definitions into weekly priority data", () => {
    const liveData = buildWeeklyLiveDataFromBungie({
      milestones: {
        "1": {
          activities: [{ activityHash: 100 }]
        },
        "2": {
          displayProperties: { name: "日落", description: "奖励武器：热头" },
          activities: [{ activityHash: 200 }]
        }
      },
      definitions: {
        milestones: {
          "1": { displayProperties: { name: "国王的陨落", description: "国王万岁" } }
        },
        activities: {
          "100": { displayProperties: { name: "国王的陨落: 标准" } },
          "200": { displayProperties: { name: "玻璃小径：大师" } }
        }
      }
    });

    expect(liveData.items?.map((item) => item.weeklyActivityKind)).toEqual(["rotating_raid", "nightfall"]);
    expect(liveData.items?.[0]?.title).toBe("Bungie 公共里程碑：国王的陨落");
  });

  it("builds fixed weekly priorities separately from daily summary", () => {
    const summary = buildWeeklySummary(new Date("2026-07-09T09:00:00.000Z"), {
      items: [
        {
          title: "Bungie 公共里程碑：国王的陨落",
          subtitle: "非完整掉落地图；国王的陨落: 标准",
          description: "国王万岁",
          source: "Bungie",
          weeklyActivityKind: "rotating_raid"
        }
      ]
    }, { timeZone: "Asia/Shanghai" });

    expect(summary.priorities.rotating_raid).toMatchObject({
      status: "ready",
      title: "国王的陨落: 标准",
      detail: "非完整掉落地图；国王的陨落: 标准 · 国王万岁"
    });
    expect(summary.priorities.nightfall).toMatchObject({
      status: "pending",
      title: "日落任务待确认"
    });
    expect(summary.weekly_reset.time_remaining_label).toContain("距离每周重置还有");
  });
});
