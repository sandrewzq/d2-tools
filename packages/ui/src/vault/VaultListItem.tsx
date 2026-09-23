import { memo } from "react";
import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { ArmorStatKey } from "@d2-tools/core/loadouts/analysis";
import type { VaultTagValue } from "@d2-tools/core/vault/tags";
import { getAccountItemSlotKey, getAccountItemSlotLabel, getVaultItemKey } from "@d2-tools/app/vault";
import type { VaultCopy } from "../i18n/types.js";
import { GameAssetImage } from "../media/GameAssetImage.js";
import { VaultAmmoTypeIcon, VaultChampionTypeIcon, VaultDamageTypeIcon } from "./VaultWeaponFactIcons.js";
import type { VaultRecommendationSourceSummary } from "../recommendationMatchView.js";
import {
  useVaultQuickAction,
  type VaultQuickActionStore
} from "./vaultQuickActionStore.js";
import { vaultArmorStatsInline, vaultItemLocationLabel, vaultSlotLabel, vaultSlotShortLabel, vaultTemplate, vaultText } from "./vaultCopy.js";

type VaultListItemProps = {
  copy: VaultCopy;
  item: AccountItemSummary;
  tagValue: VaultTagValue;
  isLoadoutMatch: boolean;
  sourceSummaries: VaultRecommendationSourceSummary[];
  additionalSourceCount: number;
  imagePriority?: boolean;
  isOrganizing: boolean;
  isSelected: boolean;
  isOpening?: boolean;
  currentCharacterId?: string;
  currentCharacterLabel?: string;
  quickActionStore: VaultQuickActionStore;
  quickActionsDisabled?: boolean;
  onSelectItem: (item: AccountItemSummary) => void;
  onToggleSelected: (item: AccountItemSummary) => void;
  onQuickAction?: (item: AccountItemSummary, action: "lock" | "unlock" | "transfer") => void | Promise<void>;
};

export function VaultListItem(props: VaultListItemProps) {
  const copy = props.copy;
  const disposition = dispositionForTag(props.tagValue);
  const gearTier = displayGearTier(props.item.instance?.gear_tier);
  const isWeapon = props.item.group_key === "weapons";
  const isArmor = props.item.group_key === "armor";
  const detailAvailable = props.item.group_key === "weapons" || props.item.group_key === "armor";
  const gearTierOverlay = props.item.instance?.gear_tier_overlay ?? gearTierOverlayUrl(gearTier);
  const crafting = isWeapon && props.item.crafting?.kind === "crafted" ? props.item.crafting : undefined;
  const championType = isWeapon ? props.item.breaker_type?.champion_type : undefined;
  const unknownPowerTitle = vaultTemplate(copy, "光等 {power}", { power: vaultText(copy, "未知") });
  const visual = (
    <div
      className="vault-card-visual"
      title={[
        gearTier > 0 ? vaultTemplate(copy, "装备阶级 T{tier}", { tier: gearTier }) : "",
        crafting ? craftingLabel(copy, crafting.kind, true) : ""
      ].filter(Boolean).join(" · ") || undefined}
    >
      <GameAssetImage
        alt=""
        fetchPriority={props.imagePriority ? "high" : "auto"}
        loading={props.imagePriority ? "eager" : "lazy"}
        src={props.item.icon}
        fallback={<div className="item-icon-placeholder" />}
      />
      {crafting?.background ? (
        <GameAssetImage
          className="vault-crafting-background"
          alt=""
          aria-hidden="true"
          loading={props.imagePriority ? "eager" : "lazy"}
          src={crafting.background}
        />
      ) : null}
      {crafting?.overlay ? (
        <GameAssetImage
          className="vault-crafting-overlay"
          alt=""
          aria-hidden="true"
          loading={props.imagePriority ? "eager" : "lazy"}
          src={crafting.overlay}
        />
      ) : null}
      <GameAssetImage
        className="vault-gear-tier"
        alt=""
        aria-hidden="true"
        loading={props.imagePriority ? "eager" : "lazy"}
        src={gearTierOverlay}
      />
    </div>
  );
  const stateFlags = (
    <span className="vault-card-state-flags">
      {props.item.locked ? <span className="vault-item-lock-icon" aria-label={vaultText(copy, "已锁定")} title={vaultText(copy, "已锁定")}><i /></span> : null}
      {props.isLoadoutMatch ? <small data-status="success">{vaultText(copy, "配装")}</small> : null}
      {props.isOpening ? <small data-status="pending">{vaultText(copy, "打开中")}</small> : null}
    </span>
  );
  const strongestArmorStat = isArmor ? getStrongestArmorStat(copy, props.item) : undefined;
  const sourceSummaries = isWeapon ? props.sourceSummaries : [];
  const totalSourceCount = sourceSummaries.length + props.additionalSourceCount;
  const itemKey = getVaultItemKey(props.item);
  const activeQuickAction = useVaultQuickAction(props.quickActionStore, itemKey);
  const canUseQuickActions = Boolean(props.item.instance_id && props.onQuickAction);
  const canTransfer = canUseQuickActions && getItemSourceKind(props.item) === "vault" && Boolean(props.currentCharacterId);
  const lockQuickAction = props.item.locked ? "unlock" : "lock";
  const lockQuickActionLabel = props.item.locked ? vaultText(copy, "解锁") : vaultText(copy, "加锁");
  const activeLockQuickAction = activeQuickAction === "lock" || activeQuickAction === "unlock"
    ? activeQuickAction
    : undefined;
  const activeLockQuickActionLabel = activeLockQuickAction === "unlock"
    ? vaultText(copy, "解锁中")
    : activeLockQuickAction === "lock" ? vaultText(copy, "加锁中") : lockQuickActionLabel;
  // 武器的位置、锻造与标记跟快捷操作合成卡片底部一行：左边是状态，右边是按钮。
  // 单独占一行时那条横向空白没人用（位置十几像素、右侧几百像素全空），并进来正好填掉。
  const weaponStatus = (
    <div className="vault-weapon-status">
      <span className="vault-weapon-location-state">
        <span className="vault-weapon-location">{vaultItemLocationLabel(copy, props.item)}</span>
        {crafting ? (
          <span
            className="vault-weapon-crafting"
            data-crafting-kind={crafting.kind}
            title={craftingLabel(copy, crafting.kind, true)}
          >
            {craftingLabel(copy, crafting.kind)}
          </span>
        ) : null}
        {disposition === "none"
          ? props.isOrganizing ? <span className="vault-weapon-unmarked">{vaultText(copy, "未整理")}</span> : null
          : <span className={`vault-score-badge score-${disposition}`}>{dispositionLabel(copy, disposition)}</span>}
      </span>
      {stateFlags}
    </div>
  );
  const quickActionButtons = <>
    <button
      type="button"
      data-ui-kind="button"
      data-control-variant="quiet"
      data-vault-action="lock"
      disabled={props.quickActionsDisabled || Boolean(activeQuickAction)}
      aria-busy={Boolean(activeLockQuickAction)}
      title={vaultTemplate(copy, "一键{action}：{name}", { action: lockQuickActionLabel, name: props.item.name })}
      onClick={() => void props.onQuickAction?.(props.item, lockQuickAction)}
    >
      {activeLockQuickAction ? activeLockQuickActionLabel : lockQuickActionLabel}
    </button>
    {canTransfer ? (
      <button
        type="button"
        data-ui-kind="button"
        data-control-variant="secondary"
        data-vault-action="transfer"
        disabled={props.quickActionsDisabled || Boolean(activeQuickAction)}
        aria-busy={activeQuickAction === "transfer"}
        title={props.currentCharacterLabel
          ? vaultTemplate(copy, "取出到当前角色（{character}）", { character: props.currentCharacterLabel })
          : vaultText(copy, "取出到当前角色")}
        onClick={() => void props.onQuickAction?.(props.item, "transfer")}
      >
        {activeQuickAction === "transfer" ? vaultText(copy, "取出中") : vaultText(copy, "取出")}
      </button>
    ) : null}
  </>;
  const cardContent = isWeapon ? <>
      <div className="vault-weapon-identity">
        {visual}
        <div className="vault-weapon-copy">
          <strong title={props.item.name}>{props.item.name}</strong>
          <span title={[vaultSlotLabel(copy, getAccountItemSlotKey(props.item), getAccountItemSlotLabel(props.item)), props.item.item_type].filter(Boolean).join(" · ")}>
            {[formatWeaponSlot(copy, props.item), props.item.item_type || vaultText(copy, "武器")].filter(Boolean).join(" · ")}
          </span>
        </div>
        {/* 光等放身份行右缘：事实行四等分时它挤掉别人的宽度，勇士词条会被截成「反势不可…」；
            搬到身份行后事实行只剩三项，每项都够宽，身份行右侧那块空白也有了用处。 */}
        <span className="vault-weapon-power" title={props.item.power === undefined ? unknownPowerTitle : vaultTemplate(copy, "光等 {power}", { power: props.item.power })}>
          <small>{vaultText(copy, "光")}</small><strong>{props.item.power ?? "—"}</strong>
        </span>
      </div>
      <div className="vault-weapon-fact-row">
        <span className={`vault-weapon-fact ammo-${props.item.ammo_type ?? "unknown"}`} title={props.item.ammo_type ? copy.labels.ammo[props.item.ammo_type] : vaultText(copy, "弹药类型未知")}>
          <VaultAmmoTypeIcon type={props.item.ammo_type} size="compact" />
          <span>{formatAmmoCompact(copy, props.item.ammo_type)}</span>
        </span>
        <span className="vault-weapon-fact" title={formatVaultCardContext(copy, props.item)}>
          <VaultDamageTypeIcon damageType={props.item.instance?.damage_type} src={props.item.instance?.damage_type_icon} size="compact" />
          <span>{formatVaultCardContext(copy, props.item) || vaultText(copy, "属性未知")}</span>
        </span>
        {championType ? (
          <span
            className={`vault-weapon-fact champion-${championType}`}
            title={`${copy.labels.champions[championType]}${props.item.breaker_type?.source_frame_name ? ` · ${props.item.breaker_type.source_frame_name}` : ""}`}
          >
            <VaultChampionTypeIcon type={championType} src={props.item.breaker_type?.icon} size="compact" />
            <span>{copy.labels.champions[championType]}</span>
          </span>
        ) : null}
      </div>
      <div
        className="vault-weapon-source-summary"
        aria-label={sourceSummaries.length
          ? vaultTemplate(copy, "推荐 Roll 匹配：{details}", {
              details: sourceSummaries.map((summary) => summary.detail).join("；")
                + (props.additionalSourceCount > 0
                  ? vaultTemplate(copy, "；另有 {count} 个来源，请进入详情查看", { count: props.additionalSourceCount })
                  : "")
            })
          : vaultText(copy, "当前武器暂无推荐来源")}
      >
        <span className="vault-weapon-source-head">
          <span>{vaultText(copy, "推荐 Roll 匹配")}</span>
          <small>{totalSourceCount > 0
            ? vaultTemplate(copy, "{count} 个来源", { count: totalSourceCount })
              + (props.additionalSourceCount > 0
                ? vaultTemplate(copy, " · 另有 {count} 个", { count: props.additionalSourceCount })
                : "")
            : vaultText(copy, "暂无来源")}</small>
        </span>
        <span className="vault-weapon-source-list">
          {sourceSummaries.map((summary) => (
            <span
              className="vault-weapon-source-row"
              data-match-state={summary.state}
              key={summary.sourceId}
              title={summary.detail}
            >
              <span>{summary.shortLabel}</span>
              <strong>{summary.resultText}</strong>
            </span>
          ))}
          {!sourceSummaries.length ? <span className="vault-weapon-source-empty">{vaultText(copy, "暂无推荐来源")}</span> : null}
        </span>
      </div>
    </> : isArmor ? <>
      <div className="vault-armor-identity">
        {visual}
        <div className="vault-armor-copy">
          <strong title={props.item.name}>{props.item.name}</strong>
          <span>{classTypeLabel(copy, props.item.class_type) || vaultText(copy, "通用护甲")}</span>
          <span title={props.item.bucket_name}>{props.item.bucket_name || props.item.item_type || vaultText(copy, "未知部位")}</span>
        </div>
      </div>
      <div className="vault-armor-fact-row">
        <span className="vault-armor-fact"><small>{vaultText(copy, "总值")}</small><strong>{props.item.armor_stats?.total ?? "—"}</strong></span>
        <span className="vault-armor-fact" title={strongestArmorStat?.fullLabel}>
          <small>{strongestArmorStat?.label ?? vaultText(copy, "属性")}</small><strong>{strongestArmorStat?.value ?? "—"}</strong>
        </span>
        <span className="vault-weapon-power" title={props.item.power === undefined ? unknownPowerTitle : vaultTemplate(copy, "光等 {power}", { power: props.item.power })}>
          <small>{vaultText(copy, "光")}</small><strong>{props.item.power ?? "—"}</strong>
        </span>
      </div>
      <div className="vault-armor-status">
        <span className={`vault-score-badge score-${disposition}`}>{dispositionLabel(copy, disposition)}</span>
        {stateFlags}
      </div>
    </> : <>
      <div className="vault-card-visual-stack">
        {visual}
        <span className="vault-card-power">{props.item.power ?? "—"}</span>
      </div>
      <div className="vault-card-body">
        <strong title={props.item.name}>{props.item.name}</strong>
        <span className="vault-card-meta">{formatVaultCardMeta(copy, props.item)}</span>
        <span className="vault-card-footer">
          <span className={`vault-score-badge score-${disposition}`}>{dispositionLabel(copy, disposition)}</span>
          {stateFlags}
        </span>
      </div>
    {props.isLoadoutMatch ? (
      <span className="vault-card-corner-flags" aria-label={vaultText(copy, "配装引用")}>
        <span title={vaultText(copy, "配装引用")}>{vaultText(copy, "配")}</span>
      </span>
    ) : null}
  </>;

  return (
    <article
      className={[
        "vault-item-card",
        props.isSelected ? "selected" : "",
        props.isOrganizing ? "is-organizing" : "",
        props.isLoadoutMatch ? "loadout-highlight" : "",
        props.isOpening ? "pending" : "",
        `vault-item-${props.item.group_key}`,
        detailAvailable ? "" : "is-readonly"
      ].filter(Boolean).join(" ")}
      data-ui-kind="object-card"
      data-vault-item-key={itemKey}
    >
      {props.isOrganizing ? (
        <label className="vault-card-select" aria-label={vaultTemplate(copy, "选择{name}", { name: props.item.name })}>
          <input
            checked={props.isSelected}
            type="checkbox"
            onChange={() => props.onToggleSelected(props.item)}
          />
        </label>
      ) : null}
      {detailAvailable ? (
        <button
          type="button"
          className="vault-card-main"
          title={formatVaultCardTitle(copy, props.item, disposition, props.isLoadoutMatch)}
          aria-busy={props.isOpening}
          disabled={props.isOpening}
          onClick={() => props.onSelectItem(props.item)}
        >
          {cardContent}
        </button>
      ) : <div className="vault-card-main is-readonly" tabIndex={-1}>{cardContent}</div>}
      {isWeapon ? (
        // 武器卡底部一行始终渲染（状态是卡片自己的事实，跟有没有快捷操作无关）。
        <div className="vault-card-quick-actions vault-card-quick-actions-weapon">
          {weaponStatus}
          {!props.isOrganizing && canUseQuickActions ? (
            // 名称挂在按钮组上而不是整行：整行加 aria-label 会把左边的状态文字一起盖掉。
            <span
              className="vault-card-quick-action-buttons"
              role="group"
              aria-label={vaultTemplate(copy, "{name}快捷操作", { name: props.item.name })}
            >
              {quickActionButtons}
            </span>
          ) : null}
        </div>
      ) : !props.isOrganizing && canUseQuickActions ? (
        <div className="vault-card-quick-actions" aria-label={vaultTemplate(copy, "{name}快捷操作", { name: props.item.name })}>
          {quickActionButtons}
        </div>
      ) : null}
    </article>
  );
}

export const MemoizedVaultListItem = memo(VaultListItem, sameVaultListItemProps);

function sameVaultListItemProps(previous: VaultListItemProps, next: VaultListItemProps): boolean {
  return previous.copy === next.copy
    && previous.item === next.item
    && previous.item.breaker_type?.champion_type === next.item.breaker_type?.champion_type
    && previous.item.breaker_type?.icon === next.item.breaker_type?.icon
    && previous.tagValue === next.tagValue
    && previous.isLoadoutMatch === next.isLoadoutMatch
    && previous.additionalSourceCount === next.additionalSourceCount
    && previous.imagePriority === next.imagePriority
    && previous.isOrganizing === next.isOrganizing
    && previous.isSelected === next.isSelected
    && previous.isOpening === next.isOpening
    && previous.currentCharacterId === next.currentCharacterId
    && previous.currentCharacterLabel === next.currentCharacterLabel
    && previous.quickActionStore === next.quickActionStore
    && previous.quickActionsDisabled === next.quickActionsDisabled
    && sameSourceSummaries(previous.sourceSummaries, next.sourceSummaries)
    && previous.onSelectItem === next.onSelectItem
    && previous.onToggleSelected === next.onToggleSelected
    && previous.onQuickAction === next.onQuickAction;
}

function sameSourceSummaries(
  previous: VaultRecommendationSourceSummary[],
  next: VaultRecommendationSourceSummary[]
): boolean {
  return previous.length === next.length && previous.every((summary, index) => {
    const candidate = next[index];
    return candidate?.sourceId === summary.sourceId
      && candidate.state === summary.state
      && candidate.shortLabel === summary.shortLabel
      && candidate.resultText === summary.resultText
      && candidate.text === summary.text
      && candidate.detail === summary.detail;
  });
}

function dispositionForTag(tag: VaultTagValue): "none" | "keep" | "review" | "junk" {
  return tag === "keep" || tag === "review" || tag === "junk" ? tag : "none";
}

function getItemSourceKind(item: AccountItemSummary): "equipped" | "inventory" | "vault" | "postmaster" {
  if ("source_kind" in item) {
    const sourceKind = item.source_kind;
    if (sourceKind === "equipped" || sourceKind === "inventory" || sourceKind === "postmaster") {
      return sourceKind;
    }
  }
  return "vault";
}

/** 标记短名就是标记全名：`keep` / `review` / `junk` / 未标记四个词在卡片和筛选器里本来就同一份文案。 */
function dispositionLabel(copy: VaultCopy, tag: "none" | "keep" | "review" | "junk"): string {
  return tag === "none" ? copy.labels.tags.untagged : copy.labels.tags[tag];
}

function formatVaultCardMeta(copy: VaultCopy, item: AccountItemSummary): string {
  if (item.group_key === "weapons") {
    return item.item_type || vaultText(copy, "武器");
  }
  if (item.group_key === "armor") {
    return [classTypeLabel(copy, item.class_type), item.bucket_name ?? item.item_type].filter(Boolean).join(" · ") || vaultText(copy, "护甲");
  }
  return [
    item.item_type,
    item.bucket_name
  ].filter(Boolean).slice(0, 2).join(" · ") || vaultText(copy, "装备");
}

function formatVaultCardContext(copy: VaultCopy, item: AccountItemSummary): string {
  if (item.group_key !== "weapons") return "";
  if (item.instance?.damage_type_name) return item.instance.damage_type_name;
  switch (item.instance?.damage_type) {
    case 1: return copy.labels.damage.kinetic;
    case 2: return copy.labels.damage.arc;
    case 3: return copy.labels.damage.solar;
    case 4: return copy.labels.damage.void;
    case 6: return copy.labels.damage.stasis;
    case 7: return copy.labels.damage.strand;
    default: return "";
  }
}

function formatWeaponSlot(copy: VaultCopy, item: AccountItemSummary): string {
  // 槽位按 `VaultSlotKey` 取短名，认不出的槽位沿用 app 给的显示名，并按旧规则去掉「武器」后缀。
  const slot = vaultSlotShortLabel(
    copy,
    getAccountItemSlotKey(item),
    getAccountItemSlotLabel(item).replace(/武器$/u, "").trim()
  );
  return slot ? vaultTemplate(copy, "{slot}位", { slot }) : vaultText(copy, "未知槽位");
}

function formatAmmoCompact(copy: VaultCopy, type: AccountItemSummary["ammo_type"]): string {
  if (type === "primary") return vaultText(copy, "主弹药");
  if (type === "special") return vaultText(copy, "特殊");
  if (type === "heavy") return vaultText(copy, "重型");
  return vaultText(copy, "未知");
}

function getStrongestArmorStat(copy: VaultCopy, item: AccountItemSummary): {
  label: string;
  fullLabel: string;
  value: number;
} | undefined {
  if (!item.armor_stats) return undefined;
  const keys = Object.keys(copy.labels.armorStats) as ArmorStatKey[];
  const strongest = keys.reduce<ArmorStatKey | undefined>((current, key) => {
    if (!current || item.armor_stats![key] > item.armor_stats![current]) return key;
    return current;
  }, undefined);
  if (!strongest) return undefined;
  return {
    label: compactArmorStatLabel(copy, strongest),
    fullLabel: copy.labels.armorStats[strongest],
    value: item.armor_stats[strongest]
  };
}

/** 卡片事实行里的属性短名；只有生命值比筛选器里的全名少一个字，其余直接复用。 */
function compactArmorStatLabel(copy: VaultCopy, stat: ArmorStatKey): string {
  if (stat === "health") return vaultText(copy, "生命");
  return copy.labels.armorStats[stat];
}

function gearTierOverlayUrl(gearTier: number): string | undefined {
  if (gearTier <= 0) return undefined;
  return `https://www.bungie.net/img/destiny_content/items/inventory-item-tier${gearTier}.png`;
}

function classTypeLabel(copy: VaultCopy, classType: number | undefined): string | undefined {
  if (classType === 0) return copy.labels.classes.titan;
  if (classType === 1) return copy.labels.classes.hunter;
  if (classType === 2) return copy.labels.classes.warlock;
  return undefined;
}

function displayGearTier(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return 0;
  return Math.min(5, Math.floor(value));
}

function craftingLabel(copy: VaultCopy, kind: NonNullable<AccountItemSummary["crafting"]>["kind"], full = false): string {
  return kind === "crafted" ? full ? vaultText(copy, "锻造武器") : vaultText(copy, "锻造") : "";
}

function formatVaultCardTitle(
  copy: VaultCopy,
  item: AccountItemSummary,
  disposition: "none" | "keep" | "review" | "junk",
  isLoadoutMatch: boolean
): string {
  return [
    item.name,
    formatVaultCardMeta(copy, item),
    item.group_key === "weapons" ? formatWeaponSlot(copy, item) : "",
    item.group_key === "weapons" && item.ammo_type ? copy.labels.ammo[item.ammo_type] : "",
    item.group_key === "weapons" && item.breaker_type?.champion_type
      ? copy.labels.champions[item.breaker_type.champion_type]
      : "",
    item.crafting ? craftingLabel(copy, item.crafting.kind, true) : "",
    formatVaultCardContext(copy, item),
    item.power !== undefined ? vaultTemplate(copy, "光等 {power}", { power: item.power }) : "",
    vaultTemplate(copy, "整理状态：{status}", {
      status: disposition === "none" && item.group_key === "weapons"
        ? vaultText(copy, "未整理")
        : dispositionLabel(copy, disposition)
    }),
    item.locked ? vaultText(copy, "已锁定") : "",
    isLoadoutMatch ? vaultText(copy, "配装引用") : ""
  ].filter(Boolean).join("\n");
}

export function formatVaultItemMeta(copy: VaultCopy, item: AccountItemSummary): string {
  return [
    item.bucket_name,
    item.item_type,
    item.ammo_type ? copy.labels.ammo[item.ammo_type] : undefined,
    item.tier,
    item.power ? vaultTemplate(copy, "光等 {power}", { power: item.power }) : undefined,
    item.crafting ? craftingLabel(copy, item.crafting.kind, true) : undefined,
    vaultArmorStatsInline(copy, item),
    item.locked ? vaultText(copy, "已锁定") : undefined
  ].filter(Boolean).join(" / ");
}
