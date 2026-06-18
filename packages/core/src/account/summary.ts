import { fetchBungieJson } from "../bungie/client.js";
import type { D2Config } from "../config/schema.js";
import type { DefinitionComponentData, DefinitionRecord } from "../manifest/definitions.js";
import type { BungieOAuthToken } from "../oauth/login.js";

export type AccountItemSummary = {
  hash: number;
  instance_id?: string;
  name: string;
  icon?: string;
  item_type?: string;
  tier?: string;
  bucket_hash?: number;
  bucket_name?: string;
  group_key: EquipmentGroupKey;
  power?: number;
  locked?: boolean;
  socket_plugs: AccountItemPlugSummary[];
};

export type AccountItemPlugSummary = {
  hash: number;
  name: string;
  icon?: string;
  description?: string;
};

export type EquipmentGroupKey = "weapons" | "armor" | "equipment" | "other";

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
};

export type FetchAccountSummaryOptions = {
  config: D2Config;
  token: BungieOAuthToken;
  itemDefinitions?: DefinitionComponentData;
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
  characterEquipment?: {
    data?: Record<string, { items?: DestinyProfileItem[] }>;
  };
  profileInventory?: {
    data?: { items?: DestinyProfileItem[] };
  };
  itemComponents?: {
    instances?: {
      data?: Record<string, DestinyItemInstanceComponent>;
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
  state?: number;
};

type DestinyItemInstanceComponent = {
  primaryStat?: {
    value?: number;
  };
};

type DestinyItemSocketsComponent = {
  sockets?: DestinyItemSocket[];
};

type DestinyItemSocket = {
  plugHash?: number;
  isVisible?: boolean;
};

const bungieStaticBaseUrl = "https://www.bungie.net";
const profileComponents = [
  100, // Profiles
  102, // ProfileInventories
  200, // Characters
  205, // CharacterEquipment
  300, // ItemInstances
  305 // ItemSockets
].join(",");

const bucketLabels: Record<number, { name: string; group: EquipmentGroupKey }> = {
  1498876634: { name: "动能武器", group: "weapons" },
  2465295065: { name: "能量武器", group: "weapons" },
  953998645: { name: "威能武器", group: "weapons" },
  3448274439: { name: "头盔", group: "armor" },
  3551918588: { name: "臂铠", group: "armor" },
  14239492: { name: "胸甲", group: "armor" },
  20886954: { name: "腿甲", group: "armor" },
  1585787867: { name: "职业物品", group: "armor" },
  3284755031: { name: "职业分支", group: "equipment" },
  4023194814: { name: "机灵", group: "equipment" },
  2025709351: { name: "载具", group: "equipment" },
  284967655: { name: "飞船", group: "equipment" },
  4274335291: { name: "徽标", group: "equipment" },
  4292445962: { name: "公会战旗", group: "equipment" },
  3683254069: { name: "终结技", group: "equipment" },
  1107761855: { name: "动作", group: "equipment" }
};

const equipmentGroupLabels: Record<EquipmentGroupKey, string> = {
  weapons: "武器",
  armor: "护甲",
  equipment: "其他装备",
  other: "其他"
};

const equipmentGroupOrder: EquipmentGroupKey[] = ["weapons", "armor", "equipment", "other"];

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
    characters: summarizeCharacters(profile, options.itemDefinitions ?? {}),
    vault: summarizeVault(profile, options.itemDefinitions ?? {})
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
  definitions: DefinitionComponentData
): CharacterSummary[] {
  const characters = Object.values(profile.characters?.data ?? {});
  return characters.map((character) => {
    const equippedItems = (profile.characterEquipment?.data?.[character.characterId]?.items ?? [])
      .slice(0, 16)
      .map((item) => summarizeItem(item, definitions, profile.itemComponents));

    return {
      character_id: character.characterId,
      class_name: className(character.classType),
      light: character.light,
      emblem_url: normalizeBungieAssetUrl(character.emblemPath),
      equipped_items: equippedItems,
      equipment_groups: groupEquipment(equippedItems)
    };
  });
}

function summarizeVault(
  profile: DestinyProfileResponse,
  definitions: DefinitionComponentData
): AccountSummary["vault"] {
  const items = (profile.profileInventory?.data?.items ?? [])
    .map((item) => summarizeItem(item, definitions, profile.itemComponents));
  return {
    item_count: items.length,
    items,
    sample_items: items.slice(0, 30)
  };
}

function summarizeItem(
  item: DestinyProfileItem,
  definitions: DefinitionComponentData,
  components?: DestinyProfileResponse["itemComponents"]
): AccountItemSummary {
  const definition = definitions[String(item.itemHash)] as DefinitionRecord | undefined;
  const bucketHash = item.bucketHash ?? definition?.inventory?.bucketTypeHash;
  const bucket = bucketHash ? bucketLabels[bucketHash] : undefined;
  const instanceId = item.itemInstanceId;
  const instance = instanceId ? components?.instances?.data?.[instanceId] : undefined;
  return {
    hash: item.itemHash,
    instance_id: instanceId,
    name: definition?.displayProperties?.name?.trim() || `Item ${item.itemHash}`,
    icon: normalizeBungieAssetUrl(definition?.displayProperties?.icon),
    item_type: definition?.itemTypeDisplayName,
    tier: definition?.inventory?.tierTypeName,
    bucket_hash: bucketHash,
    bucket_name: bucket?.name,
    group_key: bucket?.group ?? "other",
    power: instance?.primaryStat?.value,
    locked: isLocked(item.state),
    socket_plugs: summarizeSocketPlugs(instanceId, components, definitions)
  };
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
