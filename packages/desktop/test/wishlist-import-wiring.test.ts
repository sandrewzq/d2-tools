import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readRendererApiContracts } from "./source-readers";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));
const uiRoot = join(desktopRoot, "..", "ui", "src");

describe("wishlist import wiring", () => {
  it("wires persisted DIM wishlist APIs through desktop and renderer layers", () => {
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.ts"), "utf8");
    const ipc = readFileSync(join(desktopRoot, "src", "main", "ipc", "wishlist.ts"), "utf8");
    const ipcRegister = readFileSync(join(desktopRoot, "src", "main", "ipc.ts"), "utf8");
    const client = readRendererApiContracts(desktopRoot);
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const accountHook = readFileSync(join(desktopRoot, "src", "renderer", "features", "account", "useAccountWorkspace.ts"), "utf8");
    const vaultPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "vault", "VaultPage.tsx"), "utf8");
    const vaultContent = readFileSync(join(uiRoot, "vault", "VaultPageContentView.tsx"), "utf8");
    const recommendationPanel = readFileSync(join(uiRoot, "vault", "VaultRecommendationImportPanel.tsx"), "utf8");
    const vaultListItem = readFileSync(join(uiRoot, "vault", "VaultListItem.tsx"), "utf8");

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
    expect(accountHook).toContain("wishlist");
    expect(accountHook).toContain("loadAccountWorkspace(services)");
    expect(homePage).toContain("importedWishlist");
    expect(vaultPage).toContain("services.localData.saveDimWishlist");
    expect(vaultPage).toContain("recommendationImportActions");
    expect(recommendationPanel).toContain("parseDimWishlist");
    expect(recommendationPanel).toContain("wishlistImportDraft");
    expect(recommendationPanel).toContain("导入 DIM 愿望单");
    expect(vaultListItem).toContain("evaluateWishlistRoll");
    expect(vaultContent).toContain("props.wishlist");
  });

  it("wires local community recommendation table APIs through desktop and renderer layers", () => {
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.ts"), "utf8");
    const ipc = readFileSync(join(desktopRoot, "src", "main", "ipc", "community.ts"), "utf8");
    const ipcRegister = readFileSync(join(desktopRoot, "src", "main", "ipc.ts"), "utf8");
    const client = readRendererApiContracts(desktopRoot);
    const vaultPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "vault", "VaultPage.tsx"), "utf8");
    const recommendationPanel = readFileSync(join(uiRoot, "vault", "VaultRecommendationImportPanel.tsx"), "utf8");

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
    expect(vaultPage).toContain("services.localData.saveLocalCommunityRecommendations");
    expect(recommendationPanel).toContain("parseLocalCommunityRecommendations");
    expect(recommendationPanel).toContain("localCommunityImportDraft");
    expect(recommendationPanel).toContain("导入本地社区推荐表");
  });
});
