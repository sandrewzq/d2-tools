import type {
  AccountItemDetail,
  AccountItemDetailQuery,
  AccountSnapshot
} from "@d2-tools/core/account/summary";
import {
  createAccountSession,
  type AccountInvalidation,
  type AccountItemPatch,
  type AccountSession
} from "@d2-tools/services/account/session";
import type { BungieRequestOptions } from "@d2-tools/services/bungie/session";
import {
  loadCachedAccountSnapshot,
  saveCachedAccountSnapshot
} from "@d2-tools/services/account/snapshotStore";
import { loadConfig } from "@d2-tools/services/config/store";
import { loadOAuthToken } from "@d2-tools/services/oauth/tokenStore";
import { loadFreshOAuthToken } from "../ipc/authSession.js";
import { fetchSharedBungieJson } from "./bungieSession.js";
import { getDefinitions } from "./gameDataRuntime.js";
import { measureRuntime } from "./runtimeMetrics.js";
import { createAccountDefinitionLoader } from "./accountDefinitions.js";

let sessionState: {
  key: string;
  session: AccountSession;
} | null = null;
let sessionRequest: Promise<AccountSession> | null = null;
const loadAccountDefinitions = createAccountDefinitionLoader(getDefinitions);

export async function getAccountSnapshot(
  freshness: "cached" | "refresh" = "cached"
): Promise<AccountSnapshot> {
  const session = await getAccountSession();
  return measureRuntime<AccountSnapshot>(
    "account.snapshot",
    () => session.getSnapshot({ freshness }),
    { measurePayload: true }
  );
}

export async function warmAccountSession(): Promise<boolean> {
  const config = loadConfig();
  if (!loadOAuthToken(config.data.data_dir)?.membership_id) return false;
  await getAccountSession();
  return true;
}

export async function getAccountItemDetail(
  query: AccountItemDetailQuery
): Promise<AccountItemDetail> {
  const session = await getAccountSession();
  return measureRuntime<AccountItemDetail>(
    "account.item-detail",
    () => session.getItemDetail(query),
    { measurePayload: true }
  );
}

export async function patchAccountSession(patch: AccountItemPatch): Promise<void> {
  const session = await getAccountSession();
  session.patch(patch);
}

export async function invalidateAccountSession(input: AccountInvalidation): Promise<void> {
  const session = await getAccountSession();
  session.invalidate(input);
}

export function resetAccountSession(): void {
  sessionState = null;
  sessionRequest = null;
}

async function getAccountSession(): Promise<AccountSession> {
  const config = loadConfig();
  const key = [
    config.data.data_dir,
    config.data.manifest_language,
    config.bungie.api_key,
    config.bungie.client_id
  ].join("\u0000");
  if (sessionState?.key === key) {
    return sessionState.session;
  }
  if (sessionRequest) {
    return sessionRequest;
  }

  const request = (async () => {
    const storedToken = loadOAuthToken(config.data.data_dir);
    let activeAccountId = storedToken?.membership_id;
    const cached = activeAccountId
      ? await loadCachedAccountSnapshot(config.data.data_dir, { accountId: activeAccountId })
      : null;
    const session = createAccountSession({
      apiKey: config.bungie.api_key,
      getAccessToken: async () => {
        const token = await loadFreshOAuthToken(loadConfig());
        activeAccountId = token.membership_id;
        return token.access_token;
      },
      fetchJson: <T>(
        path: string,
        accessToken: string,
        requestOptions?: BungieRequestOptions
      ) => fetchSharedBungieJson<T>(
        config.bungie.api_key,
        path,
        accessToken,
        requestOptions
      ),
      loadDefinitions: loadAccountDefinitions,
      initialSnapshot: cached?.snapshot,
      onSnapshot: async (snapshot) => {
        if (!activeAccountId) return;
        await saveCachedAccountSnapshot(config.data.data_dir, snapshot, new Date(), {
          accountId: activeAccountId
        });
      }
    });
    sessionState = { key, session };
    return session;
  })();
  sessionRequest = request;
  try {
    return await request;
  } finally {
    if (sessionRequest === request) sessionRequest = null;
  }
}
