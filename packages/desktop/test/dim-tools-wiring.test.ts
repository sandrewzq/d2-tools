import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("DIM-style tools wiring", () => {
  it("surfaces actionable transfer queue and farming helpers in the GUI", () => {
    const transferQueue = readFileSync(join(desktopRoot, "..", "core", "src", "actions", "transferQueue.ts"), "utf8");
    const farmingMode = readFileSync(join(desktopRoot, "..", "core", "src", "actions", "farmingMode.ts"), "utf8");
    const actionPlan = readFileSync(join(desktopRoot, "..", "core", "src", "actions", "plan.ts"), "utf8");
    const loadoutAnalysis = readFileSync(join(desktopRoot, "..", "core", "src", "loadouts", "analysis.ts"), "utf8");
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.ts"), "utf8");
    const vaultPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "vault", "VaultPage.tsx"), "utf8");
    const vaultPanel = readFileSync(join(desktopRoot, "src", "renderer", "components", "VaultPanel.tsx"), "utf8");
    const vaultOrganizePanel = readFileSync(join(desktopRoot, "src", "renderer", "features", "vault", "VaultOrganizePanel.tsx"), "utf8");
    const vaultWriteHook = readFileSync(join(desktopRoot, "src", "renderer", "features", "vault", "useVaultWriteActions.ts"), "utf8");

    expect(transferQueue).toContain("createTransferQueue");
    expect(farmingMode).toContain("createFarmingModePlan");
    expect(actionPlan).toContain("createBatchTransferPlan");
    expect(preload).toContain("createBatchTransferPlan");
    expect(vaultWriteHook).toContain("runVaultCleanupWriteAction");
    expect(farmingMode).toContain("transfer_to_vault: true");
    expect(loadoutAnalysis).toContain("analyzeLoadoutTemplate");
    expect(loadoutAnalysis).toContain("suggestArmorStatSets");
    expect(vaultPage).toContain("parseDimWishlist");
    expect(vaultPanel).toContain("VaultOrganizePanel");
    expect(vaultOrganizePanel).toContain("复制清理清单");
    expect(vaultOrganizePanel).toContain("批量解锁");
    expect(vaultOrganizePanel).toContain("转移到角色背包");
  });
});
