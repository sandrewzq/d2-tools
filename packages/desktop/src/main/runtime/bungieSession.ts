import {
  createBungieRequestBroker,
  createBungieSession,
  type BungieRequestBroker,
  type BungieRequestOptions,
  type BungieSession
} from "@d2-tools/services/bungie/session";

let state: {
  apiKey: string;
  broker: BungieRequestBroker;
  session: BungieSession;
} | null = null;

export function getSharedBungieSession(apiKey: string): BungieSession {
  return getState(apiKey).session;
}

export function fetchSharedBungieJson<T>(
  apiKey: string,
  path: string,
  accessToken?: string,
  options?: BungieRequestOptions
): Promise<T> {
  return getState(apiKey).broker.fetchJson<T>(path, accessToken, options);
}

export function resetSharedBungieSession(): void {
  state?.broker.clear();
  state = null;
}

function getState(apiKey: string) {
  if (state?.apiKey === apiKey) {
    return state;
  }
  state?.broker.clear();
  const broker = createBungieRequestBroker({ apiKey });
  const session = createBungieSession({
    apiKey,
    fetchJson: <T>(path: string, accessToken?: string) => (
      broker.fetchJson<T>(path, accessToken)
    )
  });
  state = { apiKey, broker, session };
  return state;
}
