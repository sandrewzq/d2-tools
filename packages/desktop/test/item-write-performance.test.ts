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

  it("uses the batch transfer API for vault bulk move instead of item-by-item transfer", () => {
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );

    const functionStart = homePage.indexOf("async function handleVaultCleanupTransfer(");
    const functionEnd = homePage.indexOf("function renderHomePanel()", functionStart);
    const functionSource = homePage.slice(functionStart, functionEnd);

    expect(functionStart).toBeGreaterThan(-1);
    expect(functionSource).toContain("api.batchTransferItems(");
  });

  it("uses the batch transfer API for missing loadout transfers", () => {
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );

    const functionStart = homePage.indexOf("async function executeMissingLoadoutTransfer(");
    const functionEnd = homePage.indexOf("async function loadActivitySummary(", functionStart);
    const functionSource = homePage.slice(functionStart, functionEnd);

    expect(functionStart).toBeGreaterThan(-1);
    expect(functionSource).toContain("buildMissingLoadoutTransferPlan");
    expect(functionSource).toContain('step.phase === "equip-swap"');
    expect(functionSource).toContain('step.phase === "pull-postmaster"');
    expect(functionSource).toContain("api.pullFromPostmaster(");
    expect(functionSource).toContain("api.batchEquipItems(");
    expect(functionSource).toContain("api.batchTransferItems(");
    expect(functionSource).toContain("for (const step of transferPlan.steps)");
  });

  it("reuses the loadout transfer planner for single-item recovery actions", () => {
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );

    const functionStart = homePage.indexOf("async function executeSingleLoadoutItemTransfer(");
    const functionEnd = homePage.indexOf("function openTemplateSourceItem(", functionStart);
    const functionSource = homePage.slice(functionStart, functionEnd);

    expect(functionStart).toBeGreaterThan(-1);
    expect(functionEnd).toBeGreaterThan(functionStart);
    expect(functionSource).toContain("buildMissingLoadoutTransferPlan");
    expect(functionSource).toContain("template: {");
    expect(functionSource).toContain("items: [item]");
    expect(functionSource).toContain("api.batchTransferItems(");
    expect(functionSource).toContain("api.batchEquipItems(");
  });
});
