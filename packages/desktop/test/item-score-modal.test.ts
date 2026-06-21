import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

function readHomePageSource() {
  return readFileSync(
    join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
    "utf8"
  );
}

describe("item detail scoring modal", () => {
  it("carries account item grouping into the modal scoring flow", () => {
    const homePage = readHomePageSource();

    expect(homePage).toContain('from "@d2-tools/core/analysis/scoring"');
    expect(homePage).toContain('group_key: "group_key" in item ? item.group_key : undefined');
    expect(homePage).toContain('bucket_name: "bucket_name" in item ? item.bucket_name : undefined');
    expect(homePage).toContain("buildItemShareText");
    expect(homePage).toContain("copySelectedItemSummary");
    expect(homePage).toContain("copySelectedItemChatGuide");
    expect(homePage).toContain("generateItemAiAdvice");
  });

  it("lets the same-name comparison area apply duplicate-group quick actions", () => {
    const homePage = readHomePageSource();

    expect(homePage).toContain("buildDuplicateGroupBatchTagPlan");
    expect(homePage).toContain("saveVaultTagsBatch");
    expect(homePage).toContain("applySameNameBatchTags");
    expect(homePage).toContain("keep-best-review-rest");
    expect(homePage).toContain("keep-best-junk-rest");
    expect(homePage).toContain("clear-group-tags");
    expect(homePage).toContain("formatAccountItemMeta(item)");
  });

  it("supports keeping the current same-name item while batch-tagging the rest", () => {
    const homePage = readHomePageSource();

    expect(homePage).toContain("openBestSameNameItem");
    expect(homePage).toContain("applySameNameCurrentKeepTags");
    expect(homePage).toContain("keep-current-review-rest");
    expect(homePage).toContain("keep-current-junk-rest");
  });
});
