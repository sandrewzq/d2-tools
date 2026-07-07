import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import type { VaultItemMatchInfo } from "@d2-tools/core/community-perks";
import type { VaultTags } from "@d2-tools/core/vault/tags";
import type { D2Services } from "@d2-tools/services";
import { runQuery, type QueryState } from "../queryState.js";
import { loadFullAccountWorkspace } from "./accountDerived.js";

export type VaultPageModel = {
  vaultItems: AccountItemSummary[];
  vaultItemCount: number;
  currentCharacterId: string;
  currentCharacterLabel: string;
  activeLoadoutLookup: {
    instanceIds: Set<string>;
    bucketHashKeys: Set<string>;
    hashKeys: Set<number>;
  } | null;
  activeLoadoutName?: string;
  tags: VaultTags;
  targetRules: LocalTargetRules;
  wishlist: DimWishlist | null;
  communityMatch: Map<number, VaultItemMatchInfo>;
};

export type VaultPageWorkspace = VaultPageModel;

export type VaultPageInput = {
  account: {
    characters: Array<{ character_id: string; class_name: string }>;
    vault: { item_count?: number; items: AccountItemSummary[] };
  };
  selectedCharacterId: string;
  activeLoadoutLookup: VaultPageModel["activeLoadoutLookup"];
  activeLoadoutName?: string;
  tags: VaultTags;
  targetRules: LocalTargetRules;
  wishlist: DimWishlist | null;
  communityMatch: Map<number, VaultItemMatchInfo>;
};

export async function loadVaultPageWorkspace(
  services: Pick<D2Services, "profile" | "localData">
): Promise<QueryState<VaultPageWorkspace>> {
  const accountWorkspace = await loadFullAccountWorkspace(services);
  if (accountWorkspace.status !== "success") {
    return accountWorkspace as QueryState<VaultPageWorkspace>;
  }

  return runQuery(async () => {
    const account = accountWorkspace.data.account;

    return {
      vaultItems: account.vault.items,
      vaultItemCount: account.vault.item_count,
      currentCharacterId: account.characters[0]?.character_id ?? "",
      currentCharacterLabel: account.characters[0]?.class_name ?? "",
      activeLoadoutLookup: null,
      tags: accountWorkspace.data.tags,
      targetRules: accountWorkspace.data.targetRules,
      wishlist: accountWorkspace.data.wishlist,
      communityMatch: accountWorkspace.data.vaultCommunityMatch
    };
  });
}

export function selectVaultPageModel(input: VaultPageInput): VaultPageModel {
  return createVaultPageWorkspace(input);
}

export function createVaultPageWorkspace(input: VaultPageInput): VaultPageWorkspace {
  const currentCharacterId = input.selectedCharacterId || input.account.characters[0]?.character_id || "";
  const currentCharacterLabel = input.account.characters.find((character) =>
    character.character_id === currentCharacterId
  )?.class_name ?? "";

  return {
    vaultItems: input.account.vault.items,
    vaultItemCount: input.account.vault.item_count ?? input.account.vault.items.length,
    currentCharacterId,
    currentCharacterLabel,
    activeLoadoutLookup: input.activeLoadoutLookup,
    activeLoadoutName: input.activeLoadoutName,
    tags: input.tags,
    targetRules: input.targetRules,
    wishlist: input.wishlist,
    communityMatch: input.communityMatch
  };
}
