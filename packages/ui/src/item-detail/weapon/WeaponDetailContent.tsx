import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { GameAssetImage } from "../../media/GameAssetImage.js";
import { WeaponPerkEntry, WeaponPerkPlaceholder } from "./WeaponPerkEntry.js";
import { GameCombatIcon } from "../../media/GameCombatIcon.js";
import { formatStandardDateTime } from "../../time/formatTime.js";
import { EquipmentDetailContextLedger } from "../EquipmentDetailContextLedger.js";
import type {
  WeaponDetailViewModel,
  WeaponPerkCandidate,
  WeaponPerkColumnRole,
  WeaponPerkPoolColumn,
  WeaponPerkSelectionColumn,
  WeaponRecommendation,
  WeaponRecommendationPerkCandidate,
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
      <WeaponIdentity model={model} onSelectVersion={props.actions?.selectVersion} />

      <nav className="weapon-detail-nav" data-ui-kind="section-navigation" aria-label="武器详情章节">
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
              {item.key === "recommendations" && model.context.kind === "definition" ? "推荐资料" : item.label}
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
        >武器操作</button>
      </nav>

      <div className="weapon-detail-workspace" data-surface="split">
        <div className="weapon-detail-sections" data-surface="content-stack">
          {/* 三段顺序（T71）：推荐 Roll → 本件 Roll → 完整掉落池。推荐区在首屏最上方，始终挂载。 */}
          <section ref={(node) => { sectionRefs.current.recommendations = node; }} id={`${sectionIdPrefix}-recommendations`} className="weapon-detail-section weapon-detail-recommendation-section">
            <RecommendationSection
              model={model}
              evidence={props.recommendationEvidence}
              actions={props.actions}
              configurationWriteFeedback={props.configurationWriteFeedback}
            />
          </section>
          <section ref={(node) => { sectionRefs.current.configuration = node; }} id={`${sectionIdPrefix}-configuration`} className="weapon-detail-section">
            <ConfigurationSection
              model={model}
              actions={props.actions}
              configurationWriteFeedback={props.configurationWriteFeedback}
            />
          </section>
          <FullPoolSection
            model={model}
            poolOpen={poolOpen}
            canLoadFullRoll={Boolean(props.actions?.loadConfiguration)}
            onRequestFullRoll={() => { setPoolRequested(true); void props.actions?.loadConfiguration?.(); }}
            onTogglePool={() => setPoolOpen((value) => !value)}
          />
          <section ref={(node) => { sectionRefs.current.overview = node; }} id={`${sectionIdPrefix}-overview`} className="weapon-detail-section">
            {mountedSections.has("overview")
              ? <OverviewSection model={model} onOpenSource={props.actions?.openSource} />
              : <DeferredWeaponSection label="属性与获取" />}
          </section>
          <section ref={(node) => { sectionRefs.current.upgrades = node; }} id={`${sectionIdPrefix}-upgrades`} className="weapon-detail-section">
            {mountedSections.has("upgrades")
              ? <UpgradeSection model={model} />
              : <DeferredWeaponSection label="升级与锻造" />}
          </section>
          {/* 正文最后一个子元素：待提交面板吸在正文底部，推荐区里选完就能直接提交（T73）。 */}
          <WeaponWriteDock
            model={model}
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
          aria-label="当前武器操作"
          onKeyDown={handleInstanceRailKeyDown}
        >
          <header className="weapon-detail-rail-drawer-head">
            <div><span>武器操作</span><strong>当前装备</strong></div>
            <button
              ref={instanceRailCloseRef}
              type="button"
              className="weapon-detail-rail-close"
              data-ui-kind="button"
              data-control-variant="quiet"
              aria-label="关闭武器操作"
              title="关闭"
              onClick={() => setInstanceRailOpen(false)}
            >×</button>
          </header>
          {props.instanceActions ? (
            <div className="weapon-detail-instance-actions">{props.instanceActions}</div>
          ) : (
            <div className="weapon-detail-instance-readonly">
              <h3>当前内容仅供查看</h3>
              <p>资料库定义和商人售卖内容没有可执行的实例操作。</p>
            </div>
          )}
        </aside>
      </div>
      <button
        type="button"
        className={["weapon-detail-rail-scrim", instanceRailOpen && "is-open"].filter(Boolean).join(" ")}
        data-ui-kind="button"
        data-control-variant="quiet"
        aria-label="关闭武器操作"
        onClick={() => setInstanceRailOpen(false)}
      />
    </article>
  );
}

function DeferredWeaponSection(props: { label: string }) {
  return (
    <div className="weapon-detail-deferred-section" role="status" aria-label={`${props.label}将在接近视口时载入`}>
      <span aria-hidden="true" />
      <span aria-hidden="true" />
    </div>
  );
}

function WeaponIdentity(props: {
  model: WeaponDetailViewModel;
  onSelectVersion?: (hash: number) => void;
}) {
  const { identity, context, versions } = props.model;
  const currentDefinition = versions.find((version) => version.is_current) ?? versions[0];
  const releaseLabel = identity.release?.description ?? "官方发布版本未标注";
  const definitionVersionLabel = identity.definition_version?.label ?? "定义版本资料未返回";
  const watermarks = identity.definition_version?.watermark_icons ?? [];
  const locationLabel = context.kind === "account_instance"
    ? context.location_label ?? context.entry_label
    : context.kind === "vendor_offer"
      ? "商人当前售卖"
      : "资料库";
  const canSelectDefinitionVersion = context.kind === "definition" && versions.length > 1 && Boolean(props.onSelectVersion);
  const versionLabel = context.kind === "account_instance"
    ? "装备版本"
    : context.kind === "vendor_offer"
      ? "售卖版本"
      : "发布版本";
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
          <div className="weapon-detail-facts" aria-label="武器摘要">
            {identity.tier ? <Fact label={identity.tier} tone={identity.is_exotic ? "rarity-exotic" : "rarity"} /> : null}
            {identity.slot ? <Fact label={identity.slot} tone="slot" /> : null}
            {identity.ammo ? <Fact label={identity.ammo.label} iconKind="ammo" iconType={identity.ammo.key} tone={`ammo-${identity.ammo.key}`} /> : null}
            {identity.damage ? <Fact label={identity.damage.label} icon={identity.damage.icon} iconKind="damage" iconType={identity.damage.key} title={identity.damage.description} tone={`damage-${identity.damage.key}`} /> : null}
            {identity.champion ? (
              <Fact
                label={identity.champion.label}
                icon={identity.champion.icon}
                iconKind="champion"
                iconType={identity.champion.key}
                title={`${identity.champion.label}：${identity.champion.effect_label}。${identity.champion.description ?? ""}`}
                tone={`champion-${identity.champion.key}`}
              />
            ) : null}
            {identity.crafting ? <Fact label={identity.crafting.label} tone={`crafting-${identity.crafting.kind}`} /> : null}
          </div>
        </div>
      </div>

      <div className="weapon-detail-identity-context">
        <EquipmentDetailContextLedger
          entryLabel={context.entry_label}
          currentViewLabel={weaponObjectLabel(context.kind)}
          locationLabel={locationLabel}
          locationFieldLabel="所在位置"
          slotLabel={identity.slot ?? identity.item_type ?? "武器"}
          slotFieldLabel="武器槽位"
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
          <summary>武器定义信息</summary>
          <div>
            <dl><dt>官方描述</dt><dd>{identity.description || "当前资料库未返回描述"}</dd></dl>
            <dl><dt>发布版本</dt><dd>{releaseLabel}</dd></dl>
            <dl><dt>发布类型</dt><dd>{releaseKindLabel(identity.release?.kind)}</dd></dl>
            <dl><dt>定义版本</dt><dd>{definitionVersionLabel}</dd></dl>
            <dl><dt>光等上限编号</dt><dd>{identity.definition_version?.power_cap_hash ?? "资料未返回"}</dd></dl>
            <dl><dt>版本水印</dt><dd>{watermarks.length ? <span className="weapon-detail-definition-watermarks">{watermarks.map((icon, index) => <GameAssetImage key={`${icon}:${index}`} src={icon} alt={`官方版本水印 ${index + 1}`} title="官方定义版本水印" loading="lazy" />)}</span> : "资料未返回"}</dd></dl>
            <dl><dt>装备编号</dt><dd>{identity.hash}</dd></dl>
            <dl><dt>数据来源</dt><dd>资料库定义{context.kind === "account_instance" ? " + 当前装备" : context.kind === "vendor_offer" ? " + 商人当前售卖" : ""}</dd></dl>
            <dl><dt>操作方式</dt><dd>{context.read_only ? "只读查看" : "可管理装备"}</dd></dl>
          </div>
        </details>
      </div>
    </header>
  );
}

function weaponObjectLabel(kind: WeaponDetailViewModel["context"]["kind"]): string {
  if (kind === "account_instance") return "这件武器";
  if (kind === "vendor_offer") return "本次售卖";
  return "资料库武器";
}

function releaseKindLabel(kind: ItemReleaseKind | undefined): string {
  if (kind === "season") return "赛季";
  if (kind === "annual") return "年度资料片";
  if (kind === "dlc") return "内容包";
  if (kind === "core") return "常规版本";
  if (kind === "update") return "版本更新";
  return "官方未标注";
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
  onOpenSource?: (source: WeaponSourceEntry) => void;
}) {
  const preferCurrentValues = props.model.context.kind !== "definition"
    && props.model.stats.some((stat) => stat.current_value !== undefined);
  const statSource = preferCurrentValues
    ? props.model.context.kind === "vendor_offer" ? "当前售卖数值" : "当前数值"
    : "资料库数值";
  return (
    <>
      <SectionHeading eyebrow="属性与获取" title="武器数值与获取方式" description="属性只保留当前可用数值；获取入口区分当前状态与历史记录。" />
      <div className="weapon-detail-overview-grid">
        <section className="weapon-detail-block" aria-labelledby="weapon-stat-title">
          <DataBlockHeading
            id="weapon-stat-title"
            title="武器属性"
            source={`${statSource} · ${props.model.stats.length} 项`}
          />
          {props.model.stats.length ? (
            <dl className="weapon-detail-stats">
              {props.model.stats.map((stat) => (
                <StatValue
                  key={stat.key}
                  stat={stat}
                  preferCurrent={preferCurrentValues}
                />
              ))}
            </dl>
          ) : <EmptyState text="当前定义没有可显示的武器属性。" />}
        </section>
        <section className="weapon-detail-block" aria-labelledby="weapon-source-title">
          <DataBlockHeading
            id="weapon-source-title"
            title="获取方式"
            source={`依据：游戏官方资料与当前商人、活动数据${props.model.sources.updated_at ? ` · ${formatUpdatedAt(props.model.sources.updated_at)}` : ""}`}
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
                    <strong data-ui-part="value" data-text-tone="primary" data-info-priority="context">{source.label}</strong>
                  </div>
                  <div className="weapon-detail-source-copy">
                    <p data-ui-part="detail" data-text-tone="body" data-info-priority="reading">{source.description}</p>
                    {source.offer?.purchase_requirements?.length ? <small>{source.offer.purchase_requirements.join(" / ")}</small> : null}
                    {source.offer?.can_purchase === false ? <small data-text-tone="status" data-status="warning">{source.offer.failure_messages.join(" / ") || "当前条件未满足，游戏没有返回具体限制。"}</small> : null}
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
                      {sourceEntryStatusLabel(source)}
                    </span>
                    {source.offer?.inventory_path ? <span>{source.offer.inventory_path}</span> : null}
                    {source.offer?.price_labels.length ? <span>{source.offer.price_labels.join(" + ")}</span> : null}
                    {source.offer?.refresh_at ? <span>{formatStandardDateTime(source.offer.refresh_at)}</span> : null}
                    {source.updated_at ? <span>更新于 {formatUpdatedAt(source.updated_at)}</span> : null}
                    {props.onOpenSource ? <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => props.onOpenSource?.(source)}>查看</button> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : <EmptyState text="暂时没有足够数据确认这件武器的获取方式。" />}
          <p className="weapon-detail-data-note" data-ui-kind="callout" data-callout-tone="info">{sourceStatusDescription(props.model.sources.status)}</p>
        </section>
      </div>
    </>
  );
}

function StatValue(props: {
  stat: WeaponStatTrack;
  preferCurrent: boolean;
}) {
  const { stat } = props;
  const primaryValue = props.preferCurrent
    ? stat.current_value ?? stat.standard_value
    : stat.standard_value ?? stat.current_value;
  const pendingValue = stat.pending_delta ? stat.pending_value : undefined;
  const value = pendingValue !== undefined && pendingValue !== primaryValue
    ? `${primaryValue ?? "—"} → ${pendingValue}`
    : primaryValue ?? "—";
  return (
    <div className="weapon-detail-stat-row" data-pending={pendingValue !== undefined ? "true" : undefined}>
      <dt>{stat.label}</dt>
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
  const loadingCopy = configurationLoadingCopy(context.kind, isDefinitionLoading, isInstanceLoading);
  const title = isConfigurationLoading && !hasConfigurationData
    ? loadingCopy.title
    : isFixedExotic
    ? "固定配置"
    : context.kind === "definition"
      ? isVariableExotic ? "异域配置候选" : "完整 Perk 池"
      : context.kind === "vendor_offer"
        ? "当前售卖 Roll"
        : "本件 Roll";
  const description = isConfigurationPending
    ? loadingCopy.description
    : isFixedExotic
    ? "固有能力与其余固定 Perk 使用同一配置网格，不提供随机池筛选、推荐 Roll 命中或远程切换。"
    : isVariableExotic
      ? context.kind === "account_instance"
        ? "只展示这件武器真实拥有的异域配置选项；可写项以游戏返回的插槽状态为准。"
        : "展示当前异域定义或商人售卖可确认的配置，不把它称为普通传说武器掉落池。"
      : context.kind === "account_instance"
        ? "只允许切换这件武器真实拥有且可应用的 Perk。"
        : "当前查看内容为只读，不提供远程配置操作。";
  const operationLabel = canWriteConfiguration
    ? "可远程切换 · 需要联网"
    : props.actions?.loadConfiguration
      ? "当前 Roll 已显示 · 完整配置按需读取"
    : context.kind === "account_instance" && configuration.kind === "fixed"
      ? "固定配置 · 只读"
      : "只读";
  return (
    <>
      <SectionHeading
        eyebrow="当前配置"
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
            ? <PerkColumn label="固有能力" role="intrinsic" contextLabel="固有能力" candidates={[configuration.intrinsic]} emphasis="selected" />
            : isConfigurationPending
              ? <ConfigurationLoadingColumn label="固有能力" />
              : <IntrinsicEmptyColumn failed={definitionRequestState === "failed"} />}
          {columns.map((column) => (
            <PerkColumn
              key={column.key}
              label={column.label}
              role={column.role}
              contextLabel="当前配置"
              emphasis="selected"
              candidates={column.candidates}
              interactive={showSelection && canWriteConfiguration && !isBusy}
              onSelect={(perk) => props.actions?.stagePerk?.(column as WeaponPerkSelectionColumn, perk)}
            />
          ))}
          {isConfigurationPending && columns.length === 0 ? <ConfigurationLoadingColumn /> : null}
        </div>
      ) : isConfigurationPending ? (
        <ConfigurationLoadingGrid />
      ) : (
        <EmptyState text={configurationEmptyText(context.kind)} />
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
  const panelContent = configurationPanelContent(panelState, pendingChangeCount, writeFeedback.message);
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
              <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.actions?.cancelPendingPerks}>取消选择</button>
              <button type="button" data-ui-kind="button" data-control-variant="primary" disabled={!configuration.can_apply_changes} onClick={() => void props.actions?.applyPendingPerks?.()}>应用 {pendingChangeCount} 项更改</button>
            </>
          ) : null}
          {panelState === "error" ? (
            <>
              <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.actions?.cancelPendingPerks}>取消选择</button>
              <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => void props.actions?.refreshConfiguration?.()}>重新读取</button>
              <button type="button" data-ui-kind="button" data-control-variant="primary" disabled={!configuration.can_apply_changes} onClick={() => void props.actions?.applyPendingPerks?.()}>保留选择重试</button>
            </>
          ) : null}
          {panelState === "deferred" ? (
            <>
              <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.actions?.cancelPendingPerks}>取消选择</button>
              <button type="button" data-ui-kind="button" data-control-variant="primary" onClick={() => void props.actions?.refreshConfiguration?.()}>重新读取配置</button>
              <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={!configuration.can_apply_changes} onClick={() => void props.actions?.applyPendingPerks?.()}>保留选择重试</button>
            </>
          ) : null}
          {isBusy ? <span className="weapon-detail-write-busy-label">处理中</span> : null}
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
            <strong>{props.poolOpen ? "收起完整掉落池" : "查看完整掉落池"}</strong>
            <span>{props.poolOpen ? "收起" : configuration.pool_columns.length ? `展开 ${countPool(configuration.pool_columns)} 个候选` : "读取全部候选"}</span>
          </button>
          {props.poolOpen ? (
            <><div className="weapon-detail-pool-grid">
              {configuration.pool_columns.map((column) => <PerkColumn key={column.key} label={column.label} role={column.role} contextLabel="完整掉落池" candidates={column.candidates} emphasis="selected" />)}
            </div><p className="weapon-detail-note">这里只展示可能掉落的候选，不标记当前已选状态；这件武器未拥有的 Perk 不能远程安装。</p></>
          ) : null}
        </section>
      ) : null}
      {showExoticPool ? (
        <section className="weapon-detail-full-pool">
          <button type="button" data-ui-kind="button" data-control-variant="secondary" aria-expanded={props.poolOpen} onClick={() => props.onTogglePool?.()}>
            <strong>{props.poolOpen ? "收起异域配置候选" : "查看异域配置候选"}</strong>
            <span>{props.poolOpen ? "收起" : `展开 ${countPool(configuration.pool_columns)} 个候选`}</span>
          </button>
          {props.poolOpen ? (
            <><div className="weapon-detail-pool-grid">
              {configuration.pool_columns.map((column) => <PerkColumn key={column.key} label={column.label} role={column.role} contextLabel="异域配置候选" candidates={column.candidates} emphasis="selected" />)}
            </div><p className="weapon-detail-note">这些是当前资料库可确认的特殊异域随机配置候选，不代表这件武器已经拥有，也不属于普通传说武器掉落池。</p></>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}

function configurationSummaryItems(
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
      { label: "当前查看", value: "这件武器" },
      { label: "本件 Roll", value: currentRoll.join(" / ") || (isInstanceLoading ? "正在读取" : "当前配置未返回") },
      { label: "可切换", value: switchableColumns ? `${switchableColumns} 个插槽` : isInstanceLoading ? "正在核对" : canLoadConfiguration ? "展开后核对" : "没有可远程切换项" },
      { label: "配置状态", value: pendingChangeCount ? `${pendingChangeCount} 项待应用` : isDefinitionLoading || isInstanceLoading ? "读取中" : operationLabel }
    ];
  }

  if (model.context.kind === "vendor_offer") {
    return [
      { label: "当前查看", value: "当前售卖" },
      { label: "售卖 Roll", value: currentRoll.join(" / ") || (isDefinitionLoading ? "正在读取" : "售卖配置未返回") },
      { label: "配置类型", value: isDefinitionLoading && !currentRoll.length ? "正在判断" : configurationKindLabel(model.configuration.kind) },
      { label: "操作状态", value: isDefinitionLoading ? "读取中" : "购买前只读" }
    ];
  }

  return [
    { label: "当前查看", value: "资料库版本" },
    { label: "配置范围", value: candidateCount ? `${model.configuration.pool_columns.length} 个插槽 · ${candidateCount} 个候选` : isDefinitionLoading ? "正在读取" : "配置候选未返回" },
    { label: "配置类型", value: isDefinitionLoading && !candidateCount ? "正在判断" : configurationKindLabel(model.configuration.kind) },
    { label: "操作状态", value: isDefinitionLoading ? "读取中" : "只读查看" }
  ];
}

function configurationLoadingCopy(
  kind: WeaponDetailViewModel["context"]["kind"],
  isDefinitionLoading: boolean,
  isInstanceLoading: boolean
): { title: string; description: string; status: string } {
  if (kind === "account_instance") {
    if (isDefinitionLoading && isInstanceLoading) {
      return {
        title: "本件 Roll",
        description: "正在读取这件武器的当前选择、可切换项和完整 Perk 信息。",
        status: "正在读取本件 Roll 和可切换项；已确认内容会先显示，其余内容随后补齐。"
      };
    }
    if (isInstanceLoading) {
      return {
        title: "本件 Roll",
        description: "完整 Perk 池已经可用，正在核对这件武器实际拥有的配置。",
        status: "正在读取本件 Roll；完整掉落池只表示可能候选，不代表这件武器已经拥有。"
      };
    }
    return {
      title: "本件 Roll",
      description: "这件武器的当前选择已经可用，正在补齐资料库 Perk 信息。",
      status: "本件 Roll 已读取，正在补齐 Perk 名称、说明和完整候选。"
    };
  }
  if (kind === "vendor_offer") {
    return {
      title: "当前售卖 Roll",
      description: "正在读取商人本次售卖配置和对应的 Perk 信息。",
      status: "正在读取当前售卖 Roll；完成前不会用完整掉落池代替本次售卖配置。"
    };
  }
  return {
    title: "Perk 配置",
    description: "正在读取这个版本的完整 Perk 池。",
    status: "正在读取这个版本的固有能力和完整 Perk 池。"
  };
}

function configurationEmptyText(kind: WeaponDetailViewModel["context"]["kind"]): string {
  if (kind === "account_instance") return "读取完成，但游戏没有返回这件武器的可显示配置。";
  if (kind === "vendor_offer") return "读取完成，但当前售卖内容没有返回可显示的 Roll。";
  return "读取完成，但资料库没有返回这个版本的 Perk 配置。";
}

function ConfigurationLoadingGrid() {
  return (
    <div className="weapon-detail-config-grid is-loading" aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => <ConfigurationLoadingColumn key={index} />)}
    </div>
  );
}

function ConfigurationLoadingColumn(props: { label?: string }) {
  return (
    // 用真列的外壳与真表头，只有内容位置画骨架：列高、表头高、卡片几何都和真列逐像素相同。
    <section className="weapon-detail-perk-column weapon-detail-perk-column-loading" aria-hidden="true">
      <h4>{props.label ?? <span />}</h4>
      <div>
        <WeaponPerkPlaceholder variant="loading" />
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
function IntrinsicEmptyColumn(props: { failed?: boolean }) {
  return (
    <section className="weapon-detail-perk-column role-intrinsic">
      <h4>固有能力</h4>
      <div>
        <WeaponPerkPlaceholder
          variant="empty"
          text={props.failed ? "固有能力未能读取" : "未返回固有能力"}
        />
      </div>
    </section>
  );
}

function configurationPanelContent(
  state: WeaponConfigurationWriteFeedback["status"] | "pending",
  pendingChangeCount: number,
  message?: string
): { title: string; step: string; message: string } {
  switch (state) {
    case "pending":
      return {
        title: `已选择 ${pendingChangeCount} 项更改`,
        step: "待提交",
        message: "确认后才会写入游戏；写入成功前，当前配置保持不变。"
      };
    case "submitting":
      return { title: "正在提交武器配置", step: "提交中", message: message ?? "正在将 Perk 更改提交到游戏服务..." };
    case "refreshing":
      return { title: "正在同步最新配置", step: "同步中", message: message ?? "正在读取游戏返回的最新装备状态..." };
    case "submitted":
      return {
        title: "武器配置更改已提交",
        step: "待核对",
        message: message ?? "当前显示的是本地状态；账号同步后以服务器为准。"
      };
    case "reloaded":
      return {
        title: "已读取服务器当前配置",
        step: "已读取",
        message: message ?? "显示的是刚刚从服务器读到的内容。"
      };
    case "deferred":
      return {
        title: "这件装备还有变更在处理中",
        step: "待重试",
        message: message ?? "Bungie 还没有处理完上一次更改，这次没有提交。稍后重新读取配置再试。"
      };
    case "error":
      return { title: "武器配置未更新", step: "需要处理", message: message ?? "提交失败。你可以保留选择重试。" };
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
const perkStatusWord = {
  hitActive: "符合 · 当前",
  hit: "符合",
  missed: "未拥有",
  active: "当前启用",
  notRequired: "来源未要求",
  uncheckable: "无法判断",
  pending: "待应用"
} as const;

function PerkColumn(props: {
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
            ? selection.pending ? perkStatusWord.pending : selection.selected ? perkStatusWord.active : selection.can_apply ? "本件拥有 · 可切换" : "本件拥有"
            : undefined;
          const statusLabel = [stateLabel, perk.enhanced_of_hash ? "强化版本" : undefined].filter(Boolean).join(" · ");
          const statusDetail = selection
            ? selection.pending ? "本件拥有，已选中，等待写入" : selection.selected ? "本件拥有，当前启用" : selection.can_apply ? "本件拥有，可以切换成它" : "本件拥有"
            : perk.enhanced_of_hash ? "强化版本" : "";
          return (
            <WeaponPerkEntry
              key={perk.hash}
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
        }) : <EmptyState text="此列没有返回候选。" />}
      </div>
    </section>
  );
}

/**
 * 推荐 Roll 区只有一条路径：**渲染推荐来源**。
 *
 * 这里原来有 `攻略推荐 / 我的推荐` 两个页签，把推荐事实按来源身份劈成两栏。但「所有来源同级、
 * 不按来源类型排权重」是已定口径——来源的身份是用户给它起的名字，不是它的格式或出身，页签本身
 * 就是那个被拆掉的分叉。现在：账号实例渲染事实层的来源事实（每条来源一张卡片），定义与商人没有
 * 实例事实可核对，渲染来源规则本身。两种都不按来源类型分叉。
 */
function RecommendationSection(props: {
  model: WeaponDetailViewModel;
  evidence?: WeaponDetailContentProps["recommendationEvidence"];
  actions?: WeaponDetailContentProps["actions"];
  configurationWriteFeedback?: WeaponDetailContentProps["configurationWriteFeedback"];
}) {
  const { model } = props;
  const isFixedExotic = model.identity.is_exotic && model.configuration.kind === "fixed";
  const isDefinition = model.context.kind === "definition";
  const panelId = useId();
  // 推荐区换 Perk（T73）：可远程切换时，本件拥有条目在浮层里「选择 / 取消选择」，与本件 Roll 同一批提交。
  // 写入进行中的那一刻不开新入口（与本件 Roll 的格子同一条闸门）。
  const stagePerk = props.actions?.stagePerk;
  const canStagePerks = Boolean(stagePerk)
    && (props.configurationWriteFeedback?.status ?? "idle") === "idle"
    && canStageWeaponPerks(model);
  const evidence = model.context.kind === "account_instance" ? props.evidence : undefined;
  const sourceMatches = evidence
    ? evidence.sourceMatches.slice().sort((left, right) => (
        recommendationMatchRank(right) - recommendationMatchRank(left)
        || recommendationSourceLabel(left.source_id, left.source_label).localeCompare(
          recommendationSourceLabel(right.source_id, right.source_label),
          "zh-Hans-CN"
        )
      ))
    : [];
  const targets = model.recommendations;
  return (
    <>
      <SectionHeading
        eyebrow={isDefinition ? "推荐资料" : "推荐判断"}
        title={isDefinition ? "这把武器的来源推荐" : "这件武器的推荐 Roll"}
        description={isDefinition
          ? "按数据源原始形式展示：完整组合保持组合，分栏候选保持 Perk 池；这里不进行玩家 Roll 命中核对。"
          : isFixedExotic
            ? "固定异域不进行随机 Roll 核对；推荐来源只保留拥有状态、催化剂进度与使用建议。"
            : "先看各来源的核心 Perk 与完整匹配，再按需展开逐栏依据；所有来源同级，按符合程度排序。"}
      />
      {evidence ? (
        sourceMatches.length ? (
          <div
            id={`${panelId}-panel`}
            className="weapon-detail-recommendations"
            aria-busy={evidence.status === "loading"}
          >
            {evidence.message ? <p className={`status-message status-${evidence.status === "error" ? "error" : evidence.status === "partial" ? "warning" : "pending"}`} role="status">{evidence.message}</p> : null}
            {sourceMatches.map((sourceMatch) => (
              <RecommendationSourceEvidenceCard
                key={`${sourceMatch.source_id}:${sourceMatch.source_label}`}
                model={model}
                sourceMatch={sourceMatch}
                canStagePerks={canStagePerks}
                onStagePerk={stagePerk}
              />
            ))}
          </div>
        ) : <EmptyState text={isDefinition
          ? "这把武器暂时没有来源推荐资料。"
          : evidence.status === "loading" ? "正在读取这把武器的推荐 Roll。" : "这把武器暂时没有可核对的推荐 Roll。"} />
      ) : targets.length ? (
        <div id={`${panelId}-panel`} className="weapon-detail-recommendations">
          {targets.map((target) => <RecommendationCard key={target.id} model={model} recommendation={target} />)}
        </div>
      ) : <EmptyState text={isDefinition ? "这把武器暂时没有来源推荐资料。" : "这把武器暂时没有可核对的推荐 Roll。"} />}
    </>
  );
}

function RecommendationSourceEvidenceCard(props: {
  model: WeaponDetailViewModel;
  sourceMatch: RecommendationSourceMatch;
  canStagePerks: boolean;
  onStagePerk?: (column: WeaponPerkSelectionColumn, perk: WeaponPerkCandidate) => void;
}) {
  const source = props.sourceMatch;
  const [open, setOpen] = useState(false);
  const sourceLabel = recommendationSourceLabel(source.source_id, source.source_label);
  const presentation = presentCuratedRecommendationMatch(source, sourceLabel);
  const specifiedSlots = source.slots.filter((slot) => slot.state !== "source_not_specified");
  const unrequestedSlotLabels = source.slots
    .filter((slot) => slot.state === "source_not_specified")
    .map((slot) => slot.label);
  const metadata = [
    source.purposes.length ? `用途：${source.purposes.map(recommendationPurposeLabel).join(" / ")}` : undefined,
    source.rating ? `评级：${source.rating}` : undefined,
    source.ranking ? `排名：${source.ranking}` : undefined,
    source.page_updated_at ? `更新时间：${formatUpdatedAt(source.page_updated_at)}` : undefined
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
          <small>{metadata.join(" · ") || "来源没有提供额外元数据"}</small>
        </span>
        <span className="weapon-detail-source-score" role="group" aria-label={presentation.summary}>
          {presentation.requirementCount > 0 ? (
            <>
              <span data-score-kind="perk">
                <small>核心 Perk</small>
                <strong>{presentation.perkRequirementCount > 0
                  ? `${presentation.matchedPerkCount}/${presentation.perkRequirementCount}`
                  : "未要求"}</strong>
              </span>
              <span data-score-kind="complete">
                <small>完整匹配</small>
                <strong>{presentation.matchedRequirementCount}/{presentation.requirementCount}</strong>
              </span>
              {presentation.uncheckableRequirementCount > 0 ? (
                <span data-score-kind="pending">
                  <small>无法判断</small>
                  <strong>{presentation.uncheckableRequirementCount} 项</strong>
                </span>
              ) : null}
            </>
          ) : (
            <span data-score-kind="weapon-only">
              <small>推荐范围</small>
              <strong>仅推荐武器</strong>
              <em>未指定 Roll</em>
            </span>
          )}
        </span>
      </summary>
      {open ? (
        <div className="weapon-detail-source-evidence-body">
          {source.note ? <p className="weapon-detail-source-quote" data-ui-kind="callout" data-callout-tone="info">{source.note}</p> : null}
          <div className="weapon-detail-source-trace">
            {source.source_location ? <span>原表位置：{source.source_location}</span> : null}
            {source.source_url
              ? <a href={source.source_url} target="_blank" rel="noreferrer">查看原始来源</a>
              : <span>原始链接未提供</span>}
          </div>
          {source.state === "weapon_only" || !specifiedSlots.length ? (
            <p className="weapon-detail-match-empty">该来源推荐这把武器，但没有指定需要核对的枪管、第二列、大师、Perk 或起源特性，因此不作 Roll 对照。</p>
          ) : (
            <>
              <div className="weapon-detail-source-slot-list" aria-label={`${sourceLabel}推荐项核对`}>
                {/* 栏头（T72 方案 B）：逐行的「来源要求 / 本件拥有」收成这里一处，列模板与槽位行逐像素相同，
                    吸附在滚动口顶部；两半的图例也只在这里说一次。窄屏两半纵向堆叠时这一条隐去、
                    每个半区恢复自己的表头（媒体查询里切换）。两类表头任一时刻只有一类是可见的，
                    所以读屏也只会听到一次列名与图例，这里不额外 aria-hidden。 */}
                <div className="weapon-detail-source-slot-columns">
                  <span>栏位</span>
                  <span>来源要求<em>多候选满足其一即可</em></span>
                  <span>本件拥有<em>环＝当前启用，红环＝来源没要</em></span>
                </div>
                {specifiedSlots.map((slot) => (
                  <RecommendationSourceSlotRow
                    key={slot.slot}
                    model={props.model}
                    slot={slot}
                    canStagePerks={props.canStagePerks}
                    onStagePerk={props.onStagePerk}
                  />
                ))}
              </div>
              {unrequestedSlotLabels.length ? (
                <p className="weapon-detail-source-unrequested">
                  <strong>其他栏位未要求</strong>
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

// 来源卡与 DIM 候选池共用的「来源要求 ｜ 本件拥有」两列对照。
function RecommendationSlotComparison(props: {
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
    ? candidate.active ? perkStatusWord.hitActive : perkStatusWord.hit
    : state === "uncheckable" ? perkStatusWord.uncheckable : perkStatusWord.missed;
  const ownedStatus = (candidate: RecommendationPerkVisual) => candidate.hit
    ? candidate.active ? perkStatusWord.hitActive : perkStatusWord.hit
    : candidate.active ? perkStatusWord.active : perkStatusWord.notRequired;
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
          <header><span>来源要求</span>{sourceCandidates.length > 1 ? <small>满足其中一个即可</small> : null}</header>
          {sourceCandidates.length ? (
            <div className="weapon-detail-perk-entries" role="group" aria-label={`${label}来源要求`}>
              {sourceCandidates.map((candidate) => {
                const statusDetail = candidate.hit
                  ? candidate.active ? "本件已拥有，当前已启用" : "本件已拥有，当前未启用"
                  : state === "uncheckable" ? "当前无法确认本件是否拥有" : "本件没有这个推荐项";
                return (
                  <WeaponPerkEntry
                    key={candidate.key}
                    name={candidate.name}
                    englishName={candidate.englishName}
                    description={candidate.description}
                    icon={candidate.icon}
                    hit={candidate.hit === true}
                    selected={candidate.active === true}
                    muted={state === "match" && candidate.hit !== true}
                    unknown={candidate.unresolved}
                    contextLabel="来源推荐"
                    statusLabel={sourceStatus(candidate)}
                    statusDetail={statusDetail}
                    ariaLabel={recommendationPerkAriaLabel(candidate, "来源推荐", statusDetail)}
                  />
                );
              })}
            </div>
          ) : <p>{props.sourceCandidateFallback}</p>}
        </section>
        <section>
          <header><span>本件拥有</span><small>环＝当前启用，红环＝来源没要</small></header>
          {instanceOwned.length ? (
            <div className="weapon-detail-perk-entries" role="group" aria-label={`${label}本件拥有`}>
              {instanceOwned.map((candidate) => {
                const staged = candidate.pending === true;
                const statusDetail = staged
                  ? "本件拥有，已选中，等待写入"
                  : candidate.hit
                    ? candidate.active ? "符合来源要求，当前已启用" : "符合来源要求，当前未启用"
                    : candidate.active ? "当前已启用，但不在该来源候选中" : "本件拥有，但不在该来源候选中";
                return (
                  <WeaponPerkEntry
                    key={candidate.key}
                    name={candidate.name}
                    englishName={candidate.englishName}
                    description={candidate.description}
                    icon={candidate.icon}
                    hit={candidate.hit === true}
                    selected={candidate.active === true}
                    pending={staged}
                    // 「不符」栏的直接原因：本件当前装着它、而来源没要它（判定条件见 WeaponPerkEntry 的 mismatch）。
                    // 来源要求列不标——那一列在「不符」栏里每张卡都长这样，标了等于把这四个字重复 N 遍。
                    mismatch={state === "different" && candidate.hit !== true && candidate.active === true}
                    muted={state === "match" && candidate.hit !== true}
                    contextLabel="本件拥有"
                    statusLabel={staged ? perkStatusWord.pending : ownedStatus(candidate)}
                    statusDetail={statusDetail}
                    ariaLabel={recommendationPerkAriaLabel(candidate, "本件拥有", statusDetail)}
                    // 换 Perk 是批量的：这里只把这一项放进同一批待提交项，提交仍在同一处写面板（T73）。
                    action={candidate.onToggleSelect && (staged || candidate.canApply === true)
                      ? { label: staged ? "取消选择" : "选择", onActivate: candidate.onToggleSelect }
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
  slot: RecommendationSourceSlotMatch;
  /** 可远程切换（账号实例 + 非固定配置 + 写入空闲）时，本件拥有条目才能在浮层里选择 */
  canStagePerks: boolean;
  onStagePerk?: (column: WeaponPerkSelectionColumn, perk: WeaponPerkCandidate) => void;
}) {
  const { model, slot } = props;
  const sourceCandidates = recommendationSourceCandidates(model, slot);
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
      label={slot.label}
      state={slot.state}
      stateLabel={presentation.label}
      stateTone={presentation.tone}
      sourceCandidates={sourceCandidates.map((candidate) => ({
        ...candidate,
        hit: recommendationPerkMatches(model, candidate, slot.instance_owned),
        active: recommendationPerkMatches(model, candidate, slot.current_enabled)
      }))}
      sourceCandidateFallback={slot.state === "source_not_specified" ? "未指定" : "要求名称未返回"}
      instanceOwned={slot.instance_owned.map((plug) => {
        const visual = recommendationOwnedPerk(model, plug);
        const stage = stageSelection(plug);
        return {
          ...visual,
          hit: recommendationPerkMatches(model, visual, sourceCandidates),
          active: recommendationPerkMatches(model, visual, slot.current_enabled) || visual.selected === true,
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

function recommendationPurposeLabel(purpose: RecommendationSourceMatch["purposes"][number]): string {
  return purpose === "pve" ? "PVE" : purpose === "pvp" ? "PVP" : "通用";
}

function recommendationSourceLabel(sourceId: string, fallback: string): string {
  if (sourceId === "aegis") return "Aegis推荐";
  if (sourceId === "lgpig") return "LGpig推荐";
  if (sourceId === "yxcrallxy") return "YXCRALLXY推荐表";
  if (sourceId === "sayalarry") return "Sayalarry推荐表";
  return fallback || sourceId || "推荐来源";
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

function RecommendationCard(props: { model: WeaponDetailViewModel; recommendation: WeaponRecommendation }) {
  const { model, recommendation } = props;
  const isDefinition = model.context.kind === "definition";
  const hasObject = !isDefinition;
  // 有事实层结果时直接消费，界面不再自行比较插件 Hash 或名称。
  // 候选池里同一栏可能给出多个候选，只有事实层认定的那一个才算命中，其余是普通候选。
  const perkMatches = recommendation.perk_options.map((option) => {
    const fromFacts = option.requirement_state !== undefined;
    const factHit = (name: string, hashes: number[] | undefined): boolean => {
      if (option.requirement_state !== "match") return false;
      if (option.matched_hash !== undefined && hashes?.length) return hashes.includes(option.matched_hash);
      if (option.matched_name) return sameLabel(name, option.matched_name);
      return true;
    };
    const candidates = option.candidates?.length
      ? option.candidates.map((candidate) => {
        const visual = recommendationTargetPerk(model, option.column_key, candidate.name, candidate);
        if (!fromFacts) return visual;
        const hit = factHit(candidate.name, candidate.hashes?.length ? candidate.hashes : candidate.hash !== undefined ? [candidate.hash] : undefined);
        return { ...visual, hit, active: hit && option.matched_current === true };
      })
      : option.names.map((name): RecommendationPerkVisual => {
        if (!fromFacts) return recommendationTargetPerk(model, option.column_key, name);
        const hit = factHit(name, undefined);
        return { key: `${option.column_key}:${name}`, name, hit, active: hit && option.matched_current === true };
      });
    return {
      ...option,
      candidates,
      owned: hasObject && (fromFacts ? option.requirement_state === "match" : candidates.some((candidate) => candidate.hit)),
      active: hasObject && (fromFacts
        ? option.requirement_state === "match" && option.matched_current === true
        : candidates.some((candidate) => candidate.active))
    };
  });
  const masterworkMatch = hasObject && recommendation.masterwork_names.some((name) => sameLabel(name, model.upgrades.masterwork?.name));
  const modMatch = hasObject && recommendation.mod_names.some((name) => sameLabel(name, model.upgrades.mod?.name));
  const isFixedExotic = model.identity.is_exotic && model.configuration.kind === "fixed";
  const sourcePurposeLabel = (recommendation.purposes?.length ? recommendation.purposes : [recommendation.mode])
    .map((mode) => mode === "pve" ? "PVE" : mode === "pvp" ? "PVP" : "通用")
    .filter((mode, index, values) => values.indexOf(mode) === index)
    .join(" / ");
  const presentationLabel = recommendation.presentation === "perk_pool" ? "Perk 池" : "完整组合";
  return (
    <article className="weapon-detail-recommendation">
      <header>
        <div>
          <h4>{recommendation.title}</h4>
          <p>{recommendation.source_label} · {sourcePurposeLabel}{recommendation.updated_at ? ` · ${formatUpdatedAt(recommendation.updated_at)}` : ""}</p>
        </div>
        <div className="weapon-detail-recommendation-heading-status">
          {isDefinition ? (
            <span className="ui-badge status-neutral" data-ui-kind="status-chip">{presentationLabel}</span>
          ) : !isFixedExotic && perkMatches.length ? (
            <span className={`ui-badge ${recommendationMatchBadgeClass(recommendation.match)}`} data-ui-kind="status-chip">
              {recommendation.match === "full"
                ? "完整符合"
                : recommendation.match === "partial"
                  ? `${perkMatches.filter((option) => option.owned).length}/${perkMatches.length}`
                  : recommendation.match === "none" ? "不符" : recommendation.match === "uncheckable" ? "无法判断" : "不作核对"}
            </span>
          ) : null}
          {recommendation.external_url ? <a href={recommendation.external_url} target="_blank" rel="noreferrer">查看原始来源</a> : <span>本地数据</span>}
        </div>
      </header>
      {recommendation.reason ? <p className="weapon-detail-source-quote is-single-line" data-ui-kind="callout" data-callout-tone="info" title={recommendation.reason}>{recommendation.reason}</p> : null}
      {perkMatches.length ? (
        <div className="weapon-detail-recommendation-combo">
          {perkMatches.map((option) => recommendation.presentation === "perk_pool" ? (
            // 候选池：与人工来源证据卡用同一个「来源要求 ｜ 本件拥有」两列对照。
            <RecommendationSlotComparison
              key={option.column_key}
              label={option.column_key}
              state={isDefinition ? "source_not_specified" : option.requirement_state ?? (option.owned ? "match" : "different")}
              stateLabel={isDefinition ? "候选池" : option.requirement_state === "uncheckable" ? "无法判断" : option.owned ? "符合" : "不符"}
              stateTone={option.requirement_state === "uncheckable" ? "pending" : option.owned ? "success" : "error"}
              sourceCandidates={(option.candidates ?? []).map((candidate) => ({
                ...candidate,
                hit: hasObject && candidate.hit,
                active: hasObject && candidate.active
              }))}
              sourceCandidateFallback="要求名称未返回"
              instanceOwned={(option.instance_owned ?? []).map((plug) => {
                const visual = recommendationTargetPerk(model, option.column_key, plug.name);
                const inCandidates = option.names.some((name) => sameLabel(name, plug.name))
                  || (option.candidates ?? []).some((candidate) => candidate.hash === plug.hash);
                return { ...visual, hit: hasObject && inCandidates, active: hasObject && plug.current };
              })}
              instanceOwnedFallback={isDefinition ? "资料库对象没有账号实例" : "这件武器还没有这一栏的数据"}
            />
          ) : (
            <section key={option.column_key} data-match-state={isDefinition ? undefined : option.owned ? "match" : "different"}>
              <header>
                <strong>{option.column_key}</strong>
                <span>{isDefinition
                  ? "组合要求"
                  : option.requirement_state === "uncheckable" ? "无法判断" : option.owned ? "符合" : "不符"}</span>
              </header>
              <div className="weapon-detail-perk-entries" role="group" aria-label={`${option.column_key}推荐候选`}>
                {(option.candidates ?? []).map((candidate) => {
                  const hit = hasObject && candidate.hit;
                  const active = hasObject && candidate.active;
                  const statusDetail = isDefinition
                    ? "数据源明确给出的完整组合项"
                    : candidate.hit
                      ? candidate.active ? "本件已拥有，当前已启用" : "本件已拥有，当前未启用"
                      : "本件没有这个推荐项";
                  return (
                    <WeaponPerkEntry
                      key={candidate.key}
                      name={candidate.name}
                      englishName={candidate.englishName}
                      description={candidate.description}
                      icon={candidate.icon}
                      hit={hit}
                      selected={active}
                      muted={hasObject && option.owned && !candidate.hit}
                      unknown={!candidate.icon}
                      contextLabel="完整组合要求"
                      statusLabel={isDefinition
                        ? "组合要求"
                        : candidate.hit
                          ? candidate.active ? perkStatusWord.hitActive : perkStatusWord.hit
                          : perkStatusWord.missed}
                      statusDetail={statusDetail}
                      ariaLabel={recommendationPerkAriaLabel({ name: candidate.name, hit, active }, "完整组合要求", statusDetail)}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : <p className="weapon-detail-match-empty">{isFixedExotic ? "固定异域不使用随机 Perk 目标；此处保留来源说明和使用建议。" : "该来源没有指定随机 Perk 目标。"}</p>}
      {!isDefinition ? <div className="weapon-detail-match-summary">
        {isFixedExotic ? (
          <>
            <span>配置：固定 Perk · 不执行 Roll 命中</span>
            {model.upgrades.catalyst ? <span>催化剂：{catalystStateLabel(model)}</span> : null}
            <span>当前查看：{weaponObjectLabel(model.context.kind)}</span>
          </>
        ) : (
          <>
            <span>Perk：{!perkMatches.length ? "未指定" : !hasObject ? "未选择账号装备" : `${perkMatches.filter((option) => option.owned).length}/${perkMatches.length} 命中 · ${perkMatches.filter((option) => option.active).length}/${perkMatches.length} 当前启用`}</span>
            <span>大师杰作：{recommendation.masterwork_names.length ? matchFactLabel(hasObject, masterworkMatch) : "未指定"}</span>
            <span>武器模组：{recommendation.mod_names.length ? matchFactLabel(hasObject, modMatch) : "未指定"}</span>
          </>
        )}
      </div> : null}
    </article>
  );
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
  perk: Pick<RecommendationPerkVisual, "name" | "hit" | "active">,
  contextLabel: string,
  statusDetail: string
): string {
  return [perk.name, contextLabel, perk.hit ? "命中推荐" : undefined, perk.active ? "当前启用" : undefined, statusDetail].filter(Boolean).join("，");
}

function recommendationMatchBadgeClass(match: WeaponRecommendation["match"]): string {
  if (match === "full") return "status-ready";
  if (match === "partial") return "status-warning";
  if (match === "none") return "status-error";
  return "status-neutral";
}

function UpgradeSection({ model }: { model: WeaponDetailViewModel }) {
  const { upgrades } = model;
  const objectSource = model.context.kind === "account_instance"
    ? "当前装备"
    : model.context.kind === "vendor_offer"
      ? "商人当前售卖"
      : "资料库定义";
  const rows = [
    upgrades.masterwork ? { key: "masterwork", label: "大师杰作", current: `${upgrades.masterwork.name}${upgrades.masterwork.level ? ` · ${upgrades.masterwork.level} 级` : ""}`, detail: `${upgrades.masterwork.complete ? "已完成" : "未完成"}${upgrades.masterwork.stat_amount ? ` · 属性 ${upgrades.masterwork.stat_amount > 0 ? "+" : ""}${upgrades.masterwork.stat_amount}` : ""}`, source: objectSource } : null,
    upgrades.mod ? { key: "mod", label: "武器模组", current: upgrades.mod.name, detail: upgrades.mod.description, source: objectSource } : null,
    upgrades.catalyst ? { key: "catalyst", label: "催化剂", current: upgrades.catalyst.name, detail: catalystStateLabel(model), source: upgrades.catalyst.acquired === undefined ? "资料库定义" : "账号进度 + 资料库定义" } : null,
    upgrades.enhancement ? { key: "enhancement", label: "强化阶级", current: upgrades.enhancement.name, detail: upgrades.enhancement.level !== undefined ? `当前 ${upgrades.enhancement.level} 阶` : "当前装备强化状态", source: objectSource } : null,
    upgrades.crafting_level !== undefined ? { key: "crafting", label: "锻造等级", current: `${upgrades.crafting_level} 级`, detail: upgrades.enhanced ? "已包含强化能力" : "未强化", source: objectSource } : null
  ].filter((row): row is NonNullable<typeof row> => Boolean(row));
  if (!rows.length) return null;
  return (
    <>
      <SectionHeading eyebrow="升级与锻造" title={upgrades.catalyst ? "催化剂、杰作与当前进度" : "大师杰作、模组与强化"} description="这件武器的状态与版本能力分别标明来源，不把未返回的信息补成结论。" />
      <DataBlockHeading title="升级状态" source={upgrades.catalyst ? (upgrades.catalyst.acquired === undefined ? "资料库定义" : "账号进度 + 资料库定义 · 当前读取") : objectSource} />
      <div className={["weapon-detail-upgrade-layout", !upgrades.catalyst && "without-catalyst"].filter(Boolean).join(" ")}>
        {upgrades.catalyst ? <article className="weapon-detail-catalyst"><header><GameAssetImage className="game-definition-icon" src={upgrades.catalyst.icon} alt="" loading="lazy" /><div><strong>{upgrades.catalyst.name}</strong><span>{upgrades.catalyst.objective || catalystStateLabel(model)}</span></div></header>{upgrades.catalyst.acquired !== undefined ? <progress value={upgrades.catalyst.progress ?? (upgrades.catalyst.complete ? 100 : 0)} max={100} /> : null}{upgrades.catalyst.acquisition ? <p>获取：{upgrades.catalyst.acquisition}</p> : null}{upgrades.catalyst.effects.length ? <ul>{upgrades.catalyst.effects.map((effect) => <li key={effect}>{effect}</li>)}</ul> : null}</article> : null}
        {rows.length ? (
          <div className="weapon-detail-upgrade-table" role="table" aria-label="升级与锻造状态">
            <div role="row"><strong role="columnheader">项目</strong><strong role="columnheader">当前查看</strong><strong role="columnheader">状态</strong><strong role="columnheader">数据来源</strong></div>
            {rows.map((row) => <div key={row.key} role="row"><strong role="cell">{row.label}</strong><span role="cell">{row.current}</span><span role="cell">{row.detail}</span><span role="cell">{row.source}</span></div>)}
          </div>
        ) : <EmptyState text="这件武器没有可显示的升级或附加能力。" />}
      </div>
    </>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="weapon-detail-empty">{text}</p>;
}

function sourceEntryStatusLabel(source: WeaponDetailViewModel["sources"]["entries"][number]): string {
  if (source.kind === "vendor_offer" && source.available_now === true) {
    if (source.offer?.can_purchase === true) return "当前可购买";
    if (source.offer?.can_purchase === false) return "当前有入口 · 条件未满足";
    return "当前有获取入口";
  }
  if (source.kind === "activity_reward" && source.available_now === true) return "当前活动奖励";
  if (source.available_now === true) return "当前有获取入口";
  if (source.kind === "live_status") {
    return source.available_now === false ? "暂未发现入口" : "当前状态未确认";
  }
  if (source.kind === "manifest_hint") return "官方历史资料";
  return "开放时间未确认";
}

function sourceStatusDescription(status: WeaponDetailViewModel["sources"]["status"]): string {
  if (status === "ready") return "已确认当前获取入口；价格、条件和刷新时间以对应商人或活动数据为准。";
  if (status === "partial") return "历史获取途径和当前获取状态分开显示；“暂未发现入口”不代表永久无法获得。";
  return "当前数据不足，暂时无法确认获取方式；不会回退显示已经过期的商人库存。";
}

function catalystStateLabel(model: WeaponDetailViewModel): string {
  const catalyst = model.upgrades.catalyst;
  if (!catalyst) return "";
  if (catalyst.complete) return "已完成并生效";
  if (catalyst.acquired === true) return catalyst.progress !== undefined ? `进行中 · ${catalyst.progress}%` : "已获得 · 进度未返回";
  if (catalyst.acquired === false) return "尚未获得";
  return "仅显示催化剂定义";
}

function configurationKindLabel(kind: WeaponDetailViewModel["configuration"]["kind"]) {
  if (kind === "fixed") return "固定 Perk";
  if (kind === "variable_exotic") return "可变异域配置";
  return "随机 Roll";
}

function countPool(columns: readonly WeaponPerkPoolColumn[]) {
  return columns.reduce((total, column) => total + column.candidates.length, 0);
}

function formatUpdatedAt(value: string): string {
  return formatStandardDateTime(value);
}

function recommendationSourceCandidates(
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
      name: candidate.name || existing?.name || "未知 Perk",
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
    selected: plug.selected
  };
}

function recommendationTargetPerk(
  model: WeaponDetailViewModel,
  columnKey: string,
  targetName: string,
  sourceCandidate?: WeaponRecommendationPerkCandidate
): RecommendationPerkVisual {
  const matchedColumn = model.configuration.selection_columns.find((column) => (
    sameLabel(column.key, columnKey) || sameLabel(column.label, columnKey)
  ));
  const selectionCandidates = matchedColumn?.candidates
    ?? model.configuration.selection_columns.flatMap((column) => column.candidates);
  const sourceHashes = new Set([
    ...(sourceCandidate?.hashes ?? []),
    sourceCandidate?.hash
  ].filter((hash): hash is number => Boolean(hash)));
  const ownedMatches = selectionCandidates.filter((candidate) => (
    sourceHashes.has(candidate.hash) || weaponPerkMatchesTarget(model, candidate, targetName)
  ));
  const visual = findWeaponPerkVisual(model, undefined, targetName) ?? ownedMatches[0];
  return {
    key: `target:${normalizedLabel(columnKey)}:${normalizedLabel(targetName)}:${[...sourceHashes].join(",")}`,
    hash: sourceCandidate?.hash ?? visual?.hash,
    hashes: sourceCandidate?.hashes,
    name: sourceCandidate?.name ?? visual?.name ?? targetName,
    englishName: sourceCandidate?.englishName,
    description: sourceCandidate?.description ?? visual?.description,
    icon: sourceCandidate?.icon ?? visual?.icon,
    unresolved: sourceCandidate?.unresolved,
    hit: ownedMatches.length > 0,
    active: ownedMatches.some((candidate) => candidate.selected)
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

function weaponPerkMatchesTarget(
  model: WeaponDetailViewModel,
  candidate: WeaponPerkCandidate,
  targetName: string
): boolean {
  if (sameLabel(candidate.name, targetName)) return true;
  if (!candidate.enhanced_of_hash) return false;
  const baseCandidate = allWeaponPerkCandidates(model).find((entry) => entry.hash === candidate.enhanced_of_hash);
  return sameLabel(baseCandidate?.name, targetName);
}

function normalizedLabel(value?: string): string {
  return (value ?? "").trim().toLocaleLowerCase();
}

function sameLabel(left?: string, right?: string): boolean {
  const normalizedLeft = normalizedLabel(left);
  return Boolean(normalizedLeft) && normalizedLeft === normalizedLabel(right);
}

function matchFactLabel(hasObject: boolean, matched: boolean): string {
  return hasObject ? matched ? "命中" : "未命中" : "未选择实际对象";
}
