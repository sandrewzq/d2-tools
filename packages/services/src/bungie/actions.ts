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

/**
 * 写响应里带回的「这次写之后服务器认为这件装备长什么样」。
 *
 * DIM 把这一截当权威用（`advanced-write-actions.ts` 的 `refreshItemAfterAWA` 配
 * `makeItemSingle`：拿插入 Plug 的响应体重建本地 item，不做任何读回确认）。本仓只把它当
 * **旁证**，不当权威 —— 实测这套读路径会陈旧几分钟（2026-09-18：受理后 6 次读回全是旧值，
 * 3 分 32 秒才见到新值），没有证据说明写响应体走的是另一条更新的路径。
 *
 * 所以分工是：**显示按写入意图落地**（确定、可测、不会把用户刚选的 Perk 弹回旧的），
 * **响应体用来对账** —— 逐槽比对意图与服务器回的 `plugHash`，不一致就留一条
 * `socket-plug-response-mismatch`。那是「受理但被静默拒绝」唯一的第一手证据（见 T80）。
 *
 * `socket_plugs` 为 `null` 表示 Bungie 没回这一截、或响应形状不是这一版 —— 调用方据此跳过
 * 对账。**解析绝不抛异常**：写已经成功了，不能因为读不懂响应体把它报成失败。
 */
export type SocketPlugWriteOutcome = {
  instance_id: string | null;
  socket_plugs: { socket_index: number; plug_hash: number }[] | null;
};

export async function insertSocketPlug(options: InsertSocketPlugOptions): Promise<SocketPlugWriteOutcome> {
  const response = await postBungieJson<unknown>("/Destiny2/Actions/Items/InsertSocketPlugFree/", {
    itemId: options.itemId,
    plug: { socketIndex: options.socketIndex, socketArrayType: 0, plugItemHash: options.plugHash },
    characterId: options.characterId,
    membershipType: options.membershipType
  }, bungieWriteOptions(options));
  return readSocketPlugWriteOutcome(response);
}

/**
 * 从写响应体里抠出逐槽 `plugHash`。
 *
 * Bungie 的形状是 `{ item: { data: { itemInstanceId }, sockets: { data: { sockets: [...] } } } }`，
 * 每个槽是 `{ socketIndex, plugHash, isEnabled, isVisible }`。这里全部按 `unknown` 逐层防守：
 * 任何一层不是预期形状就返回 `null`，让调用方回落到写入意图，而不是抛异常或编一份假数据。
 */
export function readSocketPlugWriteOutcome(response: unknown): SocketPlugWriteOutcome {
  const item = asRecord(asRecord(response)?.item);
  const instanceId = asRecord(item?.data)?.itemInstanceId;
  const rawSockets = asRecord(asRecord(item?.sockets)?.data)?.sockets;
  if (!Array.isArray(rawSockets)) {
    return { instance_id: typeof instanceId === "string" ? instanceId : null, socket_plugs: null };
  }
  const socketPlugs: { socket_index: number; plug_hash: number }[] = [];
  for (const rawSocket of rawSockets) {
    const socket = asRecord(rawSocket);
    const socketIndex = socket?.socketIndex;
    const plugHash = socket?.plugHash;
    if (typeof socketIndex !== "number" || typeof plugHash !== "number") continue;
    socketPlugs.push({ socket_index: socketIndex, plug_hash: plugHash });
  }
  return {
    instance_id: typeof instanceId === "string" ? instanceId : null,
    socket_plugs: socketPlugs.length ? socketPlugs : null
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
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
