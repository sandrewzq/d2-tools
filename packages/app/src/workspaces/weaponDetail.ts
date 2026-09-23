import type {
  AccountItemPlugSummary,
  AccountItemSummary,
  AccountWeaponCraftingSummary,
  AccountWeaponRollSlot,
  AmmoTypeKey,
  WeaponFrameSummary,
  WeaponStatKey,
  WeaponStatSummary
} from "@d2-tools/core/account/summary";
import type { ItemPerkGroup, ItemPlugSourceKind, ItemPlugSummary } from "@d2-tools/core/items/perks";
import type {
  ItemDefinitionVersionSummary,
  ItemReleaseSummary
} from "@d2-tools/core/items/release";
import type { RecommendationRequirementSlot } from "@d2-tools/core/community-perks";
import type { ItemSourceSummary } from "@d2-tools/core/items/source";
import type { VaultTagValue } from "@d2-tools/core/vault/tags";
import type { SelectedItemSourceKind } from "./itemDetail.js";

export type WeaponDetailObjectKind = "definition" | "vendor_offer" | "account_instance";

export type WeaponDetailEntryKind = "library" | "vendor" | "vault" | "account" | "loadout";

export type WeaponDetailObjectContext = {
  kind: WeaponDetailObjectKind;
  entry: WeaponDetailEntryKind;
  /**
   * 身份标签。`packages/app` 不认识界面语言，所以这里只负责**透传调用方注入的标签**；
   * 调用方不传时（`undefined`）由 UI 按 `entry` / `kind` 自己查表。
   */
  entry_label?: string;
  object_label?: string;
  object_id?: string;
  location_label?: string;
  read_only: boolean;
};

export type WeaponDetailIdentity = {
  hash: number;
  name: string;
  description: string;
  icon?: string;
  item_type?: string;
  tier?: string;
  is_exotic: boolean;
  slot?: string;
  ammo?: WeaponDetailAmmo;
  damage?: WeaponDetailDamage;
  frame?: WeaponFrameSummary;
  champion?: WeaponDetailChampionEffect;
  release?: ItemReleaseSummary;
  definition_version?: ItemDefinitionVersionSummary;
  /**
   * 锻造标识：账号实例为 crafted，资料库定义为 craftable；只做锻造，不标强化。
   * 标识文案由 `kind` 决定，措辞由 UI 按 `copy` 现查。
   */
  crafting?: {
    kind: "crafted" | "craftable";
    overlay?: string;
    background?: string;
  };
};

/** 弹药类型名由 `key` 决定，措辞由 UI 按 `copy` 现查。 */
export type WeaponDetailAmmo = {
  key: AmmoTypeKey;
  icon?: string;
};

export type WeaponDetailDamage = {
  hash?: number;
  key: string;
  label: string;
  description?: string;
  icon?: string;
};

export type WeaponDetailChampionEffect = {
  key: "barrier" | "overload" | "unstoppable";
  label: string;
  effect_label: "贯穿护盾" | "干扰" | "眩晕";
  description?: string;
  icon?: string;
  source: "weapon" | "plug" | "frame_perk";
};

export type WeaponDetailVersion = {
  hash: number;
  label: string;
  release_label?: string;
  is_current: boolean;
};

export type WeaponStatDirection = "higher" | "lower" | "neutral";

export type WeaponStatAvailability = "definition_only" | "ready" | "current_unavailable";

export type WeaponStatModifier = {
  source: string;
  amount: number;
};

/** 属性名不做成字段：`key` 已经唯一确定它是哪一条，措辞由 UI 按 `copy` 现查。 */
export type WeaponStatTrack = {
  key: WeaponStatKey;
  direction: WeaponStatDirection;
  availability: WeaponStatAvailability;
  standard_value?: number;
  current_value?: number;
  current_delta?: number;
  current_modifiers: WeaponStatModifier[];
  pending_value?: number;
  pending_delta?: number;
  pending_modifiers: WeaponStatModifier[];
};

export type WeaponPerkColumnRole =
  | "intrinsic"
  | "barrel"
  | "magazine"
  | "trait"
  | "origin"
  | "other";

export type WeaponSocketPlugLike = {
  name: string;
  description?: string;
  category_identifier?: string;
  item_type?: string;
};

export type WeaponPerkCandidate = {
  hash: number;
  name: string;
  description: string;
  icon?: string;
  enhanced_of_hash?: number;
};

export type WeaponOwnedPerkCandidate = WeaponPerkCandidate & {
  selected: boolean;
  can_apply: boolean;
  pending: boolean;
  unresolved_in_definition_pool: boolean;
};

/**
 * 插槽列的列名。
 *
 * `packages/app` 不认识界面语言，所以这里只给「是哪一种列」或「第几个插槽」，
 * 措辞由 UI 按 `copy` 现算，见 UI 侧的 `weaponSocketColumnLabelText`。
 *
 * 几段中文原文相同的分支合并成一个成员（`sword0.guard` 与 `grip` 都写「握把」，
 * 分类兜底里的「枪管 / 弹匣 / 起源特性」与分类命中时同字），合并后 zh-CN 输出逐字不变。
 */
export type WeaponSocketColumnLabel =
  | { kind: "core_upgrade" }
  | { kind: "sword_core" }
  | { kind: "grip" }
  | { kind: "bowstring" }
  | { kind: "arrow" }
  | { kind: "haft" }
  | { kind: "sight" }
  | { kind: "blade" }
  | { kind: "guard" }
  | { kind: "battery" }
  | { kind: "stock" }
  | { kind: "role"; role: Exclude<WeaponPerkColumnRole, "other"> }
  /** 同名武器特性列按出现次序编号（`Perk 1` / `Perk 2`），编号由 app 定、写法由 UI 定。 */
  | { kind: "perk_index"; index: number }
  | { kind: "slot"; index: number }
  /**
   * 账号 Roll 快照自带的栏位名（core 的 `weaponRollSlotLabel` 词表）。
   *
   * 这一路栏位身份已经由 core 判好，不能再按插件分类重猜：`barrel` 在快照里写的是
   * `枪管/瞄具` 而不是 `枪管`，`magazine` 写 `第二列`，`masterwork` 写 `大师`。
   */
  | { kind: "roll_slot"; slot: AccountWeaponRollSlot };

export type WeaponPerkPoolColumn = {
  key: string;
  socket_index: number;
  label: WeaponSocketColumnLabel;
  role: WeaponPerkColumnRole;
  candidates: WeaponPerkCandidate[];
  source_kinds?: ItemPlugSourceKind[];
};

export type WeaponPerkSelectionColumn = {
  key: string;
  socket_index: number;
  /** 同 `WeaponPerkPoolColumn.label`：只说是哪一列，措辞由 UI 按 `copy` 现算。 */
  label: WeaponSocketColumnLabel;
  role: WeaponPerkColumnRole;
  /**
   * 这一列对应哪个来源栏位（`barrel` / `magazine` / `masterwork` / `perk1` / `perk2` / `origin`）。
   *
   * 推荐对照区按来源栏位核对，玩家在那一区选 Perk 时要落回同一列、同一批待提交项，所以这一列
   * 必须能回答「我是哪个栏位」——不能让消费方按列名或次序猜（T73）。没有实例 Roll 插槽数据时为 `undefined`。
   */
  requirement_slot?: RecommendationRequirementSlot;
  candidates: WeaponOwnedPerkCandidate[];
};

export type WeaponConfigurationKind = "random_roll" | "fixed" | "variable_exotic";
export type WeaponPerkPoolKind = "none" | "randomized" | "selectable";

export type WeaponDetailConfiguration = {
  kind: WeaponConfigurationKind;
  pool_kind: WeaponPerkPoolKind;
  intrinsic?: WeaponPerkCandidate;
  selection_columns: WeaponPerkSelectionColumn[];
  pool_columns: WeaponPerkPoolColumn[];
  has_pending_changes: boolean;
  can_apply_changes: boolean;
};

export type WeaponConfigurationClassification = Pick<WeaponDetailConfiguration, "kind" | "pool_kind">;

export type WeaponSourceKind = "vendor_offer" | "activity_reward" | "live_status" | "manifest_hint";

export type WeaponSourceEntry = {
  id: string;
  kind: WeaponSourceKind;
  /**
   * 来源名与说明。资料库没有给出获取途径时留空，占位文案由 UI 按 `copy` 现算
   * （见 `WeaponDetailContent` 的 `历史获取途径` / `Bungie 官方资料没有标注…`）。
   */
  label?: string;
  description?: string;
  icon?: string;
  available_now?: boolean;
  updated_at?: string;
  offer?: WeaponVendorOfferSummary;
};

export type WeaponVendorOfferSummary = {
  offer_id: string;
  vendor_hash?: number;
  vendor_name: string;
  inventory_path?: string;
  price_labels: string[];
  refresh_at?: string;
  can_purchase?: boolean;
  purchase_requirements: string[];
  failure_messages: string[];
};

export type WeaponDetailSources = {
  status: "ready" | "partial" | "unknown";
  updated_at?: string;
  entries: WeaponSourceEntry[];
};

export type WeaponMasterworkSummary = {
  name: string;
  level?: number;
  complete?: boolean;
  stat_key?: WeaponStatKey;
  stat_amount?: number;
};

export type WeaponCatalystSummary = {
  name: string;
  icon?: string;
  acquired?: boolean;
  complete: boolean;
  progress?: number;
  objective?: string;
  acquisition?: string;
  effects: string[];
};

export type WeaponEnhancementSummary = {
  name: string;
  level?: number;
};

export type WeaponDetailUpgrades = {
  masterwork?: WeaponMasterworkSummary;
  mod?: WeaponPerkCandidate;
  catalyst?: WeaponCatalystSummary;
  enhancement?: WeaponEnhancementSummary;
  crafting_level?: number;
  enhanced: boolean;
};

export type WeaponDetailLoadoutReference = {
  id: string;
  name: string;
  kind: "in_game" | "template";
  character_id?: string;
  loadout_index?: number;
};

export type WeaponDetailInstanceMetadata = {
  local_tag?: Exclude<VaultTagValue, "none">;
  note?: string;
  upgrade_status?: WeaponDetailUpgrades;
  loadout_references?: WeaponDetailLoadoutReference[];
};

export type WeaponRecommendationMode = "pve" | "pvp" | "general";

// 推荐项**不再带来源身份字段**。
//
// 这里原来有 `WeaponRecommendationSource = "user" | "builtin" | "external" | "dim"`，详情推荐区
// 据此把同一份推荐事实劈成「攻略推荐 / 我的推荐」两个页签。T56 之后不存在「来源类型」这个维度：
// 来源的身份就是用户给它起的名字（`source_label`），格式差异止步于解析层，装备目标也不再挤进
// 推荐区。四个成员里 `"external"` 从来没有生产点，`"dim"` 的生产点随第三身份一并删除，
// `"user"` 随「我的推荐」页签删除——字段本身已经没有判别价值，删掉比留一个恒真值干净。

export type WeaponRecommendationPerkCandidate = {
  hash?: number;
  hashes?: number[];
  name: string;
  englishName?: string;
  description?: string;
  icon?: string;
  unresolved?: boolean;
};

// 推荐项只承载**来源规则本身**（来源给了哪些栏位、每栏有哪些候选），不再承载「本件命中」结果。
//
// 这里原来有一批「本件是否命中」的字段：`match` / `match_notes` / `masterwork_names` / `mod_names`，
// 以及 `perk_options[].requirement_state` / `matched_name` / `matched_hash` / `matched_current` /
// `instance_owned`。它们只在账号实例上有意义，而账号实例走的是另一条渲染路径（推荐来源证据卡，
// 事实由 `matchVaultItems` 给出），这一条路径的生产点从不填它们：`instance_owned` 恒为空数组、
// `requirement_state` 恒为 undefined。留着的后果是消费方要靠「这个字段有没有值」猜自己拿到的是
// 哪一层，于是把规则层的对象（资料库定义、商人售卖）也画成了「有无命中」的对照表。删掉之后，
// 这一层只有一个含义：来源要求了什么。
export type WeaponRecommendation = {
  id: string;
  mode: WeaponRecommendationMode;
  purposes?: WeaponRecommendationMode[];
  presentation: "combo" | "perk_pool";
  title: string;
  reason: string;
  source_label: string;
  updated_at?: string;
  external_url?: string;
  perk_options: Array<{
    column_key: string;
    names: string[];
    candidates?: WeaponRecommendationPerkCandidate[];
  }>;
};

export type WeaponDetailInstance = {
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
  equipped?: boolean;
  local_tag?: Exclude<VaultTagValue, "none">;
  note?: string;
  upgrade_status?: WeaponDetailUpgrades;
  loadout_references?: WeaponDetailLoadoutReference[];
  current: boolean;
  plugs: Array<{
    hash: number;
    name: string;
    icon?: string;
  }>;
  plug_names: string[];
};

export type WeaponDetailViewModel = {
  identity: WeaponDetailIdentity;
  context: WeaponDetailObjectContext;
  versions: WeaponDetailVersion[];
  stats: WeaponStatTrack[];
  configuration: WeaponDetailConfiguration;
  sources: WeaponDetailSources;
  upgrades: WeaponDetailUpgrades;
  recommendations: WeaponRecommendation[];
  // 整份推荐集的免责声明。它说的是「这些推荐整体从哪来、能信到什么程度」，属于区域级信息，
  // 由推荐区顶部说一次；逐条来源自己的说明走 `recommendations[].reason`，两者不互相兜底。
  recommendation_disclaimer?: string;
  same_hash_instances: WeaponDetailInstance[];
  loading: boolean;
  loading_state: {
    definition: boolean;
    instance: boolean;
    versions: boolean;
  };
};

export type WeaponDetailSelectedItemLike = {
  hash: number;
  name: string;
  description?: string;
  icon?: string;
  item_type?: string;
  tier?: string;
  item_key?: string;
  instance_id?: string;
  power?: number;
  locked?: boolean;
  bucket_name?: string;
  ammo_type?: AmmoTypeKey;
  weapon_frame?: WeaponFrameSummary;
  weapon_stats?: WeaponStatSummary;
  release?: ItemReleaseSummary;
  definition_version?: ItemDefinitionVersionSummary;
  socket_plugs?: AccountItemPlugSummary[];
  perks?: ItemPerkGroup[];
  source: ItemSourceSummary;
  source_character_id?: string;
  source_kind?: SelectedItemSourceKind;
  is_vault_item?: boolean;
  is_postmaster_item?: boolean;
  is_detail_loading?: boolean;
  detail_loading?: {
    definition: boolean;
    instance: boolean;
  };
  detail_loaded?: {
    definition: boolean;
    instance: boolean;
  };
  crafting?: AccountWeaponCraftingSummary;
  craftable?: boolean;
};

export type WeaponDetailInstanceLike = Pick<
  AccountItemSummary,
  "hash" | "instance_id" | "name" | "icon" | "power" | "locked" | "socket_plugs"
> & {
  item_key?: string;
  source_kind: SelectedItemSourceKind;
  source_label?: string;
  source_character_id?: string;
  equipped?: boolean;
  local_tag?: Exclude<VaultTagValue, "none">;
  note?: string;
  upgrade_status?: WeaponDetailUpgrades;
  loadout_references?: WeaponDetailLoadoutReference[];
};

export type BuildWeaponDetailViewModelInput = {
  item: WeaponDetailSelectedItemLike;
  context?: Partial<WeaponDetailObjectContext>;
  slot?: string;
  ammo?: WeaponDetailAmmo;
  damage?: WeaponDetailDamage;
  champion?: WeaponDetailChampionEffect;
  is_exotic?: boolean;
  versions?: WeaponDetailVersion[];
  definition_stats?: WeaponStatSummary;
  current_stats?: WeaponStatSummary;
  pending_stats?: WeaponStatSummary;
  stat_modifiers?: Partial<Record<WeaponStatKey, WeaponStatModifier[]>>;
  pending_stat_modifiers?: Partial<Record<WeaponStatKey, WeaponStatModifier[]>>;
  configuration?: Partial<WeaponDetailConfiguration>;
  selection_columns?: WeaponPerkSelectionColumn[];
  pool_columns?: WeaponPerkPoolColumn[];
  sources?: WeaponDetailSources;
  upgrades?: WeaponDetailUpgrades;
  recommendations?: WeaponRecommendation[];
  recommendation_disclaimer?: string;
  same_hash_instances?: WeaponDetailInstanceLike[];
  instance_metadata?: Record<string, WeaponDetailInstanceMetadata>;
  versions_loading?: boolean;
};

const weaponStatOrder: readonly WeaponStatKey[] = [
  "impact",
  "range",
  "stability",
  "handling",
  "reload_speed",
  "aim_assistance",
  "recoil_direction",
  "airborne_effectiveness",
  "charge_time",
  "draw_time",
  "magazine",
  "ammo_generation",
  "rounds_per_minute"
];

const weaponStatDirection: Record<WeaponStatKey, WeaponStatDirection> = {
  impact: "higher",
  range: "higher",
  stability: "higher",
  handling: "higher",
  reload_speed: "higher",
  aim_assistance: "higher",
  recoil_direction: "higher",
  airborne_effectiveness: "higher",
  ammo_generation: "higher",
  magazine: "higher",
  rounds_per_minute: "neutral",
  charge_time: "lower",
  draw_time: "lower"
};

export function buildWeaponDetailViewModel(input: BuildWeaponDetailViewModelInput): WeaponDetailViewModel {
  const { item } = input;
  const context = buildObjectContext(item, input.context);
  const definitionStats = input.definition_stats
    ?? (context.kind === "definition" ? item.weapon_stats : undefined);
  const currentStats = input.current_stats
    ?? (context.kind !== "definition" ? item.weapon_stats : undefined);
  const poolColumns = input.pool_columns ?? perkGroupsToPoolColumns(item.perks ?? []);
  const selectionColumns = input.selection_columns ?? [];
  const isExotic = input.is_exotic ?? /异域|exotic/i.test(item.tier ?? "");
  const configurationClassification = classifyWeaponConfiguration(poolColumns, isExotic);

  return {
    identity: {
      hash: item.hash,
      name: item.name,
      description: item.description ?? "",
      icon: item.icon,
      item_type: item.item_type,
      tier: item.tier,
      is_exotic: isExotic,
      slot: input.slot ?? item.bucket_name,
      ammo: input.ammo ?? ammoFromKey(item.ammo_type),
      damage: input.damage,
      frame: item.weapon_frame,
      champion: input.champion,
      release: item.release,
      definition_version: item.definition_version,
      crafting: item.crafting?.kind === "crafted"
        ? {
            kind: "crafted",
            overlay: item.crafting.overlay,
            background: item.crafting.background
          }
        : item.craftable
          ? { kind: "craftable" }
          : undefined
    },
    context,
    versions: input.versions?.length
      ? input.versions.map((version) => ({ ...version, is_current: version.hash === item.hash }))
      : [{ hash: item.hash, label: item.name, is_current: true }],
    stats: buildWeaponStatTracks({
      definition_stats: definitionStats,
      current_stats: currentStats,
      pending_stats: input.pending_stats,
      stat_modifiers: input.stat_modifiers,
      pending_stat_modifiers: input.pending_stat_modifiers
    }),
    configuration: {
      kind: input.configuration?.kind ?? configurationClassification.kind,
      pool_kind: input.configuration?.pool_kind ?? configurationClassification.pool_kind,
      intrinsic: input.configuration?.intrinsic,
      selection_columns: selectionColumns,
      pool_columns: poolColumns,
      has_pending_changes: input.configuration?.has_pending_changes
        ?? selectionColumns.some((column) => column.candidates.some((candidate) => candidate.pending)),
      can_apply_changes: input.configuration?.can_apply_changes
        ?? (context.kind === "account_instance" && selectionColumns.some(
          (column) => column.candidates.some((candidate) => candidate.pending && candidate.can_apply)
        ))
    },
    sources: input.sources ?? sourceSummaryToSources(item.source),
    upgrades: input.upgrades ?? { enhanced: false },
    recommendations: input.recommendations ?? [],
    ...(input.recommendation_disclaimer ? { recommendation_disclaimer: input.recommendation_disclaimer } : {}),
    same_hash_instances: (input.same_hash_instances ?? [])
      .filter((instance): instance is WeaponDetailInstanceLike & { instance_id: string } => (
        instance.hash === item.hash && Boolean(instance.instance_id)
      ))
      .map((instance) => toWeaponDetailInstance(
        instance,
        item.instance_id,
        input.instance_metadata?.[instance.instance_id]
      )),
    loading: Boolean(item.is_detail_loading),
    loading_state: {
      definition: item.detail_loading?.definition ?? Boolean(item.is_detail_loading),
      instance: item.detail_loading?.instance ?? false,
      versions: Boolean(input.versions_loading)
    }
  };
}

export function buildWeaponStatTracks(input: {
  definition_stats?: WeaponStatSummary;
  current_stats?: WeaponStatSummary;
  pending_stats?: WeaponStatSummary;
  stat_modifiers?: Partial<Record<WeaponStatKey, WeaponStatModifier[]>>;
  pending_stat_modifiers?: Partial<Record<WeaponStatKey, WeaponStatModifier[]>>;
}): WeaponStatTrack[] {
  return weaponStatOrder
    .filter((key) => (
      input.definition_stats?.[key] !== undefined
      || input.current_stats?.[key] !== undefined
      || input.pending_stats?.[key] !== undefined
    ))
    .map((key) => {
      const direction = weaponStatDirection[key];
      const standardValue = input.definition_stats?.[key];
      const currentValue = input.current_stats?.[key];
      const pendingValue = input.pending_stats?.[key];
      return {
        key,
        direction,
        availability: currentValue !== undefined
          ? "ready"
          : standardValue !== undefined
            ? "definition_only"
            : "current_unavailable",
        standard_value: standardValue,
        current_value: currentValue,
        current_delta: difference(currentValue, standardValue),
        current_modifiers: input.stat_modifiers?.[key] ?? [],
        pending_value: pendingValue,
        pending_delta: difference(pendingValue, currentValue),
        pending_modifiers: input.pending_stat_modifiers?.[key] ?? []
      };
    });
}

export function perkGroupsToPoolColumns(groups: readonly ItemPerkGroup[]): WeaponPerkPoolColumn[] {
  const columns = groups.flatMap((group) => {
    const visiblePlugs = collapseEnhancedWeaponPlugs(
      group.plugs.filter((plug) => !plug.is_socket_placeholder && !isWeaponSystemPlug(plug))
    );
    const role = classifyWeaponSocketPlugs(visiblePlugs);
    if (!role) return [];
    return [{
      key: `socket-${group.socket_index}`,
      socket_index: group.socket_index,
      label: weaponSocketColumnLabel(visiblePlugs, role, group.socket_index),
      role,
      candidates: visiblePlugs.map(toWeaponPerkCandidate),
      source_kinds: group.source_kinds
    }];
  });
  let traitIndex = 0;
  return [...columns]
    .sort((left, right) => left.socket_index - right.socket_index)
    .map((column) => column.role === "trait"
      ? { ...column, label: { kind: "perk_index" as const, index: ++traitIndex } }
      : column);
}

export function classifyWeaponSocketPlugs(
  plugs: readonly WeaponSocketPlugLike[]
): WeaponPerkColumnRole | undefined {
  const visiblePlugs = plugs.filter((plug) => !isWeaponSystemPlug(plug));
  if (!visiblePlugs.length) return undefined;
  const categories = visiblePlugs
    .map((plug) => plug.category_identifier?.toLocaleLowerCase() ?? "")
    .filter(Boolean);
  const category = categories.join(" ");
  const itemTypes = visiblePlugs
    .map((plug) => plug.item_type?.toLocaleLowerCase() ?? "")
    .filter(Boolean)
    .join(" ");

  if (isWeaponCoreUpgradeCategory(category) || itemTypes.includes("能量核心")) return "other";
  if (category.includes("origin") || includesAny(itemTypes, ["起源特性", "原始特性", "origin trait"])) return "origin";
  if (category.includes("intrinsic") || includesAny(itemTypes, ["固有", "intrinsic"])) return "intrinsic";
  if (includesAny(category, ["barrel", "scope", "sight", "bowstring", "bow.string", "blade", "haft"])) return "barrel";
  if (includesAny(category, ["magazine", "batter", "arrow", "guard", "stock", "grip"])) return "magazine";
  if (includesAny(category, ["trait", "perk"])
    || includesAny(itemTypes, ["特性", "特征", "trait", "perk"])) return "trait";
  if (category.includes("frame")) return "intrinsic";

  return undefined;
}

export function weaponSocketColumnLabel(
  plugs: readonly WeaponSocketPlugLike[],
  role: WeaponPerkColumnRole,
  socketIndex: number
): WeaponSocketColumnLabel {
  const category = plugs
    .map((plug) => plug.category_identifier?.toLocaleLowerCase() ?? "")
    .filter(Boolean)
    .join(" ");
  const itemTypes = plugs
    .map((plug) => plug.item_type?.toLocaleLowerCase() ?? "")
    .filter(Boolean)
    .join(" ");

  if (isWeaponCoreUpgradeCategory(category) || itemTypes.includes("能量核心")) return { kind: "core_upgrade" };
  if (includesAny(category, ["sword0.blade", "sword0_blade"]) || itemTypes.includes("柄芯")) return { kind: "sword_core" };
  if (includesAny(category, ["sword0.guard", "sword0_guard"])) return { kind: "grip" };
  if (category.includes("origin") || includesAny(itemTypes, ["起源特性", "原始特性", "origin trait"])) return { kind: "role", role: "origin" };
  if (includesAny(category, ["bowstring", "bow.string"]) || itemTypes.includes("弓弦")) return { kind: "bowstring" };
  if (category.includes("arrow") || itemTypes.includes("箭杆")) return { kind: "arrow" };
  if (category.includes("haft") || itemTypes.includes("偃月杆")) return { kind: "haft" };
  if (includesAny(category, ["scope", "sight"]) || itemTypes.includes("瞄具")) return { kind: "sight" };
  if (category.includes("barrel") || itemTypes.includes("枪管")) return { kind: "role", role: "barrel" };
  if (category.includes("blade") || itemTypes.includes("剑刃")) return { kind: "blade" };
  if (category.includes("guard") || itemTypes.includes("护手")) return { kind: "guard" };
  if (category.includes("batter") || itemTypes.includes("电池")) return { kind: "battery" };
  if (category.includes("magazine") || itemTypes.includes("弹匣")) return { kind: "role", role: "magazine" };
  if (category.includes("stock") || itemTypes.includes("枪托")) return { kind: "stock" };
  if (category.includes("grip") || itemTypes.includes("握把")) return { kind: "grip" };
  if (role === "intrinsic" || role === "barrel" || role === "magazine" || role === "origin" || role === "trait") {
    return { kind: "role", role };
  }
  return { kind: "slot", index: socketIndex + 1 };
}

export function isWeaponSystemPlug(plug: WeaponSocketPlugLike): boolean {
  const category = plug.category_identifier?.toLocaleLowerCase() ?? "";
  const itemType = plug.item_type?.toLocaleLowerCase() ?? "";
  const text = `${plug.name} ${plug.description ?? ""}`.toLocaleLowerCase();
  if (isWeaponCoreUpgradeCategory(category)) return false;
  if (includesAny(category, [
    "shader", "ornament", "memento", "tracker", "masterwork", "catalyst",
    "weapon.mod", "modguns", "mods.weapon", "cosmetic", "skin", "killcounter"
  ])) return true;
  if (includesAny(itemType, [
    "着色器", "shader", "武器模组", "weapon mod", "大师杰作", "masterwork",
    "催化剂", "catalyst", "记录器", "tracker", "装饰", "ornament", "皮肤", "skin"
  ])) return true;
  return includesAny(text, [
    "使用此着色器", "更改装备配色", "默认皮肤", "默认外观", "战斗特效",
    "击杀记录器", "kill tracker", "kill counter", "装备阶级升级", "阶升级",
    "将其铸造为大师杰作", "memento", "纪念物"
  ]);
}

export function isEnhancedWeaponPerk(plug: WeaponSocketPlugLike): boolean {
  const category = plug.category_identifier?.toLocaleLowerCase() ?? "";
  const itemType = plug.item_type?.toLocaleLowerCase() ?? "";
  return category.includes("enhanced") || includesAny(itemType, ["强化", "enhanced"]);
}

function collapseEnhancedWeaponPlugs(plugs: readonly ItemPlugSummary[]): ItemPlugSummary[] {
  const baseNames = new Set(
    plugs
      .filter((plug) => !isEnhancedWeaponPerk(plug))
      .map(normalizedPlugName)
  );

  return plugs.filter((plug) => (
    !isEnhancedWeaponPerk(plug) || !baseNames.has(normalizedPlugName(plug))
  ));
}

function normalizedPlugName(plug: WeaponSocketPlugLike): string {
  return plug.name.trim().toLocaleLowerCase();
}

function buildObjectContext(
  item: WeaponDetailSelectedItemLike,
  override: Partial<WeaponDetailObjectContext> | undefined
): WeaponDetailObjectContext {
  const kind = override?.kind ?? (item.instance_id ? "account_instance" : "definition");
  const entry = override?.entry ?? inferEntry(item, kind);
  return {
    kind,
    entry,
    entry_label: override?.entry_label,
    object_label: override?.object_label,
    object_id: override?.object_id ?? item.instance_id,
    location_label: override?.location_label,
    read_only: override?.read_only ?? kind !== "account_instance"
  };
}

function inferEntry(
  item: WeaponDetailSelectedItemLike,
  kind: WeaponDetailObjectKind
): WeaponDetailEntryKind {
  if (kind === "vendor_offer") return "vendor";
  if (item.source_kind === "vault") return "vault";
  if (item.instance_id) return "account";
  return "library";
}

function ammoFromKey(key: AmmoTypeKey | undefined): WeaponDetailAmmo | undefined {
  if (!key) return undefined;
  return { key };
}

function sourceSummaryToSources(source: ItemSourceSummary): WeaponDetailSources {
  if (source.status !== "ready") {
    return {
      status: "unknown",
      entries: [{
        id: "manifest:missing",
        kind: "manifest_hint",
        // 空串也交给 UI 兜底：这里只透传有内容的说明，空值按「没有标注」处理。
        description: source.description || undefined
      }]
    };
  }
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

export function classifyWeaponConfiguration(
  columns: readonly WeaponPerkPoolColumn[],
  isExotic: boolean
): WeaponConfigurationClassification {
  const variableColumns = columns.filter((column) => column.candidates.length > 1);
  if (!variableColumns.length) return { kind: "fixed", pool_kind: "none" };
  const hasRandomizedPool = variableColumns.some((column) => column.source_kinds?.includes("randomized_set"));
  const hasSelectablePool = variableColumns.some((column) => (
    column.source_kinds?.some((kind) => kind === "reusable_item" || kind === "reusable_set")
  ));
  return {
    kind: isExotic ? "variable_exotic" : "random_roll",
    pool_kind: hasRandomizedPool
      ? "randomized"
      : hasSelectablePool || isExotic
        ? "selectable"
        : "randomized"
  };
}

function toWeaponPerkCandidate(plug: ItemPlugSummary): WeaponPerkCandidate {
  return {
    hash: plug.hash,
    name: plug.name,
    description: plug.description,
    icon: plug.icon
  };
}

function includesAny(value: string, segments: readonly string[]): boolean {
  return segments.some((segment) => value.includes(segment));
}

function isWeaponCoreUpgradeCategory(category: string): boolean {
  return includesAny(category, ["perk_upgrades", "perk.upgrades", "perkupgrades"]);
}

function toWeaponDetailInstance(
  item: WeaponDetailInstanceLike & { instance_id: string },
  currentInstanceId: string | undefined,
  metadata: WeaponDetailInstanceMetadata | undefined
): WeaponDetailInstance {
  const configurationPlugs = item.socket_plugs.filter((plug) => {
    const role = classifyWeaponSocketPlugs([plug]);
    return role !== undefined && role !== "intrinsic";
  }).slice(0, 5);
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
    local_tag: item.local_tag ?? metadata?.local_tag,
    note: item.note ?? metadata?.note,
    upgrade_status: item.upgrade_status ?? metadata?.upgrade_status,
    loadout_references: item.loadout_references ?? metadata?.loadout_references,
    current: item.instance_id === currentInstanceId,
    plugs: configurationPlugs.map((plug) => ({
      hash: plug.hash,
      name: plug.name,
      icon: plug.icon
    })),
    plug_names: configurationPlugs.map((plug) => plug.name)
  };
}

function difference(value: number | undefined, baseline: number | undefined): number | undefined {
  return value !== undefined && baseline !== undefined ? value - baseline : undefined;
}
