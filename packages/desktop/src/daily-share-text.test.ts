import { describe, expect, it } from "vitest";
import {
  buildDailyShareText,
  buildWeeklyDigestSections,
  buildWeeklyFocusText,
  formatDailySourceStatus
} from "./renderer/utils/dailyShare";
import type { DailySummary } from "./renderer/api/client";

describe("daily share text", () => {
  it("formats reset status and pending data sources for chat sharing", () => {
    const text = buildDailyShareText({
      date_label: "2026-06-19",
      daily_reset: {
        label: "每日重置：2026-06-19 17:00 UTC",
        next_reset_iso: "2026-06-19T17:00:00.000Z",
        time_remaining_label: "距离每日重置还有 6 小时 30 分钟"
      },
      weekly_reset: {
        label: "每周重置：2026-06-23 17:00 UTC",
        next_reset_iso: "2026-06-23T17:00:00.000Z",
        time_remaining_label: "距离每周重置还有 4 天 6 小时"
      },
      sources: {
        rotations: { status: "pending", label: "轮换数据", message: "待接入" },
        vendors: { status: "pending", label: "商人库存", message: "待接入" },
        lost_sector: { status: "pending", label: "遗失区域", message: "待接入" },
        weekly_report: {
          status: "ready",
          label: "周报/掉落地图",
          message: "已接入",
          items: [{ title: "本周突袭：救赎花园", subtitle: "里程碑 / 掉落轮换" }]
        }
      },
      checklist: ["检查仓库可清理装备和疑似好 roll。"],
      recommendations: ["先同步账号和仓库，再查看仓库整理建议。"]
    } satisfies DailySummary);

    expect(text).toContain("d2-tools 日报");
    expect(text).toContain("2026-06-19");
    expect(text).toContain("轮换数据：待接入");
    expect(text).toContain("周报/掉落地图");
    expect(text).toContain("本周突袭：救赎花园");
    expect(text).toContain("建议先做");
    expect(text).toContain("先同步账号和仓库");
    expect(text).not.toContain("数据状态：");
  });

  it("formats a shorter weekly focus summary for quick sharing", () => {
    const text = buildWeeklyFocusText({
      date_label: "2026-06-19",
      daily_reset: {
        label: "每日重置：2026-06-19 17:00 UTC",
        next_reset_iso: "2026-06-19T17:00:00.000Z",
        time_remaining_label: "距离每日重置还有 6 小时 30 分钟"
      },
      weekly_reset: {
        label: "每周重置：2026-06-23 17:00 UTC",
        next_reset_iso: "2026-06-23T17:00:00.000Z",
        time_remaining_label: "距离每周重置还有 4 天 6 小时"
      },
      sources: {
        rotations: { status: "ready", label: "轮换数据", message: "已接入" },
        vendors: { status: "ready", label: "商人库存", message: "已接入" },
        lost_sector: { status: "ready", label: "遗失区域", message: "已接入" },
        weekly_report: {
          status: "ready",
          label: "本周活动线索",
          message: "已接入",
          items: [
            { title: "本周突袭：救赎花园", subtitle: "可掉落轮换奖励" },
            { title: "地牢轮换：异端深坑", subtitle: "适合补收藏" }
          ]
        }
      },
      checklist: ["先同步账号和仓库"],
      recommendations: ["优先看本周轮换奖励", "补刷缺收藏的副本"]
    } satisfies DailySummary);

    expect(text).toContain("d2-tools 本周重点");
    expect(text).toContain("2026-06-19");
    expect(text).toContain("本周优先");
    expect(text).toContain("优先看本周轮换奖励");
    expect(text).toContain("本周突袭：救赎花园");
  });

  it("builds weekly sections for players without inventing missing items", () => {
    const sections = buildWeeklyDigestSections({
      date_label: "2026-06-19",
      daily_reset: {
        label: "每日重置：2026-06-19 17:00 UTC",
        next_reset_iso: "2026-06-19T17:00:00.000Z",
        time_remaining_label: "距离每日重置还有 6 小时 30 分钟"
      },
      weekly_reset: {
        label: "每周重置：2026-06-23 17:00 UTC",
        next_reset_iso: "2026-06-23T17:00:00.000Z",
        time_remaining_label: "距离每周重置还有 4 天 6 小时"
      },
      sources: {
        rotations: { status: "ready", label: "轮换数据", message: "已接入" },
        vendors: { status: "ready", label: "商人库存", message: "已接入" },
        lost_sector: { status: "pending", label: "遗失区域", message: "待接入" },
        weekly_report: {
          status: "ready",
          label: "本周活动线索",
          message: "已接入",
          items: [
            { title: "地牢轮换：异端深坑", subtitle: "适合补收藏" },
            { title: "本周突袭：救赎花园", subtitle: "可掉落轮换奖励" }
          ]
        }
      },
      checklist: ["先同步账号和仓库", "检查今日轮换活动"],
      recommendations: ["优先看本周轮换奖励", "补刷缺收藏的副本", "留意遗失区域是否已接入"]
    } satisfies DailySummary);

    expect(sections.map((section) => section.key)).toEqual(["priority", "optional", "watch"]);
    expect(sections[0]?.items[0]).toContain("先同步账号和仓库");
    expect(sections[2]?.items.join(" ")).toContain("地牢轮换");
  });

  it("formats source status labels for the panel badges", () => {
    expect(formatDailySourceStatus("ready")).toBe("已接入");
    expect(formatDailySourceStatus("pending")).toBe("待接入");
  });
});
