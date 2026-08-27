import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../api/client";
import type {
  AccountItemDetail,
  AccountSnapshot,
  DataResource,
  DataResourceError,
  DataResourceStatus
} from "../../api/types";

type AccountResourceMap = {
  snapshot: AccountSnapshot;
  "item-detail": AccountItemDetail;
};

export type UseAccountResourceOptions<K extends keyof AccountResourceMap> = {
  kind: K;
  instanceId?: K extends "item-detail" ? string : never;
  enabled?: boolean;
  /** 资源身份变化时触发一次本地优先读取。 */
  resourceKey?: string | number;
};

export type UseAccountResourceResult<T> = {
  resource: DataResource<T> | null;
  data: T | null;
  status: DataResourceStatus;
  error: DataResourceError | undefined;
  refresh: () => Promise<DataResource<T> | null>;
};

/**
 * Renderer 侧统一账号资源读取入口。
 *
 * IPC 返回的 DataResource 会保留本地缓存、过期和后台刷新状态；刷新时
 * 不会先清空旧 data，因此页面可以继续展示旧内容并明确标记状态。
 */
export function useAccountResource<K extends keyof AccountResourceMap>(
  options: UseAccountResourceOptions<K>
): UseAccountResourceResult<AccountResourceMap[K]> {
  const { kind, instanceId, enabled = true, resourceKey } = options;
  const [resource, setResource] = useState<DataResource<AccountResourceMap[K]> | null>(null);
  const requestSequenceRef = useRef(0);
  const mountedRef = useRef(true);
  const resourceRef = useRef<DataResource<AccountResourceMap[K]> | null>(null);
  resourceRef.current = resource;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async (force: boolean): Promise<DataResource<AccountResourceMap[K]> | null> => {
    if (!enabled || (kind === "item-detail" && !instanceId)) {
      if (mountedRef.current) setResource(null);
      return null;
    }

    const sequence = ++requestSequenceRef.current;
    if (force && resourceRef.current?.data && mountedRef.current) {
      setResource((current) => current ? { ...current, status: "refreshing" } : current);
    }

    try {
      const next = (kind === "snapshot"
        ? await api.getAccountSnapshotResource(force ? { force: true } : undefined)
        : await api.getAccountItemDetailResource(instanceId as string, force ? { force: true } : undefined)) as DataResource<AccountResourceMap[K]>;
      if (mountedRef.current && sequence === requestSequenceRef.current) setResource(next);
      return next;
    } catch (cause) {
      if (!mountedRef.current || sequence !== requestSequenceRef.current) return null;
      const error: DataResourceError = {
        code: typeof cause === "object" && cause && "code" in cause && typeof cause.code === "string"
          ? cause.code
          : "account_resource_unavailable",
        message: cause instanceof Error ? cause.message : "账号数据暂时不可用"
      };
      setResource((current) => current?.data
        ? {
            ...current,
            status: "stale",
            error,
            staleAt: new Date().toISOString()
          }
        : {
            data: null,
            status: "error",
            source: "local",
            error
          } as DataResource<AccountResourceMap[K]>);
      return null;
    }
  }, [enabled, instanceId, kind]);

  useEffect(() => {
    requestSequenceRef.current += 1;
    if (!enabled || (kind === "item-detail" && !instanceId)) {
      setResource(null);
      return;
    }
    void load(false);
  }, [enabled, instanceId, kind, load, resourceKey]);

  const refresh = useCallback(() => load(true), [load]);
  const status = resource?.status ?? (enabled && (kind !== "item-detail" || instanceId) ? "loading" : "unavailable");

  return {
    resource,
    data: resource?.data ?? null,
    status,
    error: resource?.error,
    refresh
  };
}
