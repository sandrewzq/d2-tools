import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readItemDetailSources } from "./source-readers";

describe("armor stats UI wiring", () => {
  it("shows owned armor stats in item detail and same-name comparison", () => {
    const itemDetailModal = readItemDetailSources("packages/desktop");
    const itemDetailHook = readFileSync("packages/desktop/src/renderer/shared/hooks/useItemDetail.ts", "utf8");

    expect(itemDetailHook).toContain("armor_stats?: AccountItemSummary[\"armor_stats\"]");
    expect(itemDetailHook).toContain("armor_stats: item.armor_stats");
    expect(itemDetailModal).toContain("当前属性");
    expect(itemDetailModal).toContain("formatArmorStatsSummary(selectedItem)");
    expect(itemDetailModal).toContain("formatArmorStatsSummary(item)");
  });

  it("shows owned weapon stats in item detail", () => {
    const itemDetailModal = readItemDetailSources("packages/desktop");
    const itemDetailHook = readFileSync("packages/desktop/src/renderer/shared/hooks/useItemDetail.ts", "utf8");
    const sharedTypes = readFileSync("packages/desktop/src/renderer/api/sharedTypes.ts", "utf8");

    expect(sharedTypes).toContain("export type WeaponStatSummary");
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
