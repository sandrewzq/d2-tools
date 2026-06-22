import { fetchBungieJson } from "../bungie/client.js";
import type { D2Config } from "../config/schema.js";
import { ammoTypeKey, classifyBucket, type AmmoTypeKey, type EquipmentGroupKey } from "../items/classification.js";
import { summarizeWeaponFrame, type WeaponFrameSummary } from "../items/weaponFrames.js";
import type { ArmorStatKey } from "../loadouts/analysis.js";
import type { DefinitionComponentData, DefinitionRecord } from "../manifest/definitions.js";
import type { BungieOAuthToken } from "../oauth/login.js";

export type { AmmoTypeKey, EquipmentGroupKey } from "../items/classification.js";

export type AccountItemSummary = {
  hash: number;
  instance_id?: string;
  name: string;
  icon?: string;
  item_type?: string;
  ammo_type?: AmmoTypeKey;
  tier?: string;
  bucket_hash?: number;
  bucket_name?: string;
  group_key: EquipmentGroupKey;
  weapon_frame?: WeaponFrameSummary;
  power?: number;
  locked?: boolean;
  armor_stats?: ArmorStatSummary;
  socket_plugs: AccountItemPlugSummary[];
};

export type ArmorStatSummary = Record<ArmorStatKey, number> & {
  total: number;
};

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
};

export type CharacterLoadoutSlotItemSummary = {
  instance_id?: string;
  name: string;
  bucket_name?: string;
};

export type CharacterLoadoutSlotSummary = {
  index: number;
  name: string;
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
    itemComponents?: {
    instances?: {
      data?: Record<string, DestinyItemInstanceComponent>;
    };
    stats?: {
      data?: Record<string, DestinyItemStatsComponent>;
    };
    sockets?: {
      data?: Record<string, DestinyItemSocketsComponent>;
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
  primaryStat?: {
    value?: number;
  };
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
  isVisible?: boolean;
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
  305 // ItemSockets
].join(",");

const equipmentGroupLabels: Record<EquipmentGroupKey, string> = {
  weapons: "武器",
  armor: "护甲",
  equipment: "其他装备",
  other: "其他"
};

const equipmentGroupOrder: EquipmentGroupKey[] = ["weapons", "armor", "equipment", "other"];

const armorStatHashMap: Record<number, ArmorStatKey> = {
  2996146975: "mobility",
  392767087: "resilience",
  1943323491: "recovery",
  1735777505: "discipline",
  144602215: "intellect",
  4244567218: "strength"
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
      options.plugSetDefinitions ?? {}
    ),
    ...summarizeProfileInventory(
      profile,
      options.itemDefinitions ?? {},
      options.bucketDefinitions ?? {},
      options.plugSetDefinitions ?? {}
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
  plugSetDefinitions: DefinitionComponentData
): CharacterSummary[] {
  const characters = Object.values(profile.characters?.data ?? {});
  const vaultItems = (profile.profileInventory?.data?.items ?? [])
    .filter((item) => Boolean(item.itemInstanceId))
    .map((item) => summarizeItem(item, definitions, profile.itemComponents, bucketDefinitions, plugSetDefinitions));

  return characters.map((character) => {
    const equippedItems = (profile.characterEquipment?.data?.[character.characterId]?.items ?? [])
      .slice(0, 16)
      .map((item) => summarizeItem(item, definitions, profile.itemComponents, bucketDefinitions, plugSetDefinitions));
    const allCharacterItems = (profile.characterInventories?.data?.[character.characterId]?.items ?? [])
      .map((item) => summarizeItem(item, definitions, profile.itemComponents, bucketDefinitions, plugSetDefinitions));
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
      )
    };
  });
}

function summarizeProfileInventory(
  profile: DestinyProfileResponse,
  definitions: DefinitionComponentData,
  bucketDefinitions: DefinitionComponentData,
  plugSetDefinitions: DefinitionComponentData
): Pick<AccountSummary, "vault" | "materials"> {
  const profileItems = profile.profileInventory?.data?.items ?? [];
  const items = profileItems
    .filter((item) => Boolean(item.itemInstanceId))
    .map((item) => summarizeItem(item, definitions, profile.itemComponents, bucketDefinitions, plugSetDefinitions));
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
  components?: DestinyProfileResponse["itemComponents"],
  bucketDefinitions: DefinitionComponentData = {},
  plugSetDefinitions: DefinitionComponentData = {}
): AccountItemSummary {
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
  const summary: AccountItemSummary = {
    hash: item.itemHash,
    instance_id: instanceId,
    name: definition?.displayProperties?.name?.trim() || `Item ${item.itemHash}`,
    icon: normalizeBungieAssetUrl(definition?.displayProperties?.icon),
    item_type: definition?.itemTypeDisplayName,
    ammo_type: ammoTypeKey(definition?.equippingBlock?.ammoType),
    tier: definition?.inventory?.tierTypeName,
    bucket_hash: bucketHash,
    bucket_name: bucket?.name ?? bucketDefinition?.displayProperties?.name?.trim(),
    group_key: groupKey,
    power: instance?.primaryStat?.value,
    locked: isLocked(item.state),
    socket_plugs: summarizeSocketPlugs(instanceId, components, definitions)
  };
  const armorStats = groupKey === "armor" ? summarizeArmorStats(instanceId, components) : undefined;
  if (armorStats) {
    summary.armor_stats = armorStats;
  }
  const weaponFrame = definition
    ? summarizeWeaponFrame(definition, definitions, { plugSetDefinitions })
    : undefined;
  if (weaponFrame) {
    summary.weapon_frame = weaponFrame;
  }

  return summary;
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
    mobility: 0,
    resilience: 0,
    recovery: 0,
    discipline: 0,
    intellect: 0,
    strength: 0,
    total: 0
  };

  for (const stat of Object.values(stats)) {
    const key = armorStatHashMap[Number(stat.statHash)];
    if (!key) {
      continue;
    }
    summary[key] = stat.value ?? 0;
  }
  summary.total = summary.mobility
    + summary.resilience
    + summary.recovery
    + summary.discipline
    + summary.intellect
    + summary.strength;

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
    icon_hash: loadout.iconHash,
    color_hash: loadout.colorHash,
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

function summarizeSocketPlugs(
  instanceId: string | undefined,
  components: DestinyProfileResponse["itemComponents"] | undefined,
  definitions: DefinitionComponentData
): AccountItemPlugSummary[] {
  if (!instanceId) {
    return [];
  }

  return (components?.sockets?.data?.[instanceId]?.sockets ?? [])
    .filter((socket) => socket.isVisible !== false && socket.plugHash)
    .map((socket) => {
      const hash = Number(socket.plugHash);
      const definition = definitions[String(hash)] as DefinitionRecord | undefined;
      return {
        hash,
        name: definition?.displayProperties?.name?.trim() || `Plug ${hash}`,
        icon: normalizeBungieAssetUrl(definition?.displayProperties?.icon),
        description: definition?.displayProperties?.description
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
