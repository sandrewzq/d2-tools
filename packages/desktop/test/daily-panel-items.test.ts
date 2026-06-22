import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("daily panel source item rendering", () => {
  it("renders real daily source items instead of only source status", () => {
    const dailyPage = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "daily", "DailyPage.tsx"),
      "utf8"
    );

    expect(dailyPage).toContain("daily-source-items");
    expect(dailyPage).toContain("source.items");
    expect(dailyPage).toContain("item.subtitle");
    expect(dailyPage).toContain("item.description");
  });
});
