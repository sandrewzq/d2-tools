import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const desktopRoot = join(process.cwd(), "packages", "desktop");

describe("vault page import drafts", () => {
  it("keeps recommendation import drafts in shared UI and desktop persistence in the vault adapter", () => {
    const vaultPage = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "vault", "VaultPage.tsx"),
      "utf8"
    );
    const recommendationPanel = readFileSync(
      join(desktopRoot, "..", "ui", "src", "vault", "VaultRecommendationImportPanel.tsx"),
      "utf8"
    );

    expect(vaultPage).toContain('import type { LoadoutTemplateLookup } from "../../shared/domain/loadouts/loadoutLookup";');
    expect(vaultPage).toContain("recommendationImportActions");
    expect(vaultPage).toContain("services.localData.saveDimWishlist");
    expect(vaultPage).toContain("services.localData.saveLocalCommunityRecommendations");
    expect(vaultPage).not.toContain('const [wishlistImportDraft, setWishlistImportDraft] = useState("")');
    expect(vaultPage).not.toContain('const [vaultLocalDataState, setVaultLocalDataState] = useState(null);');

    expect(recommendationPanel).toContain('const [wishlistImportDraft, setWishlistImportDraft] = useState("")');
    expect(recommendationPanel).toContain('const [localCommunityImportDraft, setLocalCommunityImportDraft] = useState("")');
  });
});
