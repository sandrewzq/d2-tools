import { fetchBungieJson } from "./client.js";

export type BungieMembership = {
  membershipId: string;
  membershipType: number;
};

export type BungiePublicMilestone = {
  displayProperties?: {
    name?: string;
    description?: string;
  };
  activities?: Array<{
    activityHash?: number;
  }>;
  availableQuests?: Array<{
    questItemHash?: number;
  }>;
};

export type BungiePublicVendor = {
  vendorHash?: number;
  enabled?: boolean;
  nextRefreshDate?: string;
  vendorLocationIndex?: number;
};

export type BungiePublicSale = {
  itemHash?: number;
  costs?: Array<{
    itemHash?: number;
    quantity?: number;
  }>;
};

type BungiePublicSaleCollection = Record<string, BungiePublicSale>;

export type BungiePublicVendorSales = Record<
  string,
  BungiePublicSale | BungiePublicSaleCollection | undefined
> & {
  saleItems?: BungiePublicSaleCollection;
};

export type BungieVendorsResponse = {
  vendors?: {
    data?: Record<string, BungiePublicVendor>;
  };
  sales?: {
    data?: Record<string, BungiePublicVendorSales>;
  };
};

export type BungieCharacterVendorResponse = BungieVendorsResponse & {
  characterId: string;
};

export type BungieHomeProfileResponse = {
  characters?: {
    data?: Record<string, { characterId?: string }>;
  };
  characterActivities?: {
    data?: Record<string, {
      availableActivities?: Array<{
        activityHash?: number;
        challenges?: Array<{
          objective?: {
            objectiveHash?: number;
          };
        }>;
        visibleRewards?: Array<{
          rewardItems?: Array<{
            itemQuantity?: {
              itemHash?: number;
            };
          }>;
        }>;
      }>;
    }>;
  };
};

export type BungieHomeSnapshot = {
  fetchedAt: string;
  membership?: BungieMembership;
  milestones?: Record<string, BungiePublicMilestone>;
  publicVendors?: BungieVendorsResponse;
  profile?: BungieHomeProfileResponse;
  characterVendors: BungieCharacterVendorResponse[];
};

export type BungieSession = {
  getHomeSnapshot(options?: {
    accessToken?: string;
    includeMilestones?: boolean;
    includeProfile?: boolean;
    includeVendors?: boolean;
  }): Promise<BungieHomeSnapshot>;
};

export type CreateBungieSessionOptions = {
  apiKey: string;
  fetchJson?: <T>(path: string, accessToken?: string) => Promise<T>;
  now?: () => number;
};

export type BungieRequestBroker = {
  fetchJson<T>(
    path: string,
    accessToken?: string,
    options?: BungieRequestOptions
  ): Promise<T>;
  clear(): void;
};

export type BungieRequestOptions = {
  forceRefresh?: boolean;
  waitForRefresh?: boolean;
};

export type CreateBungieRequestBrokerOptions = {
  apiKey: string;
  fetchJson?: <T>(path: string, accessToken?: string) => Promise<T>;
  now?: () => number;
  ttlMs?: number;
  staleMs?: number;
};

type CachePolicy = {
  ttlMs: number;
  staleMs: number;
};

type CacheEntry<T> = {
  value?: T;
  freshUntil: number;
  staleUntil: number;
  inFlight?: Promise<T>;
  loader?: () => Promise<T>;
  policy?: CachePolicy;
};

type ProfileRequestDescriptor = {
  key: string;
  components: Set<number>;
};

const policies = {
  milestones: { ttlMs: 5 * 60_000, staleMs: 2 * 60 * 60_000 },
  publicVendors: { ttlMs: 2 * 60_000, staleMs: 30 * 60_000 },
  membership: { ttlMs: 30 * 60_000, staleMs: 24 * 60 * 60_000 },
  profile: { ttlMs: 45_000, staleMs: 5 * 60_000 },
  characterVendors: { ttlMs: 45_000, staleMs: 5 * 60_000 }
} satisfies Record<string, CachePolicy>;

export function createBungieRequestBroker(
  options: CreateBungieRequestBrokerOptions
): BungieRequestBroker {
  const broker = new RequestBroker(options.now ?? Date.now);
  const profileRequests = new Map<string, ProfileRequestDescriptor[]>();
  const fetchJson = options.fetchJson ?? (<T>(path: string, accessToken?: string) =>
    fetchBungieJson<T>(path, {
      apiKey: options.apiKey,
      accessToken
    }));
  const policy = {
    ttlMs: options.ttlMs ?? 20_000,
    staleMs: options.staleMs ?? 2 * 60_000
  };
  return {
    fetchJson<T>(
      path: string,
      accessToken?: string,
      requestOptions: BungieRequestOptions = {}
    ) {
      const scope = accessToken ? `auth:${accessToken}` : "public";
      const profileRequest = parseProfileRequest(path);
      const profileResource = profileRequest
        ? `${scope}:${profileRequest.resource}`
        : undefined;
      if (profileRequest && profileResource && !requestOptions.forceRefresh) {
        const candidates = [...(profileRequests.get(profileResource) ?? [])]
          .filter((candidate) => isSuperset(candidate.components, profileRequest.components))
          .sort((left, right) => left.components.size - right.components.size);
        for (const candidate of candidates) {
          const existing = broker.getExisting<T>(candidate.key, requestOptions);
          if (existing) return existing;
        }
      }

      const key = `${scope}:${path}`;
      if (profileRequest && profileResource) {
        const registered = profileRequests.get(profileResource) ?? [];
        if (!registered.some((candidate) => candidate.key === key)) {
          registered.push({ key, components: profileRequest.components });
          profileRequests.set(profileResource, registered);
        }
      }
      return broker.get(
        key,
        () => fetchJson<T>(path, accessToken),
        policy,
        requestOptions
      );
    },
    clear() {
      broker.clear();
      profileRequests.clear();
    }
  };
}

export function createBungieSession(options: CreateBungieSessionOptions): BungieSession {
  const now = options.now ?? Date.now;
  const broker = new RequestBroker(now);
  const fetchJson = options.fetchJson ?? (<T>(path: string, accessToken?: string) =>
    fetchBungieJson<T>(path, {
      apiKey: options.apiKey,
      accessToken
    }));
  let authToken: string | undefined;
  let authScope = 0;

  function currentAuthScope(accessToken: string): string {
    if (authToken !== accessToken) {
      authToken = accessToken;
      authScope += 1;
      broker.deleteByPrefix("auth:");
    }
    return `auth:${authScope}`;
  }

  async function getMembership(accessToken: string): Promise<BungieMembership> {
    const scope = currentAuthScope(accessToken);
    const data = await broker.get(
      `${scope}:membership`,
      () => fetchJson<{
        destinyMemberships?: BungieMembership[];
        primaryMembershipId?: string;
      }>("/User/GetMembershipsForCurrentUser/", accessToken),
      policies.membership
    );
    const memberships = data.destinyMemberships ?? [];
    const selected = memberships.find((membership) => membership.membershipId === data.primaryMembershipId)
      ?? memberships[0];
    if (!selected) {
      throw new Error("当前 Bungie 账号没有 Destiny 档案");
    }
    return selected;
  }

  async function getProfile(
    membership: BungieMembership,
    accessToken: string
  ): Promise<BungieHomeProfileResponse> {
    const scope = currentAuthScope(accessToken);
    const components = "200,204";
    return broker.get(
      `${scope}:profile:${membership.membershipType}:${membership.membershipId}:${components}`,
      () => fetchJson<BungieHomeProfileResponse>(
        `/Destiny2/${membership.membershipType}/Profile/${membership.membershipId}/?components=${components}`,
        accessToken
      ),
      policies.profile
    );
  }

  async function getCharacterVendors(
    membership: BungieMembership,
    characterId: string,
    accessToken: string
  ): Promise<BungieCharacterVendorResponse> {
    const scope = currentAuthScope(accessToken);
    const components = "400,401,402,600";
    const response = await broker.get(
      `${scope}:character-vendors:${membership.membershipType}:${membership.membershipId}:${characterId}:${components}`,
      () => fetchJson<BungieVendorsResponse>(
        `/Destiny2/${membership.membershipType}/Profile/${membership.membershipId}/Character/${characterId}/Vendors/?components=${components}`,
        accessToken
      ),
      policies.characterVendors
    );
    return { ...response, characterId };
  }

  return {
    async getHomeSnapshot(sessionOptions = {}) {
      const includeMilestones = sessionOptions.includeMilestones !== false;
      const includeProfile = sessionOptions.includeProfile !== false;
      const includeVendors = sessionOptions.includeVendors !== false;
      const milestonesPromise = includeMilestones
        ? broker.get(
            "public:milestones",
            () => fetchJson<Record<string, BungiePublicMilestone>>("/Destiny2/Milestones/"),
            policies.milestones
          )
        : Promise.resolve(undefined);
      const publicVendorsPromise = includeVendors
        ? broker.get(
            "public:vendors:400,402",
            () => fetchJson<BungieVendorsResponse>("/Destiny2/Vendors/?components=400,402"),
            policies.publicVendors
          )
        : Promise.resolve(undefined);
      const accessToken = sessionOptions.accessToken;
      const authSnapshotPromise = accessToken
        ? loadAuthenticatedHomeSnapshot(accessToken, includeProfile, includeVendors)
        : Promise.resolve({
          membership: undefined,
          profile: undefined,
          characterVendors: []
        });
      const [milestonesResult, publicVendorsResult, authSnapshotResult] = await Promise.allSettled([
        milestonesPromise,
        publicVendorsPromise,
        authSnapshotPromise
      ]);
      const authSnapshot = authSnapshotResult.status === "fulfilled"
        ? authSnapshotResult.value
        : { membership: undefined, profile: undefined, characterVendors: [] };

      return {
        fetchedAt: new Date(now()).toISOString(),
        membership: authSnapshot.membership,
        milestones: milestonesResult.status === "fulfilled" ? milestonesResult.value : undefined,
        publicVendors: publicVendorsResult.status === "fulfilled" ? publicVendorsResult.value : undefined,
        profile: authSnapshot.profile,
        characterVendors: authSnapshot.characterVendors
      };
    }
  };

  async function loadAuthenticatedHomeSnapshot(
    accessToken: string,
    includeProfile: boolean,
    includeVendors: boolean
  ): Promise<{
    membership?: BungieMembership;
    profile?: BungieHomeProfileResponse;
    characterVendors: BungieCharacterVendorResponse[];
  }> {
    const membership = await getMembership(accessToken);
    const profile = await getProfile(membership, accessToken);
    const characterIds = Object.values(profile.characters?.data ?? {})
      .map((character) => character.characterId)
      .filter((characterId): characterId is string => Boolean(characterId));
    const vendorResults = includeVendors
      ? await Promise.allSettled(
          characterIds.map((characterId) => getCharacterVendors(membership, characterId, accessToken))
        )
      : [];
    return {
      membership,
      profile: includeProfile ? profile : undefined,
      characterVendors: vendorResults
        .filter((result): result is PromiseFulfilledResult<BungieCharacterVendorResponse> => result.status === "fulfilled")
        .map((result) => result.value)
    };
  }
}

class RequestBroker {
  private readonly entries = new Map<string, CacheEntry<unknown>>();

  constructor(private readonly now: () => number) {}

  get<T>(
    key: string,
    loader: () => Promise<T>,
    policy: CachePolicy,
    options: BungieRequestOptions = {}
  ): Promise<T> {
    if (options.forceRefresh) {
      this.entries.delete(key);
      return this.refresh(key, {
        freshUntil: 0,
        staleUntil: 0
      }, loader, policy);
    }
    const currentTime = this.now();
    const entry = this.entries.get(key) as CacheEntry<T> | undefined;
    if (entry?.value !== undefined && currentTime < entry.freshUntil) {
      return Promise.resolve(entry.value);
    }
    if (entry?.inFlight) {
      return entry.value !== undefined && currentTime < entry.staleUntil && !options.waitForRefresh
        ? Promise.resolve(entry.value)
        : entry.inFlight;
    }
    if (entry?.value !== undefined && currentTime < entry.staleUntil) {
      const refresh = this.refresh(key, entry, loader, policy);
      if (options.waitForRefresh) return refresh;
      void refresh.catch(() => undefined);
      return Promise.resolve(entry.value);
    }
    return this.refresh(key, entry ?? {
      freshUntil: 0,
      staleUntil: 0
    }, loader, policy);
  }

  getExisting<T>(
    key: string,
    options: BungieRequestOptions = {}
  ): Promise<T> | undefined {
    const entry = this.entries.get(key) as CacheEntry<T> | undefined;
    if (!entry?.loader || !entry.policy) return undefined;
    return this.get(key, entry.loader, entry.policy, options);
  }

  deleteByPrefix(prefix: string): void {
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) {
        this.entries.delete(key);
      }
    }
  }

  clear(): void {
    this.entries.clear();
  }

  private refresh<T>(
    key: string,
    entry: CacheEntry<T>,
    loader: () => Promise<T>,
    policy: CachePolicy
  ): Promise<T> {
    entry.loader = loader;
    entry.policy = policy;
    const inFlight = loader()
      .then((value) => {
        const completedAt = this.now();
        entry.value = value;
        entry.freshUntil = completedAt + policy.ttlMs;
        entry.staleUntil = completedAt + policy.staleMs;
        return value;
      })
      .finally(() => {
        entry.inFlight = undefined;
      });
    entry.inFlight = inFlight;
    this.entries.set(key, entry as CacheEntry<unknown>);
    return inFlight;
  }
}

function parseProfileRequest(path: string): {
  resource: string;
  components: Set<number>;
} | undefined {
  const queryIndex = path.indexOf("?");
  if (queryIndex < 0) return undefined;
  const resource = path.slice(0, queryIndex);
  if (!/^\/Destiny2\/[^/]+\/Profile\/[^/]+\/$/.test(resource)) return undefined;
  const params = new URLSearchParams(path.slice(queryIndex + 1));
  for (const key of params.keys()) {
    if (key !== "components") return undefined;
  }
  const components = new Set(
    (params.get("components") ?? "")
      .split(",")
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value))
  );
  return components.size ? { resource, components } : undefined;
}

function isSuperset(values: ReadonlySet<number>, requested: ReadonlySet<number>): boolean {
  for (const value of requested) {
    if (!values.has(value)) return false;
  }
  return true;
}
