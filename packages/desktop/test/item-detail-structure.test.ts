import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const itemDetailRoot = fileURLToPath(new URL("../src/renderer/shared/components/item-detail/", import.meta.url));
const modalPath = fileURLToPath(new URL("../src/renderer/shared/components/ItemDetailModal.tsx", import.meta.url));

const expectedParts = [
  "ItemDetailHeader.tsx",
  "ItemDetailStats.tsx",
  "ItemDetailPerks.tsx",
  "ItemDetailCommunity.tsx",
  "ItemDetailSameName.tsx",
  "ItemDetailActions.tsx",
  "ItemDetailAi.tsx"
];

describe("item detail component structure", () => {
  it("keeps the shared detail modal as an orchestrator with focused child components", () => {
    const modalSource = readFileSync(modalPath, "utf8");

    for (const file of expectedParts) {
      expect(existsSync(`${itemDetailRoot}${file}`), file).toBe(true);
      expect(modalSource).toContain(`./item-detail/${file.replace(/\.tsx$/, "")}`);
    }

    expect(modalSource.split(/\r?\n/).length).toBeLessThanOrEqual(260);
    expect(modalSource).not.toContain("社区推荐 Perk 组合");
    expect(modalSource).not.toContain("同名对比");
  });
});
