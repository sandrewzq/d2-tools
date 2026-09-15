import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import type { VaultTags } from "@d2-tools/core/vault/tags";
import type { D2Services } from "@d2-tools/services";
import { runQuery, type QueryState } from "../queryState.js";

export type VaultLocalDataState = {
  tags: VaultTags;
  wishlist: DimWishlist | null;
  targetRules: LocalTargetRules;
};

export function loadVaultLocalData(
  services: Pick<D2Services, "localData">
): Promise<QueryState<VaultLocalDataState>> {
  return runQuery(async () => {
    const [tags, wishlist, targetRules] = await Promise.all([
      services.localData.getVaultTags(),
      services.localData.getDimWishlist(),
      services.localData.getLocalTargetRules()
    ]);

    return {
      tags,
      wishlist,
      targetRules
    };
  });
}
