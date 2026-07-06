import { describe, expect, it } from "vitest";
import { fetchCharacterActivityHistory, summarizeActivityHistory } from "../src/activities/history.js";
import type { DefinitionComponentData } from "../src/manifest/definitions.js";

const activityDefinitions: DefinitionComponentData = {
  "100": {
    hash: 100,
    displayProperties: { name: "救赎花园" }
  },
  "200": {
    hash: 200,
    displayProperties: { name: "控制" }
  }
};

describe("Bungie activity history", () => {
  it("fetches character activity history from the Bungie stats endpoint", async () => {
    const requested: string[] = [];
    const fetchImpl = async (url: URL | RequestInfo) => {
      requested.push(String(url));
      return new Response(JSON.stringify({
        ErrorCode: 1,
        Response: {
          activities: []
        }
      }), { status: 200 });
    };

    await fetchCharacterActivityHistory({
      config: {
        bungie: { api_key: "api", client_id: "", client_secret: "", redirect_uri: "" },
        data: { data_dir: "", manifest_language: "zh-chs" },
        ai: { provider: "", api_key: "", model: "", base_url: "" },
        features: { write_actions_enabled: false, color_mode: "light" }
      },
      membershipType: 3,
      membershipId: "membership-1",
      characterId: "character-1",
      count: 12,
      fetchImpl: fetchImpl as typeof fetch
    });

    expect(requested[0]).toContain("/Destiny2/3/Account/membership-1/Character/character-1/Stats/Activities/");
    expect(requested[0]).toContain("count=12");
  });

  it("passes an explicit activity mode filter when loading PVE or PVP history", async () => {
    const requested: string[] = [];
    const fetchImpl = async (url: URL | RequestInfo) => {
      requested.push(String(url));
      return new Response(JSON.stringify({
        ErrorCode: 1,
        Response: {
          activities: []
        }
      }), { status: 200 });
    };

    await fetchCharacterActivityHistory({
      config: {
        bungie: { api_key: "api", client_id: "", client_secret: "", redirect_uri: "" },
        data: { data_dir: "", manifest_language: "zh-chs" },
        ai: { provider: "", api_key: "", model: "", base_url: "" },
        features: { write_actions_enabled: false, color_mode: "light" }
      },
      membershipType: 3,
      membershipId: "membership-1",
      characterId: "character-1",
      count: 12,
      mode: 5,
      fetchImpl: fetchImpl as typeof fetch
    });

    expect(requested[0]).toContain("count=12");
    expect(requested[0]).toContain("mode=5");
  });

  it("summarizes recent activity and raid entries with manifest names", () => {
    const summary = summarizeActivityHistory([
      {
        period: "2026-06-19T00:00:00.000Z",
        activityDetails: { referenceId: 100, modes: [4] },
        values: { completed: { basic: { value: 1 } } }
      },
      {
        period: "2026-06-19T01:00:00.000Z",
        activityDetails: { referenceId: 100, modes: [4] },
        values: { completed: { basic: { value: 0 } } }
      },
      {
        period: "2026-06-19T02:00:00.000Z",
        activityDetails: { referenceId: 200, modes: [5] },
        values: { completed: { basic: { value: 1 } } }
      }
    ], activityDefinitions);

    expect(summary.recent.total).toBe(3);
    expect(summary.recent.pvp.completed).toBe(1);
    expect(summary.raids.entries).toEqual([
      {
        activity_name: "救赎花园",
        activity_type: "raid",
        completions: 1,
        attempts: 2,
        last_completed_at: "2026-06-19T00:00:00.000Z"
      }
    ]);
    expect(summary.review.total_activities).toBe(3);
    expect(summary.review.recent_10[0].activity_name).toBe("控制");
    expect(summary.review.recent_10[0].status_label).toBe("已完成");
  });

  it("classifies concrete Crucible modes as PVP and keeps the latest activities first", () => {
    const summary = summarizeActivityHistory([
      {
        period: "2026-06-19T00:00:00.000Z",
        activityDetails: { referenceId: 100, mode: 7, modes: [7] },
        values: { completed: { basic: { value: 1 } } }
      },
      {
        period: "2026-06-19T03:00:00.000Z",
        activityDetails: { referenceId: 200, mode: 73, modes: [73] },
        values: { completed: { basic: { value: 1 } } }
      }
    ], activityDefinitions);

    expect(summary.recent.pve.completed).toBe(1);
    expect(summary.recent.pvp.completed).toBe(1);
    expect(summary.recent.latest_period).toBe("2026-06-19T03:00:00.000Z");
    expect(summary.recent_items[0]).toMatchObject({
      activity_name: "控制",
      mode: "pvp",
      period: "2026-06-19T03:00:00.000Z"
    });
    expect(summary.review.recent_10[0]).toMatchObject({
      activity_name: "控制",
      type: "crucible"
    });
  });
});
