import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("armor stats UI wiring", () => {
  it("shows owned armor stats in item detail and same-name comparison", () => {
    const itemDetailModal = readFileSync("packages/desktop/src/renderer/shared/components/ItemDetailModal.tsx", "utf8");
    const itemDetailHook = readFileSync("packages/desktop/src/renderer/shared/hooks/useItemDetail.ts", "utf8");

    expect(itemDetailHook).toContain("armor_stats?: AccountItemSummary[\"armor_stats\"]");
    expect(itemDetailHook).toContain("armor_stats: item.armor_stats");
    expect(itemDetailModal).toContain("当前属性");
    expect(itemDetailModal).toContain("formatArmorStatsSummary(selectedItem)");
    expect(itemDetailModal).toContain("formatArmorStatsSummary(item)");
  });
});
