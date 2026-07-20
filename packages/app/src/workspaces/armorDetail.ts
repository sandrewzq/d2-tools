import type {
  AccountItemPlugSummary,
  AccountItemSummary,
  ArmorEnergySummary,
  ArmorStatBreakdownSummary,
  ArmorStatSummary
} from "@d2-tools/core/account/summary";
import type { ArmorStatKey } from "@d2-tools/core/loadouts/analysis";
import type { ItemSourceSummary } from "@d2-tools/core/items/source";
import type { VaultTagValue } from "@d2-tools/core/vault/tags";
import type { SelectedItemSourceKind } from "./itemDetail.js";

export type ArmorDetailObjectKind = "definition" | "vendor_offer" | "account_instance";
export type ArmorDetailEntryKind = "library" | "vendor" | "vault" | "account" | "loadout";

export type ArmorDetailObjectContext = {
  kind: ArmorDetailObjectKind;
  entry: ArmorDetailEntryKind;
  entry_label: string;
  object_label: string;
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
  slot?: string;
};

export type ArmorDetailVersion = {
  hash: number;
  label: string;
  season_label?: string;
  is_current: boolean;
};

export type ArmorStatTrack = {
  key: ArmorStatKey;
  label: string;
  available: boolean;
  final_value?: number;
  base_value?: number;
  mod_value?: number;
  masterwork_value?: number;
  masterwork_separable: boolean;
};

export type ArmorStatProfile = {
  available: boolean;
  total?: number;
  base_total?: number;
  mod_total?: number;
  masterwork_total?: number;
  masterwork_separable: boolean;
  tracks: ArmorStatTrack[];
};

export type ArmorSourceKind = "vendor_offer" | "activity_reward" | "manifest_hint";

export type ArmorSourceEntry = {
  id: string;
  kind: ArmorSourceKind;
  label: string;
  description: string;
  icon?: string;
  available_now?: boolean;
  updated_at?: string;
};

export type ArmorDetailSources = {
  status: "ready" | "partial" | "unknown";
  updated_at?: string;
  entries: ArmorSourceEntry[];
};

export type ArmorAbilityKind = "exotic_intrinsic" | "set_bonus" | "artifice" | "special_socket" | "intrinsic";

export type ArmorAbility = {
  id: string;
  hash?: number;
  name: string;
  description: string;
  icon?: string;
  kind: ArmorAbilityKind;
  kind_label: string;
};

export type ArmorInstalledMod = {
  hash: number;
  name: string;
  description: string;
  icon?: string;
  socket_index?: number;
};

export type ArmorDetailUpgrades = {
  energy?: ArmorEnergySummary;
  installed_mods: ArmorInstalledMod[];
  special_sockets: ArmorAbility[];
  masterwork: {
    level?: number;
    complete: boolean;
    stat_bonus_separable: boolean;
  };
};

export type ArmorTargetCondition = {
  stat: ArmorStatKey;
  label: string;
  minimum: number;
  current?: number;
  matched?: boolean;
};

export type ArmorRecommendation = {
  id: string;
  title: string;
  source_label: string;
  reason: string;
  conditions: ArmorTargetCondition[];
  match: "matched" | "missed" | "unavailable";
};

export type ArmorBuildFit = {
  title: string;
  description: string;
};

export type ArmorDetailRecommendations = {
  targets: ArmorRecommendation[];
  build_fits: ArmorBuildFit[];
  suggested_mods: string[];
};

export type ArmorDetailInstance = {
  item_key: string;
  instance_id: string;
  hash: number;
  name: string;
  icon?: string;
  power?: number;
  location: string;
  source_kind: SelectedItemSourceKind;
  source_character_id?: string;
  locked?: boolean;
  equipped?: boolean;
  local_tag?: Exclude<VaultTagValue, "none">;
  note?: string;
  total?: number;
  stats?: ArmorStatSummary;
  energy?: ArmorEnergySummary;
  plug_names: string[];
  current: boolean;
};

export type ArmorDetailViewModel = {
  identity: ArmorDetailIdentity;
  context: ArmorDetailObjectContext;
  versions: ArmorDetailVersion[];
  stats: ArmorStatProfile;
  sources: ArmorDetailSources;
  abilities: ArmorAbility[];
  upgrades: ArmorDetailUpgrades;
  recommendations: ArmorDetailRecommendations;
  same_hash_instances: ArmorDetailInstance[];
  loading: boolean;
};

export type ArmorDetailSelectedItemLike = {
  hash: number;
  name: string;
  description?: string;
  icon?: string;
  item_type?: string;
  tier?: string;
  class_name?: string;
  bucket_name?: string;
  item_key?: string;
  instance_id?: string;
  power?: number;
  locked?: boolean;
  armor_stats?: ArmorStatSummary;
  armor_stat_breakdown?: ArmorStatBreakdownSummary;
  armor_energy?: ArmorEnergySummary;
  socket_plugs?: AccountItemPlugSummary[];
  intrinsic_traits?: Array<{
    hash: number;
    name: string;
    description: string;
    icon?: string;
  }>;
  source: ItemSourceSummary;
  source_character_id?: string;
  source_kind?: SelectedItemSourceKind;
  is_vault_item?: boolean;
  is_postmaster_item?: boolean;
  is_detail_loading?: boolean;
};

export type ArmorDetailInstanceLike = Pick<
  AccountItemSummary,
  "hash" | "instance_id" | "name" | "icon" | "power" | "locked" | "armor_stats" | "armor_energy" | "socket_plugs"
> & {
  item_key?: string;
  source_kind: SelectedItemSourceKind;
  source_label?: string;
  source_character_id?: string;
  equipped?: boolean;
  local_tag?: Exclude<VaultTagValue, "none">;
  note?: string;
};

export type BuildArmorDetailViewModelInput = {
  item: ArmorDetailSelectedItemLike;
  context?: Partial<ArmorDetailObjectContext>;
  versions?: ArmorDetailVersion[];
  sources?: ArmorDetailSources;
  abilities?: ArmorAbility[];
  upgrades?: Partial<ArmorDetailUpgrades>;
  recommendations?: Partial<ArmorDetailRecommendations>;
  same_hash_instances?: ArmorDetailInstanceLike[];
};

const armorStatOrder: readonly ArmorStatKey[] = ["health", "melee", "grenade", "super", "class", "weapon"];

const armorStatLabels: Record<ArmorStatKey, string> = {
  health: "生命值",
  melee: "近战",
  grenade: "手雷",
  super: "超能",
  class: "职业",
  weapon: "武器"
};

export function buildArmorDetailViewModel(input: BuildArmorDetailViewModelInput): ArmorDetailViewModel {
  const context = buildObjectContext(input.item, input.context);
  const hasActualStats = context.kind !== "definition" && Boolean(input.item.armor_stats);
  const abilities = input.abilities ?? buildArmorAbilities(input.item);
  const upgrades = input.upgrades ?? {};

  return {
    identity: {
      hash: input.item.hash,
      name: input.item.name,
      description: input.item.description ?? "",
      icon: input.item.icon,
      item_type: input.item.item_type,
      tier: input.item.tier,
      class_name: input.item.class_name,
      slot: input.item.bucket_name
    },
    context,
    versions: input.versions?.length
      ? input.versions.map((version) => ({ ...version, is_current: version.hash === input.item.hash }))
      : [{ hash: input.item.hash, label: input.item.name, is_current: true }],
    stats: buildArmorStatProfile(
      hasActualStats ? input.item.armor_stats : undefined,
      hasActualStats ? input.item.armor_stat_breakdown : undefined
    ),
    sources: input.sources ?? sourceSummaryToSources(input.item.source),
    abilities,
    upgrades: {
      energy: upgrades.energy ?? (context.kind !== "definition" ? input.item.armor_energy : undefined),
      installed_mods: upgrades.installed_mods ?? [],
      special_sockets: upgrades.special_sockets ?? abilities.filter((ability) => ability.kind === "special_socket" || ability.kind === "artifice"),
      masterwork: upgrades.masterwork ?? {
        level: context.kind !== "definition" ? input.item.armor_energy?.capacity : undefined,
        complete: context.kind !== "definition" && input.item.armor_energy?.capacity === 10,
        stat_bonus_separable: false
      }
    },
    recommendations: {
      targets: input.recommendations?.targets ?? [],
      build_fits: input.recommendations?.build_fits ?? buildStatFits(hasActualStats ? input.item.armor_stats : undefined),
      suggested_mods: input.recommendations?.suggested_mods ?? []
    },
    same_hash_instances: (input.same_hash_instances ?? [])
      .filter((instance): instance is ArmorDetailInstanceLike & { instance_id: string } => (
        instance.hash === input.item.hash && Boolean(instance.instance_id)
      ))
      .map((instance) => toArmorDetailInstance(instance, input.item.instance_id)),
    loading: Boolean(input.item.is_detail_loading)
  };
}

export function buildArmorStatProfile(
  stats: ArmorStatSummary | undefined,
  breakdown: ArmorStatBreakdownSummary | undefined
): ArmorStatProfile {
  const available = Boolean(stats);
  return {
    available,
    total: stats?.total,
    base_total: breakdown?.total.base,
    mod_total: breakdown?.total.mod,
    masterwork_separable: false,
    tracks: armorStatOrder.map((key) => ({
      key,
      label: armorStatLabels[key],
      available,
      final_value: stats?.[key],
      base_value: breakdown?.[key].base,
      mod_value: breakdown?.[key].mod,
      masterwork_separable: false
    }))
  };
}

export function armorStatLabel(key: ArmorStatKey): string {
  return armorStatLabels[key];
}

function buildObjectContext(
  item: ArmorDetailSelectedItemLike,
  override: Partial<ArmorDetailObjectContext> | undefined
): ArmorDetailObjectContext {
  const inferredOffer = !item.instance_id && Boolean(item.socket_plugs?.length || item.armor_stats);
  const kind = override?.kind ?? (item.instance_id ? "account_instance" : inferredOffer ? "vendor_offer" : "definition");
  const entry = override?.entry ?? inferEntry(item, kind);
  return {
    kind,
    entry,
    entry_label: override?.entry_label ?? entryLabel(entry),
    object_label: override?.object_label ?? objectLabel(kind),
    object_id: override?.object_id ?? item.instance_id,
    read_only: override?.read_only ?? kind !== "account_instance"
  };
}

function inferEntry(item: ArmorDetailSelectedItemLike, kind: ArmorDetailObjectKind): ArmorDetailEntryKind {
  if (kind === "vendor_offer") return "vendor";
  if (item.source_kind === "vault") return "vault";
  if (item.instance_id) return "account";
  return "library";
}

function entryLabel(entry: ArmorDetailEntryKind): string {
  if (entry === "vendor") return "商人";
  if (entry === "vault") return "仓库";
  if (entry === "account") return "账号";
  if (entry === "loadout") return "配装";
  return "资料库";
}

function objectLabel(kind: ArmorDetailObjectKind): string {
  if (kind === "vendor_offer") return "商人 Offer";
  if (kind === "account_instance") return "账号实例";
  return "装备定义";
}

function sourceSummaryToSources(source: ItemSourceSummary): ArmorDetailSources {
  if (source.status !== "ready") return { status: "unknown", entries: [] };
  return {
    status: "partial",
    entries: [{
      id: `manifest:${source.source_kind ?? "item"}:${source.source_hash ?? source.linked_definition_hash ?? "hint"}`,
      kind: "manifest_hint",
      label: source.label,
      description: source.description
    }]
  };
}

function buildArmorAbilities(item: ArmorDetailSelectedItemLike): ArmorAbility[] {
  return (item.intrinsic_traits ?? []).map((trait) => {
    const kind = classifyAbility(item, trait.name, trait.description);
    return {
      id: `trait:${trait.hash}`,
      hash: trait.hash,
      name: trait.name,
      description: trait.description,
      icon: trait.icon,
      kind,
      kind_label: abilityKindLabel(kind)
    };
  });
}

function classifyAbility(
  item: ArmorDetailSelectedItemLike,
  name: string,
  description: string
): ArmorAbilityKind {
  const text = `${name} ${description}`.toLocaleLowerCase();
  if (text.includes("诡计") || text.includes("artifice")) return "artifice";
  if (text.includes("套装") || text.includes("set bonus")) return "set_bonus";
  if (text.includes("插槽") || text.includes("socket")) return "special_socket";
  if (/异域|exotic/i.test(item.tier ?? "")) return "exotic_intrinsic";
  return "intrinsic";
}

function abilityKindLabel(kind: ArmorAbilityKind): string {
  if (kind === "exotic_intrinsic") return "异域固有";
  if (kind === "set_bonus") return "套装效果";
  if (kind === "artifice") return "诡计护甲";
  if (kind === "special_socket") return "特殊插槽";
  return "护甲固有";
}

function buildStatFits(stats: ArmorStatSummary | undefined): ArmorBuildFit[] {
  if (!stats) return [];
  const leading = armorStatOrder
    .map((key) => ({ key, value: stats[key] }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 2);
  return [{
    title: `${armorStatLabels[leading[0].key]} / ${armorStatLabels[leading[1].key]}取向`,
    description: `当前两项最高属性为${armorStatLabels[leading[0].key]} ${leading[0].value} 与${armorStatLabels[leading[1].key]} ${leading[1].value}；是否适配仍需结合职业、碎片和整套配装目标。`
  }];
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
    location: item.source_label ?? locationLabel(item.source_kind),
    source_kind: item.source_kind,
    source_character_id: item.source_character_id,
    locked: item.locked,
    equipped: item.equipped,
    local_tag: item.local_tag,
    note: item.note,
    total: item.armor_stats?.total,
    stats: item.armor_stats,
    energy: item.armor_energy,
    plug_names: item.socket_plugs.map((plug) => plug.name),
    current: item.instance_id === currentInstanceId
  };
}

function locationLabel(source: SelectedItemSourceKind): string {
  if (source === "equipped") return "已装备";
  if (source === "inventory") return "角色背包";
  if (source === "postmaster") return "邮政官";
  return "仓库";
}
