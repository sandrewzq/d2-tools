const secretKeys = new Set([
  "api_key",
  "client_secret",
  "access_token",
  "refresh_token",
  "AI_API_KEY",
  "BUNGIE_API_KEY",
  "BUNGIE_CLIENT_SECRET"
]);

export function redactSecrets<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        secretKeys.has(key) ? "[REDACTED]" : redactSecrets(nested)
      ])
    ) as T;
  }

  return value;
}
