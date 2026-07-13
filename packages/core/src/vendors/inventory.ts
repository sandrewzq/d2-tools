export type VendorCharacterScope =
  | { kind: "character"; characterId: string }
  | { kind: "account" };

export type VendorCharacterContext = {
  characterId: string;
  armorerModHash: number | null;
  armorerModName: string | null;
};

export type VendorDetailFailure = {
  characterId: string;
  vendorHash: number;
  message: string;
};

export type VendorCost = {
  itemHash: number;
  name: string;
  quantity: number;
  iconUrl?: string;
};

export type VendorOffer = {
  id: string;
  vendorHash: number;
  vendorItemIndex: number;
  itemHash: number;
  quantity?: number;
  name: string;
  itemType: string;
  tierType: string;
  iconUrl?: string;
  characterIds: string[];
  costs: VendorCost[];
  failureIndexes: number[];
  failureMessages: string[];
  saleStatus: number;
  canPurchase: boolean;
  apiPurchasable: boolean | null;
  categoryIndex: number;
  categoryName: string;
  serviceId?: string;
  rollFingerprint: string;
  stats: Record<string, number>;
  socketPlugHashes: number[];
};

export type VendorProgression = {
  progressionHash: number;
  currentProgress: number;
  level: number;
  levelCap: number;
  stepIndex: number;
  progressToNextLevel: number;
  nextLevelAt: number;
};

export type VendorService = {
  id: string;
  name: string;
  description: string;
  categoryIndex: number;
  offers: VendorOffer[];
};

export type VendorInventory = {
  id: string;
  vendorHash: number;
  name: string;
  description: string;
  iconUrl?: string;
  location?: string;
  nextRefreshAt?: string;
  progression?: VendorProgression;
  characterIds: string[];
  offers: VendorOffer[];
  services: VendorService[];
};

export type VendorInventorySnapshot = {
  status: "ready" | "stale" | "error";
  fetchedAt: string;
  cachedAt?: string;
  errorMessage?: string;
  failedCharacterIds: string[];
  failedVendorDetails: VendorDetailFailure[];
  currencyBalances: Record<string, number>;
  characterContexts: Record<string, VendorCharacterContext>;
  detailVendorHashes?: number[];
  vendors: VendorInventory[];
};

export type VendorInventoryDefinitions = {
  vendors: Readonly<Record<string, VendorDefinitionInput>>;
  items: Readonly<Record<string, VendorItemDefinitionInput>>;
};

export type VendorDefinitionInput = {
  name: string;
  description?: string;
  iconUrl?: string;
  failureStrings?: readonly string[];
  itemList: Readonly<Record<string, VendorDefinitionItemInput>>;
};

export type VendorDefinitionItemInput = {
  displayCategoryIndex: number;
  redirectToSaleIndexes?: readonly number[];
};

export type VendorItemDefinitionInput = {
  name: string;
  itemType?: string;
  tierType?: string;
  iconUrl?: string;
};

export type VendorCharacterResponseInput = {
  characterId: string;
  vendors: Readonly<Record<string, VendorResponseInput>>;
};

export type VendorResponseInput = {
  vendorHash: number;
  canPurchase: boolean;
  location?: string;
  nextRefreshAt?: string;
  progression?: VendorProgression;
  categories: readonly VendorCategoryInput[];
  saleItems: Readonly<Record<string, VendorSaleItemInput>>;
  stats?: Readonly<Record<string, Readonly<Record<string, number>>>>;
  sockets?: Readonly<Record<string, readonly number[]>>;
};

export type VendorCategoryInput = {
  categoryIndex: number;
  name: string;
  itemIndexes: readonly number[];
};

export type VendorSaleItemInput = {
  vendorItemIndex: number;
  itemHash: number;
  quantity?: number;
  costs: readonly { itemHash: number; quantity: number }[];
  failureIndexes: readonly number[];
  saleStatus: number;
  apiPurchasable?: boolean | null;
};

export type BuildVendorInventorySnapshotInput = {
  fetchedAt: string;
  cachedAt?: string;
  errorMessage?: string;
  characterContexts: Readonly<Record<string, VendorCharacterContext>>;
  characterResponses: readonly VendorCharacterResponseInput[];
  failedCharacterIds: readonly string[];
  failedVendorDetails: readonly VendorDetailFailure[];
  currencyBalances: Readonly<Record<string, number>>;
  detailVendorHashes?: readonly number[];
  definitions: VendorInventoryDefinitions;
};

export function createVendorOfferFingerprint(input: {
  itemHash: number;
  costs: readonly VendorCost[];
  failureIndexes: readonly number[];
  saleStatus: number;
  canPurchase: boolean;
  socketPlugHashes: readonly number[];
  statSummary: readonly (readonly [number, number])[];
}): string {
  return JSON.stringify({
    itemHash: input.itemHash,
    costs: input.costs
      .map((cost) => [cost.itemHash, cost.quantity] as const)
      .sort(([left], [right]) => left - right),
    failureIndexes: [...input.failureIndexes].sort((left, right) => left - right),
    saleStatus: input.saleStatus,
    canPurchase: input.canPurchase,
    socketPlugHashes: [...input.socketPlugHashes],
    statSummary: input.statSummary
      .map(([statHash, value]) => [statHash, value] as const)
      .sort(([left], [right]) => left - right)
  });
}

export function createVendorCacheContextKey(context: VendorCharacterContext): string {
  return `${context.characterId}:${context.armorerModHash ?? "none"}`;
}

export function buildVendorInventorySnapshot(input: BuildVendorInventorySnapshotInput): VendorInventorySnapshot {
  const vendors = new Map<number, VendorInventory>();

  for (const characterResponse of input.characterResponses) {
    for (const vendorResponse of Object.values(characterResponse.vendors)) {
      const mapped = mapCharacterVendor(characterResponse.characterId, vendorResponse, input.definitions);
      const existing = vendors.get(mapped.vendorHash);
      if (!existing) {
        vendors.set(mapped.vendorHash, mapped);
        continue;
      }
      mergeVendor(existing, mapped);
    }
  }

  return {
    status: input.errorMessage && vendors.size === 0 ? "error" : input.errorMessage ? "stale" : "ready",
    fetchedAt: input.fetchedAt,
    cachedAt: input.cachedAt,
    errorMessage: input.errorMessage,
    failedCharacterIds: [...input.failedCharacterIds],
    failedVendorDetails: [...input.failedVendorDetails],
    currencyBalances: { ...input.currencyBalances },
    characterContexts: { ...input.characterContexts },
    detailVendorHashes: input.detailVendorHashes ? [...input.detailVendorHashes] : undefined,
    vendors: [...vendors.values()]
  };
}

function mapCharacterVendor(
  characterId: string,
  response: VendorResponseInput,
  definitions: VendorInventoryDefinitions
): VendorInventory {
  const vendorDefinition = definitions.vendors[String(response.vendorHash)];
  const serviceRoots = new Map<number, { id: string; targetIndexes: Set<number> }>();
  const serviceByTarget = new Map<number, string>();

  for (const [indexKey, definitionItem] of Object.entries(vendorDefinition?.itemList ?? {})) {
    if (!definitionItem.redirectToSaleIndexes?.length) continue;
    const rootIndex = Number(indexKey);
    const id = `${response.vendorHash}:service:${rootIndex}`;
    const targetIndexes = new Set(definitionItem.redirectToSaleIndexes);
    serviceRoots.set(rootIndex, { id, targetIndexes });
    for (const targetIndex of targetIndexes) serviceByTarget.set(targetIndex, id);
  }

  const offers: VendorOffer[] = [];
  const services = new Map<string, VendorService>();
  const seenIndexes = new Set<number>();
  const orderedIndexes = response.categories.flatMap((category) => category.itemIndexes);
  const remainingIndexes = Object.values(response.saleItems)
    .map((sale) => sale.vendorItemIndex)
    .filter((index) => !orderedIndexes.includes(index));

  for (const vendorItemIndex of [...orderedIndexes, ...remainingIndexes]) {
    if (seenIndexes.has(vendorItemIndex)) continue;
    seenIndexes.add(vendorItemIndex);
    const sale = response.saleItems[String(vendorItemIndex)];
    if (!sale) continue;

    const root = serviceRoots.get(vendorItemIndex);
    if (root) {
      const rootItem = definitions.items[String(sale.itemHash)];
      const category = findCategory(response.categories, vendorItemIndex);
      services.set(root.id, {
        id: root.id,
        name: rootItem?.name ?? `服务 ${vendorItemIndex}`,
        description: rootItem?.itemType ?? "",
        categoryIndex: category?.categoryIndex ?? -1,
        offers: []
      });
      continue;
    }

    const serviceId = serviceByTarget.get(vendorItemIndex);
    const offer = mapOffer(characterId, response, sale, serviceId, vendorDefinition, definitions);
    if (serviceId) {
      const service = services.get(serviceId);
      if (service) service.offers.push(offer);
      continue;
    }
    offers.push(offer);
  }

  return {
    id: `vendor-${response.vendorHash}`,
    vendorHash: response.vendorHash,
    name: vendorDefinition?.name ?? `商人 ${response.vendorHash}`,
    description: vendorDefinition?.description ?? "",
    iconUrl: vendorDefinition?.iconUrl,
    location: response.location,
    nextRefreshAt: response.nextRefreshAt,
    progression: response.progression,
    characterIds: [characterId],
    offers,
    services: [...services.values()]
  };
}

function mapOffer(
  characterId: string,
  response: VendorResponseInput,
  sale: VendorSaleItemInput,
  serviceId: string | undefined,
  vendorDefinition: VendorDefinitionInput | undefined,
  definitions: VendorInventoryDefinitions
): VendorOffer {
  const item = definitions.items[String(sale.itemHash)];
  const category = findCategory(response.categories, sale.vendorItemIndex);
  const costs = sale.costs.map((cost) => {
    const costDefinition = definitions.items[String(cost.itemHash)];
    return {
      itemHash: cost.itemHash,
      name: costDefinition?.name ?? String(cost.itemHash),
      quantity: cost.quantity,
      iconUrl: costDefinition?.iconUrl
    };
  });
  const stats = { ...(response.stats?.[String(sale.vendorItemIndex)] ?? {}) };
  const socketPlugHashes = [...(response.sockets?.[String(sale.vendorItemIndex)] ?? [])];
  const canPurchase = response.canPurchase && sale.saleStatus === 0 && sale.failureIndexes.length === 0;
  const rollFingerprint = createVendorOfferFingerprint({
    itemHash: sale.itemHash,
    costs,
    failureIndexes: sale.failureIndexes,
    saleStatus: sale.saleStatus,
    canPurchase,
    socketPlugHashes,
    statSummary: Object.entries(stats).map(([hash, value]) => [Number(hash), value] as const)
  });

  return {
    id: `${response.vendorHash}:${sale.vendorItemIndex}:${characterId}`,
    vendorHash: response.vendorHash,
    vendorItemIndex: sale.vendorItemIndex,
    itemHash: sale.itemHash,
    quantity: sale.quantity ?? 1,
    name: item?.name ?? String(sale.itemHash),
    itemType: item?.itemType ?? "",
    tierType: item?.tierType ?? "",
    iconUrl: item?.iconUrl,
    characterIds: [characterId],
    costs,
    failureIndexes: [...sale.failureIndexes],
    failureMessages: sale.failureIndexes.map(
      (index) => vendorDefinition?.failureStrings?.[index] ?? "无法购买"
    ),
    saleStatus: sale.saleStatus,
    canPurchase,
    apiPurchasable: sale.apiPurchasable ?? null,
    categoryIndex: category?.categoryIndex ?? -1,
    categoryName: category?.name ?? "其他",
    serviceId,
    rollFingerprint,
    stats,
    socketPlugHashes
  };
}

function findCategory(categories: readonly VendorCategoryInput[], vendorItemIndex: number) {
  return categories.find((category) => category.itemIndexes.includes(vendorItemIndex));
}

function mergeVendor(target: VendorInventory, source: VendorInventory): void {
  target.progression ??= source.progression;
  for (const characterId of source.characterIds) {
    if (!target.characterIds.includes(characterId)) target.characterIds.push(characterId);
  }
  mergeOffers(target.offers, source.offers);
  for (const sourceService of source.services) {
    const targetService = target.services.find((service) => service.id === sourceService.id);
    if (!targetService) {
      target.services.push(sourceService);
      continue;
    }
    mergeOffers(targetService.offers, sourceService.offers);
  }
}

function mergeOffers(target: VendorOffer[], source: VendorOffer[]): void {
  for (const sourceOffer of source) {
    const existing = target.find(
      (offer) =>
        offer.vendorItemIndex === sourceOffer.vendorItemIndex &&
        offer.serviceId === sourceOffer.serviceId &&
        offer.rollFingerprint === sourceOffer.rollFingerprint
    );
    if (!existing) {
      target.push(sourceOffer);
      continue;
    }
    for (const characterId of sourceOffer.characterIds) {
      if (!existing.characterIds.includes(characterId)) existing.characterIds.push(characterId);
    }
    existing.id = `${existing.vendorHash}:${existing.vendorItemIndex}:account:${hashFingerprint(existing.rollFingerprint)}`;
  }
}

function hashFingerprint(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
