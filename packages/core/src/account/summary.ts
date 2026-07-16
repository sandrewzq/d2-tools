import { fetchBungieJson } from "../bungie/client.js";
import type { D2Config } from "../config/schema.js";
import { ammoTypeKey, classifyBucket, type AmmoTypeKey, type EquipmentGroupKey } from "../items/classification.js";
import { summarizeWeaponFrame, type WeaponFrameSummary } from "../items/weaponFrames.js";
import type { ArmorStatKey } from "../loadouts/analysis.js";
import type { DefinitionComponentData, DefinitionRecord } from "../manifest/definitions.js";
import type { BungieOAuthToken } from "../oauth/login.js";

export type { AmmoTypeKey, EquipmentGroupKey } from "../items/classification.js";
export type { WeaponFrameSummary } from "../items/weaponFrames.js";

export type AccountItemSummary = {
  hash: number;
  instance_id?: string;
  name: string;
  icon?: string;
  item_type?: string;
  class_type?: number;
  ammo_type?: AmmoTypeKey;
  tier?: string;
  bucket_hash?: number;
  bucket_name?: string;
  group_key: EquipmentGroupKey;
  weapon_frame?: WeaponFrameSummary;
  power?: number;
  locked?: boolean;
  armor_stats?: ArmorStatSummary;
  armor_stat_breakdown?: ArmorStatBreakdownSummary;
  armor_energy?: ArmorEnergySummary;
  weapon_stats?: WeaponStatSummary;
  instance?: AccountItemInstanceSummary;
  item_objectives?: AccountItemPlugObjectiveSummary[];
  sockets?: AccountItemSocketSummary[];
  socket_plugs: AccountItemPlugSummary[];
};

export type AccountItemInstanceSummary = {
  damage_type?: number;
  damage_type_hash?: number;
  breaker_type?: number;
  breaker_type_hash?: number;
  item_level?: number;
  quality?: number;
  is_equipped?: boolean;
  can_equip?: boolean;
  equip_required_level?: number;
  cannot_equip_reason?: number;
  gear_tier?: number;
};

export type ArmorStatSummary = Record<ArmorStatKey, number> & {
  total: number;
};

export type ArmorStatBreakdownEntry = {
  base: number;
  mod: number;
  final: number;
};

export type ArmorStatBreakdownSummary = Record<ArmorStatKey, ArmorStatBreakdownEntry> & {
  total: ArmorStatBreakdownEntry;
};

export type ArmorEnergySummary = {
  type_hash?: number;
  type?: number;
  capacity: number;
  used: number;
  unused: number;
};

export type WeaponStatKey =
  | "impact"
  | "range"
  | "stability"
  | "handling"
  | "reload_speed"
  | "magazine"
  | "rounds_per_minute"
  | "charge_time"
  | "draw_time"
  | "recoil_direction";

export type WeaponStatSummary = Partial<Record<WeaponStatKey, number>>;

export type AccountMaterialSummary = {
  hash: number;
  name: string;
  icon?: string;
  item_type?: string;
  tier?: string;
  quantity: number;
};

export type AccountItemPlugSummary = {
  hash: number;
  name: string;
  icon?: string;
  description?: string;
  category_identifier?: string;
  objectives?: AccountItemPlugObjectiveSummary[];
  stat_modifiers?: WeaponStatSummary;
  source_description?: string;
  item_type?: string;
};

export type AccountItemPlugObjectiveSummary = {
  objective_hash: number;
  progress?: number;
  completion_value: number;
  complete: boolean;
  visible: boolean;
  progress_description?: string;
};

export type AccountItemReusablePlugSource = "instance" | "character" | "profile" | "manifest";

export type AccountItemReusablePlugSummary = AccountItemPlugSummary & {
  selected: boolean;
  can_insert?: boolean;
  enabled?: boolean;
  insert_fail_indexes: number[];
  enable_fail_indexes: number[];
  sources: AccountItemReusablePlugSource[];
};

export type AccountItemSocketSummary = {
  socket_index: number;
  is_visible: boolean;
  is_enabled: boolean;
  enable_fail_indexes: number[];
  selected_plug?: AccountItemPlugSummary;
  reusable_plugs: AccountItemReusablePlugSummary[];
};

export type CharacterEquipmentGroup = {
  key: EquipmentGroupKey;
  label: string;
  items: AccountItemSummary[];
};

export type CharacterSummary = {
  character_id: string;
  class_name: string;
  light?: number;
  emblem_url?: string;
  equipped_items: AccountItemSummary[];
  equipment_groups: CharacterEquipmentGroup[];
  inventory_items: AccountItemSummary[];
  inventory_groups: CharacterEquipmentGroup[];
  postmaster_items: AccountItemSummary[];
  loadout_slots: CharacterLoadoutSlotSummary[];
  craftable_items?: AccountCraftableItemSummary[];
};

export type AccountCraftableItemSummary = {
  hash: number;
  name: string;
  icon?: string;
  visible: boolean;
  failed_requirement_indexes: number[];
  sockets: AccountCraftableSocketSummary[];
};

export type AccountCraftableSocketSummary = {
  socket_index: number;
  plug_set_hash: number;
  plugs: Array<{
    hash: number;
    name: string;
    icon?: string;
    category_identifier?: string;
    failed_requirement_indexes: number[];
  }>;
};

export type CharacterLoadoutSlotItemSummary = {
  instance_id?: string;
  name: string;
  bucket_name?: string;
};

export type CharacterLoadoutSlotSummary = {
  index: number;
  name: string;
  name_hash?: number;
  icon_hash?: number;
  color_hash?: number;
  item_count: number;
  items: CharacterLoadoutSlotItemSummary[];
};

export type AccountSummary = {
  account_name: string;
  destiny_membership_id: string;
  membership_type: number;
  characters: CharacterSummary[];
  vault: {
    item_count: number;
    items: AccountItemSummary[];
    sample_items: AccountItemSummary[];
  };
  materials: {
    item_count: number;
    items: AccountMaterialSummary[];
  };
};

export type FetchAccountSummaryOptions = {
  config: D2Config;
  token: BungieOAuthToken;
  itemDefinitions?: DefinitionComponentData;
  bucketDefinitions?: DefinitionComponentData;
  plugSetDefinitions?: DefinitionComponentData;
  objectiveDefinitions?: DefinitionComponentData;
  loadoutNameDefinitions?: DefinitionComponentData;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

type UserMembershipData = {
  bungieNetUser?: {
    displayName?: string;
    uniqueName?: string;
  };
  destinyMemberships?: DestinyMembership[];
  primaryMembershipId?: string;
};

type DestinyMembership = {
  membershipId: string;
  membershipType: number;
  displayName?: string;
  bungieGlobalDisplayName?: string;
  bungieGlobalDisplayNameCode?: number;
};

type DestinyProfileResponse = {
  characters?: {
    data?: Record<string, DestinyCharacter>;
  };
  characterInventories?: {
    data?: Record<string, { items?: DestinyProfileItem[] }>;
  };
  characterEquipment?: {
    data?: Record<string, { items?: DestinyProfileItem[] }>;
  };
  characterLoadouts?: {
    data?: Record<string, { loadouts?: DestinyCharacterLoadout[] }>;
  };
  profileInventory?: {
    data?: { items?: DestinyProfileItem[] };
  };
  profilePlugSets?: {
    data?: DestinyPlugSetsComponent;
  };
  characterPlugSets?: {
    data?: Record<string, DestinyPlugSetsComponent>;
  };
  characterCraftables?: {
    data?: Record<string, DestinyCraftablesComponent>;
  };
  itemComponents?: {
    instances?: {
      data?: Record<string, DestinyItemInstanceComponent>;
    };
    objectives?: {
      data?: Record<string, DestinyItemObjectivesComponent>;
    };
    stats?: {
      data?: Record<string, DestinyItemStatsComponent>;
    };
    sockets?: {
      data?: Record<string, DestinyItemSocketsComponent>;
    };
    reusablePlugs?: {
      data?: Record<string, DestinyItemReusablePlugsComponent>;
    };
    plugObjectives?: {
      data?: Record<string, DestinyItemPlugObjectivesComponent>;
    };
  };
};

type DestinyCharacter = {
  characterId: string;
  classType?: number;
  light?: number;
  emblemPath?: string;
};

type DestinyProfileItem = {
  itemHash: number;
  itemInstanceId?: string;
  bucketHash?: number;
  quantity?: number;
  state?: number;
};

type DestinyItemInstanceComponent = {
  damageType?: number;
  damageTypeHash?: number;
  primaryStat?: {
    value?: number;
  };
  energy?: {
    energyTypeHash?: number;
    energyType?: number;
    energyCapacity?: number;
    energyUsed?: number;
    energyUnused?: number;
  };
  itemLevel?: number;
  quality?: number;
  isEquipped?: boolean;
  canEquip?: boolean;
  equipRequiredLevel?: number;
  cannotEquipReason?: number;
  breakerType?: number;
  breakerTypeHash?: number;
  gearTier?: number;
};

type DestinyItemStatsComponent = {
  stats?: Record<string, DestinyItemStat>;
};

type DestinyItemStat = {
  statHash?: number;
  value?: number;
};

type DestinyItemSocketsComponent = {
  sockets?: DestinyItemSocket[];
};

type DestinyItemSocket = {
  plugHash?: number;
  isEnabled?: boolean;
  isVisible?: boolean;
  enableFailIndexes?: number[];
};

type DestinyObjectiveProgress = {
  objectiveHash: number;
  progress?: number;
  completionValue: number;
  complete: boolean;
  visible: boolean;
};

type DestinyItemPlugState = {
  plugItemHash: number;
  canInsert?: boolean;
  enabled?: boolean;
  insertFailIndexes?: number[];
  enableFailIndexes?: number[];
  plugObjectives?: DestinyObjectiveProgress[];
};

type DestinyItemReusablePlugsComponent = {
  plugs?: Record<string, DestinyItemPlugState[]>;
};

type DestinyItemPlugObjectivesComponent = {
  objectivesPerPlug?: Record<string, DestinyObjectiveProgress[]>;
};

type DestinyItemObjectivesComponent = {
  objectives?: DestinyObjectiveProgress[];
};

type DestinyPlugSetsComponent = {
  plugs?: Record<string, DestinyItemPlugState[]>;
};

type DestinyCraftablesComponent = {
  craftables?: Record<string, {
    visible?: boolean;
    failedRequirementIndexes?: number[];
    sockets?: Array<{
      plugSetHash?: number;
      plugs?: Array<{
        plugItemHash?: number;
        failedRequirementIndexes?: number[];
      }>;
    }>;
  }>;
};

type DestinyCharacterLoadout = {
  nameHash?: number;
  iconHash?: number;
  colorHash?: number;
  items?: Array<{
    itemInstanceId?: string;
  }>;
};

const bungieStaticBaseUrl = "https://www.bungie.net";
const profileComponents = [
  100, // Profiles
  102, // ProfileInventories
  200, // Characters
  201, // CharacterInventories
  205, // CharacterEquipment
  206, // CharacterLoadouts
  300, // ItemInstances
  304, // ItemStats
  305, // ItemSockets
  301, // ItemObjectives
  309, // ItemPlugObjectives
  310, // ItemReusablePlugs
  1300 // Craftables
].join(",");

const equipmentGroupLabels: Record<EquipmentGroupKey, string> = {
  weapons: "武器",
  armor: "护甲",
  equipment: "其他装备",
  other: "其他"
};

const equipmentGroupOrder: EquipmentGroupKey[] = ["weapons", "armor", "equipment", "other"];

const armorStatHashMap: Record<number, ArmorStatKey> = {
  392767087: "health",
  4244567218: "melee",
  1735777505: "grenade",
  144602215: "super",
  1943323491: "class",
  2996146975: "weapon"
};

const armorStatKeys: ArmorStatKey[] = ["health", "melee", "grenade", "super", "class", "weapon"];

const weaponStatHashMap: Record<number, WeaponStatKey> = {
  4043523819: "impact",
  1240592695: "range",
  155624089: "stability",
  943549884: "handling",
  4188031367: "reload_speed",
  3871231066: "magazine",
  4284893193: "rounds_per_minute",
  2961396640: "charge_time",
  447667954: "draw_time",
  2714457168: "recoil_direction"
};

export async function fetchAccountSummary(options: FetchAccountSummaryOptions): Promise<AccountSummary> {
  const accessToken = options.token.access_token;
  if (!accessToken) {
    throw new Error("Bungie access token is required");
  }

  const memberships = await fetchBungieJson<UserMembershipData>(
    "/User/GetMembershipsForCurrentUser/",
    {
      apiKey: options.config.bungie.api_key,
      accessToken,
      baseUrl: options.baseUrl,
      fetchImpl: options.fetchImpl
    }
  );
  const destinyMembership = selectDestinyMembership(memberships);
  const profile = await fetchBungieJson<DestinyProfileResponse>(
    `/Destiny2/${destinyMembership.membershipType}/Profile/${destinyMembership.membershipId}/?components=${profileComponents}`,
    {
      apiKey: options.config.bungie.api_key,
      accessToken,
      baseUrl: options.baseUrl,
      fetchImpl: options.fetchImpl
    }
  );

  return {
    account_name: memberships.bungieNetUser?.displayName
      ?? memberships.bungieNetUser?.uniqueName
      ?? destinyMembership.bungieGlobalDisplayName
      ?? destinyMembership.displayName
      ?? "Unknown Guardian",
    destiny_membership_id: destinyMembership.membershipId,
    membership_type: destinyMembership.membershipType,
    characters: summarizeCharacters(
      profile,
      options.itemDefinitions ?? {},
      options.bucketDefinitions ?? {},
      options.loadoutNameDefinitions ?? {},
      options.plugSetDefinitions ?? {},
      options.objectiveDefinitions ?? {}
    ),
    ...summarizeProfileInventory(
      profile,
      options.itemDefinitions ?? {},
      options.bucketDefinitions ?? {},
      options.plugSetDefinitions ?? {},
      options.objectiveDefinitions ?? {}
    )
  };
}

function selectDestinyMembership(data: UserMembershipData): DestinyMembership {
  const memberships = data.destinyMemberships ?? [];
  const selected = memberships.find((membership) => membership.membershipId === data.primaryMembershipId)
    ?? memberships[0];
  if (!selected) {
    throw new Error("No Destiny membership found for the logged-in Bungie account");
  }

  return selected;
}

function summarizeCharacters(
  profile: DestinyProfileResponse,
  definitions: DefinitionComponentData,
  bucketDefinitions: DefinitionComponentData,
  loadoutNameDefinitions: DefinitionComponentData,
  plugSetDefinitions: DefinitionComponentData,
  objectiveDefinitions: DefinitionComponentData
): CharacterSummary[] {
  const characters = Object.values(profile.characters?.data ?? {});
  const vaultItems = (profile.profileInventory?.data?.items ?? [])
    .filter((item) => Boolean(item.itemInstanceId))
    .map((item) => summarizeItem(
      item,
      definitions,
      profile,
      bucketDefinitions,
      plugSetDefinitions,
      objectiveDefinitions
    ));

  return characters.map((character) => {
    const equippedItems = (profile.characterEquipment?.data?.[character.characterId]?.items ?? [])
      .slice(0, 16)
      .map((item) => summarizeItem(
        item,
        definitions,
        profile,
        bucketDefinitions,
        plugSetDefinitions,
        objectiveDefinitions,
        character.characterId
      ));
    const allCharacterItems = (profile.characterInventories?.data?.[character.characterId]?.items ?? [])
      .map((item) => summarizeItem(
        item,
        definitions,
        profile,
        bucketDefinitions,
        plugSetDefinitions,
        objectiveDefinitions,
        character.characterId
      ));
    const inventoryItems = allCharacterItems.filter((item) => !isPostmasterItem(item, bucketDefinitions));
    const postmasterItems = allCharacterItems.filter((item) => isPostmasterItem(item, bucketDefinitions));
    const knownItems = [...equippedItems, ...inventoryItems, ...postmasterItems, ...vaultItems];

    return {
      character_id: character.characterId,
      class_name: className(character.classType),
      light: character.light,
      emblem_url: normalizeBungieAssetUrl(character.emblemPath),
      equipped_items: equippedItems,
      equipment_groups: groupEquipment(equippedItems),
      inventory_items: inventoryItems,
      inventory_groups: groupEquipment(inventoryItems),
      postmaster_items: postmasterItems,
      loadout_slots: summarizeCharacterLoadouts(
        profile.characterLoadouts?.data?.[character.characterId]?.loadouts ?? [],
        loadoutNameDefinitions,
        knownItems
      ),
      craftable_items: summarizeCraftables(
        profile.characterCraftables?.data?.[character.characterId],
        definitions
      )
    };
  });
}

function summarizeProfileInventory(
  profile: DestinyProfileResponse,
  definitions: DefinitionComponentData,
  bucketDefinitions: DefinitionComponentData,
  plugSetDefinitions: DefinitionComponentData,
  objectiveDefinitions: DefinitionComponentData
): Pick<AccountSummary, "vault" | "materials"> {
  const profileItems = profile.profileInventory?.data?.items ?? [];
  const items = profileItems
    .filter((item) => Boolean(item.itemInstanceId))
    .map((item) => summarizeItem(
      item,
      definitions,
      profile,
      bucketDefinitions,
      plugSetDefinitions,
      objectiveDefinitions
    ));
  const materials = profileItems
    .filter((item) => !item.itemInstanceId)
    .map((item) => summarizeMaterial(item, definitions));

  return {
    vault: {
      item_count: items.length,
      items,
      sample_items: items.slice(0, 30)
    },
    materials: {
      item_count: materials.length,
      items: materials
    }
  };
}

function summarizeMaterial(
  item: DestinyProfileItem,
  definitions: DefinitionComponentData
): AccountMaterialSummary {
  const definition = definitions[String(item.itemHash)] as DefinitionRecord | undefined;
  return {
    hash: item.itemHash,
    name: definition?.displayProperties?.name?.trim() || `Item ${item.itemHash}`,
    icon: normalizeBungieAssetUrl(definition?.displayProperties?.icon),
    item_type: definition?.itemTypeDisplayName,
    tier: definition?.inventory?.tierTypeName,
    quantity: item.quantity ?? 1
  };
}

function summarizeItem(
  item: DestinyProfileItem,
  definitions: DefinitionComponentData,
  profile: DestinyProfileResponse,
  bucketDefinitions: DefinitionComponentData = {},
  plugSetDefinitions: DefinitionComponentData = {},
  objectiveDefinitions: DefinitionComponentData = {},
  characterId?: string
): AccountItemSummary {
  const components = profile.itemComponents;
  const definition = definitions[String(item.itemHash)] as DefinitionRecord | undefined;
  const explicitBucketHash = item.bucketHash;
  const definitionBucketHash = definition?.inventory?.bucketTypeHash;
  const explicitBucketDefinition = explicitBucketHash
    ? bucketDefinitions[String(explicitBucketHash)] as DefinitionRecord | undefined
    : undefined;
  const bucketHash = isPostmasterBucketDefinition(explicitBucketDefinition)
    ? explicitBucketHash
    : definitionBucketHash ?? explicitBucketHash;
  const bucket = classifyBucket(bucketHash);
  const groupKey = bucket?.group ?? "other";
  const bucketDefinition = bucketHash ? bucketDefinitions[String(bucketHash)] as DefinitionRecord | undefined : undefined;
  const instanceId = item.itemInstanceId;
  const instance = instanceId ? components?.instances?.data?.[instanceId] : undefined;
  const sockets = summarizeSockets({
    instanceId,
    itemDefinition: definition,
    components,
    definitions,
    plugSetDefinitions,
    objectiveDefinitions,
    profilePlugSets: profile.profilePlugSets?.data,
    characterPlugSets: characterId ? profile.characterPlugSets?.data?.[characterId] : undefined
  });
  const summary: AccountItemSummary = {
    hash: item.itemHash,
    instance_id: instanceId,
    name: definition?.displayProperties?.name?.trim() || `Item ${item.itemHash}`,
    icon: normalizeBungieAssetUrl(definition?.displayProperties?.icon),
    item_type: definition?.itemTypeDisplayName,
    class_type: definition?.classType,
    ammo_type: ammoTypeKey(definition?.equippingBlock?.ammoType),
    tier: definition?.inventory?.tierTypeName,
    bucket_hash: bucketHash,
    bucket_name: bucket?.name ?? bucketDefinition?.displayProperties?.name?.trim(),
    group_key: groupKey,
    power: instance?.primaryStat?.value,
    locked: isLocked(item.state),
    instance: summarizeItemInstance(instance),
    item_objectives: summarizeItemObjectives(instanceId, components, objectiveDefinitions),
    sockets,
    socket_plugs: sockets.flatMap((socket) => (
      socket.is_visible && socket.selected_plug ? [socket.selected_plug] : []
    ))
  };
  const armorStats = groupKey === "armor" ? summarizeArmorStats(instanceId, components) : undefined;
  if (armorStats) {
    summary.armor_stats = armorStats;
    summary.armor_stat_breakdown = summarizeArmorStatBreakdown(
      armorStats,
      instanceId,
      components,
      definitions
    );
  }
  const armorEnergy = groupKey === "armor" ? summarizeArmorEnergy(instance) : undefined;
  if (armorEnergy) {
    summary.armor_energy = armorEnergy;
  }
  const weaponStats = groupKey === "weapons" ? summarizeWeaponStats(instanceId, components) : undefined;
  if (weaponStats) {
    summary.weapon_stats = weaponStats;
  }
  const weaponFrame = definition
    ? summarizeWeaponFrame(definition, definitions, { plugSetDefinitions })
    : undefined;
  if (weaponFrame) {
    summary.weapon_frame = weaponFrame;
  }

  return summary;
}

function summarizeArmorEnergy(instance: DestinyItemInstanceComponent | undefined): ArmorEnergySummary | undefined {
  const energy = instance?.energy;
  if (!energy) {
    return undefined;
  }

  if (
    typeof energy.energyCapacity !== "number"
    || typeof energy.energyUsed !== "number"
    || typeof energy.energyUnused !== "number"
  ) {
    return undefined;
  }

  return {
    type_hash: energy.energyTypeHash,
    type: energy.energyType,
    capacity: energy.energyCapacity,
    used: energy.energyUsed,
    unused: energy.energyUnused
  };
}

function summarizeItemInstance(
  instance: DestinyItemInstanceComponent | undefined
): AccountItemInstanceSummary | undefined {
  if (!instance) {
    return undefined;
  }

  const summary: AccountItemInstanceSummary = {
    damage_type: instance.damageType,
    damage_type_hash: instance.damageTypeHash,
    breaker_type: instance.breakerType,
    breaker_type_hash: instance.breakerTypeHash,
    item_level: instance.itemLevel,
    quality: instance.quality,
    is_equipped: instance.isEquipped,
    can_equip: instance.canEquip,
    equip_required_level: instance.equipRequiredLevel,
    cannot_equip_reason: instance.cannotEquipReason,
    gear_tier: instance.gearTier
  };

  return Object.values(summary).some((value) => value !== undefined) ? summary : undefined;
}

function summarizeWeaponStats(
  instanceId: string | undefined,
  components: DestinyProfileResponse["itemComponents"] | undefined
): WeaponStatSummary | undefined {
  if (!instanceId) {
    return undefined;
  }

  const stats = components?.stats?.data?.[instanceId]?.stats;
  if (!stats) {
    return undefined;
  }

  const summary: WeaponStatSummary = {};
  for (const stat of Object.values(stats)) {
    const key = weaponStatHashMap[Number(stat.statHash)];
    if (!key || stat.value === undefined) {
      continue;
    }
    summary[key] = stat.value;
  }

  return Object.keys(summary).length ? summary : undefined;
}

function summarizeArmorStats(
  instanceId: string | undefined,
  components: DestinyProfileResponse["itemComponents"] | undefined
): ArmorStatSummary | undefined {
  if (!instanceId) {
    return undefined;
  }

  const stats = components?.stats?.data?.[instanceId]?.stats;
  if (!stats) {
    return undefined;
  }

  const summary: ArmorStatSummary = {
    health: 0,
    melee: 0,
    grenade: 0,
    super: 0,
    class: 0,
    weapon: 0,
    total: 0
  };

  for (const stat of Object.values(stats)) {
    const key = armorStatHashMap[Number(stat.statHash)];
    if (!key) {
      continue;
    }
    summary[key] = stat.value ?? 0;
  }
  summary.total = summary.health
    + summary.melee
    + summary.grenade
    + summary.super
    + summary.class
    + summary.weapon;

  return summary;
}

function summarizeArmorStatBreakdown(
  armorStats: ArmorStatSummary,
  instanceId: string | undefined,
  components: DestinyProfileResponse["itemComponents"] | undefined,
  definitions: DefinitionComponentData
): ArmorStatBreakdownSummary {
  const mods = summarizeArmorStatMods(instanceId, components, definitions);
  const summary = {} as ArmorStatBreakdownSummary;

  for (const key of armorStatKeys) {
    const finalValue = armorStats[key] ?? 0;
    const modValue = mods[key] ?? 0;
    summary[key] = {
      base: finalValue - modValue,
      mod: modValue,
      final: finalValue
    };
  }

  const finalTotal = armorStats.total;
  const modTotal = armorStatKeys.reduce((total, key) => total + summary[key].mod, 0);
  summary.total = {
    base: finalTotal - modTotal,
    mod: modTotal,
    final: finalTotal
  };

  return summary;
}

function summarizeArmorStatMods(
  instanceId: string | undefined,
  components: DestinyProfileResponse["itemComponents"] | undefined,
  definitions: DefinitionComponentData
): Record<ArmorStatKey, number> {
  const summary = Object.fromEntries(armorStatKeys.map((key) => [key, 0])) as Record<ArmorStatKey, number>;
  if (!instanceId) {
    return summary;
  }

  const sockets = components?.sockets?.data?.[instanceId]?.sockets ?? [];
  for (const socket of sockets) {
    if (socket.isVisible === false || !socket.plugHash) {
      continue;
    }

    const definition = definitions[String(socket.plugHash)] as DefinitionRecord | undefined;
    for (const stat of definition?.investmentStats ?? []) {
      if (stat.isConditionallyActive) {
        continue;
      }

      const key = armorStatHashMap[Number(stat.statTypeHash)];
      if (!key || typeof stat.value !== "number") {
        continue;
      }

      summary[key] += stat.value;
    }
  }

  return summary;
}

function summarizeCharacterLoadouts(
  loadouts: DestinyCharacterLoadout[],
  loadoutNameDefinitions: DefinitionComponentData,
  knownItems: AccountItemSummary[]
): CharacterLoadoutSlotSummary[] {
  const itemsByInstanceId = new Map(
    knownItems
      .filter((item) => item.instance_id)
      .map((item) => [item.instance_id as string, item] as const)
  );

  return loadouts.map((loadout, index) => ({
    index,
    name: resolveLoadoutName(loadout.nameHash, index, loadoutNameDefinitions),
    ...(typeof loadout.nameHash === "number" ? { name_hash: loadout.nameHash } : {}),
    ...(typeof loadout.iconHash === "number" ? { icon_hash: loadout.iconHash } : {}),
    ...(typeof loadout.colorHash === "number" ? { color_hash: loadout.colorHash } : {}),
    item_count: loadout.items?.length ?? 0,
    items: (loadout.items ?? []).map((item) => {
      const matched = item.itemInstanceId ? itemsByInstanceId.get(item.itemInstanceId) : undefined;
      return {
        instance_id: item.itemInstanceId,
        name: matched?.name ?? `物品 ${item.itemInstanceId ?? "未知"}`,
        bucket_name: matched?.bucket_name
      };
    })
  }));
}

function resolveLoadoutName(
  nameHash: number | undefined,
  index: number,
  loadoutNameDefinitions: DefinitionComponentData
): string {
  const definition = nameHash ? loadoutNameDefinitions[String(nameHash)] as DefinitionRecord | undefined : undefined;
  const resolved = definition?.name?.trim() || definition?.displayProperties?.name?.trim();
  return resolved || `配装槽 ${index + 1}`;
}

function isPostmasterItem(item: AccountItemSummary, bucketDefinitions: DefinitionComponentData): boolean {
  if (!item.bucket_hash) {
    return false;
  }

  const bucketDefinition = bucketDefinitions[String(item.bucket_hash)] as DefinitionRecord | undefined;
  const bucketName = bucketDefinition?.displayProperties?.name?.trim().toLowerCase() ?? "";
  return bucketName.includes("postmaster")
    || bucketName.includes("lost items")
    || bucketName.includes("邮政")
    || bucketName.includes("失物");
}

function isPostmasterBucketDefinition(bucketDefinition: DefinitionRecord | undefined): boolean {
  const bucketName = bucketDefinition?.displayProperties?.name?.trim().toLowerCase() ?? "";
  return bucketName.includes("postmaster")
    || bucketName.includes("lost items")
    || bucketName.includes("邮政")
    || bucketName.includes("失物");
}

function summarizeSockets(input: {
  instanceId: string | undefined;
  itemDefinition: DefinitionRecord | undefined;
  components: DestinyProfileResponse["itemComponents"] | undefined;
  definitions: DefinitionComponentData;
  plugSetDefinitions: DefinitionComponentData;
  objectiveDefinitions: DefinitionComponentData;
  profilePlugSets: DestinyPlugSetsComponent | undefined;
  characterPlugSets: DestinyPlugSetsComponent | undefined;
}): AccountItemSocketSummary[] {
  if (!input.instanceId) {
    return [];
  }

  const socketStates = input.components?.sockets?.data?.[input.instanceId]?.sockets ?? [];
  const itemReusablePlugs = input.components?.reusablePlugs?.data?.[input.instanceId]?.plugs ?? {};
  const objectivesPerPlug = input.components?.plugObjectives?.data?.[input.instanceId]?.objectivesPerPlug ?? {};
  const socketEntries = input.itemDefinition?.sockets?.socketEntries ?? [];

  return socketStates.map((socket, socketIndex) => {
    const selectedHash = typeof socket.plugHash === "number" ? socket.plugHash : undefined;
    const selectedObjectives = selectedHash === undefined ? undefined : objectivesPerPlug[String(selectedHash)];
    const reusableByHash = new Map<number, AccountItemReusablePlugSummary>();
    const addCandidates = (
      candidates: DestinyItemPlugState[],
      source: AccountItemReusablePlugSource
    ): void => {
      for (const candidate of candidates) {
        if (typeof candidate.plugItemHash !== "number") {
          continue;
        }
        const existing = reusableByHash.get(candidate.plugItemHash);
        const objectives = candidate.plugObjectives ?? objectivesPerPlug[String(candidate.plugItemHash)];
        const next = buildReusablePlugSummary(
          candidate,
          source,
          selectedHash,
          objectives,
          input.definitions,
          input.objectiveDefinitions
        );
        if (!existing) {
          reusableByHash.set(candidate.plugItemHash, next);
          continue;
        }
        existing.selected ||= next.selected;
        existing.can_insert = existing.can_insert ?? next.can_insert;
        existing.enabled = existing.enabled ?? next.enabled;
        existing.insert_fail_indexes = existing.insert_fail_indexes.length
          ? existing.insert_fail_indexes
          : next.insert_fail_indexes;
        existing.enable_fail_indexes = existing.enable_fail_indexes.length
          ? existing.enable_fail_indexes
          : next.enable_fail_indexes;
        existing.objectives = existing.objectives ?? next.objectives;
        if (!existing.sources.includes(source)) {
          existing.sources.push(source);
        }
      }
    };

    addCandidates(itemReusablePlugs[String(socketIndex)] ?? [], "instance");
    const reusablePlugSetHash = socketEntries[socketIndex]?.reusablePlugSetHash;
    if (typeof reusablePlugSetHash === "number") {
      addCandidates(input.characterPlugSets?.plugs?.[String(reusablePlugSetHash)] ?? [], "character");
      addCandidates(input.profilePlugSets?.plugs?.[String(reusablePlugSetHash)] ?? [], "profile");
      const manifestPlugs = input.plugSetDefinitions[String(reusablePlugSetHash)]?.reusablePlugItems ?? [];
      addCandidates(
        manifestPlugs
          .filter((plug): plug is { plugItemHash: number } => typeof plug.plugItemHash === "number")
          .map((plug) => ({ plugItemHash: plug.plugItemHash })),
        "manifest"
      );
    }

    if (selectedHash !== undefined && !reusableByHash.has(selectedHash)) {
      addCandidates([{ plugItemHash: selectedHash }], "instance");
    }

    return {
      socket_index: socketIndex,
      is_visible: socket.isVisible !== false,
      is_enabled: socket.isEnabled !== false,
      enable_fail_indexes: socket.enableFailIndexes ?? [],
      selected_plug: selectedHash === undefined
        ? undefined
        : buildPlugSummary(
          selectedHash,
          selectedObjectives,
          input.definitions,
          input.objectiveDefinitions
        ),
      reusable_plugs: [...reusableByHash.values()]
    };
  });
}

function buildReusablePlugSummary(
  plug: DestinyItemPlugState,
  source: AccountItemReusablePlugSource,
  selectedHash: number | undefined,
  objectives: DestinyObjectiveProgress[] | undefined,
  definitions: DefinitionComponentData,
  objectiveDefinitions: DefinitionComponentData
): AccountItemReusablePlugSummary {
  return {
    ...buildPlugSummary(plug.plugItemHash, objectives, definitions, objectiveDefinitions),
    selected: plug.plugItemHash === selectedHash,
    can_insert: plug.canInsert,
    enabled: plug.enabled,
    insert_fail_indexes: plug.insertFailIndexes ?? [],
    enable_fail_indexes: plug.enableFailIndexes ?? [],
    sources: [source]
  };
}

function buildPlugSummary(
  hash: number,
  objectives: DestinyObjectiveProgress[] | undefined,
  definitions: DefinitionComponentData,
  objectiveDefinitions: DefinitionComponentData
): AccountItemPlugSummary {
  const definition = definitions[String(hash)] as DefinitionRecord | undefined;
  const objectiveSummaries = summarizePlugObjectives(objectives, objectiveDefinitions);
  const statModifiers: WeaponStatSummary = {};
  for (const stat of definition?.investmentStats ?? []) {
    const key = weaponStatHashMap[Number(stat.statTypeHash)];
    if (!key || stat.isConditionallyActive || typeof stat.value !== "number") continue;
    statModifiers[key] = (statModifiers[key] ?? 0) + stat.value;
  }
  return {
    hash,
    name: definition?.displayProperties?.name?.trim() || `Plug ${hash}`,
    icon: normalizeBungieAssetUrl(definition?.displayProperties?.icon),
    description: definition?.displayProperties?.description,
    category_identifier: definition?.plug?.plugCategoryIdentifier,
    objectives: objectiveSummaries.length ? objectiveSummaries : undefined,
    ...(Object.keys(statModifiers).length ? { stat_modifiers: statModifiers } : {}),
    ...(definition?.sourceData?.sourceString
      ? { source_description: definition.sourceData.sourceString }
      : {}),
    ...(definition?.itemTypeDisplayName ? { item_type: definition.itemTypeDisplayName } : {})
  };
}

function summarizePlugObjectives(
  objectives: DestinyObjectiveProgress[] | undefined,
  objectiveDefinitions: DefinitionComponentData
): AccountItemPlugObjectiveSummary[] {
  return (objectives ?? []).map((objective) => {
    const definition = objectiveDefinitions[String(objective.objectiveHash)] as DefinitionRecord | undefined;
    return {
      objective_hash: objective.objectiveHash,
      progress: objective.progress,
      completion_value: objective.completionValue,
      complete: objective.complete,
      visible: objective.visible,
      progress_description: typeof definition?.progressDescription === "string"
        ? definition.progressDescription
        : undefined
    };
  });
}

function summarizeItemObjectives(
  instanceId: string | undefined,
  components: DestinyProfileResponse["itemComponents"] | undefined,
  objectiveDefinitions: DefinitionComponentData
): AccountItemPlugObjectiveSummary[] | undefined {
  if (!instanceId) {
    return undefined;
  }
  const objectives = components?.objectives?.data?.[instanceId]?.objectives;
  const summaries = summarizePlugObjectives(objectives, objectiveDefinitions);
  return summaries.length ? summaries : undefined;
}

function summarizeCraftables(
  component: DestinyCraftablesComponent | undefined,
  definitions: DefinitionComponentData
): AccountCraftableItemSummary[] {
  return Object.entries(component?.craftables ?? {}).map(([hashValue, craftable]) => {
    const hash = Number(hashValue);
    const definition = definitions[hashValue] as DefinitionRecord | undefined;
    return {
      hash,
      name: definition?.displayProperties?.name?.trim() || `Item ${hash}`,
      icon: normalizeBungieAssetUrl(definition?.displayProperties?.icon),
      visible: craftable.visible !== false,
      failed_requirement_indexes: craftable.failedRequirementIndexes ?? [],
      sockets: (craftable.sockets ?? []).map((socket, socketIndex) => ({
        socket_index: socketIndex,
        plug_set_hash: socket.plugSetHash ?? 0,
        plugs: (socket.plugs ?? [])
          .filter((plug): plug is { plugItemHash: number; failedRequirementIndexes?: number[] } => (
            typeof plug.plugItemHash === "number"
          ))
          .map((plug) => {
            const plugDefinition = definitions[String(plug.plugItemHash)] as DefinitionRecord | undefined;
            return {
              hash: plug.plugItemHash,
              name: plugDefinition?.displayProperties?.name?.trim() || `Plug ${plug.plugItemHash}`,
              icon: normalizeBungieAssetUrl(plugDefinition?.displayProperties?.icon),
              category_identifier: plugDefinition?.plug?.plugCategoryIdentifier,
              failed_requirement_indexes: plug.failedRequirementIndexes ?? []
            };
          })
      }))
    };
  });
}

function isLocked(state: number | undefined): boolean | undefined {
  if (state === undefined) {
    return undefined;
  }

  return (state & 1) === 1;
}

function groupEquipment(items: AccountItemSummary[]): CharacterEquipmentGroup[] {
  return equipmentGroupOrder
    .map((key) => ({
      key,
      label: equipmentGroupLabels[key],
      items: items.filter((item) => item.group_key === key)
    }))
    .filter((group) => group.items.length > 0);
}

function className(classType: number | undefined): string {
  switch (classType) {
    case 0:
      return "泰坦";
    case 1:
      return "猎人";
    case 2:
      return "术士";
    default:
      return "未知职业";
  }
}

function normalizeBungieAssetUrl(path: string | undefined): string | undefined {
  if (!path) {
    return undefined;
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return new URL(path, bungieStaticBaseUrl).toString();
}
