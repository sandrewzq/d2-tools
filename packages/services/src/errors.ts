export type ServiceErrorCode =
  | "auth_required"
  | "network_failed"
  | "manifest_unavailable"
  | "local_data_unavailable"
  | "unknown";

export type ServiceError = {
  code: ServiceErrorCode;
  message: string;
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
  );
}
