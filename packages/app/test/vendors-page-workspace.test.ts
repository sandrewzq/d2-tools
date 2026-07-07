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
              title: "资料库周末商人",
              subtitle: "周末商人库存",
              description: "守誓者（臂铠，异域；23 奇异硬币） / 精准手炮（手炮，传说；微光）",
              source: "Bungie 公共商人",
              vendorHash: 2190858386,
              iconUrl: "/common/destiny2_content/icons/xur.jpg",
              items: [
                {
                  title: "守誓者",
                  subtitle: "臂铠，异域",
                  description: "23 奇异硬币",
                  source: "Bungie 公共商人",
                  iconUrl: "/common/destiny2_content/icons/oathkeeper.jpg",
                  costIconUrl: "/common/destiny2_content/icons/strange-coin.jpg"
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
              title: "资料库武器商人",
              subtitle: "登录角色或公共商人库存",
              description: "高射速自动步枪（自动步枪，传说；微光）",
              source: "Bungie 公共商人",
              vendorHash: 672118013
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
    expect(workspace.defaultVendorId).toBe("xur");
    expect(workspace.railSections.map((section) => section.title)).toEqual([
      "重点库存",
      "仪式声望",
      "周末活动",
      "外观 / 服务",
      "其他商人"
    ]);
    expect(workspace.railSections.map((section) => section.vendors.map((vendor) => vendor.id))).toEqual([
      ["xur", "banshee", "rahool"],
      ["zavala", "shaxx", "drifter"],
      ["saint"],
      ["ada", "tess"],
      []
    ]);
    expect(workspace.verifiedItemCount).toBe(3);
    expect(workspace.vendors.map((vendor) => vendor.name)).toEqual([
      "资料库周末商人",
      "资料库武器商人",
      "护甲合成商人",
      "试炼商人",
      "先锋商人",
      "熔炉商人",
      "智谋商人",
      "记忆水晶商人",
      "外观商人"
    ]);
    expect(workspace.vendors[0]).toMatchObject({
      name: "资料库周末商人",
      description: "周末商人库存",
      badge: "已确认",
      source: "Bungie 公共商人",
      iconUrl: "https://www.bungie.net/common/destiny2_content/icons/xur.jpg",
      taskCategory: "重点库存",
      displayStatusLabel: "已确认",
      inventoryState: "loaded",
      inventoryStateLabel: "库存已读取",
      railStatusLabel: "已确认 · 2 件物品",
      detailToolbar: {
        taskCategory: "重点库存",
        inventoryStateLabel: "库存已读取",
        statusLabel: "已确认",
        itemCountLabel: "2 件物品"
      }
    });
    expect(workspace.vendors[0]?.items).toMatchObject([
      {
        name: "守誓者",
        itemType: "臂铠，异域",
        cost: "23 奇异硬币",
        iconUrl: "https://www.bungie.net/common/destiny2_content/icons/oathkeeper.jpg",
        costIconUrl: "https://www.bungie.net/common/destiny2_content/icons/strange-coin.jpg",
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
      name: "资料库武器商人",
      source: "Bungie 公共商人",
      statusLabel: "已确认"
    });
    expect(workspace.vendors[2]).toMatchObject({
      name: "护甲合成商人",
      source: "本地商人目录",
      statusLabel: "等待库存读取",
      displayStatusLabel: "未读取",
      inventoryState: "not_read",
      inventoryStateLabel: "未读取库存",
      railStatusLabel: "未读取 · 0 件物品",
      detailToolbar: {
        taskCategory: "外观 / 服务",
        inventoryStateLabel: "未读取库存",
        statusLabel: "未读取",
        itemCountLabel: "0 件物品"
      }
    });
    expect(workspace.recommendationCount).toBe(1);
  });

  it("shows a local vendor directory when daily vendor data is pending", () => {
    const workspace = createVendorsPageWorkspace(null);

    expect(workspace.vendors.map((vendor) => vendor.name)).toEqual([
      "周末异域商人",
      "每日武器商人",
      "护甲合成商人",
      "试炼商人",
      "先锋商人",
      "熔炉商人",
      "智谋商人",
      "记忆水晶商人",
      "外观商人"
    ]);
    expect(workspace.defaultVendorId).toBe("xur");
    expect(workspace.railSections.map((section) => section.title)).toEqual([
      "重点库存",
      "仪式声望",
      "周末活动",
      "外观 / 服务",
      "其他商人"
    ]);
    expect(workspace.railSections.flatMap((section) => section.vendors).map((vendor) => vendor.id)).toEqual([
      "xur",
      "banshee",
      "rahool",
      "zavala",
      "shaxx",
      "drifter",
      "saint",
      "ada",
      "tess"
    ]);
    expect(workspace.sourceLabel).toBe("等待 Bungie 公共商人");
    expect(workspace.verifiedItemCount).toBe(0);
    expect(workspace.vendors[0]).toMatchObject({
      category: "重点",
      source: "本地商人目录",
      statusLabel: "等待库存读取",
      displayStatusLabel: "未读取",
      inventoryState: "not_read",
      inventoryStateLabel: "未读取库存",
      items: [],
      featured: true
    });
    expect(workspace.vendors.at(-1)).toMatchObject({
      name: "外观商人",
      category: "特殊 / 活动"
    });
    expect(JSON.stringify(workspace.vendors)).not.toContain("待确认");
    expect(JSON.stringify(workspace.vendors)).not.toContain("费用待确认");
    expect(JSON.stringify(workspace.vendors)).not.toContain("等待实时库存");
    expect(JSON.stringify(workspace.vendors)).not.toContain("实时库存");
    expect(JSON.stringify(workspace.vendors)).not.toContain("Banshee");
    expect(JSON.stringify(workspace.vendors)).not.toContain("Ada-1");
    expect(JSON.stringify(workspace.vendors)).not.toContain("Saint-14");
    expect(JSON.stringify(workspace.vendors)).not.toContain("塔楼");
    expect(workspace.recommendationCount).toBe(0);
  });

  it("keeps live vendors even when Bungie returns no readable sale items yet", () => {
    const workspace = createVendorsPageWorkspace({
      date_label: "2026-07-06",
      daily_reset: {
        label: "每日重置：2026-07-07 01:00 Asia/Shanghai",
        next_reset_iso: "2026-07-06T17:00:00.000Z",
        time_remaining_label: "距离每日重置还有 5 小时 00 分钟"
      },
      weekly_reset: {
        label: "每周重置：2026-07-08 01:00 Asia/Shanghai",
        next_reset_iso: "2026-07-07T17:00:00.000Z",
        time_remaining_label: "距离每周重置还有 29 小时 00 分钟"
      },
      sources: {
        vendors: {
          status: "ready",
          label: "商人库存",
          message: "已找到 1 条可读信息。",
          items: [
            {
              title: "资料库护甲合成商人",
              subtitle: "登录角色或公共商人库存",
              description: "库存名称暂不可读",
              source: "Bungie 登录角色商人",
              vendorHash: 3500617033,
              iconUrl: "/common/destiny2_content/icons/ada.jpg",
              items: []
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

    expect(workspace.vendors[2]).toMatchObject({
      id: "ada",
      vendorHash: 3500617033,
      name: "资料库护甲合成商人",
      source: "Bungie 登录角色商人",
      statusLabel: "已确认",
      displayStatusLabel: "暂无可读库存",
      inventoryState: "empty",
      inventoryStateLabel: "暂无可读库存",
      railStatusLabel: "暂无可读库存 · 0 件物品",
      iconUrl: "https://www.bungie.net/common/destiny2_content/icons/ada.jpg",
      items: []
    });
    expect(workspace.sourceLabel).toBe("Bungie 登录角色商人");
    expect(workspace.verifiedItemCount).toBe(0);
  });
});
