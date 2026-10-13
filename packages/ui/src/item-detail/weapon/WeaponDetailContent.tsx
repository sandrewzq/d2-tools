import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { GameAssetImage } from "../../media/GameAssetImage.js";
import { WeaponPerkEntry, WeaponPerkPlaceholder } from "./WeaponPerkEntry.js";
import { GameCombatIcon } from "../../media/GameCombatIcon.js";
import { formatStandardDateTime } from "../../time/formatTime.js";
import { EquipmentDetailContextLedger } from "../EquipmentDetailContextLedger.js";
import type { ItemDetailCopy } from "../../i18n/types.js";
import { itemDetailTemplate, itemDetailText } from "../itemDetailCopy.js";
import {
  itemDetailEntryLabel,
  weaponAmmoLabel,
  weaponCraftingLabel,
  weaponSocketColumnLabelText,
  weaponStatLabel
} from "../itemDetailLabels.js";
import type {
  WeaponDetailViewModel,
  WeaponPerkCandidate,
  WeaponPerkColumnRole,
  WeaponPerkPoolColumn,
  WeaponPerkSelectionColumn,
  WeaponRecommendation,
  WeaponSourceEntry,
  WeaponStatTrack
} from "@d2-tools/app/items";
import type { RecommendationSourceMatch, RecommendationSourceSlotMatch } from "@d2-tools/core/community-perks";
import type { ItemReleaseKind } from "@d2-tools/core/items/release";
import {
  presentCuratedRecommendationMatch,
  presentRecommendationSlotMatch
} from "../../recommendationMatchView.js";

export type WeaponDetailSection =
  | "overview"
  | "configuration"
  | "recommendations"
  | "upgrades";

export type WeaponDetailContentActions = {
  selectVersion?: (hash: number) => void;
  openSource?: (source: WeaponSourceEntry) => void;
  stagePerk?: (column: WeaponPerkSelectionColumn, perk: WeaponPerkCandidate) => void;
  cancelPendingPerks?: () => void;
  applyPendingPerks?: () => void | Promise<void>;
  refreshConfiguration?: () => void | Promise<void>;
  loadConfiguration?: () => void | Promise<void>;
  /**
   * 只补读物品定义的后台读取（不读完整实例 Roll、不把整份详情退回全屏骨架）。
   * 返回值表示「定义现在可用」；失败返回 false。
   */
  loadDefinition?: () => boolean | Promise<boolean>;
  activateSection?: (section: WeaponDetailSection) => void;
};

/**
 * 写入面板的反馈状态。
 *
 * `submitted` / `reloaded` 从原来的 `success` 拆出来，不是文案洁癖：这两种状态**能断言的事不一样**，
 * 挤在一个状态里就必然有一边在撒谎。
 *
 * - `submitted`：写接口受理了。受理不等于服务器已经认——实测传播延迟可达几分钟（T77），
 *   所以这里只能说「已提交、显示的是本地状态」，稿子落在 `configurationPanelContent`。
 * - `reloaded`：刚刚读到了服务器当前配置。至于「读到的是不是刚写进去的那份」，这一层不知道，
 *   也不猜（T78）。
 */
export type WeaponConfigurationWriteFeedback = {
  /**
   * `deferred` 是第四种结局：写没有落地，但**也不是失败** —— Bungie 用 ErrorCode 1679 说
   * 「这件装备还有变更在处理中」。既不能进 `error`（会把一次正常写入报成失败），
   * 也不能进 `submitted`（那是在替服务器宣布结果），所以单列一档走中性态（见 T80）。
   */
  status: "idle" | "submitting" | "refreshing" | "submitted" | "reloaded" | "deferred" | "error";
  message?: string;
};

export type WeaponDetailContentProps = {
  model: WeaponDetailViewModel;
  copy: ItemDetailCopy;
  actions?: WeaponDetailContentActions;
  configurationWriteFeedback?: WeaponConfigurationWriteFeedback;
  recommendationEvidence?: {
    sourceMatches: RecommendationSourceMatch[];
    status: "idle" | "loading" | "partial" | "ready" | "error";
    message?: string;
  };
  activeSection?: WeaponDetailSection;
  onSectionChange?: (section: WeaponDetailSection) => void;
  instanceActions?: ReactNode;
  className?: string;
};

const sectionLabels: Array<{ key: WeaponDetailSection; label: string }> = [
  { key: "recommendations", label: "推荐 Roll" },
  { key: "configuration", label: "当前配置" },
  { key: "overview", label: "属性与获取" },
  { key: "upgrades", label: "升级与锻造" }
];

// 首屏定位与懒挂载集合都跟着章节顺序走：推荐 Roll 在最上，所以打开详情时先挂载的是它。
// 挂载即触发 `activateItemDetailSection("recommendations")`，推荐证据随之在打开详情时读取，
// 不再等滚到视口附近——这是 T71 重排的必然结果，已记入 backlog。
const firstSection: WeaponDetailSection = "recommendations";

export function WeaponDetailContent(props: WeaponDetailContentProps) {
  const { model } = props;
  const [internalSection, setInternalSection] = useState<WeaponDetailSection>(firstSection);
  const [poolOpen, setPoolOpen] = useState(false);
  // 掉落池按钮在「完整 Roll 未读取」时负责先加载，加载完成后自动展开。
  const [poolRequested, setPoolRequested] = useState(false);
  useEffect(() => {
    if (poolRequested && props.model.configuration.pool_columns.length > 0) {
      setPoolOpen(true);
      setPoolRequested(false);
    }
  }, [poolRequested, props.model.configuration.pool_columns.length]);
  const [instanceRailOpen, setInstanceRailOpen] = useState(false);
  const [mountedSections, setMountedSections] = useState<Set<WeaponDetailSection>>(() => new Set([firstSection]));
  const section = props.activeSection ?? internalSection;
  const sectionIdPrefix = useId();
  const detailRef = useRef<HTMLElement>(null);
  const instanceRailRef = useRef<HTMLElement>(null);
  const instanceRailTriggerRef = useRef<HTMLButtonElement>(null);
  const instanceRailCloseRef = useRef<HTMLButtonElement>(null);
  const observedSectionRef = useRef<WeaponDetailSection>(firstSection);
  const activateSectionRef = useRef(props.actions?.activateSection);
  const visibleSectionsRef = useRef(new Map<WeaponDetailSection, number>());
  const sectionRefs = useRef<Record<WeaponDetailSection, HTMLElement | null>>({
    overview: null,
    configuration: null,
    recommendations: null,
    upgrades: null
  });
  activateSectionRef.current = props.actions?.activateSection;

  useEffect(() => {
    setPoolOpen(false);
    setInternalSection(firstSection);
    setInstanceRailOpen(false);
    setMountedSections(new Set([firstSection]));
    observedSectionRef.current = firstSection;
    visibleSectionsRef.current.clear();
  }, [model.identity.hash, model.context.object_id, model.context.kind]);

  useEffect(() => {
    // 「当前配置」没有按需 loader，跳过它；首屏挂载的推荐 Roll 走这里触发推荐证据读取。
    for (const mountedSection of mountedSections) {
      if (mountedSection !== "configuration") activateSectionRef.current?.(mountedSection);
    }
  }, [mountedSections]);

  useEffect(() => {
    if (!instanceRailOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : instanceRailTriggerRef.current;
    requestAnimationFrame(() => instanceRailCloseRef.current?.focus());
    return () => previousFocus?.focus();
  }, [instanceRailOpen]);

  useEffect(() => {
    const detail = detailRef.current;
    const scrollRoot = detail?.closest<HTMLElement>(".shared-item-detail-body");
    if (!detail || !scrollRoot) return;
    if (typeof IntersectionObserver === "undefined") {
      setMountedSections(new Set(sectionLabels.map((item) => item.key)));
      return;
    }

    const sectionElements = sectionLabels.flatMap(({ key }) => {
      const element = sectionRefs.current[key];
      return element ? [{ key, element }] : [];
    });
    const sectionByElement = new Map(sectionElements.map(({ key, element }) => [element, key]));
    const mountObserver = new IntersectionObserver((entries) => {
      const enteringSections = entries.flatMap((entry) => {
        const key = sectionByElement.get(entry.target as HTMLElement);
        return entry.isIntersecting && key ? [key] : [];
      });
      if (!enteringSections.length) return;
      setMountedSections((current) => {
        if (enteringSections.every((key) => current.has(key))) return current;
        return new Set([...current, ...enteringSections]);
      });
    }, { root: scrollRoot, rootMargin: "160px 0px", threshold: 0.01 });
    const activeObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const key = sectionByElement.get(entry.target as HTMLElement);
        if (!key) continue;
        if (entry.isIntersecting) visibleSectionsRef.current.set(key, entry.boundingClientRect.top);
        else visibleSectionsRef.current.delete(key);
      }
      const nextSection = [...visibleSectionsRef.current]
        .sort((left, right) => Math.abs(left[1]) - Math.abs(right[1]))[0]?.[0];
      if (!nextSection || observedSectionRef.current === nextSection) return;
      observedSectionRef.current = nextSection;
      if (props.activeSection === undefined) setInternalSection(nextSection);
      props.onSectionChange?.(nextSection);
    }, { root: scrollRoot, rootMargin: "-88px 0px -68% 0px", threshold: [0, 0.01, 0.5] });
    for (const { element } of sectionElements) {
      mountObserver.observe(element);
      activeObserver.observe(element);
    }
    return () => {
      mountObserver.disconnect();
      activeObserver.disconnect();
      visibleSectionsRef.current.clear();
    };
  }, [model.identity.hash, model.context.object_id, props.activeSection, props.onSectionChange]);

  const changeSection = (next: WeaponDetailSection) => {
    observedSectionRef.current = next;
    if (props.activeSection === undefined) setInternalSection(next);
    props.onSectionChange?.(next);
    setMountedSections((current) => current.has(next) ? current : new Set([...current, next]));
    const schedule = typeof requestAnimationFrame === "function"
      ? requestAnimationFrame
      : (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 16);
    schedule(() => {
      sectionRefs.current[next]?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleInstanceRailKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setInstanceRailOpen(false);
      return;
    }
    if (event.key !== "Tab" || !instanceRailRef.current) return;
    const focusable = [...instanceRailRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    )];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1)!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <article
      ref={detailRef}
      className={["weapon-detail", props.className].filter(Boolean).join(" ")}
      data-contract-root="detail-dossier"
      data-contract-id="weapon.detail"
      data-detail-contract="detail.dossier"
      data-layout="hybrid-workspace"
      data-surface="page"
      data-state={model.loading ? "loading" : "normal"}
      aria-busy={model.loading}
    >
      <WeaponIdentity model={model} copy={props.copy} onSelectVersion={props.actions?.selectVersion} />

      <nav className="weapon-detail-nav" data-ui-kind="section-navigation" aria-label={itemDetailText(props.copy, "武器详情章节")}>
        <div>
          {sectionLabels.map((item) => (
            <button
              key={item.key}
              type="button"
              data-ui-kind="button"
              data-control-variant="quiet"
              aria-current={section === item.key ? "location" : undefined}
              aria-controls={`${sectionIdPrefix}-${item.key}`}
              className={section === item.key ? "is-active" : undefined}
              onClick={() => changeSection(item.key)}
            >
              {/* 章节名跟推荐区一致：有账号实例事实时叫「推荐 Roll」，资料库定义 / 商人售卖只有来源规则，叫「推荐资料」。 */}
              {item.key === "recommendations" && model.context.kind !== "account_instance" ? itemDetailText(props.copy, "推荐资料") : itemDetailText(props.copy, item.label)}
            </button>
          ))}
        </div>
        <button
          ref={instanceRailTriggerRef}
          type="button"
          className="weapon-detail-rail-toggle"
          data-ui-kind="button"
          data-control-variant="secondary"
          aria-expanded={instanceRailOpen}
          aria-controls={`${sectionIdPrefix}-instance-rail`}
          onClick={() => setInstanceRailOpen((value) => !value)}
        >{itemDetailText(props.copy, "武器操作")}</button>
      </nav>

      <div className="weapon-detail-workspace" data-surface="split">
        <div className="weapon-detail-sections" data-surface="content-stack">
          {/* 三段顺序（T71）：推荐 Roll → 本件 Roll → 完整掉落池。推荐区在首屏最上方，始终挂载。 */}
          <section ref={(node) => { sectionRefs.current.recommendations = node; }} id={`${sectionIdPrefix}-recommendations`} className="weapon-detail-section weapon-detail-recommendation-section">
            <RecommendationSection
              model={model}
              copy={props.copy}
              evidence={props.recommendationEvidence}
              actions={props.actions}
              configurationWriteFeedback={props.configurationWriteFeedback}
            />
          </section>
          <section ref={(node) => { sectionRefs.current.configuration = node; }} id={`${sectionIdPrefix}-configuration`} className="weapon-detail-section">
            <ConfigurationSection
              model={model}
              copy={props.copy}
              actions={props.actions}
              configurationWriteFeedback={props.configurationWriteFeedback}
            />
          </section>
          <FullPoolSection
            model={model}
            copy={props.copy}
            poolOpen={poolOpen}
            canLoadFullRoll={Boolean(props.actions?.loadConfiguration)}
            onRequestFullRoll={() => { setPoolRequested(true); void props.actions?.loadConfiguration?.(); }}
            onTogglePool={() => setPoolOpen((value) => !value)}
          />
          <section ref={(node) => { sectionRefs.current.overview = node; }} id={`${sectionIdPrefix}-overview`} className="weapon-detail-section">
            {mountedSections.has("overview")
              ? <OverviewSection model={model} copy={props.copy} onOpenSource={props.actions?.openSource} />
              : <DeferredWeaponSection copy={props.copy} label={itemDetailText(props.copy, "属性与获取")} />}
          </section>
          <section ref={(node) => { sectionRefs.current.upgrades = node; }} id={`${sectionIdPrefix}-upgrades`} className="weapon-detail-section">
            {mountedSections.has("upgrades")
              ? <UpgradeSection model={model} copy={props.copy} />
              : <DeferredWeaponSection copy={props.copy} label={itemDetailText(props.copy, "升级与锻造")} />}
          </section>
          {/* 正文最后一个子元素：待提交面板吸在正文底部，推荐区里选完就能直接提交（T73）。 */}
          <WeaponWriteDock
            model={model}
            copy={props.copy}
            actions={props.actions}
            configurationWriteFeedback={props.configurationWriteFeedback}
          />
        </div>
        <aside
          ref={instanceRailRef}
          id={`${sectionIdPrefix}-instance-rail`}
          className={["weapon-detail-instance-rail", instanceRailOpen && "is-open"].filter(Boolean).join(" ")}
          data-surface="drawer"
          data-ui-kind="drawer"
          data-scroll-region="pane"
          aria-label={itemDetailText(props.copy, "当前武器操作")}
          onKeyDown={handleInstanceRailKeyDown}
        >
          <header className="weapon-detail-rail-drawer-head">
            <div><span>{itemDetailText(props.copy, "武器操作")}</span><strong>{itemDetailText(props.copy, "当前装备")}</strong></div>
            <button
              ref={instanceRailCloseRef}
              type="button"
              className="weapon-detail-rail-close"
              data-ui-kind="button"
              data-control-variant="quiet"
              aria-label={itemDetailText(props.copy, "关闭武器操作")}
              title={itemDetailText(props.copy, "关闭")}
              onClick={() => setInstanceRailOpen(false)}
            >×</button>
          </header>
          {props.instanceActions ? (
            <div className="weapon-detail-instance-actions">{props.instanceActions}</div>
          ) : (
            <div className="weapon-detail-instance-readonly">
              <h3>{itemDetailText(props.copy, "当前内容仅供查看")}</h3>
              <p>{itemDetailText(props.copy, "资料库定义和商人售卖内容没有可执行的实例操作。")}</p>
            </div>
          )}
        </aside>
      </div>
      <button
        type="button"
        className={["weapon-detail-rail-scrim", instanceRailOpen && "is-open"].filter(Boolean).join(" ")}
        data-ui-kind="button"
        data-control-variant="quiet"
        aria-label={itemDetailText(props.copy, "关闭武器操作")}
        onClick={() => setInstanceRailOpen(false)}
      />
    </article>
  );
}

function DeferredWeaponSection(props: { copy: ItemDetailCopy; label: string }) {
  return (
    <div className="weapon-detail-deferred-section" role="status" aria-label={itemDetailTemplate(props.copy, "{label}将在接近视口时载入", { label: props.label })}>
      <span aria-hidden="true" />
      <span aria-hidden="true" />
    </div>
  );
}

function WeaponIdentity(props: {
  model: WeaponDetailViewModel;
  copy: ItemDetailCopy;
  onSelectVersion?: (hash: number) => void;
}) {
  const { identity, context, versions } = props.model;
  const currentDefinition = versions.find((version) => version.is_current) ?? versions[0];
  const releaseLabel = identity.release?.description ?? itemDetailText(props.copy, "官方发布版本未标注");
  const definitionVersionLabel = identity.definition_version?.label ?? itemDetailText(props.copy, "定义版本资料未返回");
  const watermarks = identity.definition_version?.watermark_icons ?? [];
  /** 入口标签：调用方注入优先，没注入时按入口种类现查，和迁移前 app 直接给的标签一致。 */
  const entryLabelText = context.entry_label ?? itemDetailEntryLabel(props.copy, context.entry);
  const locationLabel = context.kind === "account_instance"
    ? context.location_label ?? entryLabelText
    : context.kind === "vendor_offer"
      ? itemDetailText(props.copy, "商人当前售卖")
      : itemDetailText(props.copy, "资料库");
  const canSelectDefinitionVersion = context.kind === "definition" && versions.length > 1 && Boolean(props.onSelectVersion);
  const versionLabel = context.kind === "account_instance"
    ? itemDetailText(props.copy, "装备版本")
    : context.kind === "vendor_offer"
      ? itemDetailText(props.copy, "售卖版本")
      : itemDetailText(props.copy, "发布版本");
  return (
    <header className="weapon-detail-identity" data-surface="section">
      <div className="weapon-detail-identity-main">
        <span className="weapon-detail-identity-icon">
          {identity.crafting?.background ? (
            <GameAssetImage className="weapon-detail-crafting-background" src={identity.crafting.background} alt="" aria-hidden="true" loading="eager" />
          ) : null}
          <GameAssetImage src={identity.icon} alt="" loading="eager" fallback={<span className="weapon-detail-icon-placeholder" aria-hidden="true" />} />
          {identity.crafting?.overlay ? (
            <GameAssetImage className="weapon-detail-crafting-overlay" src={identity.crafting.overlay} alt="" aria-hidden="true" loading="eager" />
          ) : null}
        </span>
        <div>
          <h2 data-ui-part="value" data-text-tone="primary" data-info-priority="display">{identity.name}</h2>
          <p data-ui-part="detail" data-text-tone="body" data-info-priority="reading">{[identity.item_type, identity.frame?.name].filter(Boolean).join(" · ")}</p>
          <div className="weapon-detail-facts" aria-label={itemDetailText(props.copy, "武器摘要")}>
            {identity.tier ? <Fact label={identity.tier} tone={identity.is_exotic ? "rarity-exotic" : "rarity"} /> : null}
            {identity.slot ? <Fact label={identity.slot} tone="slot" /> : null}
            {identity.ammo ? <Fact label={weaponAmmoLabel(props.copy, identity.ammo.key)} iconKind="ammo" iconType={identity.ammo.key} tone={`ammo-${identity.ammo.key}`} /> : null}
            {identity.damage ? <Fact label={identity.damage.label} icon={identity.damage.icon} iconKind="damage" iconType={identity.damage.key} title={identity.damage.description} tone={`damage-${identity.damage.key}`} /> : null}
            {identity.champion ? (
              <Fact
                label={identity.champion.label}
                icon={identity.champion.icon}
                iconKind="champion"
                iconType={identity.champion.key}
                title={itemDetailTemplate(props.copy, "{label}：{effect}。{description}", {
                  label: identity.champion.label,
                  effect: identity.champion.effect_label,
                  description: identity.champion.description ?? ""
                })}
                tone={`champion-${identity.champion.key}`}
              />
            ) : null}
            {identity.crafting ? <Fact label={weaponCraftingLabel(props.copy, identity.crafting.kind)} tone={`crafting-${identity.crafting.kind}`} /> : null}
          </div>
        </div>
      </div>

      <div className="weapon-detail-identity-context">
        <EquipmentDetailContextLedger
          copy={props.copy}
          entryLabel={entryLabelText}
          currentViewLabel={weaponObjectLabel(props.copy, context.kind)}
          locationLabel={locationLabel}
          locationFieldLabel={itemDetailText(props.copy, "所在位置")}
          slotLabel={identity.slot ?? identity.item_type ?? itemDetailText(props.copy, "武器")}
          slotFieldLabel={itemDetailText(props.copy, "武器槽位")}
          versionFieldLabel={versionLabel}
          versionValue={currentDefinition?.label ?? releaseLabel}
          versionOptions={canSelectDefinitionVersion
            ? versions.map((version) => ({ hash: version.hash, label: version.label }))
            : undefined}
          selectedVersionHash={currentDefinition?.hash ?? identity.hash}
          watermarkIcon={identity.definition_version?.current_watermark_icon}
          versionLoading={props.model.loading_state.versions}
          showVersionField={context.kind === "definition" && canSelectDefinitionVersion}
          onSelectVersion={canSelectDefinitionVersion ? props.onSelectVersion : undefined}
        />
        <details className="weapon-detail-definition-details">
          <summary>{itemDetailText(props.copy, "武器定义信息")}</summary>
          <div>
            <dl><dt>{itemDetailText(props.copy, "官方描述")}</dt><dd>{identity.description || itemDetailText(props.copy, "当前资料库未返回描述")}</dd></dl>
            <dl><dt>{itemDetailText(props.copy, "发布版本")}</dt><dd>{releaseLabel}</dd></dl>
            <dl><dt>{itemDetailText(props.copy, "发布类型")}</dt><dd>{releaseKindLabel(props.copy, identity.release?.kind)}</dd></dl>
            <dl><dt>{itemDetailText(props.copy, "定义版本")}</dt><dd>{definitionVersionLabel}</dd></dl>
            <dl><dt>{itemDetailText(props.copy, "光等上限编号")}</dt><dd>{identity.definition_version?.power_cap_hash ?? itemDetailText(props.copy, "资料未返回")}</dd></dl>
            <dl><dt>{itemDetailText(props.copy, "版本水印")}</dt><dd>{watermarks.length ? <span className="weapon-detail-definition-watermarks">{watermarks.map((icon, index) => <GameAssetImage key={`${icon}:${index}`} src={icon} alt={itemDetailTemplate(props.copy, "官方版本水印 {index}", { index: index + 1 })} title={itemDetailText(props.copy, "官方定义版本水印")} loading="lazy" />)}</span> : itemDetailText(props.copy, "资料未返回")}</dd></dl>
            <dl><dt>{itemDetailText(props.copy, "装备编号")}</dt><dd>{identity.hash}</dd></dl>
            <dl><dt>{itemDetailText(props.copy, "数据来源")}</dt><dd>{itemDetailText(props.copy, "资料库定义")}{context.kind === "account_instance" ? itemDetailText(props.copy, " + 当前装备") : context.kind === "vendor_offer" ? itemDetailText(props.copy, " + 商人当前售卖") : ""}</dd></dl>
            <dl><dt>{itemDetailText(props.copy, "操作方式")}</dt><dd>{context.read_only ? itemDetailText(props.copy, "只读查看") : itemDetailText(props.copy, "可管理装备")}</dd></dl>
          </div>
        </details>
      </div>
    </header>
  );
}

function weaponObjectLabel(copy: ItemDetailCopy, kind: WeaponDetailViewModel["context"]["kind"]): string {
  if (kind === "account_instance") return itemDetailText(copy, "这件武器");
  if (kind === "vendor_offer") return itemDetailText(copy, "本次售卖");
  return itemDetailText(copy, "资料库武器");
}

function releaseKindLabel(copy: ItemDetailCopy, kind: ItemReleaseKind | undefined): string {
  if (kind === "season") return itemDetailText(copy, "赛季");
  if (kind === "annual") return itemDetailText(copy, "年度资料片");
  if (kind === "dlc") return itemDetailText(copy, "内容包");
  if (kind === "core") return itemDetailText(copy, "常规版本");
  if (kind === "update") return itemDetailText(copy, "版本更新");
  return itemDetailText(copy, "官方未标注");
}

function Fact(props: {
  label: string;
  icon?: string;
  iconKind?: "damage" | "champion" | "ammo";
  iconType?: string;
  tone?: string;
  title?: string;
}) {
  return (
    <span
      className={["weapon-detail-fact", props.tone].filter(Boolean).join(" ")}
      data-ui-part="value"
      data-text-tone="primary"
      data-info-priority="support"
      title={props.title}
      tabIndex={props.title ? 0 : undefined}
    >
      {props.iconKind && props.iconType
        ? <GameCombatIcon kind={props.iconKind} type={props.iconType} src={props.icon} />
        : <GameAssetImage src={props.icon} alt="" loading="lazy" />}
      {props.label}
    </span>
  );
}

function SectionHeading(props: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="weapon-detail-section-heading">
      <div><span data-ui-part="label" data-text-tone="meta" data-info-priority="support">{props.eyebrow}</span><h3 data-ui-part="value" data-text-tone="primary" data-info-priority="display">{props.title}</h3></div>
      <p data-ui-part="detail" data-text-tone="body" data-info-priority="reading">{props.description}</p>
    </div>
  );
}

function DataBlockHeading(props: { id?: string; title: string; source: string }) {
  return (
    <div className="weapon-detail-data-heading">
      <h4 id={props.id} data-ui-part="value" data-text-tone="primary" data-info-priority="context">{props.title}</h4>
      <span data-ui-part="source" data-text-tone="meta" data-info-priority="trace">{props.source}</span>
    </div>
  );
}

function OverviewSection(props: {
  model: WeaponDetailViewModel;
  copy: ItemDetailCopy;
  onOpenSource?: (source: WeaponSourceEntry) => void;
}) {
  const preferCurrentValues = props.model.context.kind !== "definition"
    && props.model.stats.some((stat) => stat.current_value !== undefined);
  const statSource = preferCurrentValues
    ? props.model.context.kind === "vendor_offer" ? itemDetailText(props.copy, "当前售卖数值") : itemDetailText(props.copy, "当前数值")
    : itemDetailText(props.copy, "资料库数值");
  return (
    <>
      <SectionHeading eyebrow={itemDetailText(props.copy, "属性与获取")} title={itemDetailText(props.copy, "武器数值与获取方式")} description={itemDetailText(props.copy, "属性只保留当前可用数值；获取入口区分当前状态与历史记录。")} />
      <div className="weapon-detail-overview-grid">
        <section className="weapon-detail-block" aria-labelledby="weapon-stat-title">
          <DataBlockHeading
            id="weapon-stat-title"
            title={itemDetailText(props.copy, "武器属性")}
            source={itemDetailTemplate(props.copy, "{source} · {count} 项", { source: statSource, count: props.model.stats.length })}
          />
          {props.model.stats.length ? (
            <dl className="weapon-detail-stats">
              {props.model.stats.map((stat) => (
                <StatValue
                  key={stat.key}
                  copy={props.copy}
                  stat={stat}
                  preferCurrent={preferCurrentValues}
                />
              ))}
            </dl>
          ) : <EmptyState text={itemDetailText(props.copy, "当前定义没有可显示的武器属性。")} />}
        </section>
        <section className="weapon-detail-block" aria-labelledby="weapon-source-title">
          <DataBlockHeading
            id="weapon-source-title"
            title={itemDetailText(props.copy, "获取方式")}
            source={`${itemDetailText(props.copy, "依据：游戏官方资料与当前商人、活动数据")}${props.model.sources.updated_at ? ` · ${formatUpdatedAt(props.model.sources.updated_at)}` : ""}`}
          />
          {props.model.sources.entries.length ? (
            <div className="weapon-detail-source-list">
              {props.model.sources.entries.map((source) => (
                <article
                  key={source.id}
                  className={[
                    "weapon-detail-source-row",
                    source.available_now ? "is-current" : source.kind === "manifest_hint" ? "is-definition" : "is-scheduled"
                  ].join(" ")}
                >
                  <div className="weapon-detail-source-identity">
                    <GameAssetImage src={source.icon} alt="" loading="lazy" />
                    <strong data-ui-part="value" data-text-tone="primary" data-info-priority="context">{source.label ?? itemDetailText(props.copy, "历史获取途径")}</strong>
                  </div>
                  <div className="weapon-detail-source-copy">
                    <p data-ui-part="detail" data-text-tone="body" data-info-priority="reading">{source.description ?? itemDetailText(props.copy, "Bungie 官方资料没有标注这件武器的历史获取途径。")}</p>
                    {source.offer?.purchase_requirements?.length ? <small>{source.offer.purchase_requirements.join(" / ")}</small> : null}
                    {source.offer?.can_purchase === false ? <small data-text-tone="status" data-status="warning">{source.offer.failure_messages.join(" / ") || itemDetailText(props.copy, "当前条件未满足，游戏没有返回具体限制。")}</small> : null}
                  </div>
                  <div className="weapon-detail-source-meta">
                    <span
                      data-ui-part="state"
                      data-text-tone={source.available_now === true || source.available_now === false ? "status" : "meta"}
                      data-info-priority="support"
                      data-status={source.kind === "vendor_offer" && source.offer?.can_purchase === false
                        ? "warning"
                        : source.available_now === true
                          ? "success"
                          : source.available_now === false
                            ? "warning"
                            : undefined}
                    >
                      {sourceEntryStatusLabel(props.copy, source)}
                    </span>
                    {source.offer?.inventory_path ? <span>{source.offer.inventory_path}</span> : null}
                    {source.offer?.price_labels.length ? <span>{source.offer.price_labels.join(" + ")}</span> : null}
                    {source.offer?.refresh_at ? <span>{formatStandardDateTime(source.offer.refresh_at)}</span> : null}
                    {source.updated_at ? <span>{itemDetailTemplate(props.copy, "更新于 {time}", { time: formatUpdatedAt(source.updated_at) })}</span> : null}
                    {props.onOpenSource ? <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => props.onOpenSource?.(source)}>{itemDetailText(props.copy, "查看")}</button> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : <EmptyState text={itemDetailText(props.copy, "暂时没有足够数据确认这件武器的获取方式。")} />}
          <p className="weapon-detail-data-note" data-ui-kind="callout" data-callout-tone="info">{sourceStatusDescription(props.copy, props.model.sources.status)}</p>
        </section>
      </div>
    </>
  );
}

function StatValue(props: {
  copy: ItemDetailCopy;
  stat: WeaponStatTrack;
  preferCurrent: boolean;
}) {
  const { copy, stat } = props;
  const primaryValue = props.preferCurrent
    ? stat.current_value ?? stat.standard_value
    : stat.standard_value ?? stat.current_value;
  const pendingValue = stat.pending_delta ? stat.pending_value : undefined;
  const value = pendingValue !== undefined && pendingValue !== primaryValue
    ? `${primaryValue ?? "—"} → ${pendingValue}`
    : primaryValue ?? "—";
  return (
    <div className="weapon-detail-stat-row" data-pending={pendingValue !== undefined ? "true" : undefined}>
      <dt>{weaponStatLabel(copy, stat.key)}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/**
 * 这件武器能不能远程换 Perk：账号实例、不是固定配置、且至少有一项真的可切换。
 *
 * 「有没有可切换项」只有模型答得上来（`can_apply` 是逐项按插槽状态算出来的，见
 * `buildSelectionColumns`）。这个判定有三个消费者——本件 Roll 的格子、正文底部的写面板、
 * 推荐区浮层里的「选择」——所以只写这一处：三处各写一遍，哪天模型改了判据就会不同步，
 * 表现是「有一处能点、另一处点不动」。
 */
function canStageWeaponPerks(model: WeaponDetailViewModel): boolean {
  const { configuration, context } = model;
  return context.kind === "account_instance"
    && configuration.kind !== "fixed"
    && configuration.selection_columns.some((column) =>
      column.candidates.some((candidate) => candidate.can_apply));
}

function ConfigurationSection(props: {
  model: WeaponDetailViewModel;
  copy: ItemDetailCopy;
  actions?: WeaponDetailContentActions;
  configurationWriteFeedback?: WeaponConfigurationWriteFeedback;
}) {
  const { configuration, context } = props.model;
  const isDefinitionLoading = props.model.loading_state.definition;
  const isInstanceLoading = context.kind === "account_instance" && props.model.loading_state.instance;
  const isConfigurationLoading = isDefinitionLoading || isInstanceLoading;
  const hasDefinitionConfigurationData = Boolean(
    configuration.intrinsic
    || configuration.pool_columns.length
  );
  const hasConfigurationData = Boolean(
    hasDefinitionConfigurationData
    || configuration.selection_columns.length
  );
  // 这一区的定义事实（固有能力、完整 Perk 池、异域固定配置）只能从武器定义来，而账号实例首屏
  // 按规格不自动读定义（首屏直接用快照里的 Roll，不等第二次请求）。调用方还给着 loadDefinition
  // 就说明定义还没读完——补一次**只含定义**的后台读取：它不置整份详情的加载态，所以首屏不会白屏、
  // 失败也不会反复重来；完整 Roll 仍然只在点「查看完整掉落池」时才读（用户口径）。
  // 读的过程按区域显示骨架，读完确实没有才是终态文案（规格：未完成的可选数据不得显示「未返回」等终态文案）。
  const definitionPending = Boolean(props.actions?.loadDefinition)
    && context.kind === "account_instance"
    && (configuration.kind !== "random_roll" || !configuration.intrinsic);
  const [definitionRequestState, setDefinitionRequestState] = useState<"idle" | "pending" | "done" | "failed">("idle");
  const loadDefinition = props.actions?.loadDefinition;
  useEffect(() => {
    // 失败后停在 failed，不再自动重试；重试入口是详情里显式的按钮（完整掉落池 / 刷新）。
    if (!definitionPending || definitionRequestState !== "idle") return;
    setDefinitionRequestState("pending");
    void Promise.resolve(loadDefinition?.()).then(
      (loaded) => setDefinitionRequestState(loaded === false ? "failed" : "done"),
      () => setDefinitionRequestState("failed")
    );
  }, [definitionPending, definitionRequestState, loadDefinition]);
  // 还没发出请求的那一帧也算加载中：否则会先闪一下终态文案再变成骨架。
  const isWaitingForDefinition = definitionRequestState === "pending"
    || (definitionPending && definitionRequestState === "idle");
  const isConfigurationPending = isConfigurationLoading || isWaitingForDefinition;
  const isFixedExotic = hasDefinitionConfigurationData
    && props.model.identity.is_exotic
    && configuration.kind === "fixed";
  const isVariableExotic = props.model.identity.is_exotic && configuration.kind === "variable_exotic";
  const usesSelectionColumns = context.kind !== "definition"
    && (
      configuration.kind !== "fixed"
      || (isConfigurationLoading && !hasDefinitionConfigurationData && configuration.selection_columns.length > 0)
    );
  const showSelection = usesSelectionColumns && configuration.selection_columns.length > 0;
  const columns = usesSelectionColumns ? configuration.selection_columns : configuration.pool_columns;
  const canWriteConfiguration = canStageWeaponPerks(props.model);
  // 这一段只用来禁用「换 Perk」的点击（写入进行中不许再改选择）；待提交面板本身在 WeaponWriteDock。
  const isBusy = (props.configurationWriteFeedback?.status ?? "idle") === "submitting"
    || (props.configurationWriteFeedback?.status ?? "idle") === "refreshing";
  const loadingCopy = configurationLoadingCopy(props.copy, context.kind, isDefinitionLoading, isInstanceLoading);
  const title = isConfigurationLoading && !hasConfigurationData
    ? loadingCopy.title
    : isFixedExotic
    ? itemDetailText(props.copy, "固定配置")
    : context.kind === "definition"
      ? isVariableExotic ? itemDetailText(props.copy, "异域配置候选") : itemDetailText(props.copy, "完整 Perk 池")
      : context.kind === "vendor_offer"
        ? itemDetailText(props.copy, "当前售卖 Roll")
        : itemDetailText(props.copy, "本件 Roll");
  const description = isConfigurationPending
    ? loadingCopy.description
    : isFixedExotic
    ? itemDetailText(props.copy, "固有能力与其余固定 Perk 使用同一配置网格，不提供随机池筛选、推荐 Roll 命中或远程切换。")
    : isVariableExotic
      ? context.kind === "account_instance"
        ? itemDetailText(props.copy, "只展示这件武器真实拥有的异域配置选项；可写项以游戏返回的插槽状态为准。")
        : itemDetailText(props.copy, "展示当前异域定义或商人售卖可确认的配置，不把它称为普通传说武器掉落池。")
      : context.kind === "account_instance"
        ? itemDetailText(props.copy, "只允许切换这件武器真实拥有且可应用的 Perk。")
        : itemDetailText(props.copy, "当前查看内容为只读，不提供远程配置操作。");
  const operationLabel = canWriteConfiguration
    ? itemDetailText(props.copy, "可远程切换 · 需要联网")
    : props.actions?.loadConfiguration
      ? itemDetailText(props.copy, "当前 Roll 已显示 · 完整配置按需读取")
    : context.kind === "account_instance" && configuration.kind === "fixed"
      ? itemDetailText(props.copy, "固定配置 · 只读")
      : itemDetailText(props.copy, "只读");
  return (
    <>
      <SectionHeading
        eyebrow={itemDetailText(props.copy, "当前配置")}
        title={title}
        description={description}
      />
      {isConfigurationPending ? (
        <p className="weapon-detail-config-loading-note" role="status" aria-live="polite">
          <span aria-hidden="true" />
          {loadingCopy.status}
        </p>
      ) : null}
      {hasConfigurationData ? (
        <div className="weapon-detail-config-grid" aria-busy={isConfigurationPending}>
          {configuration.intrinsic
            ? <PerkColumn copy={props.copy} label={itemDetailText(props.copy, "固有能力")} role="intrinsic" contextLabel={itemDetailText(props.copy, "固有能力")} candidates={[configuration.intrinsic]} emphasis="selected" />
            : isConfigurationPending
              ? <ConfigurationLoadingColumn copy={props.copy} label={itemDetailText(props.copy, "固有能力")} />
              : <IntrinsicEmptyColumn copy={props.copy} failed={definitionRequestState === "failed"} />}
          {columns.map((column) => (
            <PerkColumn
              key={column.key}
              copy={props.copy}
              label={weaponSocketColumnLabelText(props.copy, column.label)}
              role={column.role}
              contextLabel={itemDetailText(props.copy, "当前配置")}
              emphasis="selected"
              candidates={column.candidates}
              interactive={showSelection && canWriteConfiguration && !isBusy}
              onSelect={(perk) => props.actions?.stagePerk?.(column as WeaponPerkSelectionColumn, perk)}
            />
          ))}
          {isConfigurationPending && columns.length === 0 ? <ConfigurationLoadingColumn copy={props.copy} /> : null}
        </div>
      ) : isConfigurationPending ? (
        <ConfigurationLoadingGrid copy={props.copy} />
      ) : (
        <EmptyState text={configurationEmptyText(props.copy, context.kind)} />
      )}
    </>
  );
}

/**
 * 待提交写面板（T73 上提：从「本件 Roll」章节搬到详情正文级）。
 *
 * 它原来长在「本件 Roll」区里，而 T71 之后推荐对照区排在上面一屏；在推荐区按批次选了几项之后，
 * 唯一的提交入口在屏幕外——点了「选择」却看不到能提交的东西。现在它是正文的最后一个子元素并吸附在
 * 正文底部，在哪个区域选都看得见；提交按钮仍然只有这一个，不出现第二个。
 *
 * 状态判定与面板文案一字未动，只是搬了位置：条件（可写、有待提交、写入反馈）都从同一份视图模型来。
 */
function WeaponWriteDock(props: {
  model: WeaponDetailViewModel;
  copy: ItemDetailCopy;
  actions?: WeaponDetailContentProps["actions"];
  configurationWriteFeedback?: WeaponDetailContentProps["configurationWriteFeedback"];
}) {
  const { configuration } = props.model;
  const canWriteConfiguration = canStageWeaponPerks(props.model);
  const writeFeedback = props.configurationWriteFeedback ?? { status: "idle" as const };
  const isBusy = writeFeedback.status === "submitting" || writeFeedback.status === "refreshing";
  const pendingChangeCount = configuration.selection_columns.reduce(
    (count, column) => count + (column.candidates.some((candidate) => candidate.pending) ? 1 : 0),
    0
  );
  const panelState = writeFeedback.status === "idle" && configuration.has_pending_changes
    ? "pending"
    : writeFeedback.status;
  if (!canWriteConfiguration || panelState === "idle") return null;
  const panelContent = configurationPanelContent(props.copy, panelState, pendingChangeCount, writeFeedback.message);
  return (
    <div className="weapon-detail-write-dock">
      <div
        className={`weapon-detail-write-panel is-${configurationPanelTone(panelState)}`}
        role={panelState === "error" ? "alert" : "status"}
        aria-live={panelState === "error" ? "assertive" : "polite"}
        aria-busy={isBusy}
      >
        <span className="weapon-detail-write-indicator" aria-hidden="true" />
        <div className="weapon-detail-write-copy">
          <div className="weapon-detail-write-heading">
            <strong>{panelContent.title}</strong>
            <span>{panelContent.step}</span>
          </div>
          <p>{panelContent.message}</p>
        </div>
        <div className="weapon-detail-write-actions">
          {panelState === "pending" ? (
            <>
              <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.actions?.cancelPendingPerks}>{itemDetailText(props.copy, "取消选择")}</button>
              <button type="button" data-ui-kind="button" data-control-variant="primary" disabled={!configuration.can_apply_changes} onClick={() => void props.actions?.applyPendingPerks?.()}>{itemDetailTemplate(props.copy, "应用 {count} 项更改", { count: pendingChangeCount })}</button>
            </>
          ) : null}
          {panelState === "error" ? (
            <>
              <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.actions?.cancelPendingPerks}>{itemDetailText(props.copy, "取消选择")}</button>
              <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => void props.actions?.refreshConfiguration?.()}>{itemDetailText(props.copy, "重新读取")}</button>
              <button type="button" data-ui-kind="button" data-control-variant="primary" disabled={!configuration.can_apply_changes} onClick={() => void props.actions?.applyPendingPerks?.()}>{itemDetailText(props.copy, "保留选择重试")}</button>
            </>
          ) : null}
          {panelState === "deferred" ? (
            <>
              <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.actions?.cancelPendingPerks}>{itemDetailText(props.copy, "取消选择")}</button>
              <button type="button" data-ui-kind="button" data-control-variant="primary" onClick={() => void props.actions?.refreshConfiguration?.()}>{itemDetailText(props.copy, "重新读取配置")}</button>
              <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={!configuration.can_apply_changes} onClick={() => void props.actions?.applyPendingPerks?.()}>{itemDetailText(props.copy, "保留选择重试")}</button>
            </>
          ) : null}
          {isBusy ? <span className="weapon-detail-write-busy-label">{itemDetailText(props.copy, "处理中")}</span> : null}
        </div>
      </div>
    </div>
  );
}

/**
 * 完整掉落池是独立区域（T71）：它排在「本件 Roll」之后，有自己的章节盒子与分隔线，
 * 不再挂在配置章节里面。内容与读取时机一字未动——完整 Roll 仍然只在点这个按钮时才读。
 */
function FullPoolSection(props: {
  model: WeaponDetailViewModel;
  copy: ItemDetailCopy;
  poolOpen: boolean;
  canLoadFullRoll: boolean;
  onRequestFullRoll?: () => void;
  onTogglePool: () => void;
}) {
  const { configuration, context } = props.model;
  const isVariableExotic = props.model.identity.is_exotic && configuration.kind === "variable_exotic";
  const showRandomPool = context.kind !== "definition" && configuration.kind === "random_roll"
    && (configuration.pool_columns.length > 0
      || (context.kind === "account_instance" && props.canLoadFullRoll));
  const showExoticPool = context.kind !== "definition" && isVariableExotic
    && configuration.pool_kind === "randomized"
    && configuration.pool_columns.length > 0;
  if (!showRandomPool && !showExoticPool) return null;
  return (
    <section className="weapon-detail-section" data-region="full-pool">
      {showRandomPool ? (
        <section className="weapon-detail-full-pool">
          <button
            type="button"
            data-ui-kind="button"
            data-control-variant="secondary"
            aria-expanded={props.poolOpen}
            onClick={() => {
              // 还没加载完整 Roll 时先加载，加载完成后自动展开（见外层 onRequestFullRoll）。
              if (!configuration.pool_columns.length) {
                props.onRequestFullRoll?.();
                return;
              }
              props.onTogglePool?.();
            }}
          >
            <strong>{props.poolOpen ? itemDetailText(props.copy, "收起完整掉落池") : itemDetailText(props.copy, "查看完整掉落池")}</strong>
            <span>{props.poolOpen ? itemDetailText(props.copy, "收起") : configuration.pool_columns.length ? itemDetailTemplate(props.copy, "展开 {count} 个候选", { count: countPool(configuration.pool_columns) }) : itemDetailText(props.copy, "读取全部候选")}</span>
          </button>
          {props.poolOpen ? (
            <><div className="weapon-detail-pool-grid">
              {configuration.pool_columns.map((column) => <PerkColumn key={column.key} copy={props.copy} label={weaponSocketColumnLabelText(props.copy, column.label)} role={column.role} contextLabel={itemDetailText(props.copy, "完整掉落池")} candidates={column.candidates} emphasis="selected" />)}
            </div><p className="weapon-detail-note">{itemDetailText(props.copy, "这里只展示可能掉落的候选，不标记当前已选状态；这件武器未拥有的 Perk 不能远程安装。")}</p></>
          ) : null}
        </section>
      ) : null}
      {showExoticPool ? (
        <section className="weapon-detail-full-pool">
          <button type="button" data-ui-kind="button" data-control-variant="secondary" aria-expanded={props.poolOpen} onClick={() => props.onTogglePool?.()}>
            <strong>{props.poolOpen ? itemDetailText(props.copy, "收起异域配置候选") : itemDetailText(props.copy, "查看异域配置候选")}</strong>
            <span>{props.poolOpen ? itemDetailText(props.copy, "收起") : itemDetailTemplate(props.copy, "展开 {count} 个候选", { count: countPool(configuration.pool_columns) })}</span>
          </button>
          {props.poolOpen ? (
            <><div className="weapon-detail-pool-grid">
              {configuration.pool_columns.map((column) => <PerkColumn key={column.key} copy={props.copy} label={weaponSocketColumnLabelText(props.copy, column.label)} role={column.role} contextLabel={itemDetailText(props.copy, "异域配置候选")} candidates={column.candidates} emphasis="selected" />)}
            </div><p className="weapon-detail-note">{itemDetailText(props.copy, "这些是当前资料库可确认的特殊异域随机配置候选，不代表这件武器已经拥有，也不属于普通传说武器掉落池。")}</p></>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}

function configurationSummaryItems(
  copy: ItemDetailCopy,
  model: WeaponDetailViewModel,
  pendingChangeCount: number,
  operationLabel: string,
  isDefinitionLoading: boolean,
  isInstanceLoading: boolean,
  canLoadConfiguration: boolean
): Array<{ label: string; value: string }> {
  const selectedPerks = model.configuration.selection_columns.flatMap((column) => (
    column.candidates.filter((candidate) => candidate.selected).map((candidate) => candidate.name)
  ));
  const fixedPerks = model.configuration.kind === "fixed"
    ? [
        model.configuration.intrinsic?.name,
        ...model.configuration.pool_columns.flatMap((column) => column.candidates.map((candidate) => candidate.name))
      ].filter((name): name is string => Boolean(name))
    : [];
  const currentRoll = selectedPerks.length ? selectedPerks : fixedPerks;
  const switchableColumns = model.configuration.selection_columns.filter((column) => (
    column.candidates.some((candidate) => candidate.can_apply)
  )).length;
  const candidateCount = countPool(model.configuration.pool_columns);

  if (model.context.kind === "account_instance") {
    return [
      { label: itemDetailText(copy, "当前查看"), value: itemDetailText(copy, "这件武器") },
      { label: itemDetailText(copy, "本件 Roll"), value: currentRoll.join(" / ") || (isInstanceLoading ? itemDetailText(copy, "正在读取") : itemDetailText(copy, "当前配置未返回")) },
      { label: itemDetailText(copy, "可切换"), value: switchableColumns ? itemDetailTemplate(copy, "{count} 个插槽", { count: switchableColumns }) : isInstanceLoading ? itemDetailText(copy, "正在核对") : canLoadConfiguration ? itemDetailText(copy, "展开后核对") : itemDetailText(copy, "没有可远程切换项") },
      { label: itemDetailText(copy, "配置状态"), value: pendingChangeCount ? itemDetailTemplate(copy, "{count} 项待应用", { count: pendingChangeCount }) : isDefinitionLoading || isInstanceLoading ? itemDetailText(copy, "读取中") : operationLabel }
    ];
  }

  if (model.context.kind === "vendor_offer") {
    return [
      { label: itemDetailText(copy, "当前查看"), value: itemDetailText(copy, "当前售卖") },
      { label: itemDetailText(copy, "售卖 Roll"), value: currentRoll.join(" / ") || (isDefinitionLoading ? itemDetailText(copy, "正在读取") : itemDetailText(copy, "售卖配置未返回")) },
      { label: itemDetailText(copy, "配置类型"), value: isDefinitionLoading && !currentRoll.length ? itemDetailText(copy, "正在判断") : configurationKindLabel(copy, model.configuration.kind) },
      { label: itemDetailText(copy, "操作状态"), value: isDefinitionLoading ? itemDetailText(copy, "读取中") : itemDetailText(copy, "购买前只读") }
    ];
  }

  return [
    { label: itemDetailText(copy, "当前查看"), value: itemDetailText(copy, "资料库版本") },
    { label: itemDetailText(copy, "配置范围"), value: candidateCount ? itemDetailTemplate(copy, "{slots} 个插槽 · {count} 个候选", { slots: model.configuration.pool_columns.length, count: candidateCount }) : isDefinitionLoading ? itemDetailText(copy, "正在读取") : itemDetailText(copy, "配置候选未返回") },
    { label: itemDetailText(copy, "配置类型"), value: isDefinitionLoading && !candidateCount ? itemDetailText(copy, "正在判断") : configurationKindLabel(copy, model.configuration.kind) },
    { label: itemDetailText(copy, "操作状态"), value: isDefinitionLoading ? itemDetailText(copy, "读取中") : itemDetailText(copy, "只读查看") }
  ];
}

function configurationLoadingCopy(
  copy: ItemDetailCopy,
  kind: WeaponDetailViewModel["context"]["kind"],
  isDefinitionLoading: boolean,
  isInstanceLoading: boolean
): { title: string; description: string; status: string } {
  if (kind === "account_instance") {
    if (isDefinitionLoading && isInstanceLoading) {
      return {
        title: itemDetailText(copy, "本件 Roll"),
        description: itemDetailText(copy, "正在读取这件武器的当前选择、可切换项和完整 Perk 信息。"),
        status: itemDetailText(copy, "正在读取本件 Roll 和可切换项；已确认内容会先显示，其余内容随后补齐。")
      };
    }
    if (isInstanceLoading) {
      return {
        title: itemDetailText(copy, "本件 Roll"),
        description: itemDetailText(copy, "完整 Perk 池已经可用，正在核对这件武器实际拥有的配置。"),
        status: itemDetailText(copy, "正在读取本件 Roll；完整掉落池只表示可能候选，不代表这件武器已经拥有。")
      };
    }
    return {
      title: itemDetailText(copy, "本件 Roll"),
      description: itemDetailText(copy, "这件武器的当前选择已经可用，正在补齐资料库 Perk 信息。"),
      status: itemDetailText(copy, "本件 Roll 已读取，正在补齐 Perk 名称、说明和完整候选。")
    };
  }
  if (kind === "vendor_offer") {
    return {
      title: itemDetailText(copy, "当前售卖 Roll"),
      description: itemDetailText(copy, "正在读取商人本次售卖配置和对应的 Perk 信息。"),
      status: itemDetailText(copy, "正在读取当前售卖 Roll；完成前不会用完整掉落池代替本次售卖配置。")
    };
  }
  return {
    title: itemDetailText(copy, "Perk 配置"),
    description: itemDetailText(copy, "正在读取这个版本的完整 Perk 池。"),
    status: itemDetailText(copy, "正在读取这个版本的固有能力和完整 Perk 池。")
  };
}

function configurationEmptyText(copy: ItemDetailCopy, kind: WeaponDetailViewModel["context"]["kind"]): string {
  if (kind === "account_instance") return itemDetailText(copy, "读取完成，但游戏没有返回这件武器的可显示配置。");
  if (kind === "vendor_offer") return itemDetailText(copy, "读取完成，但当前售卖内容没有返回可显示的 Roll。");
  return itemDetailText(copy, "读取完成，但资料库没有返回这个版本的 Perk 配置。");
}

function ConfigurationLoadingGrid(props: { copy: ItemDetailCopy }) {
  return (
    <div className="weapon-detail-config-grid is-loading" aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => <ConfigurationLoadingColumn key={index} copy={props.copy} />)}
    </div>
  );
}

function ConfigurationLoadingColumn(props: { copy: ItemDetailCopy; label?: string }) {
  return (
    // 用真列的外壳与真表头，只有内容位置画骨架：列高、表头高、卡片几何都和真列逐像素相同。
    <section className="weapon-detail-perk-column weapon-detail-perk-column-loading" aria-hidden="true">
      <h4>{props.label ?? <span />}</h4>
      <div>
        <WeaponPerkPlaceholder copy={props.copy} variant="loading" />
      </div>
    </section>
  );
}

/**
 * 读完定义确实没有固有能力（或定义这一次没读回来）时的空态。
 *
 * 仍然保留列名：没有列名的整格会比邻列高出表头那一格，正是改动前用户看到的「错位」。
 * 两种文案必须分得开——「未返回」是定义真的读完了，「未能读取」是这次定义没拿到，
 * 后者不该让用户以为这件武器没有固有能力。
 */
function IntrinsicEmptyColumn(props: { copy: ItemDetailCopy; failed?: boolean }) {
  const { copy } = props;
  return (
    <section className="weapon-detail-perk-column role-intrinsic">
      <h4>{itemDetailText(copy, "固有能力")}</h4>
      <div>
        <WeaponPerkPlaceholder
          copy={copy}
          variant="empty"
          text={props.failed ? itemDetailText(copy, "固有能力未能读取") : itemDetailText(copy, "未返回固有能力")}
        />
      </div>
    </section>
  );
}

function configurationPanelContent(
  copy: ItemDetailCopy,
  state: WeaponConfigurationWriteFeedback["status"] | "pending",
  pendingChangeCount: number,
  message?: string
): { title: string; step: string; message: string } {
  switch (state) {
    case "pending":
      return {
        title: itemDetailTemplate(copy, "已选择 {count} 项更改", { count: pendingChangeCount }),
        step: itemDetailText(copy, "待提交"),
        message: itemDetailText(copy, "确认后才会写入游戏；写入成功前，当前配置保持不变。")
      };
    case "submitting":
      return { title: itemDetailText(copy, "正在提交武器配置"), step: itemDetailText(copy, "提交中"), message: message ?? itemDetailText(copy, "正在将 Perk 更改提交到游戏服务...") };
    case "refreshing":
      return { title: itemDetailText(copy, "正在同步最新配置"), step: itemDetailText(copy, "同步中"), message: message ?? itemDetailText(copy, "正在读取游戏返回的最新装备状态...") };
    case "submitted":
      return {
        title: itemDetailText(copy, "武器配置更改已提交"),
        step: itemDetailText(copy, "待核对"),
        message: message ?? itemDetailText(copy, "当前显示的是本地状态；账号同步后以服务器为准。")
      };
    case "reloaded":
      return {
        title: itemDetailText(copy, "已读取服务器当前配置"),
        step: itemDetailText(copy, "已读取"),
        message: message ?? itemDetailText(copy, "显示的是刚刚从服务器读到的内容。")
      };
    case "deferred":
      return {
        title: itemDetailText(copy, "这件装备还有变更在处理中"),
        step: itemDetailText(copy, "待重试"),
        message: message ?? itemDetailText(copy, "Bungie 还没有处理完上一次更改，这次没有提交。稍后重新读取配置再试。")
      };
    case "error":
      return { title: itemDetailText(copy, "武器配置未更新"), step: itemDetailText(copy, "需要处理"), message: message ?? itemDetailText(copy, "提交失败。你可以保留选择重试。") };
    default:
      return { title: "", step: "", message: "" };
  }
}

/**
 * 面板配色只认三种语气；`submitted` 与 `reloaded` 都是「没有失败」，共用成功那套。
 *
 * 返回类型里留着 `idle` 是为了这个映射本身完备（状态联合里就有它）。它到不了 DOM：
 * 调用点在上面遇到 `panelState === "idle"` 就直接不渲染面板。
 */
function configurationPanelTone(
  state: WeaponConfigurationWriteFeedback["status"] | "pending"
): "pending" | "idle" | "submitting" | "refreshing" | "success" | "error" {
  if (state === "submitted" || state === "reloaded") return "success";
  // `deferred` 落到中性的待办配色：它不是失败，也不该借用成功那套绿色（见 T80）。
  if (state === "deferred") return "pending";
  return state;
}

/**
 * Perk 短状态词表只有这一处：同一件事（来源要什么、本件有没有、是不是当前）在整页只用一个说法。
 *
 * 推荐对照区原来两侧各写一套——来源侧走调用方传入的标签、本件侧 4 个词直接硬编码在标记里——
 * 于是同一行两列对同一件事给出不同的词（「本件命中」/「符合」、「推荐候选」/「本件拥有」），
 * 读的人要多花一次换算（T72 方案 C）。判定的分支不变，只是把话说成同一套。
 */
function perkStatusWord(copy: ItemDetailCopy) {
  return {
    hitActive: itemDetailText(copy, "符合 · 当前"),
    hit: itemDetailText(copy, "符合"),
    missed: itemDetailText(copy, "未拥有"),
    active: itemDetailText(copy, "当前启用"),
    notRequired: itemDetailText(copy, "来源未要求"),
    uncheckable: itemDetailText(copy, "无法判断"),
    pending: itemDetailText(copy, "待应用")
  };
}

function PerkColumn(props: {
  copy: ItemDetailCopy;
  label: string;
  role: WeaponPerkColumnRole;
  candidates: readonly WeaponPerkCandidate[];
  /** 条目归属的区块名（浮层身份行与无障碍标签用） */
  contextLabel: string;
  /** Roll 各列属于配置区：「当前」按蓝色选中语义表达（见 WeaponPerkEntry 的 emphasis） */
  emphasis?: "marker" | "selected";
  interactive?: boolean;
  onSelect?: (perk: WeaponPerkCandidate) => void;
}) {
  return (
    <section className={`weapon-detail-perk-column role-${props.role}`}>
      <h4>{props.label}</h4>
      <div>
        {props.candidates.length ? props.candidates.map((perk) => {
          const selection = "selected" in perk ? perk as WeaponPerkSelectionColumn["candidates"][number] : undefined;
          // 「是不是当前」「是不是待应用」两件事整页同一套词（见 perkStatusWord）：换 Perk 是先选后提交，
          // 推荐对照区里选中的那格写「待应用」，配置列里同一批选中也必须写「待应用」，不能一个说「已选」
          // 一个说「待应用」。剩下两个词说的是另一个问题（换成它要不要额外条件），只在配置列里出现。
          const stateLabel = selection
            ? selection.pending ? perkStatusWord(props.copy).pending : selection.selected ? perkStatusWord(props.copy).active : selection.can_apply ? itemDetailText(props.copy, "本件拥有 · 可切换") : itemDetailText(props.copy, "本件拥有")
            : undefined;
          const statusLabel = [stateLabel, perk.enhanced_of_hash ? itemDetailText(props.copy, "强化版本") : undefined].filter(Boolean).join(" · ");
          const statusDetail = selection
            ? selection.pending ? itemDetailText(props.copy, "本件拥有，已选中，等待写入") : selection.selected ? itemDetailText(props.copy, "本件拥有，当前启用") : selection.can_apply ? itemDetailText(props.copy, "本件拥有，可以切换成它") : itemDetailText(props.copy, "本件拥有")
            : perk.enhanced_of_hash ? itemDetailText(props.copy, "强化版本") : "";
          return (
            <WeaponPerkEntry
              key={perk.hash}
              copy={props.copy}
              name={perk.name}
              description={perk.description}
              icon={perk.icon}
              statusLabel={statusLabel || undefined}
              statusDetail={statusDetail || undefined}
              contextLabel={props.contextLabel}
              ariaLabel={[perk.name, props.contextLabel, statusDetail].filter(Boolean).join("，")}
              selected={selection?.selected}
              pending={selection?.pending}
              emphasis={props.emphasis}
              // 可切换的格子点击＝换 Perk（与改动前一致）；其余格子点击＝看说明。
              onActivate={props.interactive && selection?.can_apply ? () => props.onSelect?.(perk) : undefined}
              pressed={Boolean(selection?.selected || selection?.pending)}
            />
          );
        }) : <EmptyState text={itemDetailText(props.copy, "此列没有返回候选。")} />}
      </div>
    </section>
  );
}

/**
 * 推荐区只有两条路径，分叉点是**对象身份**，不是「字段有没有值」：
 *
 * - `account_instance`：事实层。每条来源一张证据卡，逐栏对照「来源要求 ｜ 本件拥有」，
 *   命中与启用状态由 `matchVaultItems` 给出，这里是 `InstanceRecommendationEvidence`。
 * - `definition` / `vendor_offer`：规则层。只画来源规则本身——来源要求了哪些栏位、每栏有哪些候选，
 *   这里是 `DefinitionRecommendationSources`。没有本件，就没有「命中 / 完整度 / 本件拥有」可言，
 *   那些格子不是空的，是不该存在。
 *
 * 这里原来只有一条路径，靠 `requirement_state` / `instance_owned` 有没有值来猜自己拿到了哪一层，
 * 于是规则层对象也被画成了对照表：第三列结构上恒空、状态恒「不符」、「本件没有这个推荐项」出现在
 * 根本没有本件的资料库对象上。T81 把两个渲染器分开，判据换成 `context.kind`。
 */
function RecommendationSection(props: {
  model: WeaponDetailViewModel;
  copy: ItemDetailCopy;
  evidence?: WeaponDetailContentProps["recommendationEvidence"];
  actions?: WeaponDetailContentProps["actions"];
  configurationWriteFeedback?: WeaponDetailContentProps["configurationWriteFeedback"];
}) {
  const { model } = props;
  const isAccountInstance = model.context.kind === "account_instance";
  const isFixedExotic = model.identity.is_exotic && model.configuration.kind === "fixed";
  // 推荐区换 Perk（T73）：可远程切换时，本件拥有条目在浮层里「选择 / 取消选择」，与本件 Roll 同一批提交。
  // 写入进行中的那一刻不开新入口（与本件 Roll 的格子同一条闸门）。规则层没有本件，用不到这条闸门。
  const stagePerk = props.actions?.stagePerk;
  const canStagePerks = Boolean(stagePerk)
    && (props.configurationWriteFeedback?.status ?? "idle") === "idle"
    && canStageWeaponPerks(model);
  return (
    <>
      <SectionHeading
        eyebrow={isAccountInstance ? itemDetailText(props.copy, "推荐判断") : itemDetailText(props.copy, "推荐资料")}
        title={isAccountInstance ? itemDetailText(props.copy, "这件武器的推荐 Roll") : itemDetailText(props.copy, "这把武器的来源推荐")}
        description={isAccountInstance
          ? isFixedExotic
            ? itemDetailText(props.copy, "固定异域不进行随机 Roll 核对；推荐来源只保留拥有状态、催化剂进度与使用建议。")
            : itemDetailText(props.copy, "先看各来源的核心 Perk 与完整匹配，再按需展开逐栏依据；所有来源同级，按符合程度排序。")
          : itemDetailText(props.copy, "按数据源原始形式展示：只列出来源要求的栏位与候选，不核对本件是否拥有。")}
      />
      {isAccountInstance ? (
        <InstanceRecommendationEvidence
          model={model}
          copy={props.copy}
          evidence={props.evidence}
          canStagePerks={canStagePerks}
          onStagePerk={stagePerk}
        />
      ) : (
        <DefinitionRecommendationSources model={model} copy={props.copy} />
      )}
    </>
  );
}

/** 事实层：账号实例的推荐来源证据卡。命中与启用状态来自事实层，这里不自行判定。 */
function InstanceRecommendationEvidence(props: {
  model: WeaponDetailViewModel;
  copy: ItemDetailCopy;
  evidence?: WeaponDetailContentProps["recommendationEvidence"];
  canStagePerks: boolean;
  onStagePerk?: (column: WeaponPerkSelectionColumn, perk: WeaponPerkCandidate) => void;
}) {
  const panelId = useId();
  const evidence = props.evidence;
  const sourceMatches = evidence
    ? evidence.sourceMatches.slice().sort((left, right) => (
        recommendationMatchRank(right) - recommendationMatchRank(left)
        || recommendationSourceLabel(props.copy, left.source_id, left.source_label).localeCompare(
          recommendationSourceLabel(props.copy, right.source_id, right.source_label),
          "zh-Hans-CN"
        )
      ))
    : [];
  if (!sourceMatches.length) {
    return <EmptyState text={evidence?.status === "loading"
      ? itemDetailText(props.copy, "正在读取这把武器的推荐 Roll。")
      : itemDetailText(props.copy, "这把武器暂时没有可核对的推荐 Roll。")} />;
  }
  return (
    <div
      id={`${panelId}-panel`}
      className="weapon-detail-recommendations"
      aria-busy={evidence?.status === "loading"}
    >
      {evidence?.message ? <p className={`status-message status-${evidence.status === "error" ? "error" : evidence.status === "partial" ? "warning" : "pending"}`} role="status">{evidence.message}</p> : null}
      {sourceMatches.map((sourceMatch) => (
        <RecommendationSourceEvidenceCard
          key={`${sourceMatch.source_id}:${sourceMatch.source_label}`}
          model={props.model}
          copy={props.copy}
          sourceMatch={sourceMatch}
          canStagePerks={props.canStagePerks}
          onStagePerk={props.onStagePerk}
        />
      ))}
    </div>
  );
}

/**
 * 规则层：资料库定义与商人售卖。这两种对象没有账号实例，推荐区只画来源规则本身。
 *
 * 免责声明属于整份推荐集（「这些推荐从哪来、能信到什么程度」），在区域顶部说一次；
 * 每张来源卡只说来源自己写的那句说明（`reason`）。两者不互相兜底——原来把免责声明塞进
 * 每条来源的 `reason` 里当 fallback，同一句话就在每张卡上重复了一遍。
 */
function DefinitionRecommendationSources(props: { model: WeaponDetailViewModel; copy: ItemDetailCopy }) {
  const { model } = props;
  const targets = model.recommendations;
  if (!targets.length) return <EmptyState text={itemDetailText(props.copy, "这把武器暂时没有来源推荐资料。")} />;
  return (
    <div className="weapon-detail-recommendations">
      {model.recommendation_disclaimer ? (
        <p className="weapon-detail-recommendation-disclaimer" data-ui-kind="callout" data-callout-tone="info">{model.recommendation_disclaimer}</p>
      ) : null}
      {targets.map((target) => (
        <DefinitionRecommendationSourceCard key={target.id} model={model} copy={props.copy} recommendation={target} />
      ))}
    </div>
  );
}

/**
 * 一条来源一张卡，卡内一栏一张小卡：栏位名 + 候选池角标 + 该栏候选。
 *
 * 一栏一卡与「来源要求 ｜ 本件拥有」两列对照的几何差别不是样式偏好：后者是给有本件的对象
 * 做逐栏核对用的，规则层没有第二列可填。这里复用 `WeaponPerkEntry` 与既有的等宽列网格，
 * 不引入新的条目形态。
 */
function DefinitionRecommendationSourceCard(props: {
  model: WeaponDetailViewModel;
  copy: ItemDetailCopy;
  recommendation: WeaponRecommendation;
}) {
  const { model, recommendation } = props;
  const isFixedExotic = model.identity.is_exotic && model.configuration.kind === "fixed";
  const sourcePurposeLabel = (recommendation.purposes?.length ? recommendation.purposes : [recommendation.mode])
    .map((mode) => mode === "pve" ? "PVE" : mode === "pvp" ? "PVP" : itemDetailText(props.copy, "通用"))
    .filter((mode, index, values) => values.indexOf(mode) === index)
    .join(" / ");
  return (
    <article className="weapon-detail-definition-source">
      <header>
        <div>
          <h4>{recommendation.title}</h4>
          <p>{recommendation.source_label} · {sourcePurposeLabel}{recommendation.updated_at ? ` · ${formatUpdatedAt(recommendation.updated_at)}` : ""}</p>
        </div>
        <div className="weapon-detail-definition-source-meta">
          <span className="ui-badge status-neutral" data-ui-kind="status-chip">
            {recommendation.presentation === "perk_pool" ? itemDetailText(props.copy, "候选池") : itemDetailText(props.copy, "完整组合")}
          </span>
          {recommendation.external_url ? <a href={recommendation.external_url} target="_blank" rel="noreferrer">{itemDetailText(props.copy, "查看原始来源")}</a> : <span>{itemDetailText(props.copy, "本地数据")}</span>}
        </div>
      </header>
      {recommendation.reason ? (
        <p className="weapon-detail-source-quote" data-ui-kind="callout" data-callout-tone="info">{recommendation.reason}</p>
      ) : null}
      {recommendation.perk_options.length ? (
        <div className="weapon-detail-definition-columns">
          {recommendation.perk_options.map((option) => (
            <section key={option.column_key} className="weapon-detail-definition-column">
              <header>
                <strong>{option.column_key}</strong>
                <span>{option.names.length > 1 ? itemDetailTemplate(props.copy, "{count} 个候选", { count: option.names.length }) : itemDetailText(props.copy, "指定")}</span>
              </header>
              <div className="weapon-detail-perk-entries" role="group" aria-label={itemDetailTemplate(props.copy, "{column}来源候选", { column: option.column_key })}>
                {/* 候选带图标就画图标；只解析出名字的来源（`candidates` 为空）退化成纯名字条目，
                    与「这条来源到底给了什么」保持一致——这里不替来源补它没给的东西。 */}
                {sourceCandidateEntries(option).map((candidate) => (
                  <WeaponPerkEntry
                    key={`${option.column_key}:${candidate.name}`}
                    copy={props.copy}
                    name={candidate.name}
                    englishName={candidate.englishName}
                    description={candidate.description}
                    icon={candidate.icon}
                    unknown={!candidate.icon}
                    contextLabel={itemDetailText(props.copy, "来源候选")}
                    statusDetail={itemDetailText(props.copy, "数据源对这一栏给出的候选；资料库对象没有本件，因此不核对是否拥有。")}
                    ariaLabel={itemDetailTemplate(props.copy, "{name}，来源候选，{column}", { name: candidate.name, column: option.column_key })}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <p className="weapon-detail-match-empty">{isFixedExotic
          ? itemDetailText(props.copy, "固定异域不使用随机 Perk 目标；此处保留来源说明和使用建议。")
          : itemDetailText(props.copy, "该来源没有指定随机 Perk 目标。")}</p>
      )}
    </article>
  );
}

/** 这一栏要画的条目：来源给了带图标的候选就用它，只给出名字的来源退化成纯名字条目。 */
function sourceCandidateEntries(
  option: WeaponRecommendation["perk_options"][number]
): Array<{ name: string; englishName?: string; description?: string; icon?: string }> {
  return option.candidates?.length ? option.candidates : option.names.map((name) => ({ name }));
}

function RecommendationSourceEvidenceCard(props: {
  model: WeaponDetailViewModel;
  copy: ItemDetailCopy;
  sourceMatch: RecommendationSourceMatch;
  canStagePerks: boolean;
  onStagePerk?: (column: WeaponPerkSelectionColumn, perk: WeaponPerkCandidate) => void;
}) {
  const source = props.sourceMatch;
  const [open, setOpen] = useState(false);
  const sourceLabel = recommendationSourceLabel(props.copy, source.source_id, source.source_label);
  const presentation = presentCuratedRecommendationMatch(source, sourceLabel);
  const specifiedSlots = source.slots.filter((slot) => slot.state !== "source_not_specified");
  const unrequestedSlotLabels = source.slots
    .filter((slot) => slot.state === "source_not_specified")
    .map((slot) => slot.label);
  const metadata = [
    // 主名是用户给这次导入起的名字，文件里声明的名字跟在后面作副标题——同一份来源在管理面
    // 和这里必须是同一个名字，否则用户没法把两处的来源对上。
    source.declared_label ? itemDetailTemplate(props.copy, "文件内名称：{value}", { value: source.declared_label }) : undefined,
    source.purposes.length ? itemDetailTemplate(props.copy, "用途：{value}", { value: source.purposes.map((purpose) => recommendationPurposeLabel(props.copy, purpose)).join(" / ") }) : undefined,
    source.rating ? itemDetailTemplate(props.copy, "评级：{value}", { value: source.rating }) : undefined,
    source.ranking ? itemDetailTemplate(props.copy, "排名：{value}", { value: source.ranking }) : undefined,
    source.page_updated_at ? itemDetailTemplate(props.copy, "更新时间：{value}", { value: formatUpdatedAt(source.page_updated_at) }) : undefined
  ].filter((entry): entry is string => Boolean(entry));
  return (
    <details
      className="weapon-detail-source-evidence"
      data-match-state={recommendationSourceMatchState(source)}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <span>
          <strong>{sourceLabel}</strong>
          <small>{metadata.join(" · ") || itemDetailText(props.copy, "来源没有提供额外元数据")}</small>
        </span>
        <span className="weapon-detail-source-score" role="group" aria-label={presentation.summary}>
          {presentation.requirementCount > 0 ? (
            <>
              <span data-score-kind="perk">
                <small>{itemDetailText(props.copy, "核心 Perk")}</small>
                <strong>{presentation.perkRequirementCount > 0
                  ? `${presentation.matchedPerkCount}/${presentation.perkRequirementCount}`
                  : itemDetailText(props.copy, "未要求")}</strong>
              </span>
              <span data-score-kind="complete">
                <small>{itemDetailText(props.copy, "完整匹配")}</small>
                <strong>{presentation.matchedRequirementCount}/{presentation.requirementCount}</strong>
              </span>
              {presentation.uncheckableRequirementCount > 0 ? (
                <span data-score-kind="pending">
                  <small>{itemDetailText(props.copy, "无法判断")}</small>
                  <strong>{itemDetailTemplate(props.copy, "{count} 项", { count: presentation.uncheckableRequirementCount })}</strong>
                </span>
              ) : null}
            </>
          ) : (
            <span data-score-kind="weapon-only">
              <small>{itemDetailText(props.copy, "推荐范围")}</small>
              <strong>{itemDetailText(props.copy, "仅推荐武器")}</strong>
              <em>{itemDetailText(props.copy, "未指定 Roll")}</em>
            </span>
          )}
        </span>
      </summary>
      {open ? (
        <div className="weapon-detail-source-evidence-body">
          {source.note ? <p className="weapon-detail-source-quote" data-ui-kind="callout" data-callout-tone="info">{source.note}</p> : null}
          <div className="weapon-detail-source-trace">
            {source.source_location ? <span>{itemDetailTemplate(props.copy, "原表位置：{value}", { value: source.source_location })}</span> : null}
            {source.source_url
              ? <a href={source.source_url} target="_blank" rel="noreferrer">{itemDetailText(props.copy, "查看原始来源")}</a>
              : <span>{itemDetailText(props.copy, "原始链接未提供")}</span>}
          </div>
          {source.state === "weapon_only" || !specifiedSlots.length ? (
            <p className="weapon-detail-match-empty">{itemDetailText(props.copy, "该来源推荐这把武器，但没有指定需要核对的枪管、第二列、大师、Perk 或起源特性，因此不作 Roll 对照。")}</p>
          ) : (
            <>
              <div className="weapon-detail-source-slot-list" aria-label={itemDetailTemplate(props.copy, "{source}推荐项核对", { source: sourceLabel })}>
                {/* 栏头（T72 方案 B）：逐行的「来源要求 / 本件拥有」收成这里一处，列模板与槽位行逐像素相同，
                    吸附在滚动口顶部；两半的图例也只在这里说一次。窄屏两半纵向堆叠时这一条隐去、
                    每个半区恢复自己的表头（媒体查询里切换）。两类表头任一时刻只有一类是可见的，
                    所以读屏也只会听到一次列名与图例，这里不额外 aria-hidden。 */}
                <div className="weapon-detail-source-slot-columns">
                  <span>{itemDetailText(props.copy, "栏位")}</span>
                  <span>{itemDetailText(props.copy, "来源要求")}<em>{itemDetailText(props.copy, "多候选满足其一即可")}</em></span>
                  <span>{itemDetailText(props.copy, "本件拥有")}<em>{itemDetailText(props.copy, "环＝当前启用，叉＝来源没要")}</em></span>
                </div>
                {specifiedSlots.map((slot) => (
                  <RecommendationSourceSlotRow
                    key={slot.slot}
                    model={props.model}
                    copy={props.copy}
                    slot={slot}
                    canStagePerks={props.canStagePerks}
                    onStagePerk={props.onStagePerk}
                  />
                ))}
              </div>
              {unrequestedSlotLabels.length ? (
                <p className="weapon-detail-source-unrequested">
                  <strong>{itemDetailText(props.copy, "其他栏位未要求")}</strong>
                  <span>{unrequestedSlotLabels.join("、")}</span>
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </details>
  );
}

// 来源证据卡专用的「来源要求 ｜ 本件拥有」两列对照：只有账号实例这一条路径有第二列可填。
function RecommendationSlotComparison(props: {
  copy: ItemDetailCopy;
  label: string;
  state: RecommendationSourceSlotMatch["state"];
  stateLabel: string;
  stateTone: string;
  sourceCandidates: RecommendationPerkVisual[];
  sourceCandidateFallback: string;
  instanceOwned: RecommendationPerkVisual[];
  instanceOwnedFallback: string;
}) {
  const { label, state, sourceCandidates, instanceOwned } = props;
  // 两列同一套短状态词（见 perkStatusWord）：同一件事在整页只用一个说法。
  const sourceStatus = (candidate: RecommendationPerkVisual) => candidate.hit
    ? candidate.active ? perkStatusWord(props.copy).hitActive : perkStatusWord(props.copy).hit
    : state === "uncheckable" ? perkStatusWord(props.copy).uncheckable : perkStatusWord(props.copy).missed;
  const ownedStatus = (candidate: RecommendationPerkVisual) => candidate.hit
    ? candidate.active ? perkStatusWord(props.copy).hitActive : perkStatusWord(props.copy).hit
    : candidate.active ? perkStatusWord(props.copy).active : perkStatusWord(props.copy).notRequired;
  return (
    <div
      className="weapon-detail-source-slot"
      data-core-slot={label === "Perk 1" || label === "Perk 2" ? "true" : undefined}
      data-match-state={state}
    >
      <header>
        <strong>{label}</strong>
        <span className="ui-badge" data-ui-kind="status-chip" data-status={props.stateTone}>{props.stateLabel}</span>
      </header>
      <div className="weapon-detail-source-slot-comparison">
        <section>
          <header><span>{itemDetailText(props.copy, "来源要求")}</span>{sourceCandidates.length > 1 ? <small>{itemDetailText(props.copy, "满足其中一个即可")}</small> : null}</header>
          {sourceCandidates.length ? (
            <div className="weapon-detail-perk-entries" role="group" aria-label={itemDetailTemplate(props.copy, "{label}来源要求", { label })}>
              {sourceCandidates.map((candidate) => {
                const statusDetail = candidate.hit
                  ? candidate.active ? itemDetailText(props.copy, "本件已拥有，当前已启用") : itemDetailText(props.copy, "本件已拥有，当前未启用")
                  : state === "uncheckable" ? itemDetailText(props.copy, "当前无法确认本件是否拥有") : itemDetailText(props.copy, "本件没有这个推荐项");
                return (
                  <WeaponPerkEntry
                    key={candidate.key}
                    copy={props.copy}
                    name={candidate.name}
                    englishName={candidate.englishName}
                    description={candidate.description}
                    icon={candidate.icon}
                    hit={candidate.hit === true}
                    selected={candidate.active === true}
                    muted={state === "match" && candidate.hit !== true}
                    unknown={candidate.unresolved}
                    contextLabel={itemDetailText(props.copy, "来源推荐")}
                    statusLabel={sourceStatus(candidate)}
                    statusDetail={statusDetail}
                    ariaLabel={recommendationPerkAriaLabel(props.copy, candidate, itemDetailText(props.copy, "来源推荐"), statusDetail)}
                  />
                );
              })}
            </div>
          ) : <p>{props.sourceCandidateFallback}</p>}
        </section>
        <section>
          <header><span>{itemDetailText(props.copy, "本件拥有")}</span><small>{itemDetailText(props.copy, "环＝当前启用，叉＝来源没要")}</small></header>
          {instanceOwned.length ? (
            <div className="weapon-detail-perk-entries" role="group" aria-label={itemDetailTemplate(props.copy, "{label}本件拥有", { label })}>
              {instanceOwned.map((candidate) => {
                const staged = candidate.pending === true;
                const statusDetail = staged
                  ? itemDetailText(props.copy, "本件拥有，已选中，等待写入")
                  : candidate.hit
                    ? candidate.active ? itemDetailText(props.copy, "符合来源要求，当前已启用") : itemDetailText(props.copy, "符合来源要求，当前未启用")
                    : candidate.active ? itemDetailText(props.copy, "当前已启用，但不在该来源候选中") : itemDetailText(props.copy, "本件拥有，但不在该来源候选中");
                return (
                  <WeaponPerkEntry
                    key={candidate.key}
                    copy={props.copy}
                    name={candidate.name}
                    englishName={candidate.englishName}
                    description={candidate.description}
                    icon={candidate.icon}
                    hit={candidate.hit === true}
                    selected={candidate.active === true}
                    pending={staged}
                    // 本件当前装着它、而来源没要它（判定条件见 WeaponPerkEntry 的 mismatch）。
                    // 这条只看卡片自己的事实，不看这一栏符不符合（T84 拍板 A）：同一张卡落在「符合」栏里
                    // 也该是同一枚叉——「符合」说的是你**拥有**来源要的那项（哪怕没装），不等于你装的就是它。
                    mismatch={candidate.hit !== true && candidate.active === true}
                    muted={state === "match" && candidate.hit !== true}
                    contextLabel={itemDetailText(props.copy, "本件拥有")}
                    statusLabel={staged ? perkStatusWord(props.copy).pending : ownedStatus(candidate)}
                    statusDetail={statusDetail}
                    ariaLabel={recommendationPerkAriaLabel(props.copy, candidate, itemDetailText(props.copy, "本件拥有"), statusDetail)}
                    // 换 Perk 是批量的：这里只把这一项放进同一批待提交项，提交仍在同一处写面板（T73）。
                    action={candidate.onToggleSelect && (staged || candidate.canApply === true)
                      ? { label: staged ? itemDetailText(props.copy, "取消选择") : itemDetailText(props.copy, "选择"), onActivate: candidate.onToggleSelect }
                      : undefined}
                  />
                );
              })}
            </div>
          ) : <p>{props.instanceOwnedFallback}</p>}
        </section>
      </div>
    </div>
  );
}

function RecommendationSourceSlotRow(props: {
  model: WeaponDetailViewModel;
  copy: ItemDetailCopy;
  slot: RecommendationSourceSlotMatch;
  /** 可远程切换（账号实例 + 非固定配置 + 写入空闲）时，本件拥有条目才能在浮层里选择 */
  canStagePerks: boolean;
  onStagePerk?: (column: WeaponPerkSelectionColumn, perk: WeaponPerkCandidate) => void;
}) {
  const { model, slot } = props;
  const sourceCandidates = recommendationSourceCandidates(props.copy, model, slot);
  const presentation = presentRecommendationSlotMatch(slot.state, {
    hasInstanceOwned: slot.instance_owned.length > 0,
    hasCurrentEnabled: slot.current_enabled.length > 0
  });
  // 推荐区换 Perk（T73）：来源栏位 → 同一件武器的配置列 → 同一批待提交项。
  // 两边的交集只有 `weapon_roll.sockets[].slot`（来源事实与配置列都从它来），配置列因此带着
  // `requirement_slot`；这里不按列名或次序猜，配不上就不给动作（宁可少一个入口，不给错一个）。
  const column = props.canStagePerks
    ? model.configuration.selection_columns.find((candidate) => candidate.requirement_slot === slot.slot)
    : undefined;
  const stageSelection = (plug: RecommendationSourceSlotMatch["instance_owned"][number]) => {
    if (!column || !props.onStagePerk) return undefined;
    const stage = props.onStagePerk;
    const perk = column.candidates.find((candidate) => candidate.hash === plug.hash)
      ?? column.candidates.find((candidate) => sameLabel(candidate.name, plug.name));
    if (!perk) return undefined;
    return { perk, toggle: () => stage(column, perk) };
  };
  return (
    <RecommendationSlotComparison
      copy={props.copy}
      label={slot.label}
      state={slot.state}
      stateLabel={presentation.label}
      stateTone={presentation.tone}
      sourceCandidates={sourceCandidates.map((candidate) => ({
        ...candidate,
        hit: recommendationPerkMatches(model, candidate, slot.instance_owned),
        active: recommendationPerkMatches(model, candidate, slot.current_enabled)
      }))}
      sourceCandidateFallback={slot.state === "source_not_specified" ? itemDetailText(props.copy, "未指定") : itemDetailText(props.copy, "要求名称未返回")}
      instanceOwned={slot.instance_owned.map((plug) => {
        const visual = recommendationOwnedPerk(model, plug);
        const stage = stageSelection(plug);
        return {
          ...visual,
          hit: recommendationPerkMatches(model, visual, sourceCandidates),
          active: recommendationPerkMatches(model, visual, slot.current_enabled),
          // 「已经装着的那一项」不是可切换项，这一条在模型里判（can_apply），这里不重判一次。
          canApply: stage?.perk.can_apply === true,
          pending: stage?.perk.pending === true,
          onToggleSelect: stage?.toggle
        };
      })}
      instanceOwnedFallback={presentation.instanceOwnedFallback}
    />
  );
}

function recommendationSourceMatchState(source: RecommendationSourceMatch): RecommendationSourceMatch["state"] {
  return source.state;
}

function recommendationPurposeLabel(copy: ItemDetailCopy, purpose: RecommendationSourceMatch["purposes"][number]): string {
  return purpose === "pve" ? "PVE" : purpose === "pvp" ? "PVP" : itemDetailText(copy, "通用");
}

// 显示的就是来源自己存的名字，不在代码里认来源。第三方来源名一旦写死在这里，
// 等于把具体来源固化进产品，也和「未确认再分发许可的资料只作本地输入」相冲突。
function recommendationSourceLabel(copy: ItemDetailCopy, sourceId: string, fallback: string): string {
  return fallback || sourceId || itemDetailText(copy, "推荐来源");
}

// 所有来源同级：先看符合程度，平级再按来源名，不按来源类型排权重。
function recommendationMatchRank(source: RecommendationSourceMatch): number {
  if (source.state === "full") return 5;
  if (source.state === "core") return 4;
  if (source.state === "close") return 3;
  if (source.state === "uncheckable") return 2;
  if (source.state === "key_missing") return 1;
  return 0;
}


type RecommendationPerkVisual = {
  key: string;
  hash?: number;
  hashes?: number[];
  name: string;
  englishName?: string;
  description?: string;
  icon?: string;
  selected?: boolean;
  unresolved?: boolean;
  hit?: boolean;
  active?: boolean;
  /** 本件拥有项在这一栏能不能切（实例可写时才有值；来源侧候选不带） */
  canApply?: boolean;
  /** 已进本件 Roll 那一批待提交项 */
  pending?: boolean;
  /** 在这一栏换 Perk：与「本件 Roll」用同一个批量待提交（T73） */
  onToggleSelect?: () => void;
};

/** 推荐区条目的无障碍标签：名称、身份、命中与启用状态、完整状态各说一次。 */
function recommendationPerkAriaLabel(
  copy: ItemDetailCopy,
  perk: Pick<RecommendationPerkVisual, "name" | "hit" | "active">,
  contextLabel: string,
  statusDetail: string
): string {
  return [perk.name, contextLabel, perk.hit ? itemDetailText(copy, "命中推荐") : undefined, perk.active ? itemDetailText(copy, "当前启用") : undefined, statusDetail].filter(Boolean).join("，");
}

function UpgradeSection({ model, copy }: { model: WeaponDetailViewModel; copy: ItemDetailCopy }) {
  const { upgrades } = model;
  const objectSource = model.context.kind === "account_instance"
    ? itemDetailText(copy, "当前装备")
    : model.context.kind === "vendor_offer"
      ? itemDetailText(copy, "商人当前售卖")
      : itemDetailText(copy, "资料库定义");
  const rows = [
    upgrades.masterwork ? { key: "masterwork", label: itemDetailText(copy, "大师杰作"), current: `${upgrades.masterwork.name}${upgrades.masterwork.level ? itemDetailTemplate(copy, " · {level} 级", { level: upgrades.masterwork.level }) : ""}`, detail: `${upgrades.masterwork.complete ? itemDetailText(copy, "已完成") : itemDetailText(copy, "未完成")}${upgrades.masterwork.stat_amount ? itemDetailTemplate(copy, " · 属性 {value}", { value: `${upgrades.masterwork.stat_amount > 0 ? "+" : ""}${upgrades.masterwork.stat_amount}` }) : ""}`, source: objectSource } : null,
    upgrades.mod ? { key: "mod", label: itemDetailText(copy, "武器模组"), current: upgrades.mod.name, detail: upgrades.mod.description, source: objectSource } : null,
    upgrades.catalyst ? { key: "catalyst", label: itemDetailText(copy, "催化剂"), current: upgrades.catalyst.name, detail: catalystStateLabel(copy, model), source: upgrades.catalyst.acquired === undefined ? itemDetailText(copy, "资料库定义") : itemDetailText(copy, "账号进度 + 资料库定义") } : null,
    upgrades.enhancement ? { key: "enhancement", label: itemDetailText(copy, "强化阶级"), current: upgrades.enhancement.name, detail: upgrades.enhancement.level !== undefined ? itemDetailTemplate(copy, "当前 {level} 阶", { level: upgrades.enhancement.level }) : itemDetailText(copy, "当前装备强化状态"), source: objectSource } : null,
    upgrades.crafting_level !== undefined ? { key: "crafting", label: itemDetailText(copy, "锻造等级"), current: itemDetailTemplate(copy, "{level} 级", { level: upgrades.crafting_level }), detail: upgrades.enhanced ? itemDetailText(copy, "已包含强化能力") : itemDetailText(copy, "未强化"), source: objectSource } : null
  ].filter((row): row is NonNullable<typeof row> => Boolean(row));
  if (!rows.length) return null;
  return (
    <>
      <SectionHeading eyebrow={itemDetailText(copy, "升级与锻造")} title={upgrades.catalyst ? itemDetailText(copy, "催化剂、杰作与当前进度") : itemDetailText(copy, "大师杰作、模组与强化")} description={itemDetailText(copy, "这件武器的状态与版本能力分别标明来源，不把未返回的信息补成结论。")} />
      <DataBlockHeading title={itemDetailText(copy, "升级状态")} source={upgrades.catalyst ? (upgrades.catalyst.acquired === undefined ? itemDetailText(copy, "资料库定义") : itemDetailText(copy, "账号进度 + 资料库定义 · 当前读取")) : objectSource} />
      <div className={["weapon-detail-upgrade-layout", !upgrades.catalyst && "without-catalyst"].filter(Boolean).join(" ")}>
        {upgrades.catalyst ? <article className="weapon-detail-catalyst"><header><GameAssetImage className="game-definition-icon" src={upgrades.catalyst.icon} alt="" loading="lazy" /><div><strong>{upgrades.catalyst.name}</strong><span>{upgrades.catalyst.objective || catalystStateLabel(copy, model)}</span></div></header>{upgrades.catalyst.acquired !== undefined ? <progress value={upgrades.catalyst.progress ?? (upgrades.catalyst.complete ? 100 : 0)} max={100} /> : null}{upgrades.catalyst.acquisition ? <p>{itemDetailTemplate(copy, "获取：{value}", { value: upgrades.catalyst.acquisition })}</p> : null}{upgrades.catalyst.effects.length ? <ul>{upgrades.catalyst.effects.map((effect) => <li key={effect}>{effect}</li>)}</ul> : null}</article> : null}
        {rows.length ? (
          <div className="weapon-detail-upgrade-table" role="table" aria-label={itemDetailText(copy, "升级与锻造状态")}>
            <div role="row"><strong role="columnheader">{itemDetailText(copy, "项目")}</strong><strong role="columnheader">{itemDetailText(copy, "当前查看")}</strong><strong role="columnheader">{itemDetailText(copy, "状态")}</strong><strong role="columnheader">{itemDetailText(copy, "数据来源")}</strong></div>
            {rows.map((row) => <div key={row.key} role="row"><strong role="cell">{row.label}</strong><span role="cell">{row.current}</span><span role="cell">{row.detail}</span><span role="cell">{row.source}</span></div>)}
          </div>
        ) : <EmptyState text={itemDetailText(copy, "这件武器没有可显示的升级或附加能力。")} />}
      </div>
    </>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="weapon-detail-empty">{text}</p>;
}

function sourceEntryStatusLabel(copy: ItemDetailCopy, source: WeaponDetailViewModel["sources"]["entries"][number]): string {
  if (source.kind === "vendor_offer" && source.available_now === true) {
    if (source.offer?.can_purchase === true) return itemDetailText(copy, "当前可购买");
    if (source.offer?.can_purchase === false) return itemDetailText(copy, "当前有入口 · 条件未满足");
    return itemDetailText(copy, "当前有获取入口");
  }
  if (source.kind === "activity_reward" && source.available_now === true) return itemDetailText(copy, "当前活动奖励");
  if (source.available_now === true) return itemDetailText(copy, "当前有获取入口");
  if (source.kind === "live_status") {
    return source.available_now === false ? itemDetailText(copy, "暂未发现入口") : itemDetailText(copy, "当前状态未确认");
  }
  if (source.kind === "manifest_hint") return itemDetailText(copy, "官方历史资料");
  return itemDetailText(copy, "开放时间未确认");
}

function sourceStatusDescription(copy: ItemDetailCopy, status: WeaponDetailViewModel["sources"]["status"]): string {
  if (status === "ready") return itemDetailText(copy, "已确认当前获取入口；价格、条件和刷新时间以对应商人或活动数据为准。");
  if (status === "partial") return itemDetailText(copy, "历史获取途径和当前获取状态分开显示；“暂未发现入口”不代表永久无法获得。");
  return itemDetailText(copy, "当前数据不足，暂时无法确认获取方式；不会回退显示已经过期的商人库存。");
}

function catalystStateLabel(copy: ItemDetailCopy, model: WeaponDetailViewModel): string {
  const catalyst = model.upgrades.catalyst;
  if (!catalyst) return "";
  if (catalyst.complete) return itemDetailText(copy, "已完成并生效");
  if (catalyst.acquired === true) return catalyst.progress !== undefined ? itemDetailTemplate(copy, "进行中 · {value}%", { value: catalyst.progress }) : itemDetailText(copy, "已获得 · 进度未返回");
  if (catalyst.acquired === false) return itemDetailText(copy, "尚未获得");
  return itemDetailText(copy, "仅显示催化剂定义");
}

function configurationKindLabel(copy: ItemDetailCopy, kind: WeaponDetailViewModel["configuration"]["kind"]) {
  if (kind === "fixed") return itemDetailText(copy, "固定 Perk");
  if (kind === "variable_exotic") return itemDetailText(copy, "可变异域配置");
  return itemDetailText(copy, "随机 Roll");
}

function countPool(columns: readonly WeaponPerkPoolColumn[]) {
  return columns.reduce((total, column) => total + column.candidates.length, 0);
}

function formatUpdatedAt(value: string): string {
  return formatStandardDateTime(value);
}

function recommendationSourceCandidates(
  copy: ItemDetailCopy,
  model: WeaponDetailViewModel,
  slot: RecommendationSourceSlotMatch
): RecommendationPerkVisual[] {
  const candidates = new Map<string, RecommendationPerkVisual>();
  const addCandidate = (candidate: Omit<RecommendationPerkVisual, "key">) => {
    const normalizedName = normalizedLabel(candidate.name);
    const key = normalizedName ? `name:${normalizedName}` : `hash:${candidate.hash ?? "unknown"}`;
    const existing = candidates.get(key);
    const hashes = [...new Set([
      ...(existing?.hashes ?? []),
      existing?.hash,
      ...(candidate.hashes ?? []),
      candidate.hash
    ].filter((hash): hash is number => Boolean(hash)))];
    candidates.set(key, {
      key,
      hash: candidate.hash ?? existing?.hash,
      hashes,
      name: candidate.name || existing?.name || itemDetailText(copy, "未知 Perk"),
      englishName: candidate.englishName ?? existing?.englishName,
      description: candidate.description ?? existing?.description,
      icon: candidate.icon ?? existing?.icon,
      selected: candidate.selected ?? existing?.selected,
      unresolved: existing?.unresolved === false || candidate.unresolved === false
        ? false
        : candidate.unresolved ?? existing?.unresolved
    });
  };

  for (const candidate of slot.source_candidates) {
    const visual = findWeaponPerkVisual(model, candidate.hash, candidate.name);
    addCandidate({
      hash: candidate.hash,
      name: candidate.name,
      englishName: candidate.englishName,
      description: candidate.description ?? visual?.description,
      icon: candidate.icon ?? visual?.icon,
      unresolved: false
    });
  }
  for (const name of slot.source_candidate_names) {
    if ([...candidates.values()].some((candidate) => sameLabel(candidate.name, name))) continue;
    const visual = findWeaponPerkVisual(model, undefined, name);
    addCandidate({
      hash: visual?.hash,
      name: visual?.name ?? name,
      description: visual?.description,
      icon: visual?.icon,
      unresolved: !visual
    });
  }
  return [...candidates.values()];
}

function recommendationOwnedPerk(
  model: WeaponDetailViewModel,
  plug: RecommendationSourceSlotMatch["instance_owned"][number]
): RecommendationPerkVisual {
  const visual = findWeaponPerkVisual(model, plug.hash, plug.name);
  return {
    key: `owned:${plug.hash || normalizedLabel(plug.name)}`,
    hash: plug.hash,
    name: visual?.name ?? plug.name,
    description: plug.description ?? visual?.description,
    icon: plug.icon ?? visual?.icon,
    // 「当前启用」由 `current_enabled` 匹配判定（见上面的 `active`），不再从副本布尔取（T79）。
    selected: false
  };
}

function recommendationPerkMatches(
  model: WeaponDetailViewModel,
  candidate: Pick<RecommendationPerkVisual, "hash" | "hashes" | "name">,
  values: ReadonlyArray<{ hash?: number; hashes?: number[]; name: string }>
): boolean {
  const candidateHashes = recommendationPerkIdentityHashes(model, candidate);
  return values.some((value) => {
    const valueHashes = recommendationPerkIdentityHashes(model, value);
    return valueHashes.some((hash) => candidateHashes.includes(hash))
      || sameRecommendationPerkLabel(candidate.name, value.name);
  });
}

function sameRecommendationPerkLabel(left?: string, right?: string): boolean {
  if (sameLabel(left, right)) return true;
  const normalizedLeft = normalizedLabel(stripMasterworkDisplayPrefix(left));
  return Boolean(normalizedLeft)
    && normalizedLeft === normalizedLabel(stripMasterworkDisplayPrefix(right));
}

function stripMasterworkDisplayPrefix(value?: string): string {
  return (value ?? "")
    .replace(/^\s*\d+\s*阶\s*[：:]\s*/u, "")
    .replace(/^\s*大师杰作\s*[：:]\s*/u, "")
    .trim();
}

function recommendationPerkIdentityHashes(
  model: WeaponDetailViewModel,
  candidate: { hash?: number; hashes?: number[]; name: string }
): number[] {
  const visual = findWeaponPerkVisual(model, candidate.hash, candidate.name);
  return [...new Set([
    ...(candidate.hashes ?? []),
    candidate.hash,
    visual?.hash,
    visual?.enhanced_of_hash
  ].filter((hash): hash is number => Boolean(hash)))];
}

function findWeaponPerkVisual(
  model: WeaponDetailViewModel,
  hash: number | undefined,
  name: string | undefined
): WeaponPerkCandidate | undefined {
  const candidates = allWeaponPerkCandidates(model);
  return candidates.find((candidate) => Boolean(hash && candidate.hash === hash))
    ?? candidates.find((candidate) => sameLabel(candidate.name, name));
}

function allWeaponPerkCandidates(model: WeaponDetailViewModel): WeaponPerkCandidate[] {
  return [
    ...(model.configuration.intrinsic ? [model.configuration.intrinsic] : []),
    ...model.configuration.selection_columns.flatMap((column) => column.candidates),
    ...model.configuration.pool_columns.flatMap((column) => column.candidates)
  ];
}

function normalizedLabel(value?: string): string {
  return (value ?? "").trim().toLocaleLowerCase();
}

function sameLabel(left?: string, right?: string): boolean {
  const normalizedLeft = normalizedLabel(left);
  return Boolean(normalizedLeft) && normalizedLeft === normalizedLabel(right);
}
