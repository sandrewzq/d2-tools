import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

function readDesktop(path: string) {
  return readFileSync(join(desktopRoot, path), "utf8");
}

function readRepo(path: string) {
  return readFileSync(join(repoRoot, path), "utf8");
}

describe("local data services wiring", () => {
  it("loads vault local data through the shared app workspace helper", () => {
    const vaultWorkspace = readRepo("packages/app/src/workspaces/vaultLocalData.ts");
    const appIndex = readRepo("packages/app/src/index.ts");

    expect(vaultWorkspace).toContain("loadVaultLocalData");
    expect(vaultWorkspace).toContain("services.localData.getVaultTags()");
    expect(vaultWorkspace).toContain("services.localData.getDimWishlist()");
    expect(vaultWorkspace).toContain("services.localData.getLocalTargetRules()");
    expect(vaultWorkspace).toContain("services.localData.getLocalCommunityRecommendations()");
    expect(appIndex).toContain("loadVaultLocalData");
  });

  it("routes local data writes through the shared services adapter", () => {
    const page = readDesktop("src/renderer/features/vault/VaultPage.tsx");
    const targetPanel = readRepo("packages/ui/src/vault/VaultTargetRulesPanel.tsx");
    const writeActions = readDesktop("src/renderer/features/vault/useVaultWriteActions.ts");
    const itemDetail = readDesktop("src/renderer/shared/hooks/useItemDetailWorkspace.ts");
    const servicesClient = readDesktop("src/renderer/api/services.ts");

    expect(page).toContain("services.localData.saveDimWishlist");
    expect(page).toContain("services.localData.clearDimWishlist");
    expect(page).toContain("services.localData.saveLocalCommunityRecommendations");
    expect(page).toContain("services.localData.clearLocalCommunityRecommendations");
    expect(page).toContain("services.localData.saveLocalTargetRules");
    expect(page).toContain("services.localData.clearLocalTargetRules");
    expect(targetPanel).toContain("onSaveRules");
    expect(targetPanel).toContain("onClearRules");
    expect(writeActions).toContain("services.localData.saveVaultTag");
    expect(writeActions).toContain("services.localData.saveVaultTagsBatch");
    expect(itemDetail).toContain("services.localData.saveVaultNote");
    expect(itemDetail).toContain("services.localData.saveVaultTag");
    expect(servicesClient).toContain("createAppServices(api)");
    expect(page).not.toContain("api.saveDimWishlist(");
    expect(page).not.toContain("api.clearDimWishlist(");
    expect(page).not.toContain("api.saveLocalCommunityRecommendations(");
    expect(page).not.toContain("api.clearLocalCommunityRecommendations(");
    expect(targetPanel).not.toContain("api.saveLocalTargetRules(");
    expect(targetPanel).not.toContain("api.clearLocalTargetRules(");
    expect(writeActions).not.toContain("api.saveVaultTag(");
    expect(writeActions).not.toContain("api.saveVaultTagsBatch(");
    expect(itemDetail).not.toContain("api.saveVaultNote(");
    expect(itemDetail).not.toContain("api.saveVaultTag(");
  });
});
