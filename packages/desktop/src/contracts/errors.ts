import type {
  ServiceError,
  ServiceErrorCauseCategory,
  ServiceErrorDetails
} from "@d2-tools/services";

export type DesktopIpcErrorCauseCategory = ServiceErrorCauseCategory;

export type DesktopIpcErrorDetails = ServiceErrorDetails;

export type DesktopIpcErrorPayload = ServiceError & {
  retryable: boolean;
};

export type DesktopIpcErrorClassifier = (error: unknown) => DesktopIpcErrorPayload;

const transportPrefix = "D2_IPC_ERROR:";

export async function encodeDesktopIpcFailure<TResult>(
  operation: () => TResult | Promise<TResult>,
  classify: DesktopIpcErrorClassifier
): Promise<TResult> {
  try {
    return await operation();
  } catch (error) {
    if (readDesktopIpcErrorPayload(error)) throw error;
    throw createDesktopIpcTransportError(classify(error));
  }
}

export function classifyAccountIpcError(error: unknown): DesktopIpcErrorPayload {
  const message = errorMessage(error, "账号数据读取失败");
  if (includesAny(message, ["请先登录 Bungie", "access token is required"])) {
    return payload("ACCOUNT_AUTH_REQUIRED", message, false, "authentication");
  }
  if (includesAny(message, ["登录已过期", "token 刷新失败", "重新登录"])) {
    return payload("ACCOUNT_AUTH_EXPIRED", message, false, "authentication");
  }
  if (message.includes("装备实例 ID 无效")) {
    return payload("ACCOUNT_ITEM_ID_INVALID", message, false, "validation");
  }
  if (includesAny(message, ["当前账号快照中找不到", "没有 Destiny 档案"])) {
    return payload("ACCOUNT_ITEM_NOT_FOUND", message, true, "not-found");
  }
  if (isTimeoutMessage(message)) {
    return payload("ACCOUNT_TIMEOUT", message, true, "timeout");
  }
  if (isNetworkMessage(message)) {
    return payload("ACCOUNT_NETWORK_FAILED", message, true, "network");
  }
  return payload("ACCOUNT_LOAD_FAILED", message, true, "internal");
}

export function classifyManifestIpcError(error: unknown): DesktopIpcErrorPayload {
  const message = errorMessage(error, "资料库操作失败");
  if (includesAny(message, ["缺少 Bungie API Key", "配置 Bungie API Key"])) {
    return payload("MANIFEST_CONFIG_MISSING", message, false, "configuration");
  }
  if (includesAny(message, ["空间不足", "ENOSPC"])) {
    return payload("MANIFEST_DISK_SPACE_INSUFFICIENT", message, false, "storage");
  }
  if (includesAny(message, ["资料库正在更新", "尚未就绪", "未初始化"])) {
    return payload("MANIFEST_NOT_READY", message, true, "unavailable");
  }
  if (includesAny(message, ["回滚", "验证失败", "repair", "损坏"])) {
    return payload("MANIFEST_ACTIVATION_FAILED", message, true, "storage");
  }
  if (isTimeoutMessage(message)) {
    return payload("MANIFEST_TIMEOUT", message, true, "timeout");
  }
  if (isNetworkMessage(message)) {
    return payload("MANIFEST_NETWORK_FAILED", message, true, "network");
  }
  return payload("MANIFEST_OPERATION_FAILED", message, true, "internal");
}

export function classifyGameDataIpcError(error: unknown): DesktopIpcErrorPayload {
  const message = errorMessage(error, "资料库查询失败");
  if (message.includes("资料库正在更新")) {
    return payload("GAME_DATA_UPDATING", message, true, "unavailable");
  }
  if (includesAny(message, ["尚未就绪", "未初始化"])) {
    return payload("GAME_DATA_NOT_READY", message, true, "unavailable");
  }
  if (includesAny(message, ["worker 已关闭", "worker 已退出", "worker 异常退出"])) {
    return payload("GAME_DATA_WORKER_UNAVAILABLE", message, true, "unavailable");
  }
  if (message.includes("未知资料库查询操作")) {
    return payload("GAME_DATA_OPERATION_INVALID", message, false, "validation");
  }
  if (includesAny(message, ["未找到物品详情", "找不到物品详情"])) {
    return payload("GAME_DATA_ITEM_NOT_FOUND", message, false, "not-found");
  }
  if (isTimeoutMessage(message)) {
    return payload("GAME_DATA_TIMEOUT", message, true, "timeout");
  }
  if (isNetworkMessage(message)) {
    return payload("GAME_DATA_NETWORK_FAILED", message, true, "network");
  }
  return payload("GAME_DATA_QUERY_FAILED", message, true, "internal");
}

export function classifyWriteActionIpcError(error: unknown): DesktopIpcErrorPayload {
  const rawMessage = errorMessage(error, "Bungie 写操作失败");
  if (rawMessage.includes("写操作未开启")) {
    return payload("WRITE_ACTION_DISABLED", rawMessage, false, "configuration");
  }
  if (includesAny(rawMessage, ["DestinyItemActionForbidden", "MoveEquipDestinyItems", "scope"])) {
    const message = rawMessage.includes("MoveEquipDestinyItems")
      ? rawMessage
      : `${rawMessage}。请确认 Bungie App 已勾选 MoveEquipDestinyItems，然后重新登录。`;
    return payload("WRITE_ACTION_FORBIDDEN", message, false, "authorization");
  }
  if (includesAny(rawMessage, ["请先登录 Bungie", "登录已过期", "token 刷新失败", "重新登录"])) {
    return payload("WRITE_ACTION_AUTH_REQUIRED", rawMessage, false, "authentication");
  }
  if (includesAny(rawMessage, ["找不到", "不存在", "不可用", "状态已变化"])) {
    return payload("WRITE_ACTION_ITEM_UNAVAILABLE", rawMessage, true, "conflict");
  }
  if (isTimeoutMessage(rawMessage)) {
    return payload("WRITE_ACTION_TIMEOUT", rawMessage, true, "timeout");
  }
  if (isNetworkMessage(rawMessage)) {
    return payload("WRITE_ACTION_NETWORK_FAILED", rawMessage, true, "network");
  }
  return payload("WRITE_ACTION_FAILED", rawMessage, true, "internal");
}

function createDesktopIpcTransportError(payload: DesktopIpcErrorPayload): Error {
  return new Error(`${transportPrefix}${encodeURIComponent(JSON.stringify(payload))}`);
}

function readDesktopIpcErrorPayload(error: unknown): DesktopIpcErrorPayload | null {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const markerIndex = message.indexOf(transportPrefix);
  if (markerIndex < 0) return null;
  try {
    const encoded = message.slice(markerIndex + transportPrefix.length).trim();
    const parsed = JSON.parse(decodeURIComponent(encoded)) as Partial<DesktopIpcErrorPayload>;
    if (typeof parsed.code !== "string"
      || typeof parsed.message !== "string"
      || typeof parsed.retryable !== "boolean") {
      return null;
    }
    return parsed as DesktopIpcErrorPayload;
  } catch {
    return null;
  }
}

function payload(
  code: string,
  message: string,
  retryable: boolean,
  causeCategory: DesktopIpcErrorCauseCategory
): DesktopIpcErrorPayload {
  return { code, message, retryable, causeCategory };
}

function errorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message
    .replace(/^Error invoking remote method '[^']+':\s*/i, "")
    .replace(/^Error:\s*/i, "")
    .trim() || fallback;
}

function includesAny(message: string, values: readonly string[]): boolean {
  const normalized = message.toLowerCase();
  return values.some((value) => normalized.includes(value.toLowerCase()));
}

function isTimeoutMessage(message: string): boolean {
  return includesAny(message, ["超时", "timeout", "timed out"]);
}

function isNetworkMessage(message: string): boolean {
  return includesAny(message, [
    "fetch failed",
    "network",
    "ECONN",
    "ENOTFOUND",
    "EAI_AGAIN",
    "socket hang up"
  ]);
}
