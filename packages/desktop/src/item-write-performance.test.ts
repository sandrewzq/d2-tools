import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("item write action performance", () => {
  it("shows an immediate progress message and refreshes account data in the background after success", () => {
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );

    const functionStart = homePage.indexOf("async function runItemWriteAction(");
    const functionEnd = homePage.indexOf("async function runVaultCleanupWriteAction(", functionStart);
    const functionSource = homePage.slice(functionStart, functionEnd);

    const closeIndex = functionSource.indexOf("closeSelectedItemDetail();");
    const refreshIndex = functionSource.indexOf("void Promise.all([loadAccountSummary(), loadActionLog()])");

    expect(functionSource).toContain("setItemActionMessage(`${label}");
    expect(functionStart).toBeGreaterThan(-1);
    expect(functionEnd).toBeGreaterThan(functionStart);
    expect(closeIndex).toBeGreaterThan(-1);
    expect(refreshIndex).toBeGreaterThan(-1);
    expect(closeIndex).toBeLessThan(refreshIndex);
  });
});
