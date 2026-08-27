import {
  buildAccountItemDetailFromResponse,
  buildAccountSummaryFromResponses,
  buildAccountSnapshot,
  collectAccountDefinitionRequest,
  collectAccountItemDetailDefinitionRequest,
  type AccountDefinitionData,
  type AccountDefinitionLoader,
  type AccountItemDetail,
  type AccountItemDetailQuery,
  type AccountSnapshot,
  type AccountSummary,
  type DestinyItemResponse,
  type DestinyMembership,
  type DestinyProfileResponse,
  type UserMembershipData
} from "@d2-tools/core/account/summary";
import { fetchBungieJson } from "../bungie/client.js";
import { createServiceError } from "../errors.js";
import type { BungieRequestOptions } from "../bungie/session.js";
import {
  applyAccountItemPatch,
  isAccountItemPatchReflected,
  type AccountItemPatch
} from "./itemPatches.js";
import type {
  AccountItemDetailCacheKey,
  AccountItemDetailCacheStore
} from "./itemDetailStore.js";

export type AccountSnapshotFreshness = "cached" | "refresh";

export type AccountInvalidation =
  | { scope: "all" }
  | { scope: "profile" }
  | { scope: "snapshot" }
  | { scope: "item"; instance_id: string };

export type { AccountItemPatch } from "./itemPatches.js";

/** Detail may be served from a stale local cache when revalidation fails. */
export type AccountItemDetailResult = AccountItemDetail & {
  cache_status?: "fresh" | "stale";
  fetched_at?: string;
};

export type AccountSession = {
  getSnapshot(input?: {
    freshness?: AccountSnapshotFreshness;
    authoritative?: boolean;
  }): Promise<AccountSnapshot>;
  getArmorPlannerSummary(input?: {
    freshness?: AccountSnapshotFreshness;
  }): Promise<AccountSummary>;
  getItemDetail(
    input: AccountItemDetailQuery,
    options?: { freshness?: AccountSnapshotFreshness }
  ): Promise<AccountItemDetailResult>;
  invalidate(input: AccountInvalidation): void;
  patch(input: AccountItemPatch): void;
};

export type CreateAccountSessionOptions = {
  apiKey: string;
  getAccessToken: () => string | Promise<string>;
  loadDefinitions?: AccountDefinitionLoader;
  definitions?: AccountDefinitionData;
  initialSnapshot?: AccountSnapshot;
  onSnapshot?: (snapshot: AccountSnapshot) => void | Promise<void>;
  fetchJson?: <T>(
    path: string,
    accessToken: string,
    options?: BungieRequestOptions
  ) => Promise<T>;
  now?: () => number;
  membershipTtlMs?: number;
  profileTtlMs?: number;
  snapshotTtlMs?: number;
  itemDetailTtlMs?: number;
  /** Durable cache freshness window. Defaults to 30 minutes. */
  itemDetailPersistentTtlMs?: number;
  maxItemDetails?: number;
  patchRevalidateDelayMs?: number;
  /** Optional durable cache. Memory remains the hot path; this is consulted before Bungie. */
  itemDetailStore?: AccountItemDetailCacheStore;
};

type MembershipCache = {
  data: UserMembershipData;
  selected: DestinyMembership;
  freshUntil: number;
};

type ProfileCache = {
  membershipKey: string;
  components: Set<number>;
  profile: DestinyProfileResponse;
  freshUntil: number;
};

type ProfileRequest = {
  membershipKey: string;
  components: Set<number>;
  promise: Promise<DestinyProfileResponse>;
};

type ItemDetailCacheEntry = {
  detail: AccountItemDetail;
  freshUntil: number;
};

type SnapshotRequest = {
  forceRefresh: boolean;
  authoritative: boolean;
  promise: Promise<AccountSnapshot>;
};

const snapshotComponents = new Set([
  100, // Profiles
  102, // ProfileInventories
  200, // Characters
  201, // CharacterInventories
  205, // CharacterEquipment
  206, // CharacterLoadouts
  300, // ItemInstances
  304, // ItemStats
  305 // ItemSockets
]);

const armorPlannerComponents = new Set([
  ...snapshotComponents,
  301, // ItemObjectives
  309, // ItemPlugObjectives
  310 // ItemReusablePlugs
]);

const itemDetailComponents = [300, 301, 304, 305, 307, 309, 310].join(",");

export function createAccountSession(options: CreateAccountSessionOptions): AccountSession {
  const now = options.now ?? Date.now;
  const fetchJson = options.fetchJson ?? (<T>(path: string, accessToken: string) =>
    fetchBungieJson<T>(path, {
      apiKey: options.apiKey,
      accessToken
    }));
  const membershipTtlMs = options.membershipTtlMs ?? 30 * 60_000;
  const profileTtlMs = options.profileTtlMs ?? 45_000;
  const snapshotTtlMs = options.snapshotTtlMs ?? 45_000;
  const itemDetailTtlMs = options.itemDetailTtlMs ?? 45_000;
  const itemDetailPersistentTtlMs = options.itemDetailPersistentTtlMs ?? 30 * 60_000;
  const maxItemDetails = options.maxItemDetails ?? 48;
  const patchRevalidateDelayMs = options.patchRevalidateDelayMs ?? 750;

  let currentAccessToken: string | undefined;
  let sessionEpoch = 0;
  let membershipCache: MembershipCache | undefined;
  let membershipInFlight: Promise<MembershipCache> | undefined;
  let profileCache: ProfileCache | undefined;
  let profileInFlight: ProfileRequest | undefined;
  let snapshot: AccountSnapshot | undefined = options.initialSnapshot;
  let snapshotFreshUntil = 0;
  let snapshotInFlight: SnapshotRequest | undefined;
  let snapshotMutationRevision = 0;
  let snapshotRevalidatedRevision = -1;
  let patchRevalidateTimer: ReturnType<typeof setTimeout> | undefined;
  const itemDetails = new Map<string, ItemDetailCacheEntry>();
  const itemDetailInFlight = new Map<string, Promise<AccountItemDetailResult>>();
  const itemDetailVersions = new Map<string, number>();
  const pendingItemPatches = new Map<string, AccountItemPatch>();
  const itemDetailStore = options.itemDetailStore;

  const session: AccountSession = {
    async getSnapshot(input = {}) {
      const freshness = input.freshness ?? "cached";
      const authoritative = input.authoritative ?? false;
      if (freshness === "cached" && snapshot && !authoritative) {
        if (now() >= snapshotFreshUntil && !snapshotInFlight) {
          void getScopedAccessToken()
            .then((accessToken) => refreshSnapshot(accessToken))
            .catch(() => undefined);
        }
        return snapshot;
      }
      const accessToken = await getScopedAccessToken();
      return refreshSnapshot(
        accessToken,
        freshness === "refresh" || authoritative,
        authoritative
      );
    },

    async getArmorPlannerSummary(input = {}) {
      const accessToken = await getScopedAccessToken();
      const membership = await getMembership(accessToken);
      const profile = await getProfile(
        membership.selected,
        accessToken,
        armorPlannerComponents,
        input.freshness === "refresh"
      );
      const definitions = await loadDefinitions(
        collectAccountDefinitionRequest(profile)
      );
      return buildAccountSummaryFromResponses({
        ...definitions,
        memberships: membership.data,
        destinyMembership: membership.selected,
        profile
      });
    },

    async getItemDetail(input, options = {}) {
      const forceRefresh = options.freshness === "refresh";
      const cacheKey = detailKey(input);
      const cached = itemDetails.get(cacheKey);
      if (!forceRefresh && cached && now() < cached.freshUntil) {
        touchDetail(cacheKey, cached);
        return markItemDetailStatus(cached.detail, "fresh");
      }
      let staleFallback: AccountItemDetail | undefined = cached?.detail;
      let staleFetchedAt: string | undefined;
      const existingInFlight = itemDetailInFlight.get(cacheKey);
      if (!forceRefresh && existingInFlight) {
        return existingInFlight;
      }
      // Durable cache is intentionally checked before acquiring a token so a
      // previously fetched detail can be viewed while offline or before auth
      // refresh completes.
      if (!forceRefresh && itemDetailStore) {
        const persisted = await itemDetailStore.get(cacheInputKey(input)).catch(() => null);
        if (persisted) {
          // The durable entry may be newer than an expired in-memory entry
          // after an app restart or another page has refreshed it.
          staleFallback = persisted.detail;
          staleFetchedAt = persisted.fetched_at;
          const fetchedAt = Date.parse(persisted.fetched_at);
          const freshUntil = Number.isFinite(fetchedAt)
            ? fetchedAt + itemDetailPersistentTtlMs
            : 0;
          if (freshUntil > now()) {
            itemDetails.set(cacheKey, {
              detail: persisted.detail,
              freshUntil
            });
            touchDetail(cacheKey, itemDetails.get(cacheKey)!);
            trimItemDetails();
            return markItemDetailStatus(persisted.detail, "fresh", persisted.fetched_at);
          }
        }
      }
      // Stale-while-revalidate: keep the last known detail interactive while
      // a refresh runs in the background. The forced call below shares the
      // existing in-flight map and therefore cannot duplicate a request.
      if (!forceRefresh && staleFallback) {
        void session.getItemDetail(input, { freshness: "refresh" }).catch(() => undefined);
        return markItemDetailStatus(staleFallback, "stale", staleFetchedAt);
      }
      let accessToken: string;
      try {
        accessToken = await getScopedAccessToken();
      } catch (error) {
        if (staleFallback) return markItemDetailStatus(staleFallback, "stale", staleFetchedAt);
        throw error;
      }
      const inFlight = itemDetailInFlight.get(cacheKey);
      if (!forceRefresh && inFlight) {
        return inFlight;
      }

      const requestEpoch = sessionEpoch;
      const itemVersion = itemDetailVersions.get(input.instance_id) ?? 0;
      let promise: Promise<AccountItemDetailResult>;
      promise = loadItemDetail(input, accessToken, { forceRefresh })
        .then((detail) => {
          assertActiveRequest(accessToken, requestEpoch);
          if ((itemDetailVersions.get(input.instance_id) ?? 0) !== itemVersion) {
            throw new Error("Account item detail was invalidated while the request was running");
          }
          itemDetails.set(cacheKey, {
            detail,
            freshUntil: now() + itemDetailTtlMs
          });
          trimItemDetails();
          if (itemDetailStore) {
            void itemDetailStore.set(cacheInputKey(input), detail, new Date(now()))
              .catch(() => undefined);
          }
          return markItemDetailStatus(detail, "fresh", new Date(now()).toISOString());
        })
        .catch((error) => {
          if (staleFallback && !isRequestInvalidationError(error)) {
            return markItemDetailStatus(staleFallback, "stale", staleFetchedAt);
          }
          throw error;
        })
        .finally(() => {
          if (itemDetailInFlight.get(cacheKey) === promise) {
            itemDetailInFlight.delete(cacheKey);
          }
        });
      itemDetailInFlight.set(cacheKey, promise);
      return promise;
    },

    invalidate(input) {
      if (input.scope === "all") {
        const account = currentAccountKey();
        clearAccountCaches();
        membershipCache = undefined;
        membershipInFlight = undefined;
        void clearPersistentItemDetails(account).catch(() => undefined);
        return;
      }
      if (input.scope === "profile") {
        sessionEpoch += 1;
        profileCache = undefined;
        profileInFlight = undefined;
        snapshotFreshUntil = 0;
        return;
      }
      if (input.scope === "snapshot") {
        snapshotFreshUntil = 0;
        return;
      }
      deleteItemDetail(input.instance_id);
      void deletePersistentItemDetail(input.instance_id).catch(() => undefined);
    },

    patch(input) {
      if (snapshot) {
        snapshot = applyAccountItemPatch(snapshot, input);
        pendingItemPatches.set(input.item_instance_id, input);
        snapshotMutationRevision += 1;
        snapshotFreshUntil = Math.max(
          snapshotFreshUntil,
          now() + patchRevalidateDelayMs
        );
        void Promise.resolve(options.onSnapshot?.(snapshot)).catch(() => undefined);
        scheduleSnapshotRevalidate();
      }
      deleteItemDetail(input.item_instance_id);
      void deletePersistentItemDetail(input.item_instance_id).catch(() => undefined);
    }
  };
  return session;

  async function getScopedAccessToken(): Promise<string> {
    const accessToken = (await options.getAccessToken()).trim();
    if (!accessToken) {
      throw createServiceError({
        code: "auth_required",
        message: "请先登录 Bungie",
        retryable: false,
        causeCategory: "authentication"
      });
    }
    if (currentAccessToken === undefined) {
      currentAccessToken = accessToken;
    } else if (currentAccessToken !== accessToken) {
      currentAccessToken = accessToken;
      membershipCache = undefined;
      membershipInFlight = undefined;
      clearAccountCaches();
    }
    return accessToken;
  }

  function assertActiveRequest(accessToken: string, requestEpoch: number): void {
    if (currentAccessToken !== accessToken || sessionEpoch !== requestEpoch) {
      throw new Error("Bungie account session changed while the request was running");
    }
  }

  function clearAccountCaches(): void {
    sessionEpoch += 1;
    profileCache = undefined;
    profileInFlight = undefined;
    snapshot = undefined;
    snapshotMutationRevision += 1;
    snapshotFreshUntil = 0;
    snapshotInFlight = undefined;
    if (patchRevalidateTimer) clearTimeout(patchRevalidateTimer);
    patchRevalidateTimer = undefined;
    itemDetails.clear();
    itemDetailInFlight.clear();
    pendingItemPatches.clear();
  }

  async function getMembership(accessToken: string): Promise<MembershipCache> {
    if (membershipCache && now() < membershipCache.freshUntil) {
      return membershipCache;
    }
    if (membershipInFlight) {
      return membershipInFlight;
    }
    const requestEpoch = sessionEpoch;
    let promise: Promise<MembershipCache>;
    promise = fetchJson<UserMembershipData>(
      "/User/GetMembershipsForCurrentUser/",
      accessToken
    )
      .then((data) => {
        assertActiveRequest(accessToken, requestEpoch);
        const selected = selectMembership(data);
        membershipCache = {
          data,
          selected,
          freshUntil: now() + membershipTtlMs
        };
        return membershipCache;
      })
      .finally(() => {
        if (membershipInFlight === promise) {
          membershipInFlight = undefined;
        }
      });
    membershipInFlight = promise;
    return promise;
  }

  async function getProfile(
    membership: DestinyMembership,
    accessToken: string,
    requestedComponents: ReadonlySet<number>,
    forceRefresh = false
  ): Promise<DestinyProfileResponse> {
    const membershipKey = `${membership.membershipType}:${membership.membershipId}`;
    if (!forceRefresh
      && profileCache?.membershipKey === membershipKey
      && now() < profileCache.freshUntil
      && isSuperset(profileCache.components, requestedComponents)) {
      return profileCache.profile;
    }
    if (profileInFlight?.membershipKey === membershipKey) {
      if (!forceRefresh && isSuperset(profileInFlight.components, requestedComponents)) {
        return profileInFlight.promise;
      }
      await profileInFlight.promise;
      return getProfile(membership, accessToken, requestedComponents, forceRefresh);
    }

    const components = new Set(requestedComponents);
    if (profileCache?.membershipKey === membershipKey) {
      for (const component of profileCache.components) {
        components.add(component);
      }
    }
    const componentQuery = [...components].sort((left, right) => left - right).join(",");
    const requestEpoch = sessionEpoch;
    let promise: Promise<DestinyProfileResponse>;
    promise = fetchJson<DestinyProfileResponse>(
      `/Destiny2/${membership.membershipType}/Profile/${membership.membershipId}/?components=${componentQuery}`,
      accessToken,
      { forceRefresh }
    )
      .then((profile) => {
        assertActiveRequest(accessToken, requestEpoch);
        profileCache = {
          membershipKey,
          components,
          profile,
          freshUntil: now() + profileTtlMs
        };
        return profile;
      })
      .finally(() => {
        if (profileInFlight?.promise === promise) {
          profileInFlight = undefined;
        }
      });
    profileInFlight = { membershipKey, components, promise };
    return promise;
  }

  function refreshSnapshot(
    accessToken: string,
    forceRefresh = false,
    authoritative = false
  ): Promise<AccountSnapshot> {
    if (snapshotInFlight) {
      if ((!forceRefresh || snapshotInFlight.forceRefresh)
        && (!authoritative || snapshotInFlight.authoritative)) {
        return snapshotInFlight.promise;
      }
      return snapshotInFlight.promise.then(
        () => refreshSnapshot(accessToken, true, authoritative),
        () => refreshSnapshot(accessToken, true, authoritative)
      );
    }
    const requestEpoch = sessionEpoch;
    const requestMutationRevision = snapshotMutationRevision;
    let promise: Promise<AccountSnapshot>;
    promise = (async () => {
      const membership = await getMembership(accessToken);
      const profile = await getProfile(
        membership.selected,
        accessToken,
        snapshotComponents,
        forceRefresh
      );
      const definitions = await loadDefinitions(
        collectAccountSnapshotDefinitionRequest(profile)
      );
      const nextSnapshot = buildAccountSnapshot({
        ...definitions,
        memberships: membership.data,
        destinyMembership: membership.selected,
        profile
      });
      assertActiveRequest(accessToken, requestEpoch);
      if (snapshotMutationRevision !== requestMutationRevision && snapshot) {
        snapshotFreshUntil = 0;
        scheduleSnapshotRevalidate();
        return snapshot;
      }
      if (authoritative) {
        pendingItemPatches.clear();
        if (patchRevalidateTimer) clearTimeout(patchRevalidateTimer);
        patchRevalidateTimer = undefined;
        snapshot = nextSnapshot;
      } else {
        snapshot = reconcilePendingItemPatches(nextSnapshot);
      }
      snapshotRevalidatedRevision = Math.max(
        snapshotRevalidatedRevision,
        requestMutationRevision
      );
      snapshotFreshUntil = now() + snapshotTtlMs;
      void Promise.resolve(options.onSnapshot?.(snapshot)).catch(() => undefined);
      return snapshot;
    })().finally(() => {
      if (snapshotInFlight?.promise === promise) {
        snapshotInFlight = undefined;
      }
    });
    snapshotInFlight = { forceRefresh, authoritative, promise };
    return promise;
  }

  function scheduleSnapshotRevalidate(): void {
    if (!snapshot) return;
    if (patchRevalidateTimer) clearTimeout(patchRevalidateTimer);
    const scheduledRevision = snapshotMutationRevision;
    patchRevalidateTimer = setTimeout(() => {
      patchRevalidateTimer = undefined;
      if (snapshotRevalidatedRevision >= scheduledRevision) return;
      void getScopedAccessToken()
        .then((accessToken) => refreshSnapshot(accessToken, true))
        .catch(() => {
          snapshotFreshUntil = 0;
        });
    }, patchRevalidateDelayMs);
  }

  function reconcilePendingItemPatches(
    serverSnapshot: AccountSnapshot
  ): AccountSnapshot {
    let reconciled = serverSnapshot;
    for (const [instanceId, patch] of pendingItemPatches) {
      if (isAccountItemPatchReflected(serverSnapshot, patch)) {
        pendingItemPatches.delete(instanceId);
      } else {
        reconciled = applyAccountItemPatch(reconciled, patch);
      }
    }
    return reconciled;
  }

  async function loadItemDetail(
    query: AccountItemDetailQuery,
    accessToken: string,
    requestOptions?: BungieRequestOptions
  ): Promise<AccountItemDetail> {
    const [itemResponse, recordsProfile] = await Promise.all([
      fetchJson<DestinyItemResponse>(
        `/Destiny2/${query.membership_type}/Profile/${query.destiny_membership_id}/Item/${query.instance_id}/?components=${itemDetailComponents}`,
        accessToken,
        requestOptions
      ),
      getProfile(
        {
          membershipType: query.membership_type,
          membershipId: query.destiny_membership_id
        },
        accessToken,
        new Set([900]),
        requestOptions?.forceRefresh ?? false
      )
    ]);
    const response: DestinyItemResponse = {
      ...itemResponse,
      profileRecords: recordsProfile.profileRecords
    };
    const definitions = await loadDefinitions(
      collectAccountItemDetailDefinitionRequest(query, response)
    );
    return buildAccountItemDetailFromResponse({
      ...definitions,
      query,
      response
    });
  }

  async function loadDefinitions(
    request: Parameters<AccountDefinitionLoader>[0]
  ): Promise<AccountDefinitionData> {
    const loaded = options.loadDefinitions
      ? await Promise.resolve(options.loadDefinitions(request)).catch(() => undefined)
      : undefined;
    return mergeDefinitionData(options.definitions, loaded);
  }

  function deleteItemDetail(instanceId: string): void {
    itemDetailVersions.set(instanceId, (itemDetailVersions.get(instanceId) ?? 0) + 1);
    for (const key of itemDetails.keys()) {
      if (key.endsWith(`:${instanceId}`)) {
        itemDetails.delete(key);
      }
    }
    for (const key of itemDetailInFlight.keys()) {
      if (key.endsWith(`:${instanceId}`)) {
        itemDetailInFlight.delete(key);
      }
    }
  }

  function cacheInputKey(input: AccountItemDetailQuery): AccountItemDetailCacheKey {
    return {
      membership_type: input.membership_type,
      destiny_membership_id: input.destiny_membership_id,
      instance_id: input.instance_id
    };
  }

  function deletePersistentItemDetail(instanceId: string): Promise<void> {
    if (!itemDetailStore) return Promise.resolve();
    const account = currentAccountKey();
    // Invalidation only carries an instance id. Prefer the active snapshot's
    // membership context; if it is unavailable, remove matching in-memory
    // entries and leave durable entries untouched rather than risking another
    // account's data.
    if (!account) return Promise.resolve();
    return itemDetailStore.delete({ ...account, instance_id: instanceId }).then(() => undefined);
  }

  function clearPersistentItemDetails(account?: {
    membership_type: number;
    destiny_membership_id: string;
  }): Promise<void> {
    return itemDetailStore && account
      ? itemDetailStore.clear(account).then(() => undefined)
      : Promise.resolve();
  }

  function currentAccountKey(): {
    membership_type: number;
    destiny_membership_id: string;
  } | undefined {
    if (snapshot) {
      return {
        membership_type: snapshot.membership_type,
        destiny_membership_id: snapshot.destiny_membership_id
      };
    }
    if (membershipCache) {
      return {
        membership_type: membershipCache.selected.membershipType,
        destiny_membership_id: membershipCache.selected.membershipId
      };
    }
    return undefined;
  }

  function markItemDetailStatus(
    detail: AccountItemDetail,
    status: "fresh" | "stale",
    fetchedAt?: string
  ): AccountItemDetailResult {
    return {
      ...detail,
      cache_status: status,
      ...(fetchedAt ? { fetched_at: fetchedAt } : {})
    };
  }

  function isRequestInvalidationError(error: unknown): boolean {
    return error instanceof Error && (
      error.message === "Bungie account session changed while the request was running"
      || error.message === "Account item detail was invalidated while the request was running"
    );
  }

  function touchDetail(key: string, entry: ItemDetailCacheEntry): void {
    itemDetails.delete(key);
    itemDetails.set(key, entry);
  }

  function trimItemDetails(): void {
    while (itemDetails.size > maxItemDetails) {
      const oldestKey = itemDetails.keys().next().value as string | undefined;
      if (!oldestKey) break;
      itemDetails.delete(oldestKey);
    }
  }
}

function collectAccountSnapshotDefinitionRequest(
  profile: DestinyProfileResponse
): ReturnType<typeof collectAccountDefinitionRequest> {
  return {
    ...collectAccountDefinitionRequest({
      ...profile,
      profilePlugSets: undefined,
      characterPlugSets: undefined,
      characterCraftables: undefined,
      itemComponents: profile.itemComponents
      ? {
          instances: profile.itemComponents.instances,
          stats: profile.itemComponents.stats,
          sockets: profile.itemComponents.sockets
        }
        : undefined
    }, []),
    expandSocketPlugSets: false
  };
}

function selectMembership(data: UserMembershipData): DestinyMembership {
  const memberships = data.destinyMemberships ?? [];
  const selected = memberships.find((membership) => membership.membershipId === data.primaryMembershipId)
    ?? memberships[0];
  if (!selected) {
    throw new Error("当前 Bungie 账号没有 Destiny 档案");
  }
  return selected;
}

function isSuperset(values: ReadonlySet<number>, requested: ReadonlySet<number>): boolean {
  for (const value of requested) {
    if (!values.has(value)) return false;
  }
  return true;
}

function detailKey(input: AccountItemDetailQuery): string {
  return `${input.membership_type}:${input.destiny_membership_id}:${input.instance_id}`;
}

function mergeDefinitionData(
  base: AccountDefinitionData | undefined,
  loaded: AccountDefinitionData | undefined
): AccountDefinitionData {
  return {
    itemDefinitions: { ...base?.itemDefinitions, ...loaded?.itemDefinitions },
    inventoryItemConstantsDefinitions: {
      ...base?.inventoryItemConstantsDefinitions,
      ...loaded?.inventoryItemConstantsDefinitions
    },
    bucketDefinitions: { ...base?.bucketDefinitions, ...loaded?.bucketDefinitions },
    damageTypeDefinitions: { ...base?.damageTypeDefinitions, ...loaded?.damageTypeDefinitions },
    equipableItemSetDefinitions: {
      ...base?.equipableItemSetDefinitions,
      ...loaded?.equipableItemSetDefinitions
    },
    plugSetDefinitions: { ...base?.plugSetDefinitions, ...loaded?.plugSetDefinitions },
    objectiveDefinitions: { ...base?.objectiveDefinitions, ...loaded?.objectiveDefinitions },
    recordDefinitions: { ...base?.recordDefinitions, ...loaded?.recordDefinitions },
    loadoutNameDefinitions: { ...base?.loadoutNameDefinitions, ...loaded?.loadoutNameDefinitions }
  };
}
