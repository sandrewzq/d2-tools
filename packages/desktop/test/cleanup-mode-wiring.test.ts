import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("cleanup mode wiring", () => {
  it("wires DIM-like cleanup actions from vault panel to guarded Bungie actions", () => {
    const vaultPanel = readFileSync(
      join(desktopRoot, "src", "renderer", "components", "VaultPanel.tsx"),
      "utf8"
    );
    const vaultOrganizePanel = readFileSync(join(desktopRoot, "src", "renderer", "features", "vault", "VaultOrganizePanel.tsx"), "utf8");
    const vaultBatchHook = readFileSync(join(desktopRoot, "src", "renderer", "features", "vault", "useVaultBatchActions.ts"), "utf8");
    const vaultPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "vault", "VaultPage.tsx"), "utf8");
    const vaultWriteHook = readFileSync(join(desktopRoot, "src", "renderer", "features", "vault", "useVaultWriteActions.ts"), "utf8");
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");

    expect(vaultPanel).toContain("VaultOrganizePanel");
    expect(vaultOrganizePanel).toContain("清理模式");
    expect(vaultOrganizePanel).toContain("不会分解装备");
    expect(vaultOrganizePanel).toContain("批量解锁");
    expect(vaultOrganizePanel).toContain("转移到角色背包");
    expect(vaultPanel).toContain("selectMarkedCleanupItems");
    expect(vaultBatchHook).toContain("onBatchUnlock");
    expect(vaultBatchHook).toContain("onBatchTransferToCharacter");

    expect(vaultWriteHook).toContain("runVaultCleanupWriteAction");
    expect(vaultWriteHook).toContain("handleVaultCleanupUnlock");
    expect(vaultWriteHook).toContain("handleVaultCleanupTransfer");
    expect(vaultWriteHook).toContain("api.setItemLockState");
    expect(vaultWriteHook).toContain("api.batchTransferItems");
    expect(homePage).toContain("writeActionsEnabled={diagnostics.writeActionsEnabled}");
    expect(vaultPage).toContain("writeActionsEnabled: props.writeActionsEnabled");
  });
});
