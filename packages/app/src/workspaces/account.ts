import type { AccountSummary } from "@d2-tools/core/account/summary";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import type { VaultTags } from "@d2-tools/core/vault/tags";
import type { D2Services } from "@d2-tools/services";
import { runQuery, type QueryState } from "../queryState.js";

export type AccountWorkspace = {
  account: AccountSummary;
  tags: VaultTags;
  targetRules: LocalTargetRules;
  wishlist: DimWishlist | null;
};

export function loadAccountWorkspace(
  services: Pick<D2Services, "profile" | "localData">
): Promise<QueryState<AccountWorkspace>> {
  return runQuery(async () => {
    const [account, tags, targetRules] = await Promise.all([
      services.profile.getAccountSummary(),
      services.localData.getVaultTags(),
      services.localData.getLocalTargetRules()
    ]);
    const wishlist = await services.localData.getDimWishlist();

    return {
      account,
      tags,
      targetRules,
      wishlist
    };
  });
}
