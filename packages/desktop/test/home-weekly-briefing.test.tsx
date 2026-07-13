import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomePageContentView, type HomeDailySummary, type HomeWeeklySummary } from "../../ui/src/index";

function createDailySummary(overrides: Partial<HomeDailySummary["sources"]> = {}): HomeDailySummary {
  return {
    daily_reset: {
      label: "每日 01:00 重置",
      time_remaining_label: "距离每日重置还有 5 小时"
    },
    weekly_reset: {
      label: "每周三 01:00 重置",
      time_remaining_label: "距离每周重置还有 3 天 2 小时"
    },
    sources: {
      weekly_report: { status: "pending", message: "等待本周数据。" },
      rotations: { status: "pending", message: "等待公共里程碑。" },
      vendors: { status: "pending", message: "等待商人。" },
      lost_sector: { status: "pending", message: "无法确认当天遗失区域。" },
      ...overrides
    },
    checklist: []
  };
}

function createWeeklySummary(status: "ready" | "pending" = "ready"): HomeWeeklySummary {
  return {
    weekly_reset: {
      label: "每周三 01:00 重置",
      time_remaining_label: "距离每周重置还有 3 天 2 小时"
    },
    priorities: {
      nightfall: {
        status,
        title: status === "ready" ? "光之利刃" : "宗师先锋警戒待确认",
        detail: "屏障 · 势不可挡 · 电弧威胁",
        entries: status === "ready" ? [{
          title: "光之利刃",
          detail: "屏障 · 势不可挡 · 电弧威胁",
          rewards: [{ hash: 1, name: "本周奖励", item_type: "武器" }]
        }] : undefined
      },
      rotating_raid: {
        status,
        title: status === "ready" ? "最后一愿" : "轮换突袭待确认",
        detail: "奖励可重复获取",
        entries: status === "ready" ? [
          { title: "救赎的边缘", detail: "奖励可重复获取" },
          { title: "门徒誓约", detail: "奖励可重复获取" }
        ] : undefined
      },
      rotating_dungeon: {
        status,
        title: status === "ready" ? "预言" : "轮换地牢待确认",
        detail: "奖励可重复获取",
        entries: status === "ready" ? [
          { title: "晚星之主", detail: "奖励可重复获取" },
          { title: "二象性", detail: "奖励可重复获取" }
        ] : undefined
      },
      weekly_bonus: {
        status,
        title: status === "ready" ? "先锋声望加成" : "奖励加成待确认",
        detail: "本周声望额外奖励"
      },
      special_event: {
        status,
        title: status === "ready" ? "铁旗已开放" : "暂无可确认特殊活动",
        detail: "限时活动"
      }
    },
    public_clues: []
  };
}

describe("home weekly world briefing", () => {
  it("removes the daily and lost-sector sections even when legacy data is present", () => {
    const html = renderToStaticMarkup(
      <HomePageContentView
        dailySummary={createDailySummary({
          lost_sector: {
            status: "ready",
            message: "已读取九个区域。",
            items: [{ title: "溪谷迷宫", destinationName: "发射基地" }]
          }
        })}
        weeklySummary={createWeeklySummary()}
      />
    );

    expect(html).not.toContain("home-daily-panel");
    expect(html).not.toContain("每日重置");
    expect(html).not.toContain("遗失区域");
    expect(html).not.toContain("溪谷迷宫");
    expect(html).toContain("home-operations-week");
    expect(html).toContain("每周重置 · 3 天 2 小时");
  });

  it("renders only confirmed weekly priorities", () => {
    const confirmed = renderToStaticMarkup(
      <HomePageContentView dailySummary={createDailySummary()} weeklySummary={createWeeklySummary()} />
    );
    const pending = renderToStaticMarkup(
      <HomePageContentView dailySummary={createDailySummary()} weeklySummary={createWeeklySummary("pending")} />
    );

    expect(confirmed).toContain("光之利刃");
    expect(confirmed).toContain("救赎的边缘");
    expect(confirmed).toContain("门徒誓约");
    expect(confirmed).toContain("晚星之主");
    expect(confirmed).toContain("二象性");
    expect(confirmed).toContain("先锋声望加成");
    expect(confirmed).toContain("铁旗已开放");
    expect(confirmed).toContain("本周奖励");
    expect(pending).not.toContain("待确认");
    expect(pending).not.toContain("暂无可确认特殊活动");
  });

  it("renders every readable Xur inventory item without truncating the public vendor response", () => {
    const inventory = Array.from({ length: 12 }, (_, index) => ({
      title: index === 11 ? "第十二件库存" : `库存 ${index + 1}`,
      subtitle: index % 3 === 0 ? "异域武器" : "异域护甲",
      description: `${23 + index} 奇异硬币`
    }));
    const html = renderToStaticMarkup(
      <HomePageContentView
        dailySummary={createDailySummary({
          vendors: {
            status: "ready",
            message: "仄库存已读取。",
            items: [{
              title: "仄",
              subtitle: "周末商人库存",
              vendorHash: 2190858386,
              vendorEnabled: true,
              vendorLocation: "高塔",
              vendorRefreshDate: "2099-07-14T17:00:00Z",
              items: [
                ...inventory,
                { title: "   ", subtitle: "材料", description: "第十三件空库存" }
              ]
            }]
          }
        })}
        weeklySummary={createWeeklySummary()}
      />
    );

    expect(html).toContain("home-operations-stock");
    expect(html).toContain("高塔");
    expect(html.match(/home-operations-stock-item/g)).toHaveLength(12);
    expect(html).toContain("第十二件库存");
    expect(html).not.toContain("第十三件空库存");
    expect(html).toContain("23 奇异硬币");
  });

  it("uses the selected character Xur inventory instead of the public class item", () => {
    const html = renderToStaticMarkup(
      <HomePageContentView
        selectedCharacterId="warlock"
        dailySummary={createDailySummary({
          vendors: {
            status: "ready",
            message: "仄库存已读取。",
            items: [
              {
                title: "仄",
                vendorHash: 2190858386,
                vendorEnabled: true,
                items: [{ title: "坚忍克己" }]
              },
              {
                title: "仄",
                vendorHash: 2190858386,
                vendorEnabled: true,
                characterId: "warlock",
                items: [{ title: "唯我主义" }]
              }
            ]
          }
        })}
        weeklySummary={createWeeklySummary()}
      />
    );

    expect(html).toContain("唯我主义");
    expect(html).not.toContain("坚忍克己");
  });

  it("renders confirmed world data as one continuous operations desk", () => {
    const html = renderToStaticMarkup(
      <HomePageContentView
        dailySummary={createDailySummary({
          vendors: {
            status: "ready",
            message: "仄库存已读取。",
            items: [{
              title: "仄",
              vendorHash: 2190858386,
              vendorEnabled: true,
              items: [{ title: "异域武器", subtitle: "异域武器", description: "23 奇异硬币" }]
            }]
          }
        })}
        weeklySummary={createWeeklySummary()}
      />
    );

    expect(html).toContain("home-operations-desk");
    expect(html).toContain("home-operations-week");
    expect(html).toContain("home-operations-body");
    expect(html).toContain("home-operations-live");
    expect(html.match(/class="home-operations-entry"/g)).toHaveLength(4);
    expect(html).not.toContain("home-weekly-command-grid");
    expect(html).not.toContain("等待同步");
    expect(html).not.toContain("待确认");
  });

  it("uses the shared product language instead of a separate HUD vocabulary", () => {
    const html = renderToStaticMarkup(
      <HomePageContentView
        dailySummary={createDailySummary({
          vendors: {
            status: "ready",
            message: "仄库存已读取。",
            items: [{
              title: "仄",
              vendorHash: 2190858386,
              vendorEnabled: true,
              items: [{ title: "异域武器", subtitle: "异域武器", description: "23 奇异硬币" }]
            }]
          }
        })}
        weeklySummary={createWeeklySummary()}
      />
    );

    expect(html).toContain("本周情报");
    expect(html).toContain("实时情报");
    expect(html).toContain("仄");
    expect(html).not.toContain("本周游戏世界简报");
    expect(html).not.toContain("WEEKLY OPERATIONS");
    expect(html).not.toContain("PUBLIC SOURCES");
    expect(html).not.toContain("XÛR INVENTORY");
  });

  it("hides the entire Xur panel when the vendor is disabled or has no readable inventory", () => {
    const disabled = renderToStaticMarkup(
      <HomePageContentView
        dailySummary={createDailySummary({
          vendors: {
            status: "ready",
            message: "旧库存。",
            items: [{
              title: "仄",
              vendorHash: 2190858386,
              vendorEnabled: false,
              items: [{ title: "陈旧物品" }]
            }]
          }
        })}
        weeklySummary={createWeeklySummary()}
      />
    );
    const empty = renderToStaticMarkup(
      <HomePageContentView
        dailySummary={createDailySummary({
          vendors: {
            status: "ready",
            message: "没有可读库存。",
            items: [{ title: "仄", vendorHash: 2190858386, vendorEnabled: true, items: [] }]
          }
        })}
        weeklySummary={createWeeklySummary()}
      />
    );

    expect(disabled).not.toContain("home-weekly-xur");
    expect(disabled).not.toContain("陈旧物品");
    expect(empty).not.toContain("home-weekly-xur");
  });
});
