import type { D2Config } from "@d2-tools/core/config/schema";
import type { BungieOAuthToken } from "@d2-tools/core/oauth/login";
import { postBungieJson } from "./client.js";

export type BungieItemActionOptions = {
  config: D2Config;
  token: BungieOAuthToken;
  membershipType: number;
  characterId: string;
  itemId: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

export type SetItemLockStateOptions = BungieItemActionOptions & { state: boolean };
export type EquipItemsOptions = Omit<BungieItemActionOptions, "itemId"> & { itemIds: string[] };
export type EquipItemResult = {
  itemInstanceId: string;
  equipStatus: number;
};
export type EquipItemsResult = {
  equipResults: EquipItemResult[];
};
export type TransferItemOptions = BungieItemActionOptions & { itemReferenceHash: number; transferToVault: boolean; stackSize?: number };
export type InsertSocketPlugOptions = BungieItemActionOptions & { socketIndex: number; plugHash: number };
export type PullFromPostmasterOptions = BungieItemActionOptions & { itemReferenceHash: number; stackSize?: number };
export type BungieLoadoutActionOptions = {
  config: D2Config;
  token: BungieOAuthToken;
  membershipType: number;
  characterId: string;
  loadoutIndex: number;
  nameHash?: number;
  iconHash?: number;
  colorHash?: number;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

export async function setItemLockState(options: SetItemLockStateOptions): Promise<void> {
  await postBungieJson<unknown>("/Destiny2/Actions/Items/SetLockState/", { state: options.state, itemId: options.itemId, characterId: options.characterId, membershipType: options.membershipType }, bungieWriteOptions(options));
}

export async function equipItem(options: BungieItemActionOptions): Promise<void> {
  await postBungieJson<unknown>("/Destiny2/Actions/Items/EquipItem/", { itemId: options.itemId, characterId: options.characterId, membershipType: options.membershipType }, bungieWriteOptions(options));
}

export async function equipItems(options: EquipItemsOptions): Promise<EquipItemsResult> {
  return postBungieJson<EquipItemsResult>("/Destiny2/Actions/Items/EquipItems/", { itemIds: options.itemIds, characterId: options.characterId, membershipType: options.membershipType }, bungieWriteOptions(options));
}

export async function transferItem(options: TransferItemOptions): Promise<void> {
  await postBungieJson<unknown>("/Destiny2/Actions/Items/TransferItem/", { itemReferenceHash: options.itemReferenceHash, stackSize: options.stackSize ?? 1, transferToVault: options.transferToVault, itemId: options.itemId, characterId: options.characterId, membershipType: options.membershipType }, bungieWriteOptions(options));
}

export async function insertSocketPlug(options: InsertSocketPlugOptions): Promise<void> {
  await postBungieJson<unknown>("/Destiny2/Actions/Items/InsertSocketPlugFree/", {
    itemId: options.itemId,
    plug: { socketIndex: options.socketIndex, socketArrayType: 0, plugItemHash: options.plugHash },
    characterId: options.characterId,
    membershipType: options.membershipType
  }, bungieWriteOptions(options));
}

export async function pullFromPostmaster(options: PullFromPostmasterOptions): Promise<void> {
  await postBungieJson<unknown>("/Destiny2/Actions/Items/PullFromPostmaster/", { itemReferenceHash: options.itemReferenceHash, stackSize: options.stackSize ?? 1, itemId: options.itemId, characterId: options.characterId, membershipType: options.membershipType }, bungieWriteOptions(options));
}

export async function equipLoadout(options: BungieLoadoutActionOptions): Promise<void> {
  await postBungieJson<unknown>("/Destiny2/Actions/Loadouts/EquipLoadout/", { characterId: options.characterId, membershipType: options.membershipType, loadoutIndex: options.loadoutIndex }, bungieWriteOptions(options));
}

export async function snapshotLoadout(options: BungieLoadoutActionOptions): Promise<void> {
  await postBungieJson<unknown>("/Destiny2/Actions/Loadouts/SnapshotLoadout/", {
    colorHash: options.colorHash ?? null,
    iconHash: options.iconHash ?? null,
    nameHash: options.nameHash ?? null,
    characterId: options.characterId,
    membershipType: options.membershipType,
    loadoutIndex: options.loadoutIndex
  }, bungieWriteOptions(options));
}

export async function clearLoadout(options: BungieLoadoutActionOptions): Promise<void> {
  await postBungieJson<unknown>("/Destiny2/Actions/Loadouts/ClearLoadout/", {
    characterId: options.characterId,
    membershipType: options.membershipType,
    loadoutIndex: options.loadoutIndex
  }, bungieWriteOptions(options));
}

export async function updateLoadoutIdentifiers(options: BungieLoadoutActionOptions): Promise<void> {
  await postBungieJson<unknown>("/Destiny2/Actions/Loadouts/UpdateLoadoutIdentifiers/", {
    colorHash: options.colorHash ?? null,
    iconHash: options.iconHash ?? null,
    nameHash: options.nameHash ?? null,
    characterId: options.characterId,
    membershipType: options.membershipType,
    loadoutIndex: options.loadoutIndex
  }, bungieWriteOptions(options));
}

function bungieWriteOptions(options: Pick<BungieItemActionOptions, "config" | "token" | "baseUrl" | "fetchImpl">) {
  return {
    apiKey: options.config.bungie.api_key,
    accessToken: options.token.access_token,
    baseUrl: options.baseUrl,
    fetchImpl: options.fetchImpl,
    signal: AbortSignal.timeout(45_000)
  };
}
