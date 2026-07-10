import { describe, expect, it } from "vitest";
import { buildWeeklyLiveDataFromBungie, fetchWeeklyLiveData } from "../src/weekly/liveData";
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
      title: "宗师先锋警戒待确认"
    });
    expect(summary.weekly_reset.time_remaining_label).toContain("距离每周重置还有");
  });

  it("extracts confirmed weekly portal activities from character activities", () => {
    const liveData = buildWeeklyLiveDataFromBungie({
      profile: {
        characterActivities: {
          data: {
            "character-1": {
              availableActivities: [
                {
                  activityHash: 461602663,
                  challenges: [{ objective: { objectiveHash: 3511848321 } }],
                  visibleRewards: [{ rewardItems: [{ itemQuantity: { itemHash: 891765152 } }] }]
                },
                {
                  activityHash: 1441982566,
                  challenges: [{ objective: { objectiveHash: 1863972407 } }]
                },
                {
                  activityHash: 3889634515,
                  challenges: [{ objective: { objectiveHash: 1863972407 } }]
                },
                {
                  activityHash: 1541433876,
                  challenges: [{ objective: { objectiveHash: 2243638599 } }]
                },
                {
                  activityHash: 300092127,
                  challenges: [{ objective: { objectiveHash: 2367956143 } }]
                },
                {
                  activityHash: 4293676253,
                  challenges: [{ objective: { objectiveHash: 2367956143 } }]
                },
                {
                  activityHash: 2823159265,
                  challenges: [{ objective: { objectiveHash: 3039545165 } }]
                },
                {
                  activityHash: 2727361621,
                  challenges: [{ objective: { objectiveHash: 897179824 } }],
                  visibleRewards: [{ rewardItems: [{ itemQuantity: { itemHash: 3649567221 } }] }]
                }
              ]
            }
          }
        }
      },
      definitions: {
        activities: {
          "461602663": { displayProperties: { name: "移民号的坠毁: 自定义" }, originalDisplayProperties: { name: "移民号的坠毁" } },
          "1441982566": { displayProperties: { name: "门徒誓约: 标准" }, originalDisplayProperties: { name: "门徒誓约" }, activityTypeHash: 2043403989, directActivityModeType: 4, activityModeTypes: [4, 7] },
          "3889634515": { displayProperties: { name: "门徒誓约: 大师" }, originalDisplayProperties: { name: "门徒誓约" }, activityTypeHash: 2043403989, directActivityModeType: 4, activityModeTypes: [4, 7] },
          "1541433876": { displayProperties: { name: "救赎的边缘: 标准" }, originalDisplayProperties: { name: "救赎的边缘" }, activityTypeHash: 2043403989, directActivityModeType: 4, activityModeTypes: [4, 7] },
          "300092127": { displayProperties: { name: "晚星之主: 普通" }, originalDisplayProperties: { name: "晚星之主" }, activityTypeHash: 608898761, activityModeTypes: [82, 7] },
          "4293676253": { displayProperties: { name: "晚星之主: 大师" }, originalDisplayProperties: { name: "晚星之主" }, activityTypeHash: 608898761, activityModeTypes: [82, 7] },
          "2823159265": { displayProperties: { name: "二象性: 标准" }, originalDisplayProperties: { name: "二象性" }, activityTypeHash: 608898761, activityModeTypes: [82, 7] },
          "2727361621": { displayProperties: { name: "平衡: 标准" }, originalDisplayProperties: { name: "平衡" }, activityTypeHash: 608898761, activityModeTypes: [82, 7] }
        },
        objectives: {
          "3511848321": { displayProperties: { description: "完成宗师先锋警戒并获得B级或以上。" } },
          "1863972407": { displayProperties: { name: "周常突袭挑战", description: "完成此次突袭。" } },
          "2243638599": { displayProperties: { name: "周常突袭挑战", description: "完成此次突袭。" } },
          "2367956143": { displayProperties: { name: "周常地牢挑战", description: "完成此次地牢。" } },
          "3039545165": { displayProperties: { name: "周常地牢挑战", description: "完成此次地牢。" } },
          "897179824": { displayProperties: { description: "完成“平衡”地牢。" } }
        },
        items: {
          "891765152": { displayProperties: { name: "崇拜" }, itemTypeDisplayName: "狙击步枪" },
          "3649567221": { displayProperties: { name: "周常奖励" } }
        }
      }
    });
    const summary = buildWeeklySummary(new Date("2026-07-09T09:00:00.000Z"), liveData, { timeZone: "Asia/Shanghai" });

    expect(summary.priorities.nightfall.title).toBe("移民号的坠毁");
    expect(summary.priorities.nightfall.detail).toContain("奖励：崇拜");
    expect(summary.priorities.rotating_raid.entries?.map((entry) => entry.title)).toEqual(["门徒誓约", "救赎的边缘"]);
    expect(summary.priorities.rotating_dungeon.entries?.map((entry) => entry.title)).toEqual(["晚星之主", "二象性"]);
    expect(summary.priorities.rotating_dungeon.entries?.map((entry) => entry.title)).not.toContain("平衡");
  });

  it("fetches logged-in character activities for confirmed weekly portal activities", async () => {
    const requested: Array<{ path: string; accessToken?: string }> = [];
    const liveData = await fetchWeeklyLiveData({
      config: {
        bungie: {
          api_key: "api-key",
          client_id: "",
          client_secret: "",
          redirect_uri: ""
        },
        data: {
          data_dir: ".local-data/test"
        },
        features: {}
      },
      token: {
        access_token: "access-token",
        token_type: "Bearer",
        expires_in: 3600,
        membership_id: "bungie-membership",
        created_at: "2026-07-09T00:00:00.000Z"
      },
      definitions: {
        activities: {
          "461602663": { displayProperties: { name: "移民号的坠毁: 自定义" }, originalDisplayProperties: { name: "移民号的坠毁" } }
        },
        objectives: {
          "3511848321": { displayProperties: { description: "Grandmaster Vanguard Alerts" } }
        }
      },
      fetchJson: async <T>(path: string, accessToken?: string): Promise<T> => {
        requested.push({ path, accessToken });
        if (path === "/Destiny2/Milestones/") {
          return {} as T;
        }
        if (path === "/User/GetMembershipsForCurrentUser/") {
          return {
            destinyMemberships: [{ membershipId: "destiny-membership", membershipType: 3 }],
            primaryMembershipId: "destiny-membership"
          } as T;
        }
        if (path === "/Destiny2/3/Profile/destiny-membership/?components=200,204") {
          return {
            characterActivities: {
              data: {
                "character-1": {
                  availableActivities: [
                    {
                      activityHash: 461602663,
                      challenges: [{ objective: { objectiveHash: 3511848321 } }]
                    }
                  ]
                }
              }
            }
          } as T;
        }
        throw new Error(`Unexpected request: ${path}`);
      }
    });

    expect(requested).toContainEqual({
      path: "/User/GetMembershipsForCurrentUser/",
      accessToken: "access-token"
    });
    expect(requested).toContainEqual({
      path: "/Destiny2/3/Profile/destiny-membership/?components=200,204",
      accessToken: "access-token"
    });
    expect(liveData.items?.map((item) => item.title)).toEqual(["移民号的坠毁"]);
  });
});
