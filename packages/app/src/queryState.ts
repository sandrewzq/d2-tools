import { toServiceError, type ServiceError } from "@d2-tools/services/errors";

export type QueryState<TData> =
  | { status: "idle"; data: null; error: null }
  | { status: "loading"; data: TData | null; error: null }
  | { status: "success"; data: TData; error: null }
  | { status: "error"; data: TData | null; error: ServiceError };

export const idleQuery = <TData>(): QueryState<TData> => ({
  status: "idle",
  data: null,
  error: null
});

/**
 * 归一化查询失败。兜底文案留空：这一层不知道界面语言，
 * 空 message 由渲染层按 copy 兜底，不让中文从领域层漏到英文界面。
 */
export async function runQuery<TData>(loader: () => Promise<TData>): Promise<QueryState<TData>> {
  try {
    return {
      status: "success",
      data: await loader(),
      error: null
    };
  } catch (error) {
    return {
      status: "error",
      data: null,
      error: toServiceError(error, "")
    };
  }
}
