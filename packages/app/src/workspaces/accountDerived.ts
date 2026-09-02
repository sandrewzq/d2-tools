import type { AccountSummary } from "@d2-tools/core/account/summary";
import type { ActivityHistorySummary } from "@d2-tools/core/activities/history";
import type { VaultItemInstanceMatchInfo, VaultItemMatchInfo } from "@d2-tools/core/community-perks";
import type { D2Services } from "@d2-tools/services";
import { runQuery, type QueryState } from "../queryState.js";
import { loadAccountWorkspace, type AccountWorkspace } from "./account.js";

export type AccountDerivedWorkspace = {
  activitySummary: ActivityHistorySummary | null;
  vaultCommunityMatch: Map<number, VaultItemMatchInfo>;
  vaultCommunityInstanceMatch: Map<string, VaultItemInstanceMatchInfo>;
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
    const vaultCommunityInstanceMatch = new Map<string, VaultItemInstanceMatchInfo>();
    if (includeCommunityMatch && matchCommunityVaultItems) {
      const result = await matchCommunityVaultItems(
        allItems.map((item) => ({
          hash: item.hash,
          instance_id: item.instance_id,
          item_name: item.name,
          weapon_roll: item.weapon_roll,
          socket_plugs: item.socket_plugs?.map((plug) => ({
            hash: plug.hash,
            socket_index: plug.socket_index
          }))
        }))
      );
      for (const item of result) {
        const matchInfo: VaultItemMatchInfo = {
          matched: item.matched,
          available: item.available,
          modes: item.modes,
          sample_perks: item.sample_perks,
          source_label: item.source_label
        };
        const previous = vaultCommunityMatch.get(item.hash);
        if (!previous || item.matched > previous.matched || (
          item.matched === previous.matched && item.partial > 0
        )) {
          vaultCommunityMatch.set(item.hash, matchInfo);
        }
        vaultCommunityInstanceMatch.set(item.instance_id ?? `hash:${item.hash}`, item);
      }
    }

    return {
      activitySummary,
      vaultCommunityMatch,
      vaultCommunityInstanceMatch
    };
  });
}
