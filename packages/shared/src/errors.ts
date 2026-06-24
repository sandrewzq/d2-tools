export type AppErrorCode =
  | "platform.unavailable"
  | "platform.permission_denied"
  | "data.read_failed"
  | "data.write_failed"
  | "auth.failed"
  | "manifest.refresh_failed"
  | "ai.request_failed";

export interface AppError {
  readonly code: AppErrorCode;
  readonly message: string;
  readonly cause?: unknown;
}

export function createAppError(
  code: AppErrorCode,
  message: string,
  cause?: unknown
): AppError {
  return cause === undefined ? { code, message } : { code, message, cause };
}
