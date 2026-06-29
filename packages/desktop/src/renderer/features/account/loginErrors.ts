const IPC_ERROR_PREFIX = /^Error invoking remote method '[^']+':\s*(?:Error:\s*)?/;

export function formatBungieLoginError(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : String(error ?? "");
  const message = rawMessage.replace(IPC_ERROR_PREFIX, "").trim();

  return message || "Bungie 登录失败，请稍后重试";
}
