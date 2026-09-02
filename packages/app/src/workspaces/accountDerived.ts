import type { AccountSummary } from "@d2-tools/core/account/summary";
import type { ActivityHistorySummary } from "@d2-tools/core/activities/history";
import type {
  VaultItemInstanceMatchInfo,
  VaultRecommendationDependencyIssue
} from "@d2-tools/core/community-perks";
import type { D2Services } from "@d2-tools/services";
import { runQuery, type QueryState } from "../queryState.js";
import { loadAccountWorkspace, type AccountWorkspace } from "./account.js";

export type AccountDerivedWorkspace = {
  activitySummary: ActivityHistorySummary | null;
  vaultCommunityInstanceMatch: Map<string, VaultItemInstanceMatchInfo>;
  vaultRecommendationIssues: VaultRecommendationDependencyIssue[];
  vaultRecommendationManifestVersion?: string;
  vaultRecommendationRevision?: string;
  vaultRecommendationSchemaVersion?: number;
};

export type VaultRecommendationScanState = {
  phase: "idle" | "scanning" | "partial" | "complete" | "error";
  total_weapon_count: number;
  scanned_weapon_count: number;
  covered_weapon_count: number;
  retained_result_count: number;
  started_at?: string;
  completed_at?: string;
  message?: string;
  blocking_reason?: "manifest_unavailable" | "manifest_outdated" | "recommendation_unavailable";
  issues?: VaultRecommendationDependencyIssue[];
  manifest_version?: string;
  recommendation_revision?: string;
  recommendation_schema_version?: number;
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

    const weaponItems = allItems.filter((item) => item.group_key === "weapons");
    const matchCommunityVaultItems = services.profile.matchCommunityVaultItems;
    const vaultCommunityInstanceMatch = new Map<string, VaultItemInstanceMatchInfo>();
    let vaultRecommendationIssues: VaultRecommendationDependencyIssue[] = [];
    let vaultRecommendationManifestVersion = "";
    let vaultRecommendationRevision = "";
    let vaultRecommendationSchemaVersion: number | undefined;
    if (includeCommunityMatch && matchCommunityVaultItems) {
      const result = await matchCommunityVaultItems(
        weaponItems.map((item) => ({
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
      vaultRecommendationIssues = result.issues;
      vaultRecommendationManifestVersion = result.manifest_version ?? "";
      vaultRecommendationRevision = result.recommendation_revision ?? "";
      vaultRecommendationSchemaVersion = result.recommendation_schema_version;
      for (const item of result.matches) {
        vaultCommunityInstanceMatch.set(item.instance_id ?? `hash:${item.hash}`, item);
      }
    }

    return {
      activitySummary,
      vaultCommunityInstanceMatch,
      vaultRecommendationIssues,
      ...(vaultRecommendationManifestVersion
        ? { vaultRecommendationManifestVersion }
        : {}),
      ...(vaultRecommendationRevision
        ? { vaultRecommendationRevision }
        : {}),
      ...(vaultRecommendationSchemaVersion !== undefined
        ? { vaultRecommendationSchemaVersion }
        : {})
    };
  });
}
