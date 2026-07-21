import {
  toServiceError,
  type ServiceError,
  type ServiceErrorCauseCategory,
  type ServiceErrorDetails
} from "@d2-tools/services";

export type DesktopIpcErrorCauseCategory = ServiceErrorCauseCategory;
export type DesktopIpcErrorDetails = ServiceErrorDetails;
export type DesktopIpcErrorPayload = ServiceError & { retryable: boolean };
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

export const classifyAccountIpcError = createDomainClassifier("ACCOUNT", "LOAD_FAILED");
export const classifyHomeBriefingIpcError = createDomainClassifier("HOME", "LOAD_FAILED");
export const classifyManifestIpcError = createDomainClassifier("MANIFEST", "OPERATION_FAILED");
export const classifyGameDataIpcError = createDomainClassifier("GAME_DATA", "QUERY_FAILED");
export const classifyWriteActionIpcError = createDomainClassifier("WRITE_ACTION", "FAILED");

function createDomainClassifier(domain: string, fallback: string): DesktopIpcErrorClassifier {
  return (error) => {
    const source = toServiceError(error, `${domain} 操作失败`);
    const suffix = suffixFor(source, fallback);
    return {
      code: `${domain}_${suffix}`,
      message: source.message,
      retryable: source.retryable ?? isRetryable(source.causeCategory),
      causeCategory: source.causeCategory ?? "internal",
      ...(source.details ? { details: source.details } : {})
    };
  };
}

function suffixFor(error: ServiceError, fallback: string): string {
  switch (error.code) {
    case "auth_required": return "AUTH_REQUIRED";
    case "bungie_api_key_missing": return "CONFIG_MISSING";
    case "manifest_unavailable": return "NOT_READY";
    case "bungie_timeout": return "TIMEOUT";
    case "bungie_network_failed": return "NETWORK_FAILED";
    default: break;
  }

  switch (error.causeCategory) {
    case "validation": return "INVALID";
    case "authentication": return "AUTH_REQUIRED";
    case "authorization": return "FORBIDDEN";
    case "configuration": return "CONFIG_MISSING";
    case "network": return "NETWORK_FAILED";
    case "timeout": return "TIMEOUT";
    case "not-found": return "NOT_FOUND";
    case "conflict": return "CONFLICT";
    case "unavailable": return "UNAVAILABLE";
    case "storage": return "STORAGE_FAILED";
    default: return fallback;
  }
}

function isRetryable(causeCategory: ServiceErrorCauseCategory | undefined): boolean {
  return causeCategory === "network"
    || causeCategory === "timeout"
    || causeCategory === "unavailable"
    || causeCategory === "conflict"
    || causeCategory === "storage";
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
    if (typeof parsed.code !== "string" || typeof parsed.message !== "string" || typeof parsed.retryable !== "boolean") {
      return null;
    }
    return parsed as DesktopIpcErrorPayload;
  } catch {
    return null;
  }
}
