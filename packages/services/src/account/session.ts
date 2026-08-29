import { performance } from "node:perf_hooks";
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

export type AccountSessionDiagnosticEvent = {
  stage: "oauth" | "membership" | "profile" | "definition-hydration" | "snapshot-build" | "snapshot-request";
  outcome: "started" | "completed" | "failed" | "cache-hit" | "in-flight-reused" | "queued-after-in-flight";
  duration_ms: number;
};

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
  patch(input: AccountItemPatch, options?: { revalidate?: boolean; preserve?: boolean }): void;
};

export type CreateAccountSessionOptions = {
  apiKey: string;
  getAccessToken: () => string | Promise<string>;
  loadDefinitions?: AccountDefinitionLoader;
  definitions?: AccountDefinitionData;
  initialSnapshot?: AccountSnapshot;
  onSnapshot?: (snapshot: AccountSnapshot) => void | Promise<void>;
  onDiagnostic?: (event: AccountSessionDiagnosticEvent) => void;
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
  const reportDiagnostic = (event: AccountSessionDiagnosticEvent) => {
    try {
      options.onDiagnostic?.(event);
    } catch {
      // Diagnostics must never alter account reads.
    }
  };

  const session: AccountSession = {
    async getSnapshot(input = {}) {
      const freshness = input.freshness ?? "cached";
      const authoritative = input.authoritative ?? false;
      if (freshness === "cached" && snapshot && !authoritative) {
        reportDiagnostic({
          stage: "snapshot-request",
          outcome: "cache-hit",
          duration_ms: 0
        });
        if (now() >= snapshotFreshUntil && !snapshotInFlight) {
          void getScopedAccessToken(true)
            .then((accessToken) => refreshSnapshot(accessToken))
            .catch(() => undefined);
        }
        return snapshot;
      }
      const accessToken = await getScopedAccessToken(true);
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

    patch(input, patchOptions = {}) {
      if (snapshot) {
        if (patchOptions.preserve === false) {
          if (isSameAccountItemPatch(pendingItemPatches.get(input.item_instance_id), input)) {
            pendingItemPatches.delete(input.item_instance_id);
          }
        } else {
          clearConflictingPendingItemPatches(snapshot, input, pendingItemPatches);
          snapshot = applyAccountItemPatch(snapshot, input);
          pendingItemPatches.set(input.item_instance_id, input);
          snapshotMutationRevision += 1;
          snapshotFreshUntil = Math.max(
            snapshotFreshUntil,
            now() + patchRevalidateDelayMs
          );
          void Promise.resolve(options.onSnapshot?.(snapshot)).catch(() => undefined);
          if (patchOptions.revalidate !== false) {
            scheduleSnapshotRevalidate();
          }
        }
      }
      deleteItemDetail(input.item_instance_id);
      void deletePersistentItemDetail(input.item_instance_id).catch(() => undefined);
    }
  };
  return session;

  async function getScopedAccessToken(diagnoseSnapshotRefresh = false): Promise<string> {
    const startedAt = performance.now();
    let accessToken: string;
    try {
      accessToken = (await options.getAccessToken()).trim();
    } catch (error) {
      if (diagnoseSnapshotRefresh) {
        reportDiagnostic({
          stage: "oauth",
          outcome: "failed",
          duration_ms: performance.now() - startedAt
        });
      }
      throw error;
    }
    if (!accessToken) {
      if (diagnoseSnapshotRefresh) {
        reportDiagnostic({
          stage: "oauth",
          outcome: "failed",
          duration_ms: performance.now() - startedAt
        });
      }
      throw createServiceError({
        code: "auth_required",
        message: "请先登录 Bungie",
        retryable: false,
        causeCategory: "authentication"
      });
    }
    if (diagnoseSnapshotRefresh) {
      reportDiagnostic({
        stage: "oauth",
        outcome: "completed",
        duration_ms: performance.now() - startedAt
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

  async function getMembership(
    accessToken: string,
    diagnoseSnapshotRefresh = false
  ): Promise<MembershipCache> {
    if (membershipCache && now() < membershipCache.freshUntil) {
      if (diagnoseSnapshotRefresh) {
        reportDiagnostic({ stage: "membership", outcome: "cache-hit", duration_ms: 0 });
      }
      return membershipCache;
    }
    if (membershipInFlight) {
      if (diagnoseSnapshotRefresh) {
        reportDiagnostic({ stage: "membership", outcome: "in-flight-reused", duration_ms: 0 });
      }
      return membershipInFlight;
    }
    const requestEpoch = sessionEpoch;
    const startedAt = performance.now();
    let promise: Promise<MembershipCache>;
    promise = (async () => {
      try {
        const data = await fetchJson<UserMembershipData>(
          "/User/GetMembershipsForCurrentUser/",
          accessToken
        );
        assertActiveRequest(accessToken, requestEpoch);
        const selected = selectMembership(data);
        membershipCache = {
          data,
          selected,
          freshUntil: now() + membershipTtlMs
        };
        if (diagnoseSnapshotRefresh) {
          reportDiagnostic({
            stage: "membership",
            outcome: "completed",
            duration_ms: performance.now() - startedAt
          });
        }
        return membershipCache;
      } catch (error) {
        if (diagnoseSnapshotRefresh) {
          reportDiagnostic({
            stage: "membership",
            outcome: "failed",
            duration_ms: performance.now() - startedAt
          });
        }
        throw error;
      }
    })().finally(() => {
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
    forceRefresh = false,
    diagnoseSnapshotRefresh = false
  ): Promise<DestinyProfileResponse> {
    const membershipKey = `${membership.membershipType}:${membership.membershipId}`;
    if (!forceRefresh
      && profileCache?.membershipKey === membershipKey
      && now() < profileCache.freshUntil
      && isSuperset(profileCache.components, requestedComponents)) {
      if (diagnoseSnapshotRefresh) {
        reportDiagnostic({ stage: "profile", outcome: "cache-hit", duration_ms: 0 });
      }
      return profileCache.profile;
    }
    if (profileInFlight?.membershipKey === membershipKey) {
      if (isSuperset(profileInFlight.components, requestedComponents)) {
        if (diagnoseSnapshotRefresh) {
          reportDiagnostic({ stage: "profile", outcome: "in-flight-reused", duration_ms: 0 });
        }
        return profileInFlight.promise;
      }
      if (diagnoseSnapshotRefresh) {
        reportDiagnostic({ stage: "profile", outcome: "queued-after-in-flight", duration_ms: 0 });
      }
      await profileInFlight.promise;
      return getProfile(
        membership,
        accessToken,
        requestedComponents,
        forceRefresh,
        diagnoseSnapshotRefresh
      );
    }

    const components = new Set(requestedComponents);
    if (profileCache?.membershipKey === membershipKey) {
      for (const component of profileCache.components) {
        components.add(component);
      }
    }
    const componentQuery = [...components].sort((left, right) => left - right).join(",");
    const requestEpoch = sessionEpoch;
    const startedAt = performance.now();
    let promise: Promise<DestinyProfileResponse>;
    promise = (async () => {
      try {
        const profile = await fetchJson<DestinyProfileResponse>(
          `/Destiny2/${membership.membershipType}/Profile/${membership.membershipId}/?components=${componentQuery}`,
          accessToken,
          { forceRefresh }
        );
        assertActiveRequest(accessToken, requestEpoch);
        profileCache = {
          membershipKey,
          components,
          profile,
          freshUntil: now() + profileTtlMs
        };
        if (diagnoseSnapshotRefresh) {
          reportDiagnostic({
            stage: "profile",
            outcome: "completed",
            duration_ms: performance.now() - startedAt
          });
        }
        return profile;
      } catch (error) {
        if (diagnoseSnapshotRefresh) {
          reportDiagnostic({
            stage: "profile",
            outcome: "failed",
            duration_ms: performance.now() - startedAt
          });
        }
        throw error;
      }
    })().finally(() => {
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
      if (!authoritative || snapshotInFlight.authoritative) {
        reportDiagnostic({
          stage: "snapshot-request",
          outcome: "in-flight-reused",
          duration_ms: 0
        });
        return snapshotInFlight.promise;
      }
      reportDiagnostic({
        stage: "snapshot-request",
        outcome: "queued-after-in-flight",
        duration_ms: 0
      });
      return snapshotInFlight.promise.then(
        () => refreshSnapshot(accessToken, true, authoritative),
        () => refreshSnapshot(accessToken, true, authoritative)
      );
    }
    const requestEpoch = sessionEpoch;
    const requestMutationRevision = snapshotMutationRevision;
    const snapshotStartedAt = performance.now();
    reportDiagnostic({ stage: "snapshot-request", outcome: "started", duration_ms: 0 });
    let promise: Promise<AccountSnapshot>;
    promise = (async () => {
      try {
        const membership = await getMembership(accessToken, true);
        const profile = await getProfile(
          membership.selected,
          accessToken,
          snapshotComponents,
          forceRefresh,
          true
        );
        const definitionStartedAt = performance.now();
        let definitions: AccountDefinitionData;
        try {
          definitions = await loadDefinitions(
            collectAccountSnapshotDefinitionRequest(profile)
          );
          reportDiagnostic({
            stage: "definition-hydration",
            outcome: "completed",
            duration_ms: performance.now() - definitionStartedAt
          });
        } catch (error) {
          reportDiagnostic({
            stage: "definition-hydration",
            outcome: "failed",
            duration_ms: performance.now() - definitionStartedAt
          });
          throw error;
        }
        const buildStartedAt = performance.now();
        let nextSnapshot: AccountSnapshot;
        try {
          nextSnapshot = buildAccountSnapshot({
            ...definitions,
            memberships: membership.data,
            destinyMembership: membership.selected,
            profile
          });
          reportDiagnostic({
            stage: "snapshot-build",
            outcome: "completed",
            duration_ms: performance.now() - buildStartedAt
          });
        } catch (error) {
          reportDiagnostic({
            stage: "snapshot-build",
            outcome: "failed",
            duration_ms: performance.now() - buildStartedAt
          });
          throw error;
        }
        assertActiveRequest(accessToken, requestEpoch);
        if (snapshotMutationRevision !== requestMutationRevision && snapshot) {
          snapshotFreshUntil = 0;
          scheduleSnapshotRevalidate();
          reportDiagnostic({
            stage: "snapshot-request",
            outcome: "completed",
            duration_ms: performance.now() - snapshotStartedAt
          });
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
        reportDiagnostic({
          stage: "snapshot-request",
          outcome: "completed",
          duration_ms: performance.now() - snapshotStartedAt
        });
        return snapshot;
      } catch (error) {
        reportDiagnostic({
          stage: "snapshot-request",
          outcome: "failed",
          duration_ms: performance.now() - snapshotStartedAt
        });
        throw error;
      }
    })().finally(() => {
      if (snapshotInFlight?.promise === promise) {
        snapshotInFlight = undefined;
      }
    });
    snapshotInFlight = { authoritative, promise };
    return promise;
  }

  function scheduleSnapshotRevalidate(): void {
    if (!snapshot || !pendingItemPatches.size) return;
    if (patchRevalidateTimer) clearTimeout(patchRevalidateTimer);
    const scheduledRevision = snapshotMutationRevision;
    patchRevalidateTimer = setTimeout(() => {
      patchRevalidateTimer = undefined;
      if (snapshotRevalidatedRevision >= scheduledRevision) return;
      void getScopedAccessToken(true)
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

function clearConflictingPendingItemPatches(
  snapshot: AccountSnapshot,
  patch: AccountItemPatch,
  pendingPatches: Map<string, AccountItemPatch>
): void {
  if (patch.kind !== "equip") return;
  const incomingItem = findSnapshotItem(snapshot, patch.item_instance_id);
  if (incomingItem?.bucket_hash === undefined) return;
  for (const [instanceId, pendingPatch] of pendingPatches) {
    if (pendingPatch.kind !== "equip" || pendingPatch.character_id !== patch.character_id) continue;
    const pendingItem = findSnapshotItem(snapshot, instanceId);
    if (pendingItem?.bucket_hash === incomingItem.bucket_hash) {
      pendingPatches.delete(instanceId);
    }
  }
}

function findSnapshotItem(snapshot: AccountSnapshot, instanceId: string) {
  const vaultItem = snapshot.vault.items.find((item) => item.instance_id === instanceId);
  if (vaultItem) return vaultItem;
  for (const character of snapshot.characters) {
    const item = character.equipped_items.find((candidate) => candidate.instance_id === instanceId)
      ?? character.inventory_items.find((candidate) => candidate.instance_id === instanceId)
      ?? character.postmaster_items.find((candidate) => candidate.instance_id === instanceId);
    if (item) return item;
  }
}

function isSameAccountItemPatch(
  left: AccountItemPatch | undefined,
  right: AccountItemPatch
): boolean {
  if (!left || left.kind !== right.kind || left.item_instance_id !== right.item_instance_id) return false;
  if (left.kind === "lock" && right.kind === "lock") return left.locked === right.locked;
  if (left.kind === "equip" && right.kind === "equip") return left.character_id === right.character_id;
  if (left.kind === "postmaster-pull" && right.kind === "postmaster-pull") {
    return left.character_id === right.character_id
      && left.source_bucket_hash === right.source_bucket_hash;
  }
  return left.kind === "transfer" && right.kind === "transfer"
    && left.character_id === right.character_id
    && left.target === right.target;
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
