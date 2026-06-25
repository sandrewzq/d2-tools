import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import type { VaultTags } from "@d2-tools/core/vault/tags";
import type { D2Services } from "@d2-tools/services";
import { runQuery, type QueryState } from "../queryState.js";

export type VaultWorkspace = {
  items: AccountItemSummary[];
  tags: VaultTags;
  targetRules: LocalTargetRules;
};

export function loadVaultWorkspace(
  services: Pick<D2Services, "profile" | "localData">
): Promise<QueryState<VaultWorkspace>> {
  return runQuery(async () => {
    const [account, tags, targetRules] = await Promise.all([
      services.profile.getAccountSummary(),
      services.localData.getVaultTags(),
      services.localData.getLocalTargetRules()
    ]);

    return {
      items: account.vault.items,
      tags,
      targetRules
    };
  });
}
