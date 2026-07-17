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

export function toServiceError(error: unknown, fallbackMessage = "操作失败"): ServiceError {
  if (isServiceError(error)) {
    return error;
  }

  return {
    code: "unknown",
    message: error instanceof Error ? error.message : fallbackMessage,
    cause: error
  };
}

function isServiceError(error: unknown): error is ServiceError {
  return Boolean(
    error
      && typeof error === "object"
      && "code" in error
      && "message" in error
      && typeof error.code === "string"
      && typeof error.message === "string"
  );
}
