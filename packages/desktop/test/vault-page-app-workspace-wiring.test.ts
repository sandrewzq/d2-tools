import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const desktopRoot = join(process.cwd(), "packages", "desktop");
const appRoot = join(process.cwd(), "packages", "app");

describe("vault page app workspace wiring", () => {
  it("routes more vault page state through the app workspace object", () => {
    const vaultPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "vault", "VaultPage.tsx"), "utf8");
    const vaultWorkspace = readFileSync(join(appRoot, "src", "workspaces", "vaultPage.ts"), "utf8");

    expect(vaultPage).toContain("createVaultPageWorkspace");
    expect(vaultPage).toContain("tags={workspace.tags}");
    expect(vaultPage).toContain("wishlist={workspace.wishlist}");
    expect(vaultPage).toContain("localTargetRules={workspace.targetRules}");
    expect(vaultPage).toContain("communityMatch={workspace.communityMatch}");
    expect(vaultWorkspace).toContain("wishlist: DimWishlist | null");
    expect(vaultWorkspace).toContain("communityMatch: Map<number, VaultItemMatchInfo>");
  });
});
