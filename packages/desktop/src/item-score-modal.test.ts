import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("item detail scoring modal", () => {
  it("carries vault item grouping into the modal and renders local scoring guidance", () => {
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );

    expect(homePage).toContain('from "@d2-service/core/analysis/scoring"');
    expect(homePage).toContain('group_key: "group_key" in item ? item.group_key : undefined');
    expect(homePage).toContain('bucket_name: "bucket_name" in item ? item.bucket_name : undefined');
    expect(homePage).toContain("本地评分");
    expect(homePage).toContain("评分原因");
    expect(homePage).toContain("风险提示");
    expect(homePage).toContain("buildItemShareText");
    expect(homePage).toContain("复制结论");
  });
});
