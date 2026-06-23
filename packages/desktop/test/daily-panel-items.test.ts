import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("daily panel source item rendering", () => {
  it("renders real daily source items instead of only source status", () => {
    const dailyPanel = readFileSync(
      join(desktopRoot, "src", "renderer", "shared", "components", "DailySummaryPanel.tsx"),
      "utf8"
    );

    expect(dailyPanel).toContain("daily-source-items");
    expect(dailyPanel).toContain("source.items");
    expect(dailyPanel).toContain("item.subtitle");
    expect(dailyPanel).toContain("item.description");
  });
});
