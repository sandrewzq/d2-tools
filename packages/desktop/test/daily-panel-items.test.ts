import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("daily panel source item rendering", () => {
  it("renders real daily source items instead of only source status", () => {
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );

    expect(homePage).toContain("daily-source-items");
    expect(homePage).toContain("source.items");
    expect(homePage).toContain("item.subtitle");
    expect(homePage).toContain("item.description");
  });
});
