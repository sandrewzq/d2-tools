import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("wishlist import wiring", () => {
  it("wires persisted DIM wishlist APIs through desktop and renderer layers", () => {
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.ts"), "utf8");
    const ipc = readFileSync(join(desktopRoot, "src", "main", "ipc.ts"), "utf8");
    const client = readFileSync(join(desktopRoot, "src", "renderer", "api", "client.ts"), "utf8");
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const vaultPanel = readFileSync(join(desktopRoot, "src", "renderer", "components", "VaultPanel.tsx"), "utf8");

    expect(preload).toContain('ipcRenderer.invoke("wishlist:get")');
    expect(preload).toContain('ipcRenderer.invoke("wishlist:save"');
    expect(preload).toContain('ipcRenderer.invoke("wishlist:clear")');
    expect(ipc).toContain('ipcMain.handle("wishlist:get"');
    expect(ipc).toContain('ipcMain.handle("wishlist:save"');
    expect(ipc).toContain('ipcMain.handle("wishlist:clear"');
    expect(client).toContain("getDimWishlist");
    expect(client).toContain("saveDimWishlist");
    expect(client).toContain("clearDimWishlist");
    expect(homePage).toContain("loadPersistedWishlist");
    expect(homePage).toContain("importedWishlist");
    expect(vaultPanel).toContain("evaluateWishlistRoll");
    expect(vaultPanel).toContain("props.wishlist");
  });
});
