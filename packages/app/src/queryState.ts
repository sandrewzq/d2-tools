import { toServiceError, type ServiceError } from "@d2-tools/services";

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
      error: toServiceError(error)
    };
  }
}
