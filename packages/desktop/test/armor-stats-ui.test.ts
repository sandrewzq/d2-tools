import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readItemDetailSources } from "./source-readers";

describe("armor stats UI wiring", () => {
  it("shows owned armor stats in item detail and same-name comparison", () => {
    const itemDetailModal = readItemDetailSources("packages/desktop");
    const itemDetailHook = readFileSync("packages/desktop/src/renderer/shared/hooks/useItemDetail.ts", "utf8");
    const sharedTypes = readFileSync("packages/desktop/src/renderer/api/sharedTypes.ts", "utf8");

    expect(sharedTypes).toContain("ArmorEnergySummary");
    expect(sharedTypes).toContain("ArmorStatBreakdownSummary");
    expect(sharedTypes).toContain("@d2-tools/core/account/summary");
    expect(itemDetailHook).toContain("armor_stats?: AccountItemSummary[\"armor_stats\"]");
    expect(itemDetailHook).toContain("armor_stat_breakdown?: AccountItemSummary[\"armor_stat_breakdown\"]");
    expect(itemDetailHook).toContain("armor_energy?: AccountItemSummary[\"armor_energy\"]");
    expect(itemDetailHook).toContain("armor_stats: item.armor_stats");
    expect(itemDetailHook).toContain("armor_stat_breakdown: item.armor_stat_breakdown");
    expect(itemDetailHook).toContain("armor_energy: item.armor_energy");
    expect(itemDetailModal).toContain("当前属性");
    expect(itemDetailModal).toContain("formatArmorStatsSummary(selectedItem)");
    expect(itemDetailModal).toContain("基础");
    expect(itemDetailModal).toContain("模组");
    expect(itemDetailModal).toContain("最终");
    expect(itemDetailModal).toContain("item-detail-stat-breakdown");
    expect(itemDetailModal).toContain("selectedItem.armor_stat_breakdown");
    expect(itemDetailModal).toContain("formatArmorStatsSummary(item)");
    expect(itemDetailModal).toContain("formatArmorEnergySummary(selectedItem.armor_energy)");
    expect(itemDetailModal).toContain("生命值");
    expect(itemDetailModal).toContain("近战");
    expect(itemDetailModal).toContain("手雷");
    expect(itemDetailModal).toContain("超能");
    expect(itemDetailModal).toContain("职业");
    expect(itemDetailModal).toContain("武器");
    expect(itemDetailModal).not.toContain("敏捷");
    expect(itemDetailModal).not.toContain("韧性");
    expect(itemDetailModal).not.toContain("恢复");
    expect(itemDetailModal).not.toContain("纪律");
    expect(itemDetailModal).not.toContain("智慧");
    expect(itemDetailModal).not.toContain("力量");
  });

  it("uses a game-style detail header and keeps DIM-style tool sections below it", () => {
    const itemDetailModal = readItemDetailSources("packages/desktop");

    expect(itemDetailModal).toContain("item-detail-game-card");
    expect(itemDetailModal).toContain("item-detail-game-header");
    expect(itemDetailModal).toContain("item-detail-stat-row");
    expect(itemDetailModal).toContain("item-detail-stat-bar");
    expect(itemDetailModal).toContain("item-detail-tool-tabs");
    expect(itemDetailModal).toContain("概览");
    expect(itemDetailModal).toContain("同名对比");
    expect(itemDetailModal).toContain("社区推荐");
    expect(itemDetailModal).toContain("操作");
  });

  it("shows owned weapon stats in item detail", () => {
    const itemDetailModal = readItemDetailSources("packages/desktop");
    const itemDetailHook = readFileSync("packages/desktop/src/renderer/shared/hooks/useItemDetail.ts", "utf8");
    const sharedTypes = readFileSync("packages/desktop/src/renderer/api/sharedTypes.ts", "utf8");

    expect(sharedTypes).toContain("WeaponStatSummary");
    expect(sharedTypes).toContain("@d2-tools/core/account/summary");
    expect(itemDetailHook).toContain("weapon_stats?: AccountItemSummary[\"weapon_stats\"]");
    expect(itemDetailHook).toContain("weapon_stats: item.weapon_stats");
    expect(itemDetailModal).toContain("武器属性");
    expect(itemDetailModal).toContain("射程");
    expect(itemDetailModal).toContain("稳定性");
    expect(itemDetailModal).toContain("操控性");
    expect(itemDetailModal).toContain("装填速度");
    expect(itemDetailModal).toContain("弹匣");
    expect(itemDetailModal).toContain("RPM");
    expect(itemDetailModal).toContain("蓄力时间");
  });
});
