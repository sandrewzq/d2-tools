import { loadVaultLocalData, type VaultLocalDataState } from "@d2-tools/app/vault";
import { services } from "../../api/services";
import type { DimWishlist, LocalTargetRules, VaultTags } from "../../api/types";

export type VaultPageLocalData = {
  wishlist: DimWishlist | null;
  targetRules: LocalTargetRules;
  tags: VaultTags;
};

export async function loadVaultPageLocalData(): Promise<VaultPageLocalData> {
  const result = await loadVaultLocalData(services);
  if (result.status !== "success") {
    throw new Error(result.error?.message ?? "仓库本地数据读取失败");
  }

  return {
    wishlist: result.data.wishlist,
    targetRules: result.data.targetRules,
    tags: result.data.tags
  };
}
