import { useCallback, useRef, useSyncExternalStore } from "react";
import type {
  AccountItemActionPatch,
  AccountItemSummary,
  AccountSummary,
  CharacterEquipmentGroup
} from "../../api/types";
import { isAccountItemActionPatchReflected } from "../domain/account/itemActionState";

type AccountItemEntityKey = string;

type NormalizedEquipmentGroup = Omit<CharacterEquipmentGroup, "items">;

type NormalizedCharacter = Omit<
  AccountSummary["characters"][number],
  | "equipped_items"
  | "equipment_groups"
  | "inventory_items"
  | "inventory_groups"
  | "postmaster_items"
> & {
  equippedItemKeys: AccountItemEntityKey[];
  equipmentGroups: NormalizedEquipmentGroup[];
  inventoryItemKeys: AccountItemEntityKey[];
  inventoryGroups: NormalizedEquipmentGroup[];
  postmasterItemKeys: AccountItemEntityKey[];
};

type NormalizedAccountState = {
  account: Omit<AccountSummary, "characters" | "vault"> | null;
  characterIds: string[];
  charactersById: Record<string, NormalizedCharacter>;
  itemsByKey: Record<AccountItemEntityKey, AccountItemSummary>;
  itemKeyByInstanceId: Record<string, AccountItemEntityKey>;
  vault: {
    itemKeys: AccountItemEntityKey[];
    sampleItemKeys: AccountItemEntityKey[];
  };
  revision: number;
};

const emptyState: NormalizedAccountState = {
  account: null,
  characterIds: [],
  charactersById: {},
  itemsByKey: {},
  itemKeyByInstanceId: {},
  vault: { itemKeys: [], sampleItemKeys: [] },
  revision: 0
};

let state = emptyState;
let cachedSummaryState: NormalizedAccountState | null = null;
let cachedSummary: AccountSummary | null = null;
const listeners = new Set<() => void>();
const committedPatchesByInstanceId = new Map<string, AccountItemActionPatch>();

export function replaceAccountSummary(
  summary: AccountSummary | null,
  options: { requestStartedRevision?: number; authoritative?: boolean } = {}
): boolean {
  const startedBeforeCurrentState = options.requestStartedRevision !== undefined
    && options.requestStartedRevision < state.revision;
  if (summary
    && state.account
    && startedBeforeCurrentState
    && accountProfileVersion(summary) === 0) {
    return false;
  }
  if (summary && state.account && isOlderAccountSummary(summary, state.account)) return false;
  if (!summary) {
    committedPatchesByInstanceId.clear();
  }
  let next = summary ? normalizeAccountSummary(summary, state.revision + 1) : {
    ...emptyState,
    revision: state.revision + 1
  };
  if (summary) {
    for (const [instanceId, patch] of committedPatchesByInstanceId) {
      if (isAccountItemActionPatchReflected(summary, patch)) {
        committedPatchesByInstanceId.delete(instanceId);
      } else {
        next = applyPatch(next, patch);
      }
    }
  }
  state = next;
  emitChange();
  return true;
}

export function applyAccountEntityPatches(patches: readonly AccountItemActionPatch[]): void {
  if (!state.account || !patches.length) return;
  let next = state;
  for (const patch of patches) {
    next = applyPatch(next, patch);
  }
  if (next === state) return;
  state = { ...next, revision: state.revision + 1 };
  emitChange();
}

export function applyCommittedAccountEntityPatches(patches: readonly AccountItemActionPatch[]): void {
  if (!state.account || !patches.length) return;
  for (const patch of patches) clearConflictingCommittedPatches(patch);
  applyAccountEntityPatches(patches);
  for (const patch of patches) {
    committedPatchesByInstanceId.delete(patch.item_instance_id);
    committedPatchesByInstanceId.set(patch.item_instance_id, patch);
  }
}

export function confirmCommittedAccountEntityPatches(patches: readonly AccountItemActionPatch[]): void {
  for (const patch of patches) {
    const committedPatch = committedPatchesByInstanceId.get(patch.item_instance_id);
    if (isSameAccountItemActionPatch(committedPatch, patch)) {
      committedPatchesByInstanceId.delete(patch.item_instance_id);
    }
  }
}

export function getAccountSummarySnapshot(): AccountSummary | null {
  if (cachedSummaryState === state) return cachedSummary;
  cachedSummaryState = state;
  cachedSummary = denormalizeAccountSummary(state);
  return cachedSummary;
}

export function getAccountStoreRevision(): number {
  return state.revision;
}

export function getAccountItemEntity(instanceId: string): AccountItemSummary | undefined {
  const key = state.itemKeyByInstanceId[instanceId];
  return key ? state.itemsByKey[key] : undefined;
}

export function getAccountItemEntityCount(): number {
  return Object.keys(state.itemsByKey).length;
}

export function useAccountSummaryStore(): AccountSummary | null {
  return useAccountStoreSelector(selectAccountSummary);
}

export function useHasAccountDataStore(): boolean {
  return useAccountStoreSelector(selectHasAccountData);
}

export function useAccountStoreSelector<T>(
  selector: (summary: AccountSummary | null) => T,
  isEqual: (left: T, right: T) => boolean = Object.is
): T {
  const selectorRef = useRef(selector);
  const isEqualRef = useRef(isEqual);
  const cacheRef = useRef<{
    revision: number;
    selector: typeof selector;
    value: T;
  } | null>(null);
  selectorRef.current = selector;
  isEqualRef.current = isEqual;

  const getSelectedSnapshot = useCallback(() => {
    const currentSelector = selectorRef.current;
    const cached = cacheRef.current;
    if (cached?.revision === state.revision && cached.selector === currentSelector) {
      return cached.value;
    }

    const selected = currentSelector(getAccountSummarySnapshot());
    const value = cached && isEqualRef.current(cached.value, selected)
      ? cached.value
      : selected;
    cacheRef.current = {
      revision: state.revision,
      selector: currentSelector,
      value
    };
    return value;
  }, []);

  return useSyncExternalStore(subscribe, getSelectedSnapshot, getSelectedSnapshot);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function selectAccountSummary(summary: AccountSummary | null): AccountSummary | null {
  return summary;
}

function clearConflictingCommittedPatches(patch: AccountItemActionPatch): void {
  if (patch.kind !== "equip") return;
  const incomingKey = state.itemKeyByInstanceId[patch.item_instance_id];
  const incomingItem = incomingKey ? state.itemsByKey[incomingKey] : undefined;
  if (!incomingItem) return;
  for (const [instanceId, committedPatch] of committedPatchesByInstanceId) {
    if (committedPatch.kind !== "equip" || committedPatch.character_id !== patch.character_id) continue;
    const existingKey = state.itemKeyByInstanceId[instanceId];
    const existingItem = existingKey ? state.itemsByKey[existingKey] : undefined;
    if (!existingItem) continue;
    const sameSlot = incomingItem.bucket_hash !== undefined
      ? existingItem.bucket_hash === incomingItem.bucket_hash
      : incomingItem.group_key !== "other"
        && existingItem.group_key === incomingItem.group_key;
    if (sameSlot) {
      committedPatchesByInstanceId.delete(instanceId);
    }
  }
}

function isOlderAccountSummary(
  incoming: Pick<AccountSummary, "profile_minted_at">,
  current: Pick<AccountSummary, "profile_minted_at">
): boolean {
  const incomingVersion = accountProfileVersion(incoming);
  const currentVersion = accountProfileVersion(current);
  return incomingVersion > 0 && currentVersion > incomingVersion;
}

function accountProfileVersion(
  account: Pick<AccountSummary, "profile_minted_at"> | null
): number {
  if (!account?.profile_minted_at) return 0;
  const timestamp = Date.parse(account.profile_minted_at);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function isSameAccountItemActionPatch(
  left: AccountItemActionPatch | undefined,
  right: AccountItemActionPatch
): boolean {
  if (!left || left.kind !== right.kind || left.item_instance_id !== right.item_instance_id) return false;
  if (left.kind === "lock" && right.kind === "lock") return left.locked === right.locked;
  if (left.kind === "equip" && right.kind === "equip") return left.character_id === right.character_id;
  if (left.kind === "postmaster-pull" && right.kind === "postmaster-pull") {
    return left.character_id === right.character_id
      && left.source_bucket_hash === right.source_bucket_hash;
  }
  return left.kind === "transfer" && right.kind === "transfer"
    && left.character_id === right.character_id
    && left.target === right.target;
}

function selectHasAccountData(summary: AccountSummary | null): boolean {
  return summary !== null;
}

function emitChange(): void {
  cachedSummaryState = null;
  for (const listener of listeners) listener();
}

function normalizeAccountSummary(summary: AccountSummary, revision: number): NormalizedAccountState {
  const itemsByKey: Record<AccountItemEntityKey, AccountItemSummary> = {};
  const itemKeyByInstanceId: Record<string, AccountItemEntityKey> = {};
  const registerItems = (items: AccountItemSummary[], location: string): AccountItemEntityKey[] => {
    const occurrences = new Map<number, number>();
    return items.map((item) => {
      const occurrence = occurrences.get(item.hash) ?? 0;
      occurrences.set(item.hash, occurrence + 1);
      const key = createAccountItemEntityKey(item, location, occurrence);
      // The vault sample can contain the same instance as the full list. Keep the
      // first, authoritative entity instead of replacing it with a smaller copy.
      itemsByKey[key] ??= item;
      if (item.instance_id) itemKeyByInstanceId[item.instance_id] = key;
      return key;
    });
  };

  const vaultItemKeys = registerItems(summary.vault.items, "vault");
  const sampleItemKeys = registerItems(summary.vault.sample_items, "vault-sample");
  const charactersById: Record<string, NormalizedCharacter> = {};
  for (const character of summary.characters) {
    const equippedItemKeys = registerItems(character.equipped_items, `${character.character_id}:equipped`);
    const inventoryItemKeys = registerItems(character.inventory_items, `${character.character_id}:inventory`);
    const postmasterItemKeys = registerItems(character.postmaster_items, `${character.character_id}:postmaster`);
    const {
      equipped_items: _equippedItems,
      equipment_groups: equipmentGroups,
      inventory_items: _inventoryItems,
      inventory_groups: inventoryGroups,
      postmaster_items: _postmasterItems,
      ...characterData
    } = character;
    charactersById[character.character_id] = {
      ...characterData,
      equippedItemKeys,
      equipmentGroups: normalizeGroups(equipmentGroups),
      inventoryItemKeys,
      inventoryGroups: normalizeGroups(inventoryGroups),
      postmasterItemKeys
    };
  }

  const { characters: _characters, vault: _vault, ...account } = summary;
  return {
    account,
    characterIds: summary.characters.map((character) => character.character_id),
    charactersById,
    itemsByKey,
    itemKeyByInstanceId,
    vault: { itemKeys: vaultItemKeys, sampleItemKeys },
    revision
  };
}

function createAccountItemEntityKey(
  item: AccountItemSummary,
  location: string,
  occurrence: number
): AccountItemEntityKey {
  return item.instance_id
    ? `instance:${item.instance_id}`
    : `definition:${item.hash}:${location}:${occurrence}`;
}

function normalizeGroups(
  groups: CharacterEquipmentGroup[]
): NormalizedEquipmentGroup[] {
  return groups.map(({ items: _items, ...group }) => group);
}

function denormalizeAccountSummary(input: NormalizedAccountState): AccountSummary | null {
  if (!input.account) return null;
  const items = (keys: AccountItemEntityKey[]) => keys
    .map((key) => input.itemsByKey[key])
    .filter((item): item is AccountItemSummary => Boolean(item));
  return {
    ...input.account,
    characters: input.characterIds.flatMap((characterId) => {
      const character = input.charactersById[characterId];
      if (!character) return [];
      const {
        equippedItemKeys,
        equipmentGroups,
        inventoryItemKeys,
        inventoryGroups,
        postmasterItemKeys,
        ...characterData
      } = character;
      return [{
        ...characterData,
        equipped_items: items(equippedItemKeys),
        equipment_groups: denormalizeGroups(equipmentGroups, equippedItemKeys, input.itemsByKey),
        inventory_items: items(inventoryItemKeys),
        inventory_groups: denormalizeGroups(inventoryGroups, inventoryItemKeys, input.itemsByKey),
        postmaster_items: items(postmasterItemKeys)
      }];
    }),
    vault: {
      item_count: input.vault.itemKeys.length,
      items: items(input.vault.itemKeys),
      sample_items: items(input.vault.sampleItemKeys)
    }
  };
}

function denormalizeGroups(
  groups: NormalizedEquipmentGroup[],
  itemKeys: AccountItemEntityKey[],
  itemsByKey: Record<AccountItemEntityKey, AccountItemSummary>
): CharacterEquipmentGroup[] {
  return groups.map((group) => {
    const items = itemKeys
      .map((key) => itemsByKey[key])
      .filter((item) => item?.group_key === group.key)
      .filter((item): item is AccountItemSummary => Boolean(item));
    return {
      ...group,
      count: items.length,
      items
    };
  });
}

function applyPatch(
  input: NormalizedAccountState,
  patch: AccountItemActionPatch
): NormalizedAccountState {
  const itemKey = input.itemKeyByInstanceId[patch.item_instance_id];
  const item = itemKey ? input.itemsByKey[itemKey] : undefined;
  if (!itemKey || !item) return input;

  if (patch.kind === "lock") {
    if (item.locked === patch.locked) return input;
    return {
      ...input,
      itemsByKey: {
        ...input.itemsByKey,
        [itemKey]: { ...item, locked: patch.locked }
      }
    };
  }

  const targetCharacter = input.charactersById[patch.character_id];
  if (patch.kind !== "transfer" || patch.target !== "vault") {
    if (!targetCharacter) return input;
  }
  if (patch.kind === "equip" && item.bucket_hash === undefined) return input;

  const detached = detachItemKey(input, itemKey);
  const itemsByKey = { ...detached.itemsByKey };
  const movedItem = withEquippedState(item, patch.kind === "equip");
  itemsByKey[itemKey] = movedItem;

  if (patch.kind === "transfer" && patch.target === "vault") {
    return {
      ...detached,
      itemsByKey,
      vault: { ...detached.vault, itemKeys: [itemKey, ...detached.vault.itemKeys] }
    };
  }

  const charactersById = { ...detached.charactersById };
  const character = charactersById[patch.character_id];
  if (!character) return input;
  if (patch.kind === "transfer" || patch.kind === "postmaster-pull") {
    charactersById[patch.character_id] = {
      ...character,
      inventoryItemKeys: [itemKey, ...character.inventoryItemKeys]
    };
    return { ...detached, itemsByKey, charactersById };
  }

  const displacedKey = character.equippedItemKeys.find((key) => (
    detached.itemsByKey[key]?.bucket_hash === item.bucket_hash
  ));
  const equippedItemKeys = [
    itemKey,
    ...character.equippedItemKeys.filter((key) => key !== displacedKey)
  ];
  const inventoryItemKeys = displacedKey
    ? [displacedKey, ...character.inventoryItemKeys]
    : character.inventoryItemKeys;
  if (displacedKey && itemsByKey[displacedKey]) {
    itemsByKey[displacedKey] = withEquippedState(itemsByKey[displacedKey], false);
  }
  charactersById[patch.character_id] = {
    ...character,
    equippedItemKeys,
    inventoryItemKeys
  };
  return { ...detached, itemsByKey, charactersById };
}

function detachItemKey(
  input: NormalizedAccountState,
  itemKey: AccountItemEntityKey
): NormalizedAccountState {
  const charactersById = Object.fromEntries(
    Object.entries(input.charactersById).map(([characterId, character]) => [
      characterId,
      {
        ...character,
        equippedItemKeys: character.equippedItemKeys.filter((key) => key !== itemKey),
        inventoryItemKeys: character.inventoryItemKeys.filter((key) => key !== itemKey),
        postmasterItemKeys: character.postmasterItemKeys.filter((key) => key !== itemKey)
      }
    ])
  );
  return {
    ...input,
    charactersById,
    vault: {
      itemKeys: input.vault.itemKeys.filter((key) => key !== itemKey),
      sampleItemKeys: input.vault.sampleItemKeys.filter((key) => key !== itemKey)
    }
  };
}

function withEquippedState(item: AccountItemSummary, isEquipped: boolean): AccountItemSummary {
  return {
    ...item,
    instance: item.instance ? { ...item.instance, is_equipped: isEquipped } : item.instance
  };
}
