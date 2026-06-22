import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("item write action performance", () => {
  it("shows an immediate progress message and refreshes account data in the background after success", () => {
    const itemDetailHook = readFileSync(
      join(desktopRoot, "src", "renderer", "shared", "hooks", "useItemDetailWorkspace.ts"),
      "utf8"
    );

    const functionStart = itemDetailHook.indexOf("async function runItemWriteAction(");
    const functionEnd = itemDetailHook.indexOf("return {", functionStart);
    const functionSource = itemDetailHook.slice(functionStart, functionEnd);

    const closeIndex = functionSource.indexOf("closeSelectedItemDetail();");
    const refreshIndex = functionSource.indexOf("void Promise.all([input.loadAccountSummary(), input.diagnostics.loadActionLog()])");

    expect(functionSource).toContain("input.setItemActionMessage(`${label}");
    expect(functionStart).toBeGreaterThan(-1);
    expect(functionEnd).toBeGreaterThan(functionStart);
    expect(closeIndex).toBeGreaterThan(-1);
    expect(refreshIndex).toBeGreaterThan(-1);
    expect(closeIndex).toBeLessThan(refreshIndex);
  });

  it("uses the batch transfer API for vault bulk move instead of item-by-item transfer", () => {
    const vaultWriteHook = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "vault", "useVaultWriteActions.ts"),
      "utf8"
    );

    const functionStart = vaultWriteHook.indexOf("async function handleVaultCleanupTransfer(");
    const functionEnd = vaultWriteHook.indexOf("return {", functionStart);
    const functionSource = vaultWriteHook.slice(functionStart, functionEnd);

    expect(functionStart).toBeGreaterThan(-1);
    expect(functionSource).toContain("api.batchTransferItems(");
  });

  it("uses the batch transfer API for missing loadout transfers", () => {
    const loadoutWriteHook = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "loadouts", "useLoadoutWriteActions.ts"),
      "utf8"
    );

    const functionStart = loadoutWriteHook.indexOf("async function executeMissingLoadoutTransfer(");
    const functionEnd = loadoutWriteHook.indexOf("async function executeSingleLoadoutItemTransfer(", functionStart);
    const functionSource = loadoutWriteHook.slice(functionStart, functionEnd);

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
    const loadoutWriteHook = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "loadouts", "useLoadoutWriteActions.ts"),
      "utf8"
    );

    const functionStart = loadoutWriteHook.indexOf("async function executeSingleLoadoutItemTransfer(");
    const functionEnd = loadoutWriteHook.indexOf("async function equipSingleLoadoutItem(", functionStart);
    const functionSource = loadoutWriteHook.slice(functionStart, functionEnd);

    expect(functionStart).toBeGreaterThan(-1);
    expect(functionEnd).toBeGreaterThan(functionStart);
    expect(functionSource).toContain("buildMissingLoadoutTransferPlan");
    expect(functionSource).toContain("template: {");
    expect(functionSource).toContain("items: [item]");
    expect(functionSource).toContain("api.batchTransferItems(");
    expect(functionSource).toContain("api.batchEquipItems(");
  });
});
