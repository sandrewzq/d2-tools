import { fetchBungieJson } from "../bungie/client.js";
import type { D2Config } from "../config/schema.js";
import type { DefinitionComponentData, DefinitionRecord } from "../manifest/definitions.js";
import type { BungieOAuthToken } from "../oauth/login.js";
import { buildLostSectorData } from "./lostSectors.js";
import type { DailyLiveData, DailySummaryItem } from "./summary.js";

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
};

type PublicVendor = {
  vendorHash?: number;
};

type PublicSale = {
  itemHash?: number;
  costs?: Array<{
    itemHash?: number;
    quantity?: number;
  }>;
};

type PublicSaleCollection = Record<string, PublicSale>;

type PublicVendorSales = Record<string, PublicSale | PublicSaleCollection | undefined> & {
  saleItems?: PublicSaleCollection;
};

type PublicVendorsResponse = {
  vendors?: {
    data?: Record<string, PublicVendor>;
  };
  sales?: {
    data?: Record<string, PublicVendorSales>;
  };
};

type CharacterVendorResponse = PublicVendorsResponse & {
  characterId: string;
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

export type BuildDailyLiveDataInput = {
  milestones?: Record<string, PublicMilestone>;
  publicVendors?: PublicVendorsResponse;
  characterVendors?: CharacterVendorResponse[];
  definitions?: {
    activities?: DefinitionComponentData | null;
    milestones?: DefinitionComponentData | null;
    vendors?: DefinitionComponentData | null;
    items?: DefinitionComponentData | null;
  };
};

export type FetchDailyLiveDataOptions = {
  config: D2Config;
  token?: BungieOAuthToken | null;
  definitions?: BuildDailyLiveDataInput["definitions"];
  fetchJson?: <T>(path: string, accessToken?: string) => Promise<T>;
};

export async function fetchDailyLiveData(options: FetchDailyLiveDataOptions): Promise<DailyLiveData> {
  const fetchJson = options.fetchJson ?? ((path, accessToken) => fetchBungieJson(path, {
    apiKey: options.config.bungie.api_key,
    accessToken
  }));

  const [milestonesResult, vendorsResult] = await Promise.allSettled([
    fetchJson<Record<string, PublicMilestone>>("/Destiny2/Milestones/"),
    fetchJson<PublicVendorsResponse>("/Destiny2/Vendors/?components=400,402")
  ]);
  const characterVendors = options.token?.access_token
    ? await fetchCharacterVendorResponses({
      accessToken: options.token.access_token,
      fetchJson
    }).catch(() => [])
    : [];

  return buildDailyLiveDataFromBungie({
    milestones: milestonesResult.status === "fulfilled" ? milestonesResult.value : undefined,
    publicVendors: vendorsResult.status === "fulfilled" ? vendorsResult.value : undefined,
    characterVendors,
    definitions: options.definitions
  });
}

export function buildDailyLiveDataFromBungie(input: BuildDailyLiveDataInput): Required<DailyLiveData> {
  const milestoneItems = mapMilestones(input.milestones ?? {}, input.definitions ?? {});
  const manifestLostSectorItems = buildLostSectorFallback(input.definitions);
  const lostSectorItems = manifestLostSectorItems.length > 1
    ? manifestLostSectorItems
    : milestoneItems.lost_sector.length > 0
      ? milestoneItems.lost_sector
      : manifestLostSectorItems;
  return {
    rotations: milestoneItems.rotations,
    vendors: mapVendors(input.publicVendors, input.characterVendors ?? [], input.definitions ?? {}),
    lost_sector: lostSectorItems,
    weekly_report: milestoneItems.weekly_report
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
    const response = await input.fetchJson<PublicVendorsResponse>(
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

function buildLostSectorFallback(
  definitions: BuildDailyLiveDataInput["definitions"]
): DailySummaryItem[] {
  if (!definitions?.activities) return [];
  const { items } = buildLostSectorData(definitions.activities);
  return items;
}

function mapMilestones(
  milestones: Record<string, PublicMilestone>,
  definitions: NonNullable<BuildDailyLiveDataInput["definitions"]>
): Pick<Required<DailyLiveData>, "rotations" | "lost_sector" | "weekly_report"> {
  const rotations: DailySummaryItem[] = [];
  const lostSector: DailySummaryItem[] = [];
  const weeklyReport: DailySummaryItem[] = [];

  for (const [hash, milestone] of Object.entries(milestones)) {
    const milestoneDefinition = definitionRecord(definitions.milestones, Number(hash));
    const milestoneName = readableName(milestone) ?? milestoneDefinition?.displayProperties?.name?.trim();
    const milestoneDescription = milestone.displayProperties?.description
      ?? milestoneDefinition?.displayProperties?.description;
    const activityNames = (milestone.activities ?? [])
      .map((activity) => definitionName(definitions.activities, activity.activityHash))
      .filter(Boolean) as string[];
    const questNames = (milestone.availableQuests ?? [])
      .map((quest) => definitionName(definitions.items, quest.questItemHash))
      .filter(Boolean) as string[];
    const names = [...activityNames, ...questNames];
    const displayedNames = names.slice(0, 6);
    const milestoneIsLostSector = containsLostSector(milestoneName ?? "");
    const hasExplicitLostSectorName = displayedNames.some(containsLostSector);
    const nonLostSectorNames: string[] = [];

    if (!milestoneName && !names.length) {
      continue;
    }

    if (displayedNames.length) {
      for (const name of displayedNames) {
        const itemIsLostSector = containsLostSector(name) || (milestoneIsLostSector && !hasExplicitLostSectorName);
        const prefix = itemIsLostSector ? "遗失区域" : milestoneName ?? "活动轮换";
        const item = {
          title: formatMilestoneItemTitle(prefix, name),
          subtitle: "Bungie 公共里程碑",
          description: milestoneDescription,
          source: "Bungie"
        };
        if (itemIsLostSector) {
          lostSector.push(item);
        } else {
          nonLostSectorNames.push(name);
          rotations.push(item);
        }
      }
    } else if (milestoneName) {
      const item = {
        title: milestoneName,
        subtitle: "Bungie 公共里程碑",
        description: milestoneDescription,
        source: "Bungie"
      };
      if (milestoneIsLostSector) {
        lostSector.push(item);
      } else {
        rotations.push(item);
      }
    }

    const shouldIncludeWeeklyReport = displayedNames.length
      ? nonLostSectorNames.length > 0
      : Boolean(milestoneName && !milestoneIsLostSector);
    if (shouldIncludeWeeklyReport) {
      const title = milestoneName
        ? `Bungie 公共里程碑：${milestoneName}`
        : `Bungie 公共活动：${nonLostSectorNames[0]}`;
      weeklyReport.push({
        title,
        subtitle: `非完整掉落地图；${nonLostSectorNames.slice(0, 3).join(" / ") || "Bungie 公共里程碑"}`,
        description: milestoneDescription,
        source: "Bungie"
      });
    }
  }

  return {
    rotations: uniqueByTitle(rotations).slice(0, 6),
    lost_sector: uniqueByTitle(lostSector).slice(0, 4),
    weekly_report: uniqueByTitle(weeklyReport).slice(0, 4)
  };
}

function mapVendors(
  publicVendors: PublicVendorsResponse | undefined,
  characterVendors: CharacterVendorResponse[],
  definitions: NonNullable<BuildDailyLiveDataInput["definitions"]>
): DailySummaryItem[] {
  const publicItems = mapVendorResponse(publicVendors, definitions, "Bungie 公共商人");
  const characterItems = characterVendors.flatMap((response) =>
    mapVendorResponse(response, definitions, "Bungie 登录角色商人")
  );
  const mapped = [...publicItems, ...characterItems];
  return uniqueByVendorIdentity(mapped)
    .sort((left, right) => vendorSortRank(left) - vendorSortRank(right))
    .slice(0, 20);
}

function mapVendorResponse(
  response: PublicVendorsResponse | undefined,
  definitions: NonNullable<BuildDailyLiveDataInput["definitions"]>,
  sourceLabel: "Bungie 公共商人" | "Bungie 登录角色商人"
): DailySummaryItem[] {
  const vendors = response?.vendors?.data ?? {};
  const sales = response?.sales?.data ?? {};
  const mapped = Object.entries(vendors).flatMap(([vendorKey, vendor]) => {
    const vendorHash = vendor.vendorHash ?? Number(vendorKey);
    const vendorName = definitionName(definitions.vendors, vendorHash) ?? "等待资料库解析的商人";
    const vendorIconUrl = definitionIcon(definitions.vendors, vendorHash);
    const saleItems = collectPublicSales(sales[vendorKey])
      .map((sale) => saleItemSummaryItem(definitions.items, sale, sourceLabel))
      .filter(Boolean) as DailySummaryItem[];

    return [buildVendorItem(vendorHash, vendorName, vendorIconUrl, saleItems, sourceLabel)];
  });

  return mapped;
}

function buildVendorItem(
  vendorHash: number,
  name: string,
  iconUrl: string | undefined,
  saleItems: DailySummaryItem[],
  sourceLabel: "Bungie 公共商人" | "Bungie 登录角色商人"
): DailySummaryItem {
  const vendorLabel = vendorRoleLabel(vendorHash);
  const salePreview = saleItems
    .map((item) => saleItemLabelFromSummary(item))
    .slice(0, 8)
    .join(" / ") || "库存名称暂不可读";

  const item: DailySummaryItem = {
    title: name,
    subtitle: vendorLabel,
    description: salePreview,
    source: sourceLabel,
    vendorHash,
    iconUrl,
    items: saleItems.slice(0, 12)
  };
  return item;
}

const KEY_VENDOR_ORDER = [
  2190858386,
  672118013,
  3500617033,
  3902439767,
  2255782930
];

function vendorSortRank(item: DailySummaryItem): number {
  const index = KEY_VENDOR_ORDER.findIndex((hash) => hash === item.vendorHash);
  return index >= 0 ? index : KEY_VENDOR_ORDER.length;
}

function vendorRoleLabel(vendorHash: number): string {
  if (vendorHash === 2190858386) return "周末商人库存";
  if (KEY_VENDOR_ORDER.includes(vendorHash)) return "登录角色或公共商人库存";
  return "公共商人库存";
}

function collectPublicSales(vendorSales: PublicVendorSales | undefined): PublicSale[] {
  if (!vendorSales) {
    return [];
  }

  const saleItems = Object.values(vendorSales.saleItems ?? {});
  const directSales = Object.entries(vendorSales).flatMap(([key, value]) => {
    if (key === "saleItems" || value === undefined) {
      return [];
    }
    if (isPublicSale(value)) {
      return [value];
    }
    return Object.values(value).filter(isPublicSale);
  });

  return [...saleItems, ...directSales].filter(isPublicSale);
}

function isPublicSale(value: unknown): value is PublicSale {
  return typeof value === "object"
    && value !== null
    && typeof (value as PublicSale).itemHash === "number";
}

function readableName(record: PublicMilestone): string | undefined {
  return record.displayProperties?.name?.trim() || undefined;
}

function definitionName(definitions: DefinitionComponentData | null | undefined, hash: number | undefined): string | undefined {
  if (hash === undefined) return undefined;
  const record = definitionRecord(definitions, hash);
  return record?.displayProperties?.name?.trim() || undefined;
}

function definitionIcon(definitions: DefinitionComponentData | null | undefined, hash: number | undefined): string | undefined {
  if (hash === undefined) return undefined;
  const record = definitionRecord(definitions, hash);
  return record?.displayProperties?.icon?.trim() || undefined;
}

function formatMilestoneItemTitle(prefix: string, name: string): string {
  if (name === prefix || name.startsWith(`${prefix}:`) || name.startsWith(`${prefix}：`)) {
    return name;
  }
  return `${prefix}：${name}`;
}

function definitionRecord(definitions: DefinitionComponentData | null | undefined, hash: number | undefined): DefinitionRecord | undefined {
  if (hash === undefined) return undefined;
  return definitions?.[String(hash)] as DefinitionRecord | undefined;
}

function saleItemSummaryItem(
  definitions: DefinitionComponentData | null | undefined,
  sale: PublicSale,
  sourceLabel = "Bungie 公共商人"
): DailySummaryItem | undefined {
  if (sale.itemHash === undefined) return undefined;
  const record = definitionRecord(definitions, sale.itemHash);
  const name = record?.displayProperties?.name?.trim();
  if (!name) return undefined;

  const itemDetails = [
    record?.itemTypeDisplayName?.trim(),
    record?.inventory?.tierTypeName?.trim()
  ].filter(Boolean);
  const cost = saleCostSummary(definitions, sale.costs);
  const details = [
    itemDetails.join("，"),
    cost?.label
  ].filter(Boolean);

  return {
    title: name,
    subtitle: itemDetails.join("，") || undefined,
    description: cost?.label,
    source: sourceLabel,
    iconUrl: record?.displayProperties?.icon?.trim() || undefined,
    costIconUrl: cost?.iconUrl
  };
}

function saleItemLabelFromSummary(item: DailySummaryItem): string {
  const details = [
    item.subtitle,
    item.description
  ].filter(Boolean);

  return details.length ? `${item.title}（${details.join("；")}）` : item.title;
}

function saleCostSummary(
  definitions: DefinitionComponentData | null | undefined,
  costs: PublicSale["costs"]
): { label: string; iconUrl?: string } | undefined {
  const labels = (costs ?? [])
    .map((cost) => {
      const currencyName = definitionName(definitions, cost.itemHash);
      if (!currencyName || cost.quantity === undefined) {
        return undefined;
      }
      return `${cost.quantity} ${currencyName}`;
    })
    .filter(Boolean) as string[];

  if (!labels.length) return undefined;

  const firstCostWithIcon = (costs ?? [])
    .map((cost) => definitionRecord(definitions, cost.itemHash))
    .find((record) => record?.displayProperties?.icon?.trim());

  return {
    label: labels.join(" + "),
    iconUrl: firstCostWithIcon?.displayProperties?.icon?.trim()
  };
}

function containsLostSector(value: string): boolean {
  const lower = value.toLocaleLowerCase();
  return value.includes("遗失区域") || lower.includes("lost sector");
}

function uniqueByTitle(items: DailySummaryItem[]): DailySummaryItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.title)) return false;
    seen.add(item.title);
    return true;
  });
}

function uniqueByVendorIdentity(items: DailySummaryItem[]): DailySummaryItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.vendorHash !== undefined ? `vendor:${item.vendorHash}` : `title:${item.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
