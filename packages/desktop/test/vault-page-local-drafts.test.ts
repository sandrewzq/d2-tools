import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const desktopRoot = join(process.cwd(), "packages", "desktop");

describe("vault page import drafts", () => {
  it("keeps explicit local draft state for wishlist and loadout lookup typing", () => {
    const source = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "vault", "VaultPage.tsx"),
      "utf8"
    );

    expect(source).toContain('import type { LoadoutTemplateLookup } from "../../shared/domain/loadouts/loadoutLookup";');
    expect(source).toContain('const [wishlistImportDraft, setWishlistImportDraft] = useState("")');
    expect(source).not.toContain('const [vaultLocalDataState, setVaultLocalDataState] = useState(null);');
  });
});
