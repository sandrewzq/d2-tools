import {
  buildAccountItemDetailFromResponse,
  buildAccountSnapshot,
  collectAccountDefinitionRequest,
  collectAccountItemDetailDefinitionRequest,
  type AccountDefinitionData,
  type AccountDefinitionLoader,
  type AccountItemDetail,
  type AccountItemDetailQuery,
  type AccountItemSnapshot,
  type AccountSnapshot,
  type DestinyItemResponse,
  type DestinyMembership,
  type DestinyProfileResponse,
  type UserMembershipData
} from "@d2-tools/core/account/summary";
import { fetchBungieJson } from "../bungie/client.js";
import type { BungieRequestOptions } from "../bungie/session.js";

export type AccountSnapshotFreshness = "cached" | "refresh";

export type AccountInvalidation =
  | { scope: "all" }
  | { scope: "profile" }
  | { scope: "snapshot" }
  | { scope: "item"; instance_id: string };

export type AccountItemPatch =
  | {
      kind: "lock";
      item_instance_id: string;
      locked: boolean;
    }
  | {
      kind: "equip";
      item_instance_id: string;
      character_id: string;
    }
  | {
      kind: "transfer";
      item_instance_id: string;
      character_id: string;
      target: "vault" | "character-inventory";
    }
  | {
      kind: "postmaster-pull";
      item_instance_id: string;
      character_id: string;
    };

export type AccountSession = {
  getSnapshot(input?: { freshness?: AccountSnapshotFreshness }): Promise<AccountSnapshot>;
  getItemDetail(input: AccountItemDetailQuery): Promise<AccountItemDetail>;
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
  maxItemDetails?: number;
  patchRevalidateDelayMs?: number;
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

const itemDetailComponents = [300, 301, 304, 305, 309, 310].join(",");

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
  const itemDetailInFlight = new Map<string, Promise<AccountItemDetail>>();
  const itemDetailVersions = new Map<string, number>();
  const pendingItemPatches = new Map<string, AccountItemPatch>();

  return {
    async getSnapshot(input = {}) {
      const freshness = input.freshness ?? "cached";
      if (freshness === "cached" && snapshot) {
        if (now() >= snapshotFreshUntil && !snapshotInFlight) {
          void getScopedAccessToken()
            .then((accessToken) => refreshSnapshot(accessToken))
            .catch(() => undefined);
        }
        return snapshot;
      }
      const accessToken = await getScopedAccessToken();
      return refreshSnapshot(accessToken, freshness === "refresh");
    },

    async getItemDetail(input) {
      const accessToken = await getScopedAccessToken();
      const cacheKey = detailKey(input);
      const cached = itemDetails.get(cacheKey);
      if (cached && now() < cached.freshUntil) {
        touchDetail(cacheKey, cached);
        return cached.detail;
      }
      const inFlight = itemDetailInFlight.get(cacheKey);
      if (inFlight) {
        return inFlight;
      }

      const requestEpoch = sessionEpoch;
      const itemVersion = itemDetailVersions.get(input.instance_id) ?? 0;
      let promise: Promise<AccountItemDetail>;
      promise = loadItemDetail(input, accessToken)
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
          return detail;
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
        clearAccountCaches();
        membershipCache = undefined;
        membershipInFlight = undefined;
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
    }
  };

  async function getScopedAccessToken(): Promise<string> {
    const accessToken = (await options.getAccessToken()).trim();
    if (!accessToken) {
      throw new Error("Bungie access token is required");
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
      if (isSuperset(profileInFlight.components, requestedComponents)) {
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

  function refreshSnapshot(accessToken: string, forceRefresh = false): Promise<AccountSnapshot> {
    if (snapshotInFlight) {
      if (!forceRefresh || snapshotInFlight.forceRefresh) {
        return snapshotInFlight.promise;
      }
      return snapshotInFlight.promise.then(
        () => refreshSnapshot(accessToken, true),
        () => refreshSnapshot(accessToken, true)
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
      snapshot = reconcilePendingItemPatches(nextSnapshot);
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
    snapshotInFlight = { forceRefresh, promise };
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
    accessToken: string
  ): Promise<AccountItemDetail> {
    const response = await fetchJson<DestinyItemResponse>(
      `/Destiny2/${query.membership_type}/Profile/${query.destiny_membership_id}/Item/${query.instance_id}/?components=${itemDetailComponents}`,
      accessToken
    );
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
      ? await options.loadDefinitions(request)
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
    bucketDefinitions: { ...base?.bucketDefinitions, ...loaded?.bucketDefinitions },
    plugSetDefinitions: { ...base?.plugSetDefinitions, ...loaded?.plugSetDefinitions },
    objectiveDefinitions: { ...base?.objectiveDefinitions, ...loaded?.objectiveDefinitions },
    loadoutNameDefinitions: { ...base?.loadoutNameDefinitions, ...loaded?.loadoutNameDefinitions }
  };
}

function applyAccountItemPatch(snapshot: AccountSnapshot, patch: AccountItemPatch): AccountSnapshot {
  const next = cloneSnapshotCollections(snapshot);
  if (patch.kind === "lock") {
    visitItems(next, (item) => {
      if (item.instance_id === patch.item_instance_id) item.locked = patch.locked;
    });
    return next;
  }

  const targetCharacter = patch.kind === "transfer" && patch.target === "vault"
    ? undefined
    : findCharacter(next, patch.character_id);
  if (patch.kind !== "transfer" || patch.target !== "vault") {
    if (!targetCharacter) return next;
  }

  const item = detachItem(next, patch.item_instance_id);
  if (!item) return next;

  if (patch.kind === "transfer") {
    setEquipped(item, false);
    if (patch.target === "vault") {
      next.vault.items.push(item);
    } else {
      targetCharacter?.inventory_items.push(item);
    }
    next.vault.item_count = next.vault.items.length;
    return next;
  }

  const character = targetCharacter;
  if (!character) return next;
  if (patch.kind === "postmaster-pull") {
    setEquipped(item, false);
    character.inventory_items.push(item);
    next.vault.item_count = next.vault.items.length;
    return next;
  }

  const displaced = character.equipped_items.find((candidate) => (
    candidate.bucket_hash !== undefined && candidate.bucket_hash === item.bucket_hash
  ));
  if (displaced) {
    character.equipped_items = character.equipped_items.filter((candidate) => candidate !== displaced);
    setEquipped(displaced, false);
    character.inventory_items.push(displaced);
  }
  setEquipped(item, true);
  character.equipped_items.push(item);
  next.vault.item_count = next.vault.items.length;
  return next;
}

function isAccountItemPatchReflected(
  snapshot: AccountSnapshot,
  patch: AccountItemPatch
): boolean {
  if (patch.kind === "lock") {
    return findItem(snapshot, patch.item_instance_id)?.locked === patch.locked;
  }
  if (patch.kind === "equip") {
    return findCharacter(snapshot, patch.character_id)?.equipped_items
      .some((item) => item.instance_id === patch.item_instance_id) ?? false;
  }
  if (patch.kind === "postmaster-pull") {
    return findCharacter(snapshot, patch.character_id)?.inventory_items
      .some((item) => item.instance_id === patch.item_instance_id) ?? false;
  }
  if (patch.target === "vault") {
    return snapshot.vault.items.some((item) => item.instance_id === patch.item_instance_id);
  }
  return findCharacter(snapshot, patch.character_id)?.inventory_items
    .some((item) => item.instance_id === patch.item_instance_id) ?? false;
}

function findItem(snapshot: AccountSnapshot, instanceId: string): AccountItemSnapshot | undefined {
  const vaultItem = snapshot.vault.items.find((item) => item.instance_id === instanceId);
  if (vaultItem) return vaultItem;
  for (const character of snapshot.characters) {
    const item = character.equipped_items.find((candidate) => candidate.instance_id === instanceId)
      ?? character.inventory_items.find((candidate) => candidate.instance_id === instanceId)
      ?? character.postmaster_items.find((candidate) => candidate.instance_id === instanceId);
    if (item) return item;
  }
  return undefined;
}

function cloneSnapshotCollections(snapshot: AccountSnapshot): AccountSnapshot {
  return {
    ...snapshot,
    vault: {
      ...snapshot.vault,
      items: snapshot.vault.items.map(cloneItem)
    },
    characters: snapshot.characters.map((character) => ({
      ...character,
      equipped_items: character.equipped_items.map(cloneItem),
      inventory_items: character.inventory_items.map(cloneItem),
      postmaster_items: character.postmaster_items.map(cloneItem)
    }))
  };
}

function cloneItem(item: AccountItemSnapshot): AccountItemSnapshot {
  return {
    ...item,
    ...(item.instance ? { instance: { ...item.instance } } : {})
  };
}

function visitItems(snapshot: AccountSnapshot, visitor: (item: AccountItemSnapshot) => void): void {
  for (const item of snapshot.vault.items) visitor(item);
  for (const character of snapshot.characters) {
    for (const item of character.equipped_items) visitor(item);
    for (const item of character.inventory_items) visitor(item);
    for (const item of character.postmaster_items) visitor(item);
  }
}

function detachItem(snapshot: AccountSnapshot, instanceId: string): AccountItemSnapshot | undefined {
  const vaultItem = takeItem(snapshot.vault.items, instanceId);
  if (vaultItem) return vaultItem;
  for (const character of snapshot.characters) {
    const item = takeItem(character.equipped_items, instanceId)
      ?? takeItem(character.inventory_items, instanceId)
      ?? takeItem(character.postmaster_items, instanceId);
    if (item) return item;
  }
  return undefined;
}

function takeItem(items: AccountItemSnapshot[], instanceId: string): AccountItemSnapshot | undefined {
  const index = items.findIndex((item) => item.instance_id === instanceId);
  if (index < 0) return undefined;
  return items.splice(index, 1)[0];
}

function findCharacter(snapshot: AccountSnapshot, characterId: string) {
  return snapshot.characters.find((character) => character.character_id === characterId);
}

function setEquipped(item: AccountItemSnapshot, equipped: boolean): void {
  item.instance = {
    ...item.instance,
    is_equipped: equipped
  };
}
