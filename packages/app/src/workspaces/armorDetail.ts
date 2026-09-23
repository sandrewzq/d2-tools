import type {
  AccountItemPlugSummary,
  AccountItemSocketSummary,
  ArmorEnergySummary,
  ArmorStatBreakdownSummary,
  ArmorStatSummary
} from "@d2-tools/core/account/summary";
import type { ArmorStatKey } from "@d2-tools/core/loadouts/analysis";
import type { ItemSourceSummary } from "@d2-tools/core/items/source";
import type { EquipableItemSetSummary } from "@d2-tools/core/items/equipableItemSet";
import type { ItemDefinitionVersionSummary, ItemReleaseSummary } from "@d2-tools/core/items/release";
import type { SelectedItemSourceKind } from "./itemDetail.js";

export type ArmorDetailObjectKind = "definition" | "vendor_offer" | "account_item";
export type ArmorDetailEntryKind = "library" | "vendor" | "vault" | "account" | "loadout";

export type ArmorDetailObjectContext = {
  kind: ArmorDetailObjectKind;
  entry: ArmorDetailEntryKind;
  /**
   * 身份标签。`packages/app` 不认识界面语言，所以这里只负责**透传调用方注入的标签**；
   * 调用方不传时（`undefined`）由 UI 按 `entry` / `kind` 自己查表。
   */
  entry_label?: string;
  object_label?: string;
  object_id?: string;
  read_only: boolean;
};

export type ArmorDetailIdentity = {
  hash: number;
  name: string;
  description: string;
  icon?: string;
  item_type?: string;
  tier?: string;
  class_name?: string;
  bucket_name?: string;
  release?: ItemReleaseSummary;
  definition_version?: ItemDefinitionVersionSummary;
  armor_set?: EquipableItemSetSummary;
};

/** 属性名不做成字段：`key` 已经唯一确定它是哪一条，措辞由 UI 按 `copy` 现查。 */
export type ArmorStatTrack = {
  key: ArmorStatKey;
  value: number;
  base?: number;
  mod?: number;
};

export type ArmorAbility = {
  hash: number;
  name: string;
  description: string;
  icon?: string;
  kind: "intrinsic" | "special";
};

export type ArmorAbilityGroup = {
  key: string;
  name: string;
  category_identifier: string;
  options: ArmorAbility[];
  selected_option_hash?: number;
};

/**
 * 插槽的列名。`packages/app` 不认识界面语言，所以这里只给「是哪一种插槽」或
 * 「第几个部位模组位」，措辞由 UI 按 `copy` 现算。
 */
export type ArmorSocketLabel =
  | { kind: "upgrade" }
  | { kind: "special" }
  | { kind: "activity_mod" }
  | { kind: "tuning_mod" }
  | { kind: "slot"; index: number };

export type ArmorSocket = {
  key: string;
  hash: number;
  socket_index?: number;
  label: ArmorSocketLabel;
  name: string;
  description?: string;
  icon?: string;
  kind: "mod" | "upgrade" | "special";
};

export type ArmorSourceEntry = {
  id: string;
  label: string;
  description: string;
  available_now?: boolean;
  /** 调用方给的现成状态标签；没有时由 UI 按 `copy` 现算。 */
  status_label?: string;
};

export type ArmorDetailSources = {
  status: "ready" | "partial" | "unknown";
  entries: ArmorSourceEntry[];
  offer?: {
    cost_label?: string;
    purchase_label?: string;
    refresh_label?: string;
    can_purchase?: boolean;
  };
};

export type ArmorRecommendation = {
  id: string;
  title: string;
  value: string;
  reason: string;
  /**
   * 目标来自哪个数据源，由生产侧按数据取名：装备目标取 `target.source.label`，
   * 本地目标规则取规则存储名。消费侧不得按来源身份分叉（T62）。
   */
  source_label: string;
  match?: "full" | "partial" | "none";
};

export type ArmorDetailInstance = {
  item_key: string;
  instance_id: string;
  hash: number;
  name: string;
  icon?: string;
  power?: number;
  /**
   * 实例所在位置。`source_label` 是调用方给的现成标签；没有时留空，
   * 由 UI 按 `source_kind` 现查（`已装备` / `角色背包` / `邮政官` / `仓库`）。
   */
  location?: string;
  source_kind: SelectedItemSourceKind;
  source_character_id?: string;
  locked?: boolean;
  equipped: boolean;
  current: boolean;
  stats?: ArmorStatSummary;
  energy?: ArmorEnergySummary;
  plug_names: string[];
};

export type ArmorDetailSelectedItemLike = {
  hash: number;
  name: string;
  description: string;
  icon?: string;
  item_type?: string;
  tier?: string;
  class_name?: string;
  bucket_name?: string;
  release?: ItemReleaseSummary;
  definition_version?: ItemDefinitionVersionSummary;
  armor_set?: EquipableItemSetSummary;
  group_key?: string;
  instance_id?: string;
  source_kind?: SelectedItemSourceKind;
  source_character_id?: string;
  is_vault_item?: boolean;
  armor_stats?: ArmorStatSummary;
  armor_stat_breakdown?: ArmorStatBreakdownSummary;
  armor_energy?: ArmorEnergySummary;
  intrinsic_traits?: Array<{
    hash: number;
    name: string;
    description: string;
    icon?: string;
  }>;
  armor_ability_groups?: Array<{
    key: string;
    name: string;
    category_identifier: string;
    options: Array<{
      hash: number;
      name: string;
      description: string;
      icon?: string;
    }>;
  }>;
  sockets?: AccountItemSocketSummary[];
  socket_plugs?: AccountItemPlugSummary[];
  source: ItemSourceSummary;
  is_detail_loading?: boolean;
  detail_loading?: {
    definition: boolean;
    instance: boolean;
  };
};

export type ArmorDetailInstanceLike = {
  item_key?: string;
  instance_id?: string;
  hash: number;
  name: string;
  icon?: string;
  power?: number;
  locked?: boolean;
  armor_stats?: ArmorStatSummary;
  armor_energy?: ArmorEnergySummary;
  socket_plugs: AccountItemPlugSummary[];
  source_kind: SelectedItemSourceKind;
  source_character_id?: string;
  source_label?: string;
  equipped?: boolean;
};

export type ArmorDetailViewModel = {
  identity: ArmorDetailIdentity;
  context: ArmorDetailObjectContext;
  stats: ArmorStatTrack[];
  stat_total?: number;
  energy?: ArmorEnergySummary;
  abilities: ArmorAbility[];
  ability_groups: ArmorAbilityGroup[];
  sockets: ArmorSocket[];
  sources: ArmorDetailSources;
  recommendations: ArmorRecommendation[];
  same_hash_instances: ArmorDetailInstance[];
  loading: boolean;
  loading_state: {
    definition: boolean;
    instance: boolean;
  };
};

export type BuildArmorDetailViewModelInput = {
  item: ArmorDetailSelectedItemLike;
  context?: Partial<ArmorDetailObjectContext>;
  current_stats?: ArmorStatSummary;
  current_stat_breakdown?: ArmorStatBreakdownSummary;
  current_energy?: ArmorEnergySummary;
  current_sockets?: AccountItemSocketSummary[];
  current_socket_plugs?: AccountItemPlugSummary[];
  sources?: ArmorDetailSources;
  recommendations?: ArmorRecommendation[];
  same_hash_instances?: ArmorDetailInstanceLike[];
};

const statOrder: ArmorStatKey[] = ["health", "melee", "grenade", "super", "class", "weapon"];

export function buildArmorDetailViewModel(input: BuildArmorDetailViewModelInput): ArmorDetailViewModel {
  const item = input.item;
  const context = buildObjectContext(item, input.context);
  const stats = input.current_stats ?? item.armor_stats;
  const breakdown = input.current_stat_breakdown ?? item.armor_stat_breakdown;
  const currentSockets = input.current_sockets ?? item.sockets;
  const currentSocketPlugs = input.current_socket_plugs ?? item.socket_plugs;
  const selectedPlugHashes = collectSelectedPlugHashes(currentSockets, currentSocketPlugs);
  return {
    identity: {
      hash: item.hash,
      name: item.name,
      description: item.description,
      icon: item.icon,
      item_type: item.item_type,
      tier: item.tier,
      class_name: item.class_name,
      bucket_name: item.bucket_name,
      release: item.release,
      definition_version: item.definition_version,
      armor_set: item.armor_set
    },
    context,
    stats: stats ? statOrder.map((key) => ({
      key,
      value: stats[key],
      base: breakdown?.[key].base,
      mod: breakdown?.[key].mod
    })) : [],
    stat_total: stats?.total,
    energy: input.current_energy ?? item.armor_energy,
    abilities: (item.intrinsic_traits ?? []).map((trait) => ({
      ...trait,
      kind: "intrinsic" as const
    })),
    ability_groups: (item.armor_ability_groups ?? []).map((group) => ({
      ...group,
      options: group.options.map((option) => ({
        ...option,
        kind: "special" as const
      })),
      selected_option_hash: group.options.find((option) => selectedPlugHashes.has(option.hash))?.hash
    })),
    sockets: buildArmorSockets(
      currentSockets,
      currentSocketPlugs
    ),
    sources: input.sources ?? sourceSummaryToSources(item.source),
    recommendations: input.recommendations ?? [],
    same_hash_instances: (input.same_hash_instances ?? [])
      .filter((instance): instance is ArmorDetailInstanceLike & { instance_id: string } => (
        instance.hash === item.hash && Boolean(instance.instance_id)
      ))
      .map((instance) => toArmorDetailInstance(instance, item.instance_id)),
    loading: Boolean(item.is_detail_loading),
    loading_state: {
      definition: item.detail_loading?.definition ?? Boolean(item.is_detail_loading),
      instance: item.detail_loading?.instance ?? false
    }
  };
}

function collectSelectedPlugHashes(
  sockets: AccountItemSocketSummary[] | undefined,
  plugs: AccountItemPlugSummary[] | undefined
): Set<number> {
  return new Set([
    ...(plugs ?? []).map((plug) => plug.hash),
    ...(sockets ?? []).flatMap((socket) => socket.selected_plug ? [socket.selected_plug.hash] : [])
  ]);
}

function buildObjectContext(
  item: ArmorDetailSelectedItemLike,
  override: Partial<ArmorDetailObjectContext> | undefined
): ArmorDetailObjectContext {
  const kind = override?.kind ?? (item.instance_id ? "account_item" : "definition");
  const entry = override?.entry ?? inferEntry(item, kind);
  return {
    kind,
    entry,
    entry_label: override?.entry_label,
    object_label: override?.object_label,
    object_id: override?.object_id ?? item.instance_id,
    read_only: override?.read_only ?? kind !== "account_item"
  };
}

function inferEntry(item: ArmorDetailSelectedItemLike, kind: ArmorDetailObjectKind): ArmorDetailEntryKind {
  if (kind === "vendor_offer") return "vendor";
  if (item.is_vault_item || item.source_kind === "vault") return "vault";
  if (item.instance_id) return "account";
  return "library";
}

function sourceSummaryToSources(source: ItemSourceSummary): ArmorDetailSources {
  if (source.status !== "ready") return { status: "unknown", entries: [] };
  return {
    status: "partial",
    entries: [{
      id: `source:${source.source_kind ?? "item"}:${source.source_hash ?? source.linked_definition_hash ?? "hint"}`,
      label: source.label,
      description: source.description
    }]
  };
}

function buildArmorSockets(
  sockets: AccountItemSocketSummary[] | undefined,
  plugs: AccountItemPlugSummary[] | undefined
): ArmorSocket[] {
  const selected = sockets?.length
    ? sockets.flatMap((socket) => socket.is_visible && socket.selected_plug
      ? [{ plug: socket.selected_plug, socketIndex: socket.socket_index }]
      : [])
    : (plugs ?? []).map((plug) => ({ plug, socketIndex: plug.socket_index }));
  let modIndex = 0;
  return selected.flatMap(({ plug, socketIndex }, index) => {
    if (!isVisibleArmorPlug(plug)) return [];
    const kind = armorPlugKind(plug);
    if (kind === "mod") modIndex += 1;
    return [{
      key: `${socketIndex ?? "plug"}:${plug.hash}:${index}`,
      hash: plug.hash,
      socket_index: socketIndex,
      label: armorPlugLabel(plug, kind === "mod" ? modIndex : index + 1),
      name: plug.name,
      description: plug.description,
      icon: plug.icon,
      kind
    }];
  });
}

function isVisibleArmorPlug(plug: AccountItemPlugSummary): boolean {
  const category = plug.category_identifier?.toLocaleLowerCase() ?? "";
  const itemType = plug.item_type?.toLocaleLowerCase() ?? "";
  const text = `${plug.name} ${plug.description ?? ""}`.toLocaleLowerCase();
  return !includesAny(category, ["shader", "ornament", "cosmetic", "skin", "transmog"])
    && !includesAny(itemType, ["着色器", "shader", "装饰", "ornament", "皮肤", "skin"])
    && !includesAny(text, ["更改装备配色", "默认外观", "默认皮肤"]);
}

function armorPlugKind(plug: AccountItemPlugSummary): ArmorSocket["kind"] {
  const value = `${plug.category_identifier ?? ""} ${plug.item_type ?? ""} ${plug.name}`.toLocaleLowerCase();
  if (includesAny(value, ["masterwork", "大师杰作", "升级护甲", "armor tier"])) return "upgrade";
  if (includesAny(value, ["intrinsic", "exotic", "异域", "artifice", "诡计"])) return "special";
  return "mod";
}

function armorPlugLabel(plug: AccountItemPlugSummary, index: number): ArmorSocketLabel {
  const kind = armorPlugKind(plug);
  if (kind === "upgrade") return { kind: "upgrade" };
  if (kind === "special") return { kind: "special" };
  const value = `${plug.category_identifier ?? ""} ${plug.item_type ?? ""} ${plug.name}`.toLocaleLowerCase();
  if (includesAny(value, ["activity", "raid", "seasonal", "活动", "突袭", "赛季"])) return { kind: "activity_mod" };
  if (includesAny(value, ["tuning", "adjustment", "artifice", "stat mod", "调整", "诡计", "属性模组"])) return { kind: "tuning_mod" };
  return { kind: "slot", index };
}

function toArmorDetailInstance(
  item: ArmorDetailInstanceLike & { instance_id: string },
  currentInstanceId: string | undefined
): ArmorDetailInstance {
  return {
    item_key: item.item_key ?? item.instance_id,
    instance_id: item.instance_id,
    hash: item.hash,
    name: item.name,
    icon: item.icon,
    power: item.power,
    location: item.source_label,
    source_kind: item.source_kind,
    source_character_id: item.source_character_id,
    locked: item.locked,
    equipped: item.equipped ?? item.source_kind === "equipped",
    current: item.instance_id === currentInstanceId,
    stats: item.armor_stats,
    energy: item.armor_energy,
    plug_names: item.socket_plugs.filter(isVisibleArmorPlug).map((plug) => plug.name)
  };
}

function includesAny(value: string, segments: readonly string[]): boolean {
  return segments.some((segment) => value.includes(segment));
}
