import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import type { VaultTags } from "@d2-tools/core/vault/tags";
import type { D2Services } from "@d2-tools/services";
import { runQuery, type QueryState } from "../queryState.js";
import { loadFullAccountWorkspace } from "./accountDerived.js";
import {
  buildAccountCharacterTabs,
  type AccountCharacterTab,
  type AccountCharacterTabSource
} from "./characterTabs.js";
import type { VaultItemSourceKind, VaultLocatedItem } from "./vaultList.js";

export type VaultPageModel = {
  vaultItems: VaultLocatedItem[];
  vaultItemCount: number;
  currentCharacterId: string;
  currentCharacterLabel: string;
  characterTabs: AccountCharacterTab[];
  activeLoadoutLookup: {
    instanceIds: Set<string>;
    bucketHashKeys: Set<string>;
    hashKeys: Set<number>;
  } | null;
  activeLoadoutName?: string;
  tags: VaultTags;
  targetRules: LocalTargetRules;
};

export type VaultPageWorkspace = VaultPageModel;

export type VaultPageInput = {
  account: {
    characters: Array<
      AccountCharacterTabSource["characters"][number]
      & { postmaster_items: AccountItemSummary[] }
    >;
    vault: { item_count?: number; items: AccountItemSummary[] };
  };
  /** 不传时回落到账号里的第一个角色；调用方通常传入当前选中的角色。 */
  selectedCharacterId?: string;
  activeLoadoutLookup: VaultPageModel["activeLoadoutLookup"];
  activeLoadoutName?: string;
  tags: VaultTags;
  targetRules: LocalTargetRules;
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

    return createVaultPageWorkspace({
      account,
      activeLoadoutLookup: null,
      tags: accountWorkspace.data.tags,
      targetRules: accountWorkspace.data.targetRules
    });
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
    vaultItems: buildVaultLocatedItems(input.account),
    vaultItemCount: input.account.vault.item_count ?? input.account.vault.items.length,
    currentCharacterId,
    currentCharacterLabel,
    characterTabs: buildAccountCharacterTabs(input.account, currentCharacterId),
    activeLoadoutLookup: input.activeLoadoutLookup,
    activeLoadoutName: input.activeLoadoutName,
    tags: input.tags,
    targetRules: input.targetRules
  };
}

function buildVaultLocatedItems(input: VaultPageInput["account"]): VaultLocatedItem[] {
  const locatedVaultItems = input.vault.items.map((item) => locateVaultItem(item, "vault", "仓库"));
  const vaultNonWeapons = locatedVaultItems.filter((item) => item.group_key !== "weapons");
  const knownWeapons = [
    ...locatedVaultItems.filter((item) => item.group_key === "weapons"),
    ...input.characters.flatMap((character) => [
      ...character.equipped_items.map((item) => locateCharacterItem(item, character, "equipped", "已装备")),
      ...character.inventory_items.map((item) => locateCharacterItem(item, character, "inventory", "背包")),
      ...character.postmaster_items.map((item) => locateCharacterItem(item, character, "postmaster", "邮政官"))
    ]).filter((item) => item.group_key === "weapons")
  ];
  const seenInstances = new Set<string>();
  const uniqueWeapons = knownWeapons.filter((item) => {
    if (!item.instance_id) return true;
    if (seenInstances.has(item.instance_id)) return false;
    seenInstances.add(item.instance_id);
    return true;
  });
  return [...uniqueWeapons, ...vaultNonWeapons];
}

function locateCharacterItem(
  item: AccountItemSummary,
  character: { character_id: string; class_name: string },
  sourceKind: Exclude<VaultItemSourceKind, "vault">,
  sourceLocationLabel: string
): VaultLocatedItem {
  return getCachedLocatedItem(item, `${character.character_id}:${sourceKind}`, () => ({
    ...item,
    source_character_id: character.character_id,
    source_kind: sourceKind,
    source_label: `${character.class_name} · ${sourceLocationLabel}`,
    source_location_label: sourceLocationLabel,
    source_character_class: character.class_name,
    ...(sourceKind === "postmaster" ? { is_postmaster_item: true } : {})
  }));
}

function locateVaultItem(
  item: AccountItemSummary,
  sourceKind: "vault",
  sourceLocationLabel: string
): VaultLocatedItem {
  return getCachedLocatedItem(item, sourceKind, () => ({
    ...item,
    source_kind: sourceKind,
    source_label: sourceLocationLabel,
    source_location_label: sourceLocationLabel,
    is_vault_item: true
  }));
}

const locatedItemCache = new WeakMap<AccountItemSummary, Map<string, VaultLocatedItem>>();

function getCachedLocatedItem(
  item: AccountItemSummary,
  locationKey: string,
  create: () => VaultLocatedItem
): VaultLocatedItem {
  let byLocation = locatedItemCache.get(item);
  if (!byLocation) {
    byLocation = new Map();
    locatedItemCache.set(item, byLocation);
  }
  const cached = byLocation.get(locationKey);
  if (cached) return cached;
  const located = create();
  byLocation.set(locationKey, located);
  return located;
}
