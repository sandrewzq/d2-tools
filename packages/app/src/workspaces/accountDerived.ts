import type { AccountSummary } from "@d2-tools/core/account/summary";
import type { ActivityHistorySummary } from "@d2-tools/core/activities/history";
import type { VaultItemMatchInfo } from "@d2-tools/core/community-perks";
import type { D2Services } from "@d2-tools/services";
import { runQuery, type QueryState } from "../queryState.js";

export type AccountDerivedWorkspace = {
  activitySummary: ActivityHistorySummary | null;
  vaultCommunityMatch: Map<number, VaultItemMatchInfo>;
};

export async function loadAccountDerivedWorkspace(
  services: Pick<D2Services, "profile">,
  account: AccountSummary
): Promise<QueryState<AccountDerivedWorkspace>> {
  return runQuery(async () => {
    const activitySummary = await services.profile.getActivitySummary({
      membership_type: account.membership_type,
      membership_id: account.destiny_membership_id,
      character_ids: account.characters.map((character) => character.character_id)
    });

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
    if (matchCommunityVaultItems) {
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
