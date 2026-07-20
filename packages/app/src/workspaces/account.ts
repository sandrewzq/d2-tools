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
  warnings: AccountWorkspaceWarning[];
};

export type AccountWorkspaceWarning = {
  source: "vault-tags" | "target-rules" | "wishlist";
  message: string;
};

export function loadAccountWorkspace(
  services: Pick<D2Services, "profile" | "localData">,
  options?: { forceAccountRefresh?: boolean }
): Promise<QueryState<AccountWorkspace>> {
  return runQuery(async () => {
    const accountRequest = options?.forceAccountRefresh
      ? services.profile.getAccountSummary({ force: true })
      : services.profile.getAccountSummary();
    const [account, tagsResult, targetRulesResult, wishlistResult] = await Promise.all([
      accountRequest,
      settleLocalData("vault-tags", services.localData.getVaultTags()),
      settleLocalData("target-rules", services.localData.getLocalTargetRules()),
      settleLocalData("wishlist", services.localData.getDimWishlist())
    ]);
    const warnings = [
      tagsResult.warning,
      targetRulesResult.warning,
      wishlistResult.warning
    ].filter((warning): warning is AccountWorkspaceWarning => Boolean(warning));

    return {
      account,
      tags: tagsResult.value ?? { items: {} },
      targetRules: targetRulesResult.value ?? defaultLocalTargetRules(),
      wishlist: wishlistResult.value ?? null,
      warnings
    };
  });
}

async function settleLocalData<TValue>(
  source: AccountWorkspaceWarning["source"],
  load: Promise<TValue>
): Promise<{ value: TValue | null; warning: AccountWorkspaceWarning | null }> {
  try {
    return { value: await load, warning: null };
  } catch (error) {
    return {
      value: null,
      warning: {
        source,
        message: error instanceof Error ? error.message : "本地账号增强数据读取失败"
      }
    };
  }
}

function defaultLocalTargetRules(): LocalTargetRules {
  return {
    action_policy: "notify_only",
    armor: [],
    weapons: []
  };
}
