import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("item detail interaction performance", () => {
  it("opens a loading shell before awaiting full detail and recent-history persistence", () => {
    const hook = readFileSync(
      join(desktopRoot, "src", "renderer", "shared", "hooks", "useItemDetail.ts"),
      "utf8"
    );
    const itemDetailModal = readFileSync(
      join(desktopRoot, "src", "renderer", "shared", "components", "ItemDetailModal.tsx"),
      "utf8"
    );

    const previewIndex = hook.indexOf("setSelectedItem(createSelectedItemPreview(item, source));");
    const detailIndex = hook.indexOf("await api.getItemDetail(item.hash);");

    expect(hook).toContain("itemDetailLoadingKey");
    expect(hook).toContain("createSelectedItemPreview(item, source)");
    expect(previewIndex).toBeGreaterThan(-1);
    expect(detailIndex).toBeGreaterThan(-1);
    expect(previewIndex).toBeLessThan(detailIndex);
    expect(hook).toContain("itemDetailCacheRef.current.get(item.hash)");
    expect(hook).toContain("void api.addRecentItem({ hash: item.hash, name: item.name, icon: item.icon })");
    expect(itemDetailModal).toContain("selectedItem.is_detail_loading");
    expect(itemDetailModal).toContain("item-detail-loading");
  });
});
