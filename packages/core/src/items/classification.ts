export type EquipmentGroupKey = "weapons" | "armor" | "equipment" | "other";
export type AmmoTypeKey = "primary" | "special" | "heavy";

export type BucketClassification = {
  name: string;
  group: EquipmentGroupKey;
};

/**
 * 子职业所在的 Bucket。角色装备栏里它和武器护甲混在一起，判断一件装备是不是子职业
 * 只能看这个 hash，不能看显示名——`bucket_name` 跟着接口语言变。
 */
export const subclassEquipmentBucketHash = 3284755031;

/**
 * 赛季神器所在的 Bucket。它是角色装备栏里的一格，但它不是一件能换的装备：神器永远挂在
 * 角色身上，玩家在它上面的选择其实是赛季解锁的 perk，不在装备实例上，账号摘要里也不出现
 * 在 `equipment` 组件里。配装不把它当成一个可挑的装备目标。
 */
export const artifactEquipmentBucketHash = 1506418338;

/**
 * 角色装备栏里的装饰槽——机灵、载具、飞船、徽标、公会战旗、终结技、动作。
 *
 * 游戏内配装每个角色十格，装的是子职业、赛季神器、三件武器和五件护甲（DIM 的
 * `inGameLoadoutBuckets` 是同一口径）。这七类既存不进去，也不该被配装当成一件要穿戴的
 * 装备。
 *
 * 不用 Bucket 的 group 反推：子职业在 `bucketLabels` 里和这七类同属 `equipment`，但它有
 * 自己的去处（`subclass_target`），按 group 判会把它一起扫进来。
 */
export const cosmeticEquipmentBucketHashes = [
  4023194814,
  2025709351,
  284967655,
  4274335291,
  4292445962,
  3683254069,
  1107761855
] as const;

export const bucketLabels: Record<number, BucketClassification> = {
  1498876634: { name: "动能武器", group: "weapons" },
  2465295065: { name: "能量武器", group: "weapons" },
  953998645: { name: "威能武器", group: "weapons" },
  3448274439: { name: "头盔", group: "armor" },
  3551918588: { name: "臂铠", group: "armor" },
  14239492: { name: "胸甲", group: "armor" },
  20886954: { name: "腿甲", group: "armor" },
  1585787867: { name: "职业物品", group: "armor" },
  [subclassEquipmentBucketHash]: { name: "职业分支", group: "equipment" },
  4023194814: { name: "机灵", group: "equipment" },
  2025709351: { name: "载具", group: "equipment" },
  284967655: { name: "飞船", group: "equipment" },
  4274335291: { name: "徽标", group: "equipment" },
  4292445962: { name: "公会战旗", group: "equipment" },
  3683254069: { name: "终结技", group: "equipment" },
  1107761855: { name: "动作", group: "equipment" }
};

export const accountEquipmentBucketHashes = [
  1498876634,
  2465295065,
  953998645,
  3448274439,
  3551918588,
  14239492,
  20886954,
  1585787867
] as const;

export const vaultBucketHash = 138197802;

export const postmasterBucketHash = 215593132;

/**
 * 任务槽位所在的 Bucket。`accountCapacityDefinitionBucketHashes` 要用到它，声明顺序必须在
 * 那个数组之前。
 */
export const pursuitBucketHash = 1345459588;

/** Stable Destiny item/category identifiers used by the pursuit center. */
export const pursuitCategoryHashes = {
  quest: 53,
  questStep: 16,
  bounties: 1784235469,
  repeatableBounties: 713159888,
  seasonalArtifact: 1378222069
} as const;

/**
 * 账号加载时一定要取到定义的 Bucket 集合。任务 Bucket 也在里面：容量行要报「任务占了多少
 * 格里的几格」，只数得出占了几格、读不到 63 这个上限，就只能报半条事实（T91 第 7 节）。
 */
export const accountCapacityDefinitionBucketHashes = [
  ...accountEquipmentBucketHashes,
  vaultBucketHash,
  postmasterBucketHash,
  pursuitBucketHash
] as const;

export function isPostmasterBucketHash(bucketHash: number | undefined): boolean {
  return typeof bucketHash === "number" && (bucketHash >>> 0) === postmasterBucketHash;
}

export function classifyBucket(bucketHash: number | undefined): BucketClassification | undefined {
  return bucketHash ? bucketLabels[bucketHash] : undefined;
}

export function ammoTypeKey(ammoType: number | undefined): AmmoTypeKey | undefined {
  switch (ammoType) {
    case 1:
      return "primary";
    case 2:
      return "special";
    case 3:
      return "heavy";
    default:
      return undefined;
  }
}

/**
 * 子职业插槽里那一格装的是哪一类。`other` 只表示「分类名没认出来」，
 * 不等于模组：子职业没有模组插槽，落进 `other` 的 plug 连原始 socket 索引一起丢就没有第二处记录了。
 */
export type SubclassPlugRole = "ability" | "aspect" | "fragment" | "other";

/**
 * `plugCategoryIdentifier` 最后一段到类别的对照表。
 *
 * 认 Manifest 自己的分类名，不认界面文案：zh-chs 的 `itemTypeDisplayName` 写「冰影星相」，
 * en-US 写 "Stasis Aspect"，两套关键词分别只在一种语言下命中；分类名是同一个值。
 *
 * 两个名字和界面措辞对不上，必须点名：
 * - 冰影星相在 Manifest 里是 `{职业}.stasis.totems`，不存在 `stasis.aspects`；
 * - 冰影碎片是 `shared.stasis.trinkets`，不存在 `stasis.fragments`。
 *
 * 这张表覆盖的是「最后一段」的完整取值集合，不是子集：全部 plug 分类里以这些词结尾的
 * 只有子职业那批（`hunter.arc.supers`、`shared.prism.fragments` 这种），没有同名的武器或护甲分类。
 */
const subclassPlugRoleByCategorySegment: Readonly<Record<string, SubclassPlugRole>> = {
  aspects: "aspect",
  totems: "aspect",
  fragments: "fragment",
  trinkets: "fragment",
  supers: "ability",
  melee: "ability",
  grenades: "ability",
  prism_grenade: "ability",
  movement: "ability",
  class_abilities: "ability",
  transcendence: "ability"
};

export function classifySubclassPlug(plug: { category_identifier?: string }): SubclassPlugRole {
  const identifier = plug.category_identifier;
  if (!identifier) return "other";
  const segment = identifier.slice(identifier.lastIndexOf(".") + 1);
  return subclassPlugRoleByCategorySegment[segment] ?? "other";
}

export function isSubclassBucket(bucketHash: number | undefined): boolean {
  return bucketHash === subclassEquipmentBucketHash;
}

export function isArtifactEquipmentBucket(bucketHash: number | undefined): boolean {
  return bucketHash === artifactEquipmentBucketHash;
}

function isCosmeticEquipmentBucket(bucketHash: number | undefined): boolean {
  return typeof bucketHash === "number"
    && (cosmeticEquipmentBucketHashes as readonly number[]).includes(bucketHash);
}

/**
 * 一件账号装备要不要进配装的 `item_targets`。
 *
 * 收进来的只有三件武器和五件护甲。子职业由 `subclass_target` 承载；装饰槽和赛季神器不占
 * 配装的槽位，进来会让 `selected_count === item_targets.length` 这条穿戴判据凭空多出七八项，
 * 永远算不齐，编辑器里也会多出一栏「其他装备目标」。
 *
 * 判据一律用 Bucket hash，不用槽位显示名——显示名跟着接口语言变。`bucket_hash` 和
 * `equipment_bucket_hash` 都要看：两个字段在不同来源下各有可能缺失，只看一个会漏判。
 * Bucket 读不出来的装备保持原样保留：误杀一件真武器比多显示一行糟。
 */
export function isLoadoutPlanTargetItem(item: {
  bucket_hash?: number;
  equipment_bucket_hash?: number;
}): boolean {
  if (isSubclassBucket(item.bucket_hash) || isSubclassBucket(item.equipment_bucket_hash)) return false;
  if (isArtifactEquipmentBucket(item.bucket_hash) || isArtifactEquipmentBucket(item.equipment_bucket_hash)) {
    return false;
  }
  return !isCosmeticEquipmentBucket(item.bucket_hash)
    && !isCosmeticEquipmentBucket(item.equipment_bucket_hash);
}

/**
 * 插槽内容像不像子职业。Bucket 读不到时的兜底判据：子职业那批分类名没有同名的武器或护甲分类，
 * 认出任意一格就够。有 Bucket 可读时不要用这个，它会漏掉整格为空的子职业。
 */
export function hasSubclassPlugs(plugs: readonly { category_identifier?: string }[]): boolean {
  return plugs.some((plug) => classifySubclassPlug(plug) !== "other");
}

export function isArtifactPlug(plug: { category_identifier?: string }): boolean {
  const identifier = plug.category_identifier;
  if (!identifier) return false;
  return identifier.slice(identifier.lastIndexOf(".") + 1) === "artifact_perks";
}

/**
 * 插槽内容像不像赛季神器。Bucket 反查不到实例时的兜底判据：神器的插件全落在 `artifact_perks`
 * 这个分类上，子职业和武器护甲都没有同名分类。
 *
 * 要求每一格都是神器插件，不要求「认出任意一格」——神器整件都是这个分类，而子职业的子职业
 * 分类混在别处，`some` 会把它们混淆。整件没有插件时不判，交给调用方自己的兜底。
 */
export function hasArtifactPlugs(plugs: readonly { category_identifier?: string }[]): boolean {
  return plugs.length > 0 && plugs.every(isArtifactPlug);
}

