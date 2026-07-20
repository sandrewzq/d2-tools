import type { VendorInventory } from "@d2-tools/core/vendors/inventory";
import type {
  VendorContentSectionWorkspace,
  VendorDetailState,
  VendorInventoryGroupWorkspace,
  VendorInventoryItemWorkspace,
  VendorInventorySectionWorkspace,
  VendorServiceWorkspace
} from "./vendorsPage.js";

export type VendorContentKind = "reputation" | "inventory" | "subinventory" | "tasks";

type VendorGroupRule = {
  name: string;
  description?: string | ((itemCount: number) => string);
  presentation?: VendorInventorySectionWorkspace["presentation"];
};

type VendorContentDefinition = {
  id: string;
  kind: VendorContentKind;
  name: string;
  scope?: VendorContentSectionWorkspace["scope"];
  action?: VendorContentSectionWorkspace["action"];
  condition?: string;
  categoryIndexes?: number[];
  childVendorHashes?: number[];
  groupRules?: VendorGroupRule[];
};

type VendorStructureDefinition = {
  vendorHash: number;
  childVendorHashes: number[];
  fallbackParent?: {
    vendorIdentifier?: string;
    name: string;
    description: string;
    vendorGroupHash: number;
    vendorGroupName: string;
    vendorGroupOrder: number;
  };
  ignoredChildVendorHashes?: number[];
  includeRemainder?: boolean;
  unconfiguredServicesPosition?: "before-subinventory" | "after";
  sections: VendorContentDefinition[];
};

const vendorStructures: VendorStructureDefinition[] = [
  {
    vendorHash: 2190858386,
    childVendorHashes: [537912098, 3751514131],
    includeRemainder: false,
    unconfiguredServicesPosition: "before-subinventory",
    sections: [
      { id: "xur-rank", kind: "reputation", name: "声望与等级", scope: "account", action: "claim", categoryIndexes: [4] },
      { id: "xur-weekly", kind: "inventory", name: "多样奇异优惠", scope: "character", action: "purchase", categoryIndexes: [0] },
      {
        id: "xur-more-offers",
        kind: "subinventory",
        name: "更多奇异优惠",
        scope: "account",
        action: "exchange",
        childVendorHashes: [537912098],
        groupRules: [
          { name: "玖的忠诚计划", description: "账户级增益", presentation: "featured" },
          { name: "奇异材料优惠", description: (count) => `${count} 个独立兑换条目` },
          { name: "奇异可重复优惠", description: "可重复兑换" }
        ]
      },
      {
        id: "xur-gear-offers",
        kind: "subinventory",
        name: "奇异装备优惠",
        scope: "character",
        action: "purchase",
        childVendorHashes: [3751514131],
        groupRules: [
          { name: "异域装备", description: "武器、记忆水晶与催化剂" },
          { name: "传说武器", description: (count) => `${count} 件武器与记忆水晶` },
          { name: "传说护甲", description: "当前角色职业套装" }
        ]
      }
    ]
  },
  {
    vendorHash: 672118013,
    childVendorHashes: [2484291326, 908529654],
    includeRemainder: true,
    sections: [
      { id: "banshee-rank", kind: "reputation", name: "声望与等级", scope: "account", action: "claim", categoryIndexes: [1] },
      { id: "banshee-weapons", kind: "inventory", name: "武器", scope: "character", action: "purchase", categoryIndexes: [4] },
      {
        id: "banshee-focusing",
        kind: "subinventory",
        name: "聚焦破译",
        scope: "character",
        action: "focus",
        childVendorHashes: [2484291326]
      },
      {
        id: "banshee-legacy-focusing",
        kind: "subinventory",
        name: "传承聚焦破译",
        scope: "character",
        action: "focus",
        childVendorHashes: [908529654]
      },
      { id: "banshee-tasks", kind: "tasks", name: "任务", scope: "character", action: "acquire", categoryIndexes: [0] }
    ]
  },
  {
    vendorHash: 69482069,
    childVendorHashes: [153857624, 439609089, 3756955867, 3444362755],
    ignoredChildVendorHashes: [1009334327],
    includeRemainder: true,
    sections: [
      { id: "zavala-rank", kind: "reputation", name: "声望与等级", scope: "account", action: "claim", categoryIndexes: [6] },
      {
        id: "zavala-weekly-rewards",
        kind: "subinventory",
        name: "周常：先锋武器奖励",
        scope: "character",
        action: "claim",
        childVendorHashes: [153857624]
      },
      {
        id: "zavala-focusing",
        kind: "subinventory",
        name: "聚焦破译",
        scope: "character",
        action: "focus",
        childVendorHashes: [439609089, 3756955867]
      },
      {
        id: "zavala-legacy-focusing",
        kind: "subinventory",
        name: "传承聚焦破译",
        scope: "character",
        action: "focus",
        childVendorHashes: [3444362755]
      }
    ]
  },
  {
    vendorHash: 248695599,
    childVendorHashes: [103028516, 1447397853, 2906014866],
    includeRemainder: true,
    sections: [
      { id: "drifter-rank", kind: "reputation", name: "声望与等级", scope: "account", action: "claim", categoryIndexes: [6] },
      {
        id: "drifter-focusing",
        kind: "subinventory",
        name: "聚焦破译",
        scope: "character",
        action: "focus",
        childVendorHashes: [103028516, 1447397853]
      },
      {
        id: "drifter-legacy-focusing",
        kind: "subinventory",
        name: "传承聚焦破译",
        scope: "character",
        action: "focus",
        childVendorHashes: [2906014866]
      }
    ]
  },
  {
    vendorHash: 3347378076,
    childVendorHashes: [811102248, 811102249, 2357508752],
    includeRemainder: true,
    sections: [
      { id: "hawthorne-rank", kind: "reputation", name: "声望与等级", scope: "clan", action: "claim", categoryIndexes: [2] },
      { id: "hawthorne-bounties", kind: "tasks", name: "公会悬赏", scope: "clan", action: "acquire", categoryIndexes: [9] },
      {
        id: "hawthorne-raids",
        kind: "subinventory",
        name: "突袭",
        scope: "account",
        action: "inspect",
        childVendorHashes: [811102248, 811102249]
      },
      {
        id: "hawthorne-legacy",
        kind: "subinventory",
        name: "传承装备",
        scope: "account",
        action: "exchange",
        childVendorHashes: [2357508752]
      }
    ]
  },
  {
    vendorHash: 2255782930,
    childVendorHashes: [2199358137, 1248953136],
    fallbackParent: {
      vendorIdentifier: "CRYPTARCH",
      name: "拉乎尔大师",
      description: "高级解密大师，拉乎尔大师解码记忆水晶，寻找旧时人类文明的宝藏。",
      vendorGroupHash: 679769104,
      vendorGroupName: "高塔",
      vendorGroupOrder: 5
    },
    includeRemainder: true,
    sections: [
      {
        id: "rahool-material-exchange",
        kind: "subinventory",
        name: "材料交换",
        scope: "account",
        action: "exchange",
        childVendorHashes: [2199358137]
      },
      {
        id: "rahool-focusing",
        kind: "subinventory",
        name: "聚焦破译",
        scope: "character",
        action: "decode",
        childVendorHashes: [1248953136]
      }
    ]
  }
];

export function getVendorDetailHashes(vendorHash: number, vendors: readonly VendorInventory[]): number[] {
  const available = new Set(vendors.map((vendor) => vendor.vendorHash));
  const vendorByHash = new Map(vendors.map((vendor) => [vendor.vendorHash, vendor]));
  const result: number[] = [];
  const visited = new Set<number>();

  function visit(hash: number): void {
    if (visited.has(hash)) return;
    visited.add(hash);

    const configured = getVendorStructure(hash)?.childVendorHashes ?? [];
    if (available.has(hash)) result.push(hash);
    if (!available.has(hash) && !configured.length) return;
    const vendor = vendorByHash.get(hash);
    const discovered = [
      ...(vendor?.offers ?? []),
      ...(vendor?.services.flatMap((service) => service.offers) ?? [])
    ].flatMap((offer) => offer.previewVendorHash === undefined ? [] : [offer.previewVendorHash]);
    for (const childHash of [...configured, ...discovered]) visit(childHash);
  }

  visit(vendorHash);
  return result;
}

export function partitionVendorItems(
  vendorHash: number,
  items: VendorInventoryItemWorkspace[],
  availableVendorHashes: Iterable<number>
): {
  items: VendorInventoryItemWorkspace[];
  rankRewards?: VendorInventoryItemWorkspace[];
  taskItems?: VendorInventoryItemWorkspace[];
  childInventoryEntries?: VendorInventoryItemWorkspace[];
} {
  const structure = getVendorStructure(vendorHash);
  const available = new Set(availableVendorHashes);
  const ignoredChildren = new Set(structure?.ignoredChildVendorHashes ?? []);
  const configuredReputation = collectCategoryIndexes(structure, "reputation");
  const configuredInventory = collectCategoryIndexes(structure, "inventory");
  const configuredTasks = collectCategoryIndexes(structure, "tasks");
  const rankRewards: VendorInventoryItemWorkspace[] = [];
  const taskItems: VendorInventoryItemWorkspace[] = [];
  const childInventoryEntries: VendorInventoryItemWorkspace[] = [];
  const directItems: VendorInventoryItemWorkspace[] = [];

  for (const item of items) {
    if (matchesConfiguredCategory(item, configuredReputation) || isReputationItem(item)) {
      rankRewards.push(item);
      continue;
    }
    if (matchesConfiguredCategory(item, configuredTasks) || isTaskItem(item)) {
      taskItems.push(item);
      continue;
    }
    if (item.previewVendorHash !== undefined && ignoredChildren.has(item.previewVendorHash)) {
      continue;
    }
    if (
      item.previewVendorHash !== undefined
      && item.previewVendorHash !== vendorHash
      && available.has(item.previewVendorHash)
    ) {
      childInventoryEntries.push(item);
      continue;
    }
    if (structure?.includeRemainder === false && !matchesConfiguredCategory(item, configuredInventory)) {
      continue;
    }
    directItems.push(item);
  }

  return {
    items: directItems,
    rankRewards: rankRewards.length ? rankRewards : undefined,
    taskItems: taskItems.length ? taskItems : undefined,
    childInventoryEntries: childInventoryEntries.length ? childInventoryEntries : undefined
  };
}

export function composeVendorStructures(
  vendors: VendorInventoryGroupWorkspace[]
): VendorInventoryGroupWorkspace[] {
  const expandedVendors = addFallbackVendorParents(vendors);
  const inferredParents = expandedVendors.filter((vendor) =>
    vendor.childInventoryEntries?.length && getVendorStructure(vendor.vendorHash ?? -1) === undefined
  ).sort((left, right) =>
    getVendorNestingDepth(left, expandedVendors, new Set()) - getVendorNestingDepth(right, expandedVendors, new Set())
  );
  const structures = [
    ...inferredParents.map(inferVendorStructure),
    ...vendorStructures.filter((structure) => expandedVendors.some((vendor) => vendor.vendorHash === structure.vendorHash))
  ];
  const vendorByHash = new Map(expandedVendors.flatMap((vendor) =>
    vendor.vendorHash === undefined ? [] : [[vendor.vendorHash, vendor] as const]
  ));
  const attachedChildHashes = new Set<number>();
  for (const structure of structures) {
    composeVendorStructure(vendorByHash, structure, attachedChildHashes);
  }
  return expandedVendors.flatMap((vendor) => {
    const vendorHash = vendor.vendorHash;
    if (vendorHash === undefined || attachedChildHashes.has(vendorHash)) return [];
    return [vendorByHash.get(vendorHash) ?? vendor];
  });
}

function addFallbackVendorParents(
  vendors: VendorInventoryGroupWorkspace[]
): VendorInventoryGroupWorkspace[] {
  const expanded = [...vendors];
  const available = new Set(vendors.flatMap((vendor) => vendor.vendorHash === undefined ? [] : [vendor.vendorHash]));
  for (const structure of vendorStructures) {
    if (!structure.fallbackParent || available.has(structure.vendorHash)) continue;
    const children = vendors.filter((vendor) =>
      vendor.vendorHash !== undefined && structure.childVendorHashes.includes(vendor.vendorHash)
    );
    const reference = children[0];
    if (!reference) continue;
    expanded.push({
      id: `vendor-${structure.vendorHash}`,
      vendorHash: structure.vendorHash,
      vendorIdentifier: structure.fallbackParent.vendorIdentifier,
      vendorGroupHash: structure.fallbackParent.vendorGroupHash,
      vendorGroupName: structure.fallbackParent.vendorGroupName,
      vendorGroupOrder: structure.fallbackParent.vendorGroupOrder,
      name: structure.fallbackParent.name,
      description: structure.fallbackParent.description,
      badge: reference.badge,
      source: reference.source,
      resetLabel: reference.resetLabel,
      category: reference.category,
      statusLabel: reference.statusLabel,
      detailState: mergeVendorDetailStates(children.map((vendor) => vendor.detailState)),
      detailFailureMessage: children
        .map((vendor) => vendor.detailFailureMessage)
        .filter((message): message is string => Boolean(message))
        .join("；") || undefined,
      items: [],
      services: []
    });
  }
  return expanded;
}

export function createDefaultVendorContentSections(
  vendor: VendorInventoryGroupWorkspace
): VendorContentSectionWorkspace[] {
  const sections: VendorContentSectionWorkspace[] = [];
  if (vendor.rankRewards?.length || vendor.progression) {
    sections.push(createReputationContentSection(vendor));
  }
  if (vendor.items.length) {
    sections.push(createInventoryContentSection(vendor, "库存"));
  }
  for (const service of vendor.services ?? []) {
    if (service.items.length) sections.push(createServiceContentSection(service));
  }
  if (vendor.taskItems?.length) {
    sections.push(createTaskContentSection(vendor));
  }
  return sections;
}

export function createInventorySections(
  items: VendorInventoryItemWorkspace[]
): VendorInventorySectionWorkspace[] {
  const sections = new Map<string, VendorInventoryItemWorkspace[]>();
  for (const item of items) {
    const name = item.categoryName?.trim() || "其他";
    const sectionItems = sections.get(name) ?? [];
    sectionItems.push(item);
    sections.set(name, sectionItems);
  }
  return [...sections.entries()].map(([name, sectionItems], index) => ({
    id: `${slugify(name) || "section"}-${index}`,
    name,
    items: sectionItems
  }));
}

function composeVendorStructure(
  vendorByHash: Map<number, VendorInventoryGroupWorkspace>,
  structure: VendorStructureDefinition,
  attachedChildHashes: Set<number>
): void {
  const parent = vendorByHash.get(structure.vendorHash);
  if (!parent) return;

  const discoveredChildHashes = parent.childInventoryEntries?.flatMap((item) =>
    item.previewVendorHash === undefined ? [] : [item.previewVendorHash]
  ) ?? [];
  const ignoredChildren = new Set(structure.ignoredChildVendorHashes ?? []);
  const childHashes = [...new Set([...structure.childVendorHashes, ...discoveredChildHashes])]
    .filter((hash) =>
      hash !== structure.vendorHash
      && !ignoredChildren.has(hash)
      && !hasVendorPath(hash, structure.vendorHash, vendorByHash, new Set())
    );
  const children = childHashes
    .map((vendorHash) => vendorByHash.get(vendorHash))
    .filter((vendor): vendor is VendorInventoryGroupWorkspace => Boolean(vendor));
  const childServices = children.map((child) => createChildVendorService(parent, child));
  const embeddedServices = (parent.services ?? []).filter((service) => service.items.length > 0);
  const services = [...embeddedServices, ...childServices];
  const family = [parent, ...children];
  const mergedParent: VendorInventoryGroupWorkspace = {
    ...parent,
    detailState: mergeVendorDetailStates(family.map((vendor) => vendor.detailState)),
    detailFailureMessage: family
      .map((vendor) => vendor.detailFailureMessage)
      .filter((message): message is string => Boolean(message))
      .join("；") || undefined,
    services,
    contentSections: buildConfiguredContentSections(parent, services, structure)
  };

  for (const child of children) {
    if (child.vendorHash !== undefined) attachedChildHashes.add(child.vendorHash);
  }
  vendorByHash.set(structure.vendorHash, mergedParent);
}

function buildConfiguredContentSections(
  parent: VendorInventoryGroupWorkspace,
  services: VendorServiceWorkspace[],
  structure: VendorStructureDefinition
): VendorContentSectionWorkspace[] {
  const usedServiceIds = new Set<string>();
  const usedInventoryItemIds = new Set<string>();
  const usedTaskItemIds = new Set<string>();
  const sections = structure.sections.flatMap((definition): VendorContentSectionWorkspace[] => {
    if (definition.kind === "reputation") {
      if (!parent.rankRewards?.length && !parent.progression) return [];
      return [createReputationContentSection(parent, definition)];
    }
    if (definition.kind === "inventory") {
      const items = selectDefinitionItems(parent.items, definition);
      if (!items.length) return [];
      items.forEach((item) => usedInventoryItemIds.add(item.id));
      return [createInventoryContentSection(parent, definition.name, definition.id, definition, items)];
    }
    if (definition.kind === "tasks") {
      const items = selectDefinitionItems(parent.taskItems ?? [], definition);
      if (!items.length) return [];
      items.forEach((item) => usedTaskItemIds.add(item.id));
      return [createTaskContentSection(parent, definition.name, definition.id, definition, items)];
    }

    const hashes = new Set(definition.childVendorHashes ?? []);
    const matchedServices = services.filter((service) => service.vendorHash !== undefined && hashes.has(service.vendorHash));
    if (!matchedServices.length) return [];
    matchedServices.forEach((service) => usedServiceIds.add(service.id));
    return [createCombinedServiceContentSection(definition, matchedServices)];
  });

  const unconfiguredServices = services.filter((service) => !usedServiceIds.has(service.id));
  const unconfiguredSections = unconfiguredServices.map(createServiceContentSection);
  if (structure.unconfiguredServicesPosition === "before-subinventory") {
    const index = sections.findIndex((section) => section.kind === "subinventory");
    if (index >= 0) sections.splice(index, 0, ...unconfiguredSections);
    else sections.push(...unconfiguredSections);
  }

  if (structure.includeRemainder !== false) {
    const configuredKinds = new Set(structure.sections.map((section) => section.kind));
    if (!configuredKinds.has("reputation") && (parent.rankRewards?.length || parent.progression)) {
      sections.unshift(createReputationContentSection(parent));
    }
    const remainingInventoryItems = parent.items.filter((item) => !usedInventoryItemIds.has(item.id));
    if (remainingInventoryItems.length) {
      sections.push(createInventoryContentSection(parent, "库存", undefined, undefined, remainingInventoryItems));
    }
    if (structure.unconfiguredServicesPosition !== "before-subinventory") {
      sections.push(...unconfiguredSections);
    }
    const remainingTaskItems = (parent.taskItems ?? []).filter((item) => !usedTaskItemIds.has(item.id));
    if (remainingTaskItems.length) {
      sections.push(createTaskContentSection(parent, "任务", undefined, undefined, remainingTaskItems));
    }
  }
  return sections;
}

function createCombinedServiceContentSection(
  definition: VendorContentDefinition,
  services: VendorServiceWorkspace[]
): VendorContentSectionWorkspace {
  const groups = applyGroupRules(
    services.flatMap((service) => (service.sections ?? createInventorySections(service.items)).map((group) => ({
      ...group,
      id: `${service.id}-${group.id}`
    }))),
    definition.groupRules ?? []
  );
  return {
    id: definition.id,
    kind: "subinventory",
    scope: definition.scope,
    action: definition.action,
    condition: definition.condition,
    name: definition.name,
    description: services.length === 1 ? services[0].description || undefined : `${services.length} 个入口`,
    layout: groups.length > 1 ? "columns" : "list",
    groups
  };
}

function createReputationContentSection(
  vendor: VendorInventoryGroupWorkspace,
  definition?: VendorContentDefinition
): VendorContentSectionWorkspace {
  return {
    id: definition?.id ?? `${vendor.id}-rank`,
    kind: "reputation",
    scope: definition?.scope,
    action: definition?.action ?? "claim",
    condition: definition?.condition,
    name: definition?.name ?? "声望与等级",
    description: vendor.progression
      ? `等级上限 ${vendor.progression.levelCap} · ${vendor.rankRewards?.length ?? 0} 个奖励`
      : `${vendor.rankRewards?.length ?? 0} 个等级奖励`,
    layout: "rank",
    progression: vendor.progression,
    groups: [{ id: `${definition?.id ?? vendor.id}-rank-rewards`, name: "等级奖励", items: vendor.rankRewards ?? [] }]
  };
}

function createInventoryContentSection(
  vendor: VendorInventoryGroupWorkspace,
  name: string,
  id = `${vendor.id}-inventory`,
  definition?: VendorContentDefinition,
  items = vendor.items
): VendorContentSectionWorkspace {
  return {
    id,
    kind: "inventory",
    scope: definition?.scope,
    action: definition?.action ?? "purchase",
    condition: definition?.condition,
    name,
    description: `${items.length} 件`,
    layout: "featured",
    groups: createInventorySections(items)
  };
}

function createTaskContentSection(
  vendor: VendorInventoryGroupWorkspace,
  name = "任务",
  id = `${vendor.id}-tasks`,
  definition?: VendorContentDefinition,
  items = vendor.taskItems ?? []
): VendorContentSectionWorkspace {
  return {
    id,
    kind: "tasks",
    scope: definition?.scope,
    action: definition?.action ?? "acquire",
    condition: definition?.condition,
    name,
    description: `${items.length} 项`,
    layout: "featured",
    groups: createInventorySections(items)
  };
}

function createServiceContentSection(service: VendorServiceWorkspace): VendorContentSectionWorkspace {
  const groups = service.sections?.length ? service.sections : [{ id: `${service.id}-items`, name: "", items: service.items }];
  return {
    id: service.id,
    kind: "subinventory",
    action: inferServiceAction(service.name),
    name: service.name,
    description: service.description || `${service.items.length} 件`,
    layout: groups.length > 1 ? "columns" : "list",
    groups
  };
}

function createChildVendorService(
  parent: VendorInventoryGroupWorkspace,
  child: VendorInventoryGroupWorkspace
): VendorServiceWorkspace {
  const directItems = child.items.map((item) => ({ ...item, sourcePath: `${parent.name} → ${child.name}` }));
  const descendantItems = (child.services ?? []).flatMap((service) => service.items.map((item) => ({
    ...item,
    sourcePath: `${parent.name} → ${child.name} → ${service.name}`
  })));
  const taskItems = (child.taskItems ?? []).map((item) => ({
    ...item,
    sourcePath: `${parent.name} → ${child.name} → 任务`
  }));
  const rankRewards = (child.rankRewards ?? []).map((item) => ({
    ...item,
    sourcePath: `${parent.name} → ${child.name} → 声望与等级`
  }));
  const items = [...directItems, ...descendantItems, ...taskItems, ...rankRewards];
  return {
    id: child.id,
    vendorHash: child.vendorHash,
    name: child.name,
    description: child.description,
    items,
    sections: createInventorySections(items)
  };
}

function inferVendorStructure(parent: VendorInventoryGroupWorkspace): VendorStructureDefinition {
  const entries = parent.childInventoryEntries ?? [];
  const grouped = new Map<string, VendorInventoryItemWorkspace[]>();
  for (const entry of entries) {
    const key = entry.categoryIdentifier || entry.categoryName || entry.name;
    const group = grouped.get(key) ?? [];
    group.push(entry);
    grouped.set(key, group);
  }
  return {
    vendorHash: parent.vendorHash ?? -1,
    childVendorHashes: [...new Set(entries.flatMap((entry) =>
      entry.previewVendorHash === undefined ? [] : [entry.previewVendorHash]
    ))],
    includeRemainder: true,
    sections: [...grouped.entries()].map(([key, group], index) => ({
      id: `${parent.id}-subinventory-${slugify(key) || index}`,
      kind: "subinventory" as const,
      name: group[0]?.categoryName && group[0].categoryName !== "其他" ? group[0].categoryName : group[0]?.name ?? "子库存",
      action: inferServiceAction(group[0]?.categoryName ?? group[0]?.name ?? ""),
      childVendorHashes: [...new Set(group.flatMap((entry) =>
        entry.previewVendorHash === undefined ? [] : [entry.previewVendorHash]
      ))]
    }))
  };
}

function getVendorNestingDepth(
  vendor: VendorInventoryGroupWorkspace,
  vendors: VendorInventoryGroupWorkspace[],
  visited: Set<number>
): number {
  const vendorHash = vendor.vendorHash;
  if (vendorHash === undefined || visited.has(vendorHash)) return 0;
  const nextVisited = new Set(visited).add(vendorHash);
  const childDepths = (vendor.childInventoryEntries ?? []).flatMap((entry) => {
    if (entry.previewVendorHash === undefined || nextVisited.has(entry.previewVendorHash)) return [];
    const child = vendors.find((candidate) => candidate.vendorHash === entry.previewVendorHash);
    return child ? [getVendorNestingDepth(child, vendors, nextVisited)] : [];
  });
  return childDepths.length ? 1 + Math.max(...childDepths) : 0;
}

function hasVendorPath(
  fromHash: number,
  targetHash: number,
  vendorByHash: Map<number, VendorInventoryGroupWorkspace>,
  visited: Set<number>
): boolean {
  if (fromHash === targetHash) return true;
  if (visited.has(fromHash)) return false;
  const nextVisited = new Set(visited).add(fromHash);
  const vendor = vendorByHash.get(fromHash);
  const configuredChildren = getVendorStructure(fromHash)?.childVendorHashes ?? [];
  const discoveredChildren = vendor?.childInventoryEntries?.flatMap((entry) =>
    entry.previewVendorHash === undefined ? [] : [entry.previewVendorHash]
  ) ?? [];
  return [...configuredChildren, ...discoveredChildren].some((childHash) =>
    hasVendorPath(childHash, targetHash, vendorByHash, nextVisited)
  );
}

function isReputationItem(item: VendorInventoryItemWorkspace): boolean {
  const value = `${item.categoryIdentifier ?? ""} ${item.categoryName ?? ""}`.toLocaleLowerCase();
  return /rank_rewards|rank\.rewards|等级奖励|声望奖励/.test(value);
}

function inferServiceAction(name: string): VendorContentSectionWorkspace["action"] {
  if (/聚焦|focus/i.test(name)) return "focus";
  if (/解码|decode/i.test(name)) return "decode";
  if (/奖励|领取|reward|claim/i.test(name)) return "claim";
  if (/兑换|材料|exchange/i.test(name)) return "exchange";
  return "inspect";
}

function isTaskItem(item: VendorInventoryItemWorkspace): boolean {
  const value = `${item.categoryIdentifier ?? ""} ${item.categoryName ?? ""} ${item.itemType}`.toLocaleLowerCase();
  return /quest|pursuit|bount|card|resume|任务|悬赏|已放弃/.test(value);
}

function matchesConfiguredCategory(item: VendorInventoryItemWorkspace, categories: Set<number>): boolean {
  return item.categoryIndex !== undefined && categories.has(item.categoryIndex);
}

function selectDefinitionItems(
  items: VendorInventoryItemWorkspace[],
  definition: VendorContentDefinition
): VendorInventoryItemWorkspace[] {
  const categories = new Set(definition.categoryIndexes ?? []);
  return categories.size ? items.filter((item) => matchesConfiguredCategory(item, categories)) : items;
}

function applyGroupRules(
  groups: VendorInventorySectionWorkspace[],
  rules: VendorGroupRule[]
): VendorInventorySectionWorkspace[] {
  const ruleByName = new Map(rules.map((rule) => [rule.name, rule]));
  return [...groups]
    .sort((left, right) => getRuleIndex(rules, left.name) - getRuleIndex(rules, right.name))
    .map((group) => {
      const rule = ruleByName.get(group.name);
      if (!rule) return group;
      return {
        ...group,
        description: typeof rule.description === "function" ? rule.description(group.items.length) : rule.description,
        presentation: rule.presentation
      };
    });
}

function getRuleIndex(rules: VendorGroupRule[], name: string): number {
  const index = rules.findIndex((rule) => rule.name === name);
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}

function collectCategoryIndexes(
  structure: VendorStructureDefinition | undefined,
  kind: VendorContentKind
): Set<number> {
  return new Set((structure?.sections ?? [])
    .filter((section) => section.kind === kind)
    .flatMap((section) => section.categoryIndexes ?? []));
}

function getVendorStructure(vendorHash: number): VendorStructureDefinition | undefined {
  return vendorStructures.find((structure) => structure.vendorHash === vendorHash);
}

function mergeVendorDetailStates(states: Array<VendorDetailState | undefined>): VendorDetailState | undefined {
  if (states.some((state) => state === "failed" || state === "partial")) return "partial";
  if (states.some((state) => state === "pending")) return "pending";
  if (states.every((state) => state === "ready")) return "ready";
  return states.find((state): state is VendorDetailState => Boolean(state));
}

function slugify(value: string): string {
  return Array.from(value.trim())
    .map((char) => /^[a-z0-9]$/i.test(char) ? char.toLowerCase() : char.codePointAt(0)?.toString(36) ?? "")
    .filter(Boolean)
    .join("-");
}
