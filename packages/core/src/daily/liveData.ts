import { fetchBungieJson } from "../bungie/client.js";
import type { D2Config } from "../config/schema.js";
import type { DefinitionComponentData, DefinitionRecord } from "../manifest/definitions.js";
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

export type BuildDailyLiveDataInput = {
  milestones?: Record<string, PublicMilestone>;
  publicVendors?: PublicVendorsResponse;
  definitions?: {
    activities?: DefinitionComponentData | null;
    milestones?: DefinitionComponentData | null;
    vendors?: DefinitionComponentData | null;
    items?: DefinitionComponentData | null;
  };
};

export type FetchDailyLiveDataOptions = {
  config: D2Config;
  definitions?: BuildDailyLiveDataInput["definitions"];
  fetchJson?: <T>(path: string) => Promise<T>;
};

export async function fetchDailyLiveData(options: FetchDailyLiveDataOptions): Promise<DailyLiveData> {
  const fetchJson = options.fetchJson ?? ((path) => fetchBungieJson(path, {
    apiKey: options.config.bungie.api_key
  }));

  const [milestonesResult, vendorsResult] = await Promise.allSettled([
    fetchJson<Record<string, PublicMilestone>>("/Destiny2/Milestones/"),
    fetchJson<PublicVendorsResponse>("/Destiny2/Vendors/?components=400,402")
  ]);

  return buildDailyLiveDataFromBungie({
    milestones: milestonesResult.status === "fulfilled" ? milestonesResult.value : undefined,
    publicVendors: vendorsResult.status === "fulfilled" ? vendorsResult.value : undefined,
    definitions: options.definitions
  });
}

export function buildDailyLiveDataFromBungie(input: BuildDailyLiveDataInput): Required<DailyLiveData> {
  const milestoneItems = mapMilestones(input.milestones ?? {}, input.definitions ?? {});
  const lostSectorItems = milestoneItems.lost_sector.length > 0
    ? milestoneItems.lost_sector
    : buildLostSectorFallback(input.definitions);
  return {
    rotations: milestoneItems.rotations,
    vendors: mapPublicVendors(input.publicVendors, input.definitions ?? {}),
    lost_sector: lostSectorItems,
    weekly_report: milestoneItems.weekly_report
  };
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
    const isLostSector = containsLostSector([milestoneName, ...names].filter(Boolean).join(" "));

    if (!milestoneName && !names.length) {
      continue;
    }

    if (names.length) {
      for (const name of names.slice(0, 6)) {
        const prefix = isLostSector ? "遗失区域" : milestoneName ?? "活动轮换";
        const item = {
          title: formatMilestoneItemTitle(prefix, name),
          subtitle: "Bungie 公共里程碑",
          description: milestoneDescription,
          source: "Bungie"
        };
        if (isLostSector) {
          lostSector.push(item);
        } else {
          rotations.push(item);
        }
      }
    } else if (!isLostSector && milestoneName) {
      rotations.push({
        title: milestoneName,
        subtitle: "Bungie 公共里程碑",
        description: milestoneDescription,
        source: "Bungie"
      });
    }

    if (!isLostSector && (milestoneName || names.length)) {
      const title = milestoneName
        ? `Bungie 公共里程碑：${milestoneName}`
        : `Bungie 公共活动：${names[0]}`;
      weeklyReport.push({
        title,
        subtitle: `非完整掉落地图；${names.slice(0, 3).join(" / ") || "Bungie 公共里程碑"}`,
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

function mapPublicVendors(
  publicVendors: PublicVendorsResponse | undefined,
  definitions: NonNullable<BuildDailyLiveDataInput["definitions"]>
): DailySummaryItem[] {
  const vendors = publicVendors?.vendors?.data ?? {};
  const sales = publicVendors?.sales?.data ?? {};
  const mapped = Object.entries(vendors).flatMap(([vendorKey, vendor]) => {
    const vendorHash = vendor.vendorHash ?? Number(vendorKey);
    const vendorName = definitionName(definitions.vendors, vendorHash);
    if (!vendorName) {
      return [];
    }
    const saleNames = collectPublicSales(sales[vendorKey])
      .map((sale) => saleItemLabel(definitions.items, sale))
      .filter(Boolean) as string[];

    return [buildVendorItem(vendorHash, vendorName, saleNames)];
  });

  const keyVendors = mapped.filter((item) => isKeyVendor(item.title));
  return uniqueByTitle(keyVendors.length ? keyVendors : mapped).slice(0, 10);
}

function buildVendorItem(
  vendorHash: number,
  name: string,
  saleNames: string[]
): DailySummaryItem {
  const vendorLabel = vendorRoleLabel(name, vendorHash);
  const salePreview = saleNames.slice(0, 8).join(" / ") || "库存名称暂不可读";

  return {
    title: name,
    subtitle: vendorLabel,
    description: salePreview,
    source: "Bungie 公共商人"
  };
}

/** Known vendor hashes for key daily/weekly vendors. */
const KEY_VENDOR_HASHES: Record<number, string> = {
  2190858386: "老九",        // Xur
  672118013: "枪匠",         // Banshee-44
  3500617033: "艾达-1",     // Ada-1
  3902439767: "圣人-14",    // Saint-14
  2255782930: "拉乎尔大师", // Master Rahool
};

function vendorRoleLabel(name: string, vendorHash: number): string {
  if (vendorHash === 2190858386) return "异域商人 · 周五至周二出现";
  if (vendorHash === 672118013) return "枪匠 · 每日模组刷新";
  if (vendorHash === 3500617033) return "护甲合成 · 每日模组刷新";
  if (vendorHash === 3902439767) return "试炼商人 · 周末出现";
  if (vendorHash === 2255782930) return "密码学家 · 记忆水晶兑换";
  return "公共商人库存";
}

function isKeyVendor(name: string): boolean {
  const lower = name.toLocaleLowerCase();
  return name.includes("老九")
    || lower.includes("xur")
    || lower.includes("xûr")
    || name.includes("枪匠")
    || lower.includes("banshee")
    || lower.includes("ada")
    || name.includes("艾达")
    || name.includes("圣人")
    || lower.includes("saint")
    || name.includes("拉乎尔")
    || lower.includes("rahool");
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

function saleItemLabel(definitions: DefinitionComponentData | null | undefined, sale: PublicSale): string | undefined {
  if (sale.itemHash === undefined) return undefined;
  const record = definitionRecord(definitions, sale.itemHash);
  const name = record?.displayProperties?.name?.trim();
  if (!name) return undefined;

  const itemDetails = [
    record?.itemTypeDisplayName?.trim(),
    record?.inventory?.tierTypeName?.trim()
  ].filter(Boolean);
  const costLabel = saleCostLabel(definitions, sale.costs);
  const details = [
    itemDetails.join("，"),
    costLabel
  ].filter(Boolean);

  return details.length ? `${name}（${details.join("；")}）` : name;
}

function saleCostLabel(
  definitions: DefinitionComponentData | null | undefined,
  costs: PublicSale["costs"]
): string | undefined {
  const labels = (costs ?? [])
    .map((cost) => {
      const currencyName = definitionName(definitions, cost.itemHash);
      if (!currencyName || cost.quantity === undefined) {
        return undefined;
      }
      return `${cost.quantity} ${currencyName}`;
    })
    .filter(Boolean) as string[];

  return labels.length ? labels.join(" + ") : undefined;
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
