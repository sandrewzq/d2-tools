/**
 * 账号数据资源的生命周期状态。
 *
 * `cached` 表示已有本地数据且仍在新鲜窗口内；`ready` 表示本次已从远端
 * 校验/获取（或完成本地与远端合并）；`stale` 表示仍可展示但超过了
 * `staleAt`。`loading` 只用于没有可展示数据的首次读取，已有数据在后台
 * 更新时应使用 `refreshing`，避免页面被清空。
 */
export type DataResourceStatus =
  | "unavailable"
  | "cached"
  | "stale"
  | "loading"
  | "refreshing"
  | "ready"
  | "error";

export type DataResourceSource = "local" | "remote" | "merged";

export type DataResourceError = {
  code: string;
  message: string;
};

/**
 * 跨页面共享的数据资源包装器。
 *
 * 时间统一使用 ISO 字符串，便于持久化和跨进程传输。`data` 为 null 时
 * 表示当前没有可展示的数据；后台刷新不应把已有 data 改成 null。
 */
export type DataResource<T> = {
  data: T | null;
  status: DataResourceStatus;
  fetchedAt?: string;
  staleAt?: string;
  source: DataResourceSource;
  error?: DataResourceError;
};

/** 用于计算资源状态的输入，不包含需要由 helper 计算的 status。 */
export type DataResourceStateInput<T> = {
  data: T | null;
  source: DataResourceSource;
  fetchedAt?: string;
  staleAt?: string;
  /** 首次加载中（此时通常没有 data）。 */
  loading?: boolean;
  /** 已有 data，正在后台刷新。 */
  refreshing?: boolean;
  /** 明确知道该资源当前不可用，例如账号尚未连接。 */
  unavailable?: boolean;
  error?: DataResourceError;
};

/**
 * 根据缓存时间判断资源是否已经过期。
 *
 * 缺少有效的 `staleAt` 时，如果 `fetchedAt` 也无效，则按保守策略视为
 * 过期；这样不会把没有任何时间凭据的旧数据误当成最新数据。
 */
export function isDataResourceStale(
  input: Pick<DataResource<unknown>, "fetchedAt" | "staleAt">,
  now: number | Date = Date.now()
): boolean {
  const nowMs = toTimestamp(now);
  if (nowMs === undefined) return true;

  const staleAtMs = toTimestamp(input.staleAt);
  if (staleAtMs !== undefined) return nowMs >= staleAtMs;

  // An explicitly supplied but malformed expiry must not make old data look
  // fresh forever. Treat it as stale and let the caller revalidate.
  if (input.staleAt !== undefined) return true;

  return toTimestamp(input.fetchedAt) === undefined;
}

/**
 * 纯函数：由资源元数据推导当前展示状态。
 *
 * 状态优先级：不可用/错误 → 首次加载或后台刷新 → 过期 → 本地缓存/已就绪。
 * 有 data 且刷新失败时返回 `stale`，让 UI 保留旧内容并提供重试，而不是
 * 用错误页覆盖用户仍可使用的数据。
 */
export function getDataResourceStatus<T>(
  input: DataResourceStateInput<T>,
  now: number | Date = Date.now()
): DataResourceStatus {
  const hasData = input.data !== null;

  if (input.unavailable && !hasData) return "unavailable";
  if (input.loading && !hasData) return "loading";
  if (input.refreshing && hasData) return "refreshing";
  if (input.error && !hasData) return "error";
  if (!hasData) return "unavailable";

  if (isDataResourceStale(input, now)) return "stale";
  return input.source === "local" ? "cached" : "ready";
}

/**
 * 创建带有推导状态的资源对象，供 repository / adapter 复用。
 */
export function createDataResource<T>(
  input: DataResourceStateInput<T>,
  now: number | Date = Date.now()
): DataResource<T> {
  const { loading, refreshing, unavailable, ...resource } = input;
  return {
    ...resource,
    status: getDataResourceStatus(input, now)
  };
}

function toTimestamp(value: string | number | Date | undefined): number | undefined {
  if (value === undefined) return undefined;
  const timestamp = value instanceof Date
    ? value.getTime()
    : typeof value === "number"
      ? value
      : Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}
