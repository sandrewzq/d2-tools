import type { AccountSummary } from "@d2-tools/core/account/summary";
import type { ActivityHistorySummary } from "@d2-tools/core/activities/history";
import type { VaultItemMatchInfo } from "@d2-tools/core/community-perks";
import type { D2Services } from "@d2-tools/services";
import { runQuery, type QueryState } from "../queryState.js";
import { loadAccountWorkspace, type AccountWorkspace } from "./account.js";

export type AccountDerivedWorkspace = {
  activitySummary: ActivityHistorySummary | null;
  vaultCommunityMatch: Map<number, VaultItemMatchInfo>;
};

export type FullAccountWorkspace = AccountWorkspace & AccountDerivedWorkspace;

export type LoadAccountDerivedWorkspaceOptions = {
  includeActivity?: boolean;
  includeCommunityMatch?: boolean;
};

export async function loadFullAccountWorkspace(
  services: Pick<D2Services, "profile" | "localData">
): Promise<QueryState<FullAccountWorkspace>> {
  const base = await loadAccountWorkspace(services);
  if (base.status !== "success") {
    return base as QueryState<FullAccountWorkspace>;
  }

  const derived = await loadAccountDerivedWorkspace(services, base.data.account);
  if (derived.status !== "success") {
    return derived as QueryState<FullAccountWorkspace>;
  }

  return {
    status: "success",
    data: {
      ...base.data,
      ...derived.data
    },
    error: null
  };
}

export async function loadAccountDerivedWorkspace(
  services: Pick<D2Services, "profile">,
  account: AccountSummary,
  options: LoadAccountDerivedWorkspaceOptions = {}
): Promise<QueryState<AccountDerivedWorkspace>> {
  return runQuery(async () => {
    const includeActivity = options.includeActivity ?? true;
    const includeCommunityMatch = options.includeCommunityMatch ?? true;
    const activitySummary = includeActivity
      ? await services.profile.getActivitySummary({
          membership_type: account.membership_type,
          membership_id: account.destiny_membership_id,
          character_ids: account.characters.map((character) => character.character_id)
        })
      : null;

    const allItems = [
      ...account.characters.flatMap((character) => [
        ...character.equipped_items,
        ...character.inventory_items,
        ...character.postmaster_items
      ]),
      ...account.vault.items
    ];

    const matchCommunityVaultItems = services.profile.matchCommunityVaultItems;
    const vaultCommunityMatch = new Map<number, VaultItemMatchInfo>();
    if (includeCommunityMatch && matchCommunityVaultItems) {
      const result = await matchCommunityVaultItems(
        allItems.map((item) => ({
          hash: item.hash,
          socket_plugs: item.socket_plugs?.map((plug) => ({ hash: plug.hash }))
        }))
      );
      for (const item of result) {
        vaultCommunityMatch.set(item.hash, {
          matched: item.matched,
          available: item.available,
          modes: item.modes,
          sample_perks: item.sample_perks,
          source_label: item.source_label
        });
      }
    }

    return {
      activitySummary,
      vaultCommunityMatch
    };
  });
}
