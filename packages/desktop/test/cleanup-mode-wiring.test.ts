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
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );

    expect(vaultPanel).toContain("清理模式");
    expect(vaultPanel).toContain("不会分解装备");
    expect(vaultPanel).toContain("批量解锁");
    expect(vaultPanel).toContain("转移到角色背包");
    expect(vaultPanel).toContain("selectMarkedCleanupItems");
    expect(vaultPanel).toContain("onBatchUnlock");
    expect(vaultPanel).toContain("onBatchTransferToCharacter");

    expect(homePage).toContain("runVaultCleanupWriteAction");
    expect(homePage).toContain("handleVaultCleanupUnlock");
    expect(homePage).toContain("handleVaultCleanupTransfer");
    expect(homePage).toContain("api.setItemLockState");
    expect(homePage).toContain("api.transferItem");
    expect(homePage).toContain("writeActionsEnabled,");
  });
});
