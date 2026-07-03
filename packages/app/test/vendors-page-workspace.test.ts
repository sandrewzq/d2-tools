import { describe, expect, it } from "vitest";
import { createVendorsPageWorkspace } from "../src/workspaces/vendorsPage";

describe("vendors page workspace", () => {
  it("maps verified daily vendor summaries into vendor inventory groups", () => {
    const workspace = createVendorsPageWorkspace({
      date_label: "2026-07-03",
      daily_reset: {
        label: "每日重置：2026-07-04 01:00 Asia/Shanghai",
        next_reset_iso: "2026-07-03T17:00:00.000Z",
        time_remaining_label: "距离每日重置还有 7 小时 30 分钟"
      },
      weekly_reset: {
        label: "每周重置：2026-07-08 01:00 Asia/Shanghai",
        next_reset_iso: "2026-07-07T17:00:00.000Z",
        time_remaining_label: "距离每周重置还有 103 小时 30 分钟"
      },
      sources: {
        vendors: {
          status: "ready",
          label: "商人库存",
          message: "已找到 2 条可读信息。",
          items: [
            {
              title: "老九",
              subtitle: "异域商人 · 周五至周二出现",
              description: "守誓者（臂铠，异域；23 奇异硬币） / 精准手炮（手炮，传说；微光）",
              source: "Bungie 公共商人",
              items: [
                {
                  title: "守誓者",
                  subtitle: "臂铠，异域",
                  description: "23 奇异硬币",
                  source: "Bungie 公共商人",
                  iconUrl: "/common/destiny2_content/icons/oathkeeper.jpg"
                },
                {
                  title: "精准手炮",
                  subtitle: "手炮，传说",
                  description: "微光",
                  source: "Bungie 公共商人",
                  iconUrl: "/common/destiny2_content/icons/hand-cannon.jpg"
                }
              ]
            },
            {
              title: "枪匠",
              subtitle: "枪匠 · 每日模组刷新",
              description: "高射速自动步枪（自动步枪，传说；微光）",
              source: "Bungie 公共商人"
            }
          ]
        },
        rotations: { status: "pending", label: "今日轮换", message: "" },
        lost_sector: { status: "pending", label: "遗失区域", message: "" },
        weekly_report: { status: "pending", label: "本周活动线索", message: "" }
      },
      checklist: [],
      recommendations: []
    });

    expect(workspace.sourceLabel).toBe("Bungie 公共商人");
    expect(workspace.nextResetLabel).toBe("距离每日重置还有 7 小时 30 分钟");
    expect(workspace.vendors).toHaveLength(9);
    expect(workspace.verifiedItemCount).toBe(3);
    expect(workspace.vendors.map((vendor) => vendor.name)).toEqual([
      "仄（Xur）",
      "Banshee-44",
      "Ada-1",
      "Saint-14",
      "萨瓦拉",
      "沙克斯领主",
      "浪客",
      "拉乎尔",
      "苔丝"
    ]);
    expect(workspace.vendors[0]).toMatchObject({
      name: "仄（Xur）",
      description: "异域商人 · 周五至周二出现",
      badge: "已确认",
      source: "Bungie 公共商人"
    });
    expect(workspace.vendors[0]?.items).toMatchObject([
      {
        name: "守誓者",
        itemType: "臂铠，异域",
        cost: "23 奇异硬币",
        iconUrl: "https://www.bungie.net/common/destiny2_content/icons/oathkeeper.jpg",
        tone: "exotic",
        status: "recommended"
      },
      {
        name: "精准手炮",
        itemType: "手炮，传说",
        cost: "微光",
        iconUrl: "https://www.bungie.net/common/destiny2_content/icons/hand-cannon.jpg",
        tone: "weapon",
        status: "unknown"
      }
    ]);
    expect(workspace.vendors[1]).toMatchObject({
      name: "Banshee-44",
      source: "Bungie 公共商人",
      statusLabel: "已确认"
    });
    expect(workspace.vendors[2]).toMatchObject({
      name: "Ada-1",
      source: "本地商人目录",
      statusLabel: "等待实时库存"
    });
    expect(workspace.recommendationCount).toBe(1);
  });

  it("shows a local vendor directory when daily vendor data is pending", () => {
    const workspace = createVendorsPageWorkspace(null);

    expect(workspace.vendors.map((vendor) => vendor.name)).toEqual([
      "仄（Xur）",
      "Banshee-44",
      "Ada-1",
      "Saint-14",
      "萨瓦拉",
      "沙克斯领主",
      "浪客",
      "拉乎尔",
      "苔丝"
    ]);
    expect(workspace.sourceLabel).toBe("等待 Bungie 公共商人");
    expect(workspace.verifiedItemCount).toBe(0);
    expect(workspace.vendors[0]).toMatchObject({
      category: "重点",
      source: "本地商人目录",
      statusLabel: "等待实时库存",
      featured: true
    });
    expect(workspace.vendors[0]?.items[0]).toMatchObject({
      name: "周末异域库存",
      status: "unknown",
      cost: "待确认"
    });
    expect(workspace.vendors.at(-1)).toMatchObject({
      name: "苔丝",
      category: "特殊 / 活动"
    });
    expect(workspace.recommendationCount).toBe(0);
  });
});
