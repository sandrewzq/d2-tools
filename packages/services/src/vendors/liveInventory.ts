import {
  buildVendorInventorySnapshot,
  createVendorCacheContextKey,
  type VendorCharacterContext,
  type VendorCharacterResponseInput,
  type VendorInventoryDefinitions,
  type VendorInventorySnapshot,
  type VendorProgression,
  type VendorResponseInput
} from "@d2-tools/core/vendors/inventory";

export { createVendorCacheContextKey } from "@d2-tools/core/vendors/inventory";

const ghostBucketHash = 4023194814;
const profileComponents = "205,305";
const vendorListComponents = "400,401,402,600";
const vendorDetailComponents = "304,305";
const vendorDetailConcurrency = 4;

type DefinitionRecord = {
  vendorIdentifier?: string;
  displayProperties?: { name?: string; description?: string; icon?: string };
  itemTypeDisplayName?: string;
  inventory?: { tierTypeName?: string; bucketTypeHash?: number };
  plug?: { plugCategoryIdentifier?: string };
  traitIds?: string[];
  failureStrings?: string[];
  itemList?: Array<{
    itemHash?: number;
    displayCategoryIndex?: number;
    redirectToSaleIndexes?: number[];
  }>;
  displayCategories?: Array<{
    identifier?: string;
    displayProperties?: { name?: string };
  }>;
  preview?: { previewVendorHash?: number };
  investmentStats?: Array<{
    statTypeHash?: number;
    value?: number;
    isConditionallyActive?: boolean;
  }>;
};

export type FetchVendorInventorySnapshotOptions = {
  apiKey: string;
  accessToken: string;
  membershipType: number;
  membershipId: string;
  characterIds: string[];
  detailVendorHashes?: number[];
  definitions: {
    vendors: Record<string, DefinitionRecord>;
    items: Record<string, DefinitionRecord>;
  };
  fetchJson?: <T>(path: string, accessToken?: string) => Promise<T>;
  fetchImpl?: typeof fetch;
  now?: () => Date;
};

type ProfileResponse = {
  characterEquipment?: {
    data?: Record<string, { items?: Array<{ itemHash?: number; itemInstanceId?: string }> }>;
  };
  itemComponents?: {
    sockets?: {
      data?: Record<string, { sockets?: Array<{ plugHash?: number }> }>;
    };
  };
};

type VendorListResponse = {
  vendors?: { data?: Record<string, RawVendorComponent> };
  categories?: { data?: Record<string, { categories?: RawVendorCategory[] }> };
  sales?: { data?: Record<string, { saleItems?: Record<string, RawSaleItem> }> };
  currencyLookups?: { data?: CurrencyLookupData };
};

type CurrencyLookupData = {
  itemQuantities?: Record<string, number> | Array<{ itemHash?: number; quantity?: number }>;
  items?: Record<string, { quantity?: number }>;
};

type VendorDetailResponse = {
  itemComponents?: {
    stats?: {
      data?: Record<string, { stats?: Record<string, { value?: number }> }>;
    };
    sockets?: {
      data?: Record<string, { sockets?: Array<{ plugHash?: number }> }>;
    };
  };
};

type RawVendorComponent = {
  vendorHash?: number;
  canPurchase?: boolean;
  nextRefreshDate?: string;
  progression?: VendorProgression;
};

type RawVendorCategory = {
  displayCategoryIndex?: number;
  itemIndexes?: number[];
};

type RawSaleItem = {
  vendorItemIndex?: number;
  itemHash?: number;
  quantity?: number;
  costs?: Array<{ itemHash?: number; quantity?: number }>;
  failureIndexes?: number[];
  saleStatus?: number;
  apiPurchasable?: boolean | null;
};

export async function fetchVendorInventorySnapshot(
  options: FetchVendorInventorySnapshotOptions
): Promise<VendorInventorySnapshot> {
  const fetchJson = options.fetchJson ?? createFetchJson(options);
  const now = options.now ?? (() => new Date());
  const profileRequest = fetchJson<ProfileResponse>(
    `/Destiny2/${options.membershipType}/Profile/${options.membershipId}/?components=${profileComponents}`,
    options.accessToken
  );
  const listRequest = Promise.allSettled(options.characterIds.map(async (characterId) => ({
    characterId,
    response: await fetchJson<VendorListResponse>(
      `/Destiny2/${options.membershipType}/Profile/${options.membershipId}/Character/${characterId}/Vendors/?components=${vendorListComponents}`,
      options.accessToken
    )
  })));
  const [profile, listResults] = await Promise.all([profileRequest, listRequest]);
  const characterContexts = buildCharacterContexts(
    profile,
    options.characterIds,
    options.definitions.items
  );
  const failedCharacterIds: string[] = [];
  const failedVendorDetails: Array<{ characterId: string; vendorHash: number; message: string }> = [];
  const characterResponses: VendorCharacterResponseInput[] = [];
  const currencyBalances: Record<string, number> = {};
  const requestedDetailVendorHashes = new Set<number>();

  for (let index = 0; index < listResults.length; index += 1) {
    const result = listResults[index];
    const characterId = options.characterIds[index];
    if (result.status === "rejected") {
      failedCharacterIds.push(characterId);
      continue;
    }

    mergeCurrencyBalances(currencyBalances, result.value.response.currencyLookups?.data);
    const details = new Map<number, VendorDetailResponse>();
    const detailVendorHashes = options.detailVendorHashes
      ?? discoverVendorHashes(
        result.value.response,
        options.definitions.vendors,
        options.definitions.items
      );
    detailVendorHashes.forEach((vendorHash) => requestedDetailVendorHashes.add(vendorHash));
    const detailResults = await mapSettledWithConcurrency(
      detailVendorHashes,
      vendorDetailConcurrency,
      async (vendorHash) => ({
        vendorHash,
        response: await fetchJson<VendorDetailResponse>(
          `/Destiny2/${options.membershipType}/Profile/${options.membershipId}/Character/${characterId}/Vendors/${vendorHash}/?components=${vendorDetailComponents}`,
          options.accessToken
        )
      })
    );

    for (let detailIndex = 0; detailIndex < detailResults.length; detailIndex += 1) {
      const detailResult = detailResults[detailIndex];
      const vendorHash = detailVendorHashes[detailIndex];
      if (detailResult.status === "fulfilled") {
        details.set(vendorHash, detailResult.value.response);
      } else {
        failedVendorDetails.push({
          characterId,
          vendorHash,
          message: errorMessage(detailResult.reason)
        });
      }
    }

    characterResponses.push({
      characterId,
      vendors: mapVendorResponses(result.value.response, details, options.definitions)
    });
  }

  if (!characterResponses.length) {
    throw new Error("无法读取任何角色的商人库存");
  }

  return buildVendorInventorySnapshot({
    fetchedAt: now().toISOString(),
    characterContexts,
    characterResponses,
    failedCharacterIds,
    failedVendorDetails,
    currencyBalances,
    detailVendorHashes: [...requestedDetailVendorHashes],
    definitions: mapDefinitions(options.definitions, characterResponses)
  });
}

function discoverVendorHashes(
  response: VendorListResponse,
  vendorDefinitions: Record<string, DefinitionRecord>,
  itemDefinitions: Record<string, DefinitionRecord>
): number[] {
  const previewVendorHashes = collectPreviewVendorHashes(response, itemDefinitions);
  return Object.keys(response.sales?.data ?? {})
    .filter((vendorHash) => shouldIncludeTopLevelVendor(
      response.vendors?.data?.[vendorHash],
      vendorDefinitions[vendorHash],
      previewVendorHashes.has(Number(vendorHash))
    ))
    .map(Number)
    .filter((vendorHash) => Number.isInteger(vendorHash) && vendorHash > 0);
}

function shouldIncludeTopLevelVendor(
  vendor: RawVendorComponent | undefined,
  definition: DefinitionRecord | undefined,
  referencedByPreview = false
): boolean {
  if (
    definition?.vendorIdentifier === "TOWER_NINE"
    || definition?.vendorIdentifier === "TOWER_NINE_OFFERS"
    || definition?.vendorIdentifier === "TOWER_NINE_GEAR"
  ) return true;
  if (definition?.vendorIdentifier === "30TH_ANNIVERSARY_XUR") return false;
  return referencedByPreview || vendor?.canPurchase === true;
}

async function mapSettledWithConcurrency<T, TResult>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<TResult>
): Promise<Array<PromiseSettledResult<TResult>>> {
  const results = new Array<PromiseSettledResult<TResult>>(items.length);
  let nextIndex = 0;

  async function run(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        results[index] = { status: "fulfilled", value: await worker(items[index]) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(Math.max(1, concurrency), items.length) }, () => run())
  );
  return results;
}

function buildCharacterContexts(
  profile: ProfileResponse,
  characterIds: string[],
  itemDefinitions: Record<string, DefinitionRecord>
): Record<string, VendorCharacterContext> {
  return Object.fromEntries(characterIds.map((characterId) => {
    const equipment = profile.characterEquipment?.data?.[characterId]?.items ?? [];
    const ghost = equipment.find((item) =>
      itemDefinitions[String(item.itemHash)]?.inventory?.bucketTypeHash === ghostBucketHash
    );
    const sockets = ghost?.itemInstanceId
      ? profile.itemComponents?.sockets?.data?.[ghost.itemInstanceId]?.sockets ?? []
      : [];
    const armorerMod = sockets
      .map((socket) => socket.plugHash)
      .find((plugHash): plugHash is number =>
        plugHash !== undefined && isArmorerDefinition(itemDefinitions[String(plugHash)])
      );
    const armorerDefinition = armorerMod === undefined ? undefined : itemDefinitions[String(armorerMod)];
    return [characterId, {
      characterId,
      armorerModHash: armorerMod ?? null,
      armorerModName: armorerDefinition?.displayProperties?.name?.trim() || null
    }];
  }));
}

function isArmorerDefinition(definition: DefinitionRecord | undefined): boolean {
  const category = definition?.plug?.plugCategoryIdentifier?.toLowerCase() ?? "";
  const traits = definition?.traitIds?.map((trait) => trait.toLowerCase()) ?? [];
  return category.includes("armorer") || traits.some((trait) => trait.includes("armorer"));
}

function mapVendorResponses(
  list: VendorListResponse,
  details: Map<number, VendorDetailResponse>,
  definitions: FetchVendorInventorySnapshotOptions["definitions"]
): Record<string, VendorResponseInput> {
  const mapped: Record<string, VendorResponseInput> = {};
  const previewVendorHashes = collectPreviewVendorHashes(list, definitions.items);
  for (const [vendorKey, salesComponent] of Object.entries(list.sales?.data ?? {})) {
    const vendorHash = Number(vendorKey);
    const vendor = list.vendors?.data?.[vendorKey] ?? {};
    const vendorDefinition = definitions.vendors[vendorKey];
    if (!shouldIncludeTopLevelVendor(vendor, vendorDefinition, previewVendorHashes.has(vendorHash))) continue;
    const detail = details.get(vendorHash);
    const categories = list.categories?.data?.[vendorKey]?.categories ?? [];
    mapped[vendorKey] = {
      vendorHash: vendor.vendorHash ?? vendorHash,
      canPurchase: vendor.canPurchase ?? false,
      nextRefreshAt: vendor.nextRefreshDate,
      progression: vendor.progression,
      categories: categories.map((category) => ({
        categoryIndex: category.displayCategoryIndex ?? -1,
        name: vendorDefinition?.displayCategories?.[category.displayCategoryIndex ?? -1]
          ?.displayProperties?.name?.trim() || "其他",
        identifier: vendorDefinition?.displayCategories?.[category.displayCategoryIndex ?? -1]
          ?.identifier?.trim() || undefined,
        itemIndexes: category.itemIndexes ?? []
      })),
      saleItems: Object.fromEntries(Object.entries(salesComponent.saleItems ?? {}).map(([itemKey, sale]) => [
        itemKey,
        {
          vendorItemIndex: sale.vendorItemIndex ?? Number(itemKey),
          itemHash: sale.itemHash ?? 0,
          quantity: sale.quantity ?? 1,
          costs: (sale.costs ?? []).map((cost) => ({
            itemHash: cost.itemHash ?? 0,
            quantity: cost.quantity ?? 0
          })),
          failureIndexes: sale.failureIndexes ?? [],
          saleStatus: sale.saleStatus ?? 0,
          apiPurchasable: sale.apiPurchasable ?? null
        }
      ])),
      stats: mapStats(detail),
      sockets: mapSockets(detail)
    };
  }
  return mapped;
}

function collectPreviewVendorHashes(
  response: VendorListResponse,
  itemDefinitions: Record<string, DefinitionRecord>
): Set<number> {
  return new Set(Object.values(response.sales?.data ?? {}).flatMap((sales) =>
    Object.values(sales.saleItems ?? {}).flatMap((sale) => {
      const previewVendorHash = itemDefinitions[String(sale.itemHash)]?.preview?.previewVendorHash;
      return previewVendorHash === undefined ? [] : [previewVendorHash];
    })
  ));
}

function mapStats(detail: VendorDetailResponse | undefined): Record<string, Record<string, number>> {
  return Object.fromEntries(Object.entries(detail?.itemComponents?.stats?.data ?? {}).map(([index, component]) => [
    index,
    Object.fromEntries(Object.entries(component.stats ?? {}).map(([hash, stat]) => [hash, stat.value ?? 0]))
  ]));
}

function mapSockets(detail: VendorDetailResponse | undefined): Record<string, number[]> {
  return Object.fromEntries(Object.entries(detail?.itemComponents?.sockets?.data ?? {}).map(([index, component]) => [
    index,
    (component.sockets ?? []).map((socket) => socket.plugHash).filter((hash): hash is number => hash !== undefined)
  ]));
}

function mapDefinitions(
  definitions: FetchVendorInventorySnapshotOptions["definitions"],
  characterResponses: VendorCharacterResponseInput[]
): VendorInventoryDefinitions {
  const vendorHashes = new Set(characterResponses.flatMap((character) =>
    Object.values(character.vendors).map((vendor) => vendor.vendorHash)
  ));
  const itemHashes = new Set(characterResponses.flatMap((character) =>
    Object.values(character.vendors).flatMap((vendor) => Object.values(vendor.saleItems).flatMap((sale) => [
      sale.itemHash,
      ...sale.costs.map((cost) => cost.itemHash)
    ]).concat(Object.values(vendor.sockets ?? {}).flat()))
  ));

  return {
    vendors: Object.fromEntries([...vendorHashes].map((vendorHash) => {
      const definition = definitions.vendors[String(vendorHash)];
      return [String(vendorHash), {
        name: definition?.displayProperties?.name?.trim() || `商人 ${vendorHash}`,
        vendorIdentifier: definition?.vendorIdentifier,
        description: definition?.displayProperties?.description?.trim() || "",
        iconUrl: definition?.displayProperties?.icon,
        failureStrings: definition?.failureStrings ?? [],
        itemList: Object.fromEntries((definition?.itemList ?? []).map((item, index) => [String(index), {
          displayCategoryIndex: item.displayCategoryIndex ?? -1,
          redirectToSaleIndexes: item.redirectToSaleIndexes ?? []
        }]))
      }];
    })),
    items: Object.fromEntries([...itemHashes].map((itemHash) => {
      const definition = definitions.items[String(itemHash)];
      return [String(itemHash), {
        name: definition?.displayProperties?.name?.trim() || String(itemHash),
        itemType: definition?.itemTypeDisplayName?.trim() || "",
        tierType: definition?.inventory?.tierTypeName?.trim() || "",
        iconUrl: definition?.displayProperties?.icon,
        previewVendorHash: definition?.preview?.previewVendorHash,
        ...(definition?.displayProperties?.description
          ? { description: definition.displayProperties.description }
          : {}),
        ...(definition?.plug?.plugCategoryIdentifier
          ? { categoryIdentifier: definition.plug.plugCategoryIdentifier }
          : {}),
        ...(definition?.investmentStats?.length ? { investmentStats: definition.investmentStats } : {})
      }];
    }))
  };
}

function mergeCurrencyBalances(
  target: Record<string, number>,
  data: CurrencyLookupData | undefined
): void {
  const itemQuantities = data?.itemQuantities;
  if (Array.isArray(itemQuantities)) {
    for (const item of itemQuantities) {
      if (item.itemHash !== undefined) target[String(item.itemHash)] = item.quantity ?? 0;
    }
  } else {
    for (const [itemHash, quantity] of Object.entries(itemQuantities ?? {})) {
      target[itemHash] = quantity;
    }
  }
  for (const [itemHash, item] of Object.entries(data?.items ?? {})) {
    target[itemHash] = item.quantity ?? 0;
  }
}

function createFetchJson(options: FetchVendorInventorySnapshotOptions) {
  return async function fetchJson<T>(path: string, accessToken?: string): Promise<T> {
    const url = new URL(path.replace(/^\//, ""), "https://www.bungie.net/Platform/");
    const response = await (options.fetchImpl ?? fetch)(url, {
      headers: {
        "X-API-Key": options.apiKey,
        "Authorization": `Bearer ${accessToken ?? options.accessToken}`,
        "Accept": "application/json"
      }
    });
    if (!response.ok) throw new Error(`Bungie request failed: HTTP ${response.status}`);
    const body = await response.json() as { ErrorCode?: number; Message?: string; Response?: T };
    if (body.ErrorCode !== undefined && body.ErrorCode !== 1) {
      throw new Error(`Bungie API error ${body.ErrorCode}: ${body.Message ?? "Unknown error"}`);
    }
    return (body.Response ?? body) as T;
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
