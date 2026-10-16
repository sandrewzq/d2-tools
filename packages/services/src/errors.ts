export type KnownServiceErrorCode =
  | "auth_required"
  | "network_failed"
  | "manifest_unavailable"
  | "local_data_unavailable"
  | "unknown";

export type ServiceErrorCode = KnownServiceErrorCode | (string & {});

export type ServiceErrorCauseCategory =
  | "validation"
  | "authentication"
  | "authorization"
  | "configuration"
  | "network"
  | "timeout"
  | "not-found"
  | "conflict"
  | "unavailable"
  | "storage"
  | "internal";

export type ServiceErrorDetails = Record<
  string,
  string | number | boolean | null
>;

export type ServiceError = {
  code: ServiceErrorCode;
  message: string;
  retryable?: boolean;
  causeCategory?: ServiceErrorCauseCategory;
  details?: ServiceErrorDetails;
  cause?: unknown;
};

export class D2ServiceError extends Error implements ServiceError {
  readonly code: ServiceErrorCode;
  readonly retryable?: boolean;
  readonly causeCategory?: ServiceErrorCauseCategory;
  readonly details?: ServiceErrorDetails;

  constructor(input: Omit<ServiceError, "cause"> & { cause?: unknown }) {
    super(input.message, input.cause === undefined ? undefined : { cause: input.cause });
    this.name = "D2ServiceError";
    this.code = input.code;
    this.retryable = input.retryable;
    this.causeCategory = input.causeCategory;
    this.details = input.details;
  }
}

export function createServiceError(input: Omit<ServiceError, "cause"> & { cause?: unknown }): D2ServiceError {
  return new D2ServiceError(input);
}

/**
 * 把任意抛出物归一化成 `ServiceError`。
 *
 * `fallbackMessage` 只在入参既不是 `Error` 也不是 `ServiceError` 时用到（例如 `throw null`）。
 * 这一层不产出产品文案：调用方要么给准确的上游文本，要么传空字符串，
 * 空 message 由渲染层按 copy 兜底（见 `formatAccountLoadFailure` 那一类）。
 * 排查靠 `code` 和 `causeCategory`，它们不受语言影响。
 */
export function toServiceError(error: unknown, fallbackMessage: string): ServiceError {
  if (isServiceError(error)) {
    return error;
  }

  return {
    code: "unknown",
    message: error instanceof Error ? error.message : fallbackMessage,
    cause: error
  };
}

export function isServiceError(error: unknown): error is ServiceError {
  return Boolean(
    error
      && typeof error === "object"
      && "code" in error
      && "message" in error
      && typeof error.code === "string"
      && typeof error.message === "string"
  );
}
