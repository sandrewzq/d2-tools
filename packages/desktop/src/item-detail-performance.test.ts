import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("item detail interaction performance", () => {
  it("opens a loading shell before awaiting full detail and recent-history persistence", () => {
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );

    const previewIndex = homePage.indexOf("setSelectedItem(createSelectedItemPreview(item, source));");
    const detailIndex = homePage.indexOf("await api.getItemDetail(item.hash);");

    expect(homePage).toContain("itemDetailLoadingKey");
    expect(homePage).toContain("createSelectedItemPreview(item, source)");
    expect(previewIndex).toBeGreaterThan(-1);
    expect(detailIndex).toBeGreaterThan(-1);
    expect(previewIndex).toBeLessThan(detailIndex);
    expect(homePage).toContain("itemDetailCacheRef.current.get(item.hash)");
    expect(homePage).toContain("void api.addRecentItem({ hash: item.hash, name: item.name, icon: item.icon })");
    expect(homePage).toContain("selectedItem.is_detail_loading");
    expect(homePage).toContain("item-detail-loading");
  });
});
