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

export type AccountItemLocation = {
  kind: "vault" | "character" | "postmaster";
  characterId?: string;
};

export async function getAccountSnapshot(
  freshness: "cached" | "refresh" = "cached",
  options: { authoritative?: boolean } = {}
): Promise<AccountSnapshot> {
  const session = await getAccountSession();
  return measureRuntime<AccountSnapshot>(
    "account.snapshot",
    () => session.getSnapshot({
      freshness,
      ...(options.authoritative ? { authoritative: true } : {})
    }),
    { measurePayload: true }
  );
}

export async function warmAccountSession(): Promise<boolean> {
  const config = loadConfig();
  if (!loadOAuthToken(config.data.data_dir)?.membership_id) return false;
  await getAccountSession();
  return true;
}

export async function getAccountItemDetailByInstanceId(
  instanceId: string,
  freshness: "cached" | "refresh" = "cached"
): Promise<AccountItemDetail> {
  const session = await getAccountSession();
  let snapshot = await session.getSnapshot({ freshness: "cached" });
  let query = findAccountItemDetailQuery(snapshot, instanceId);
  if (!query && freshness === "refresh") {
    snapshot = await session.getSnapshot({ freshness: "refresh" });
    query = findAccountItemDetailQuery(snapshot, instanceId);
  }
  if (!query) {
    throw new Error("当前账号快照中找不到该装备，请刷新账号后重试");
  }
  const detailQuery = query;
  return measureRuntime<AccountItemDetail>(
    "account.item-detail",
    () => session.getItemDetail(detailQuery, { freshness }),
    { measurePayload: true }
  );
}

export async function resolveAccountItemLocation(
  instanceId: string,
  freshness: "cached" | "refresh" = "cached"
): Promise<AccountItemLocation | null> {
  const snapshot = await getAccountSnapshot(freshness);
  if (snapshot.vault.items.some((item) => item.instance_id === instanceId)) {
    return { kind: "vault" };
  }
  for (const character of snapshot.characters) {
    if ([...character.equipped_items, ...character.inventory_items]
      .some((item) => item.instance_id === instanceId)) {
      return { kind: "character", characterId: character.character_id };
    }
    if (character.postmaster_items.some((item) => item.instance_id === instanceId)) {
      return { kind: "postmaster", characterId: character.character_id };
    }
  }
  return null;
}

function findAccountItemDetailQuery(
  snapshot: AccountSnapshot,
  instanceId: string
): AccountItemDetailQuery | null {
  const createQuery = (
    item: { instance_id?: string; hash: number },
    characterId?: string
  ): AccountItemDetailQuery | null => item.instance_id === instanceId
    ? {
        destiny_membership_id: snapshot.destiny_membership_id,
        membership_type: snapshot.membership_type,
        instance_id: instanceId,
        item_hash: item.hash,
        ...(characterId ? { character_id: characterId } : {})
      }
    : null;

  for (const item of snapshot.vault.items) {
    const query = createQuery(item);
    if (query) return query;
  }
  for (const character of snapshot.characters) {
    for (const item of [
      ...character.equipped_items,
      ...character.inventory_items,
      ...character.postmaster_items
    ]) {
      const query = createQuery(item, character.character_id);
      if (query) return query;
    }
  }
  return null;
}

export async function patchAccountSession(patch: AccountItemPatch): Promise<void> {
  const session = await getAccountSession();
  session.patch(patch);
}

export async function invalidateAccountSession(input: AccountInvalidation): Promise<void> {
  const session = await getAccountSession();
  session.invalidate(input);
}

export async function invalidateAccountItemDetails(instanceIds?: readonly string[]): Promise<void> {
  if (!instanceIds?.length) {
    await invalidateAccountSession({ scope: "all" });
    return;
  }
  await Promise.all(instanceIds.map((instanceId) => (
    invalidateAccountSession({ scope: "item", instance_id: instanceId })
  )));
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
