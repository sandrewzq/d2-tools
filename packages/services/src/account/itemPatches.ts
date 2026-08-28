import type { AccountItemSnapshot, AccountSnapshot } from "@d2-tools/core/account/summary";

export type AccountItemPatch =
  | { kind: "lock"; item_instance_id: string; locked: boolean }
  | { kind: "equip"; item_instance_id: string; character_id: string }
  | { kind: "transfer"; item_instance_id: string; character_id: string; target: "vault" | "character-inventory" }
  | {
      kind: "postmaster-pull";
      item_instance_id: string;
      character_id: string;
      source_bucket_hash?: number;
    };

export function applyAccountItemPatch(snapshot: AccountSnapshot, patch: AccountItemPatch): AccountSnapshot {
  const next = cloneSnapshotCollections(snapshot);
  if (patch.kind === "lock") {
    visitItems(next, (item) => {
      if (item.instance_id === patch.item_instance_id) item.locked = patch.locked;
    });
    return next;
  }

  const targetCharacter = patch.kind === "transfer" && patch.target === "vault"
    ? undefined
    : findCharacter(next, patch.character_id);
  if (patch.kind !== "transfer" || patch.target !== "vault") {
    if (!targetCharacter) return next;
  }

  const item = detachItem(next, patch.item_instance_id);
  if (!item) return next;
  if (patch.kind === "transfer") {
    setEquipped(item, false);
    if (patch.target === "vault") next.vault.items.push(item);
    else targetCharacter?.inventory_items.push(item);
    next.vault.item_count = next.vault.items.length;
    return next;
  }

  const character = targetCharacter;
  if (!character) return next;
  if (patch.kind === "postmaster-pull") {
    setEquipped(item, false);
    character.inventory_items.push(item);
    next.vault.item_count = next.vault.items.length;
    return next;
  }

  const displaced = character.equipped_items.find((candidate) => (
    candidate.bucket_hash !== undefined && candidate.bucket_hash === item.bucket_hash
  ));
  if (displaced) {
    character.equipped_items = character.equipped_items.filter((candidate) => candidate !== displaced);
    setEquipped(displaced, false);
    character.inventory_items.push(displaced);
  }
  setEquipped(item, true);
  character.equipped_items.push(item);
  next.vault.item_count = next.vault.items.length;
  return next;
}

export function isAccountItemPatchReflected(snapshot: AccountSnapshot, patch: AccountItemPatch): boolean {
  if (patch.kind === "lock") return findItem(snapshot, patch.item_instance_id)?.locked === patch.locked;
  if (patch.kind === "equip") {
    return findCharacter(snapshot, patch.character_id)?.equipped_items
      .some((item) => item.instance_id === patch.item_instance_id) ?? false;
  }
  if (patch.kind === "postmaster-pull") {
    return findCharacter(snapshot, patch.character_id)?.inventory_items
      .some((item) => item.instance_id === patch.item_instance_id) ?? false;
  }
  if (patch.target === "vault") return snapshot.vault.items.some((item) => item.instance_id === patch.item_instance_id);
  return findCharacter(snapshot, patch.character_id)?.inventory_items
    .some((item) => item.instance_id === patch.item_instance_id) ?? false;
}

function findItem(snapshot: AccountSnapshot, instanceId: string): AccountItemSnapshot | undefined {
  const vaultItem = snapshot.vault.items.find((item) => item.instance_id === instanceId);
  if (vaultItem) return vaultItem;
  for (const character of snapshot.characters) {
    const item = character.equipped_items.find((candidate) => candidate.instance_id === instanceId)
      ?? character.inventory_items.find((candidate) => candidate.instance_id === instanceId)
      ?? character.postmaster_items.find((candidate) => candidate.instance_id === instanceId);
    if (item) return item;
  }
}

function cloneSnapshotCollections(snapshot: AccountSnapshot): AccountSnapshot {
  return {
    ...snapshot,
    vault: { ...snapshot.vault, items: snapshot.vault.items.map(cloneItem) },
    characters: snapshot.characters.map((character) => ({
      ...character,
      equipped_items: character.equipped_items.map(cloneItem),
      inventory_items: character.inventory_items.map(cloneItem),
      postmaster_items: character.postmaster_items.map(cloneItem)
    }))
  };
}

function cloneItem(item: AccountItemSnapshot): AccountItemSnapshot {
  return { ...item, ...(item.instance ? { instance: { ...item.instance } } : {}) };
}

function visitItems(snapshot: AccountSnapshot, visitor: (item: AccountItemSnapshot) => void): void {
  for (const item of snapshot.vault.items) visitor(item);
  for (const character of snapshot.characters) {
    for (const item of character.equipped_items) visitor(item);
    for (const item of character.inventory_items) visitor(item);
    for (const item of character.postmaster_items) visitor(item);
  }
}

function detachItem(snapshot: AccountSnapshot, instanceId: string): AccountItemSnapshot | undefined {
  const vaultItem = takeItem(snapshot.vault.items, instanceId);
  if (vaultItem) return vaultItem;
  for (const character of snapshot.characters) {
    const item = takeItem(character.equipped_items, instanceId)
      ?? takeItem(character.inventory_items, instanceId)
      ?? takeItem(character.postmaster_items, instanceId);
    if (item) return item;
  }
}

function takeItem(items: AccountItemSnapshot[], instanceId: string): AccountItemSnapshot | undefined {
  const index = items.findIndex((item) => item.instance_id === instanceId);
  return index < 0 ? undefined : items.splice(index, 1)[0];
}

function findCharacter(snapshot: AccountSnapshot, characterId: string) {
  return snapshot.characters.find((character) => character.character_id === characterId);
}

function setEquipped(item: AccountItemSnapshot, equipped: boolean): void {
  item.instance = { ...item.instance, is_equipped: equipped };
}
