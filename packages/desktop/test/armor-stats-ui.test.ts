import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readItemDetailSources } from "./source-readers";

function readCssRule(styles: string, selector: string): string {
  const start = styles.indexOf(`${selector} {`);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = styles.indexOf("}", start);
  expect(end).toBeGreaterThan(start);
  return styles.slice(start, end + 1);
}

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

  it("uses a wide two-column detail workbench instead of a narrow vertical modal", () => {
    const styles = readFileSync("packages/desktop/src/renderer/styles.css", "utf8");
    const itemModal = readCssRule(styles, ".item-modal");
    const gameCard = readCssRule(styles, ".item-detail-game-card");
    const toolGrid = readCssRule(styles, ".item-detail-tool-grid");
    const narrowMediaStart = styles.indexOf("@media (max-width: 760px)");
    const narrowMedia = styles.slice(narrowMediaStart);

    expect(itemModal).toContain("width: min(1180px, calc(100vw - 96px))");
    expect(itemModal).toContain("max-height: min(88vh, 980px)");
    expect(gameCard).toContain("grid-template-columns: minmax(320px, 0.85fr) minmax(420px, 1.15fr)");
    expect(gameCard).toContain("align-items: start");
    expect(toolGrid).toContain("grid-template-columns: minmax(360px, 0.95fr) minmax(420px, 1.05fr)");
    expect(narrowMedia).toContain(".item-detail-game-card");
    expect(narrowMedia).toContain(".item-detail-tool-grid");
    expect(narrowMedia).toContain("grid-template-columns: 1fr");
  });

  it("keeps weapon detail focused on the actual roll and folds long socket option lists", () => {
    const itemDetailModal = readItemDetailSources("packages/desktop");
    const styles = readFileSync("packages/desktop/src/renderer/styles.css", "utf8");
    const rollGrid = readCssRule(styles, ".item-detail-roll-grid");
    const socketSummary = readCssRule(styles, ".item-detail-socket-summary");

    expect(itemDetailModal).toContain("item-detail-roll-grid");
    expect(itemDetailModal).toContain("<details className=\"item-detail-socket-group\"");
    expect(itemDetailModal).toContain("插槽 {group.socket_index + 1}");
    expect(itemDetailModal).toContain("候选");
    expect(rollGrid).toContain("grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))");
    expect(socketSummary).toContain("cursor: pointer");
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
