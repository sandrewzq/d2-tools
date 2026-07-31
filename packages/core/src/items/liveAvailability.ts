import type { BungieJsonFetcher } from "../bungie/transport.js";
import type { DefinitionComponentData, DefinitionRecord } from "../manifest/definitions.js";
import type { BungieOAuthToken } from "../oauth/login.js";

export type LiveItemAvailabilityStatus =
  | "character_vendor"
  | "public_vendor"
  | "public_activity"
  | "manifest_only";

export type LiveItemAvailabilitySourceKind =
  | "character_vendor"
  | "public_vendor"
  | "public_activity";

export type LiveItemAvailabilitySource = {
  kind: LiveItemAvailabilitySourceKind;
  label: string;
  vendor_hash?: number;
  character_id?: string;
  offer_id?: string;
  inventory_path?: string;
  price_labels?: string[];
  refresh_at?: string;
  can_purchase?: boolean;
  purchase_requirements?: string[];
  failure_messages?: string[];
};

export type LiveItemAvailabilityEntry = {
  hash: number;
  status: LiveItemAvailabilityStatus;
  label: string;
  description: string;
  sources: LiveItemAvailabilitySource[];
};

export type LiveMilestoneClue = {
  hash?: number;
  label: string;
  description?: string;
};

export type LiveItemAvailability = {
  checked_at: string;
  items: Record<string, LiveItemAvailabilityEntry>;
  milestone_clues: LiveMilestoneClue[];
  account_scope: "public" | "character";
};

export type FetchLiveItemAvailabilityOptions = {
  itemHashes: number[];
  token?: BungieOAuthToken | null;
  definitions?: LiveAvailabilityDefinitions;
  fetchJson: BungieJsonFetcher;
  now?: () => Date;
};

export type BuildLiveItemAvailabilityInput = {
  itemHashes: number[];
  publicVendors?: VendorResponse;
  characterVendors?: CharacterVendorResponse[];
  milestones?: Record<string, PublicMilestone>;
  definitions?: LiveAvailabilityDefinitions;
  now?: () => Date;
};

export type LiveAvailabilityDefinitions = {
  vendors?: DefinitionComponentData | null;
  activities?: DefinitionComponentData | null;
  milestones?: DefinitionComponentData | null;
  items?: DefinitionComponentData | null;
};

type UserMembershipData = {
  destinyMemberships?: DestinyMembership[];
  primaryMembershipId?: string;
};

type DestinyMembership = {
  membershipId: string;
  membershipType: number;
};

type CharacterProfileResponse = {
  characters?: {
    data?: Record<string, { characterId?: string }>;
  };
};

type PublicMilestone = {
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
  rewards?: Array<{
    rewardItems?: Array<{
      itemHash?: number;
    }>;
  }>;
};

type Vendor = {
  vendorHash?: number;
  canPurchase?: boolean;
  nextRefreshDate?: string;
};

type VendorSale = {
  itemHash?: number;
  vendorItemIndex?: number;
  costs?: Array<{
    itemHash?: number;
    quantity?: number;
  }>;
  failureIndexes?: number[];
  saleStatus?: number;
  apiPurchasable?: boolean | null;
  overrideNextRefreshDate?: string;
};

type VendorSaleCollection = Record<string, VendorSale>;

type VendorSales = Record<string, VendorSale | VendorSaleCollection | undefined> & {
  saleItems?: VendorSaleCollection;
};

type VendorResponse = {
  vendors?: {
    data?: Record<string, Vendor>;
  };
  sales?: {
    data?: Record<string, VendorSales>;
  };
};

type CharacterVendorResponse = VendorResponse & {
  characterId: string;
};

export async function fetchLiveItemAvailability(
  options: FetchLiveItemAvailabilityOptions
): Promise<LiveItemAvailability> {
  const { fetchJson } = options;

  const [milestonesResult, publicVendorsResult] = await Promise.allSettled([
    fetchJson<Record<string, PublicMilestone>>("/Destiny2/Milestones/"),
    fetchJson<VendorResponse>("/Destiny2/Vendors/?components=400,402")
  ]);

  const characterVendors = options.token?.access_token
    ? await fetchCharacterVendorResponses({
      accessToken: options.token.access_token,
      fetchJson
    }).catch(() => [])
    : [];

  return buildLiveItemAvailabilityFromBungie({
    itemHashes: options.itemHashes,
    publicVendors: publicVendorsResult.status === "fulfilled" ? publicVendorsResult.value : undefined,
    characterVendors,
    milestones: milestonesResult.status === "fulfilled" ? milestonesResult.value : undefined,
    definitions: options.definitions,
    now: options.now
  });
}

export function buildLiveItemAvailabilityFromBungie(
  input: BuildLiveItemAvailabilityInput
): LiveItemAvailability {
  const itemHashes = [...new Set(input.itemHashes.map(Number).filter((hash) => Number.isFinite(hash)))];
  const items = Object.fromEntries(itemHashes.map((hash) => [
    String(hash),
    manifestOnlyEntry(hash)
  ]));
  const publicVendorSources = collectVendorSources(input.publicVendors, "public_vendor", input.definitions);
  const characterVendorResponses = input.characterVendors ?? [];
  const characterVendorSources = characterVendorResponses.flatMap((response) =>
    collectVendorSources(response, "character_vendor", input.definitions, response.characterId)
  );
  const publicActivitySources = collectMilestoneItemSources(input.milestones ?? {}, input.definitions);
  const availabilityTargets = buildAvailabilityTargets(itemHashes, input.definitions?.items);

  applySources(items, publicActivitySources, availabilityTargets);
  applySources(items, publicVendorSources, availabilityTargets);
  applySources(items, characterVendorSources, availabilityTargets);

  return {
    checked_at: (input.now ?? (() => new Date()))().toISOString(),
    items,
    milestone_clues: collectMilestoneClues(input.milestones ?? {}, input.definitions),
    account_scope: characterVendorResponses.length ? "character" : "public"
  };
}

async function fetchCharacterVendorResponses(input: {
  accessToken: string;
  fetchJson: <T>(path: string, accessToken?: string) => Promise<T>;
}): Promise<CharacterVendorResponse[]> {
  const memberships = await input.fetchJson<UserMembershipData>(
    "/User/GetMembershipsForCurrentUser/",
    input.accessToken
  );
  const membership = selectDestinyMembership(memberships);
  const profile = await input.fetchJson<CharacterProfileResponse>(
    `/Destiny2/${membership.membershipType}/Profile/${membership.membershipId}/?components=200`,
    input.accessToken
  );
  const characterIds = Object.values(profile.characters?.data ?? {})
    .map((character) => character.characterId)
    .filter((characterId): characterId is string => Boolean(characterId));
  const results = await Promise.allSettled(characterIds.map(async (characterId) => {
    const response = await input.fetchJson<VendorResponse>(
      `/Destiny2/${membership.membershipType}/Profile/${membership.membershipId}/Character/${characterId}/Vendors/?components=400,402`,
      input.accessToken
    );
    return { ...response, characterId };
  }));

  return results
    .filter((result): result is PromiseFulfilledResult<CharacterVendorResponse> => result.status === "fulfilled")
    .map((result) => result.value);
}

function selectDestinyMembership(data: UserMembershipData): DestinyMembership {
  const memberships = data.destinyMemberships ?? [];
  const selected = memberships.find((membership) => membership.membershipId === data.primaryMembershipId)
    ?? memberships[0];
  if (!selected) {
    throw new Error("当前 Bungie 账号没有 Destiny 档案");
  }

  return selected;
}

function collectVendorSources(
  response: VendorResponse | undefined,
  kind: "public_vendor" | "character_vendor",
  definitions: LiveAvailabilityDefinitions | undefined,
  characterId?: string
): Array<{ itemHash: number; source: LiveItemAvailabilitySource }> {
  const vendors = response?.vendors?.data ?? {};
  const sales = response?.sales?.data ?? {};
  const result: Array<{ itemHash: number; source: LiveItemAvailabilitySource }> = [];

  for (const [vendorKey, vendorSales] of Object.entries(sales)) {
    const vendor = vendors[vendorKey];
    const vendorHash = vendor?.vendorHash ?? Number(vendorKey);
    const vendorName = definitionName(definitions?.vendors, vendorHash) ?? `商人 ${vendorHash}`;
    for (const { sale, saleKey } of collectVendorSales(vendorSales)) {
      if (sale.itemHash === undefined) continue;
      const failureMessages = vendorFailureMessages(definitions?.vendors, vendorHash, sale.failureIndexes);
      const canPurchase = typeof vendor?.canPurchase === "boolean"
        ? vendor.canPurchase
          && sale.saleStatus === 0
          && !(sale.failureIndexes?.length)
        : undefined;
      result.push({
        itemHash: sale.itemHash,
        source: {
          kind,
          label: vendorName,
          vendor_hash: vendorHash,
          character_id: characterId,
          offer_id: `${vendorHash}:${characterId ?? "public"}:${sale.vendorItemIndex ?? saleKey}`,
          inventory_path: `库存条目 #${sale.vendorItemIndex ?? saleKey}`,
          price_labels: (sale.costs ?? []).flatMap((cost) => {
            if (typeof cost.itemHash !== "number" || typeof cost.quantity !== "number") return [];
            const currencyName = definitionName(definitions?.items, cost.itemHash) ?? `货币 ${cost.itemHash}`;
            return [`${cost.quantity} ${currencyName}`];
          }),
          refresh_at: sale.overrideNextRefreshDate ?? vendor?.nextRefreshDate,
          can_purchase: canPurchase,
          purchase_requirements: characterId ? ["当前角色库存"] : ["公开商人库存"],
          failure_messages: failureMessages
        }
      });
    }
  }

  return result;
}

function collectMilestoneItemSources(
  milestones: Record<string, PublicMilestone>,
  definitions: LiveAvailabilityDefinitions | undefined
): Array<{ itemHash: number; source: LiveItemAvailabilitySource }> {
  return Object.entries(milestones).flatMap(([hash, milestone]) => {
    const label = milestoneLabel(hash, milestone, definitions);
    return collectMilestoneItemHashes(milestone).map((itemHash) => ({
      itemHash,
      source: {
        kind: "public_activity" as const,
        label
      }
    }));
  });
}

function collectMilestoneClues(
  milestones: Record<string, PublicMilestone>,
  definitions: LiveAvailabilityDefinitions | undefined
): LiveMilestoneClue[] {
  return Object.entries(milestones)
    .map(([hash, milestone]) => ({
      hash: Number(hash),
      label: milestoneLabel(hash, milestone, definitions),
      description: milestone.displayProperties?.description
        ?? definitionRecord(definitions?.milestones, Number(hash))?.displayProperties?.description
    }))
    .filter((clue) => clue.label.trim() && !clue.label.startsWith("里程碑 "));
}

function milestoneLabel(
  hash: string,
  milestone: PublicMilestone,
  definitions: LiveAvailabilityDefinitions | undefined
): string {
  const milestoneName = milestone.displayProperties?.name?.trim()
    ?? definitionName(definitions?.milestones, Number(hash));
  const activityNames = (milestone.activities ?? [])
    .map((activity) => definitionName(definitions?.activities, activity.activityHash))
    .filter(Boolean) as string[];
  const questNames = (milestone.availableQuests ?? [])
    .map((quest) => definitionName(definitions?.items, quest.questItemHash))
    .filter(Boolean) as string[];
  const names = [...activityNames, ...questNames];

  if (milestoneName && names.length) {
    return `${milestoneName}：${names.slice(0, 2).join(" / ")}`;
  }
  return milestoneName ?? names[0] ?? `里程碑 ${hash}`;
}

function applySources(
  items: Record<string, LiveItemAvailabilityEntry>,
  sources: Array<{ itemHash: number; source: LiveItemAvailabilitySource }>,
  availabilityTargets: Map<number, string[]>
): void {
  for (const { itemHash, source } of sources) {
    for (const targetHash of availabilityTargets.get(itemHash) ?? [String(itemHash)]) {
      const entry = items[targetHash];
      if (!entry) continue;
      if (!entry.sources.some((item) => isSameLiveAvailabilitySource(item, source))) {
        entry.sources.push(source);
      }
      updateEntryStatus(entry);
    }
  }
}

function buildAvailabilityTargets(
  requestedHashes: number[],
  definitions: DefinitionComponentData | null | undefined
): Map<number, string[]> {
  const targets = new Map<number, Set<string>>();
  const familyTargets = new Map<number, Set<string>>();

  for (const hash of requestedHashes) {
    const targetHash = String(hash);
    addAvailabilityTarget(targets, hash, targetHash);
    const definition = definitionRecord(definitions, hash);
    for (const familyHash of availabilityFamilyHashes(definition)) {
      addAvailabilityTarget(familyTargets, familyHash, targetHash);
    }
  }

  if (familyTargets.size && definitions) {
    for (const [definitionKey, definition] of Object.entries(definitions)) {
      const hash = Number(definition.hash ?? definitionKey);
      if (!Number.isFinite(hash)) continue;
      for (const familyHash of availabilityFamilyHashes(definition)) {
        for (const targetHash of familyTargets.get(familyHash) ?? []) {
          addAvailabilityTarget(targets, hash, targetHash);
        }
      }
    }
  }

  return new Map([...targets].map(([hash, targetHashes]) => [hash, [...targetHashes]]));
}

function availabilityFamilyHashes(definition: DefinitionRecord | undefined): number[] {
  const weaponPatternHash = definition?.translationBlock?.weaponPatternHash;
  return typeof weaponPatternHash === "number" && weaponPatternHash > 0
    ? [weaponPatternHash]
    : [];
}

function addAvailabilityTarget(
  targets: Map<number, Set<string>>,
  sourceHash: number,
  targetHash: string
): void {
  const current = targets.get(sourceHash) ?? new Set<string>();
  current.add(targetHash);
  targets.set(sourceHash, current);
}

function isSameLiveAvailabilitySource(
  left: LiveItemAvailabilitySource,
  right: LiveItemAvailabilitySource
): boolean {
  if (left.kind !== right.kind) return false;
  if (left.offer_id !== undefined || right.offer_id !== undefined) {
    return left.offer_id === right.offer_id;
  }
  if (left.vendor_hash !== undefined || right.vendor_hash !== undefined) {
    return left.vendor_hash === right.vendor_hash && left.character_id === right.character_id;
  }
  return left.label === right.label;
}

function updateEntryStatus(entry: LiveItemAvailabilityEntry): void {
  if (entry.sources.some((source) => source.kind === "character_vendor")) {
    entry.status = "character_vendor";
    entry.label = "当前角色商人售卖";
    entry.description = "已通过当前账号的角色商人库存确认该装备在售。";
    return;
  }
  if (entry.sources.some((source) => source.kind === "public_vendor")) {
    entry.status = "public_vendor";
    entry.label = "当前公开商人售卖";
    entry.description = "Bungie 当前公开商人库存命中该装备。";
    return;
  }
  if (entry.sources.some((source) => source.kind === "public_activity")) {
    entry.status = "public_activity";
    entry.label = "当前公共活动线索";
    entry.description = "Bungie 当前公共里程碑直接命中该装备奖励线索。";
  }
}

function manifestOnlyEntry(hash: number): LiveItemAvailabilityEntry {
  return {
    hash,
    status: "manifest_only",
    label: "当前实时数据未命中",
    description: "当前公开商人、角色商人和公共里程碑未直接命中；只保留 Manifest 来源线索。",
    sources: []
  };
}

function collectVendorSales(vendorSales: VendorSales | undefined): Array<{ sale: VendorSale; saleKey: string }> {
  if (!vendorSales) {
    return [];
  }

  const saleItems = Object.entries(vendorSales.saleItems ?? {}).map(([saleKey, sale]) => ({ sale, saleKey }));
  const directSales = Object.entries(vendorSales).flatMap(([key, value]) => {
    if (key === "saleItems" || value === undefined) {
      return [];
    }
    if (isVendorSale(value)) {
      return [{ sale: value, saleKey: key }];
    }
    return Object.entries(value)
      .filter((entry): entry is [string, VendorSale] => isVendorSale(entry[1]))
      .map(([saleKey, sale]) => ({ sale, saleKey: `${key}:${saleKey}` }));
  });

  return [...saleItems, ...directSales].filter(({ sale }) => isVendorSale(sale));
}

function isVendorSale(value: unknown): value is VendorSale {
  return typeof value === "object"
    && value !== null
    && typeof (value as VendorSale).itemHash === "number";
}

function collectMilestoneItemHashes(milestone: PublicMilestone): number[] {
  return [
    ...(milestone.availableQuests ?? []).map((quest) => quest.questItemHash),
    ...(milestone.rewards ?? []).flatMap((reward) =>
      (reward.rewardItems ?? []).map((item) => item.itemHash)
    )
  ].filter((hash): hash is number => typeof hash === "number");
}

function definitionName(definitions: DefinitionComponentData | null | undefined, hash: number | undefined): string | undefined {
  if (hash === undefined) return undefined;
  return definitionRecord(definitions, hash)?.displayProperties?.name?.trim() || undefined;
}

function definitionRecord(definitions: DefinitionComponentData | null | undefined, hash: number | undefined): DefinitionRecord | undefined {
  if (hash === undefined) return undefined;
  return definitions?.[String(hash)] as DefinitionRecord | undefined;
}

function vendorFailureMessages(
  definitions: DefinitionComponentData | null | undefined,
  vendorHash: number,
  failureIndexes: number[] | undefined
): string[] {
  const definition = definitionRecord(definitions, vendorHash);
  const failureStrings = definition?.["failureStrings"];
  if (!Array.isArray(failureStrings)) return [];
  return (failureIndexes ?? []).flatMap((index) => {
    const message = failureStrings[index];
    return typeof message === "string" && message.trim() ? [message.trim()] : [];
  });
}
