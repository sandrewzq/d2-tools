import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readRendererApiContracts } from "./source-readers";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("wishlist import wiring", () => {
  it("wires persisted DIM wishlist APIs through desktop and renderer layers", () => {
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.ts"), "utf8");
    const ipc = readFileSync(join(desktopRoot, "src", "main", "ipc", "wishlist.ts"), "utf8");
    const ipcRegister = readFileSync(join(desktopRoot, "src", "main", "ipc.ts"), "utf8");
    const client = readRendererApiContracts(desktopRoot);
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const vaultPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "vault", "VaultPage.tsx"), "utf8");
    const vaultPanel = readFileSync(join(desktopRoot, "src", "renderer", "components", "VaultPanel.tsx"), "utf8");
    const vaultListItem = readFileSync(join(desktopRoot, "src", "renderer", "features", "vault", "VaultListItem.tsx"), "utf8");

    expect(preload).toContain('ipcRenderer.invoke("wishlist:get")');
    expect(preload).toContain('ipcRenderer.invoke("wishlist:save"');
    expect(preload).toContain('ipcRenderer.invoke("wishlist:clear")');
    expect(ipc).toContain('ipcMain.handle("wishlist:get"');
    expect(ipc).toContain('ipcMain.handle("wishlist:save"');
    expect(ipc).toContain('ipcMain.handle("wishlist:clear"');
    expect(ipcRegister).toContain("registerWishlistIpcHandlers()");
    expect(client).toContain("getDimWishlist");
    expect(client).toContain("saveDimWishlist");
    expect(client).toContain("clearDimWishlist");
    expect(homePage).toContain("loadPersistedWishlist");
    expect(homePage).toContain("importedWishlist");
    expect(vaultPage).toContain("parseDimWishlist");
    expect(vaultPage).toContain("wishlistImportDraft");
    expect(vaultPage).toContain("导入 DIM 愿望单");
    expect(vaultListItem).toContain("evaluateWishlistRoll");
    expect(vaultPanel).toContain("props.wishlist");
  });

  it("wires local community recommendation table APIs through desktop and renderer layers", () => {
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.ts"), "utf8");
    const ipc = readFileSync(join(desktopRoot, "src", "main", "ipc", "community.ts"), "utf8");
    const ipcRegister = readFileSync(join(desktopRoot, "src", "main", "ipc.ts"), "utf8");
    const client = readRendererApiContracts(desktopRoot);
    const vaultPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "vault", "VaultPage.tsx"), "utf8");

    expect(preload).toContain('ipcRenderer.invoke("community:local:get")');
    expect(preload).toContain('ipcRenderer.invoke("community:local:save"');
    expect(preload).toContain('ipcRenderer.invoke("community:local:clear")');
    expect(ipc).toContain('ipcMain.handle("community:local:get"');
    expect(ipc).toContain('ipcMain.handle("community:local:save"');
    expect(ipc).toContain('ipcMain.handle("community:local:clear"');
    expect(ipcRegister).toContain("registerCommunityIpcHandlers()");
    expect(client).toContain("getLocalCommunityRecommendations");
    expect(client).toContain("saveLocalCommunityRecommendations");
    expect(client).toContain("clearLocalCommunityRecommendations");
    expect(vaultPage).toContain("parseLocalCommunityRecommendations");
    expect(vaultPage).toContain("localCommunityImportDraft");
    expect(vaultPage).toContain("导入本地社区推荐表");
  });
});
