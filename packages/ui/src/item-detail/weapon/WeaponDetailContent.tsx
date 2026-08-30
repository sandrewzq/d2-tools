import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { GameAssetImage } from "../../media/GameAssetImage.js";
import { GameCombatIcon } from "../../media/GameCombatIcon.js";
import { formatStandardDateTime } from "../../time/formatTime.js";
import { EquipmentDetailContextLedger } from "../EquipmentDetailContextLedger.js";
import type {
  WeaponDetailInstance,
  WeaponDetailViewModel,
  WeaponPerkCandidate,
  WeaponPerkColumnRole,
  WeaponPerkPoolColumn,
  WeaponPerkSelectionColumn,
  WeaponRecommendation,
  WeaponSourceEntry,
  WeaponStatTrack
} from "@d2-tools/app/items";
import type {
  PersonalWeaponKnowledgeEntry,
  SavePersonalWeaponKnowledgeInput
} from "@d2-tools/core/community-perks/personalWeaponKnowledge";
import type { ItemReleaseKind } from "@d2-tools/core/items/release";

export type WeaponDetailSection =
  | "overview"
  | "configuration"
  | "recommendations"
  | "upgrades"
  | "analysis";

type WeaponTargetSource = "dim" | "community" | "personal";

export type WeaponDetailContentActions = {
  selectVersion?: (hash: number) => void;
  openSource?: (source: WeaponSourceEntry) => void;
  stagePerk?: (column: WeaponPerkSelectionColumn, perk: WeaponPerkCandidate) => void;
  cancelPendingPerks?: () => void;
  applyPendingPerks?: () => void | Promise<void>;
  refreshConfiguration?: () => void | Promise<void>;
  selectInstance?: (instance: WeaponDetailInstance) => boolean | void;
  runAnalysis?: (request: { prompt: string; allow_external_search: boolean }) => void;
  saveKnowledge?: (draft: SavePersonalWeaponKnowledgeInput["entry"]) => void;
  setKnowledgeEnabled?: (id: string, enabled: boolean) => void;
  deleteKnowledge?: (id: string) => void;
};

export type WeaponConfigurationWriteFeedback = {
  status: "idle" | "submitting" | "refreshing" | "success" | "error" | "refresh-error";
  message?: string;
};

export type WeaponDetailAnalysis = {
  status?: "idle" | "running" | "ready" | "error";
  title?: string;
  body?: string;
  evidence?: Array<{ label: string; value: string }>;
  externalSources?: Array<{ title?: string; url: string; queried_at: string }>;
  externalSearchMessage?: string;
  message?: string;
};

export type WeaponDetailContentProps = {
  model: WeaponDetailViewModel;
  actions?: WeaponDetailContentActions;
  configurationWriteFeedback?: WeaponConfigurationWriteFeedback;
  analysis?: WeaponDetailAnalysis;
  personalKnowledge?: PersonalWeaponKnowledgeEntry[];
  activeSection?: WeaponDetailSection;
  onSectionChange?: (section: WeaponDetailSection) => void;
  instanceActions?: ReactNode;
  className?: string;
};

const sectionLabels: Array<{ key: WeaponDetailSection; label: string }> = [
  { key: "configuration", label: "当前配置" },
  { key: "overview", label: "属性与获取" },
  { key: "recommendations", label: "目标匹配" },
  { key: "upgrades", label: "升级与锻造" },
  { key: "analysis", label: "AI 分析" }
];

export function WeaponDetailContent(props: WeaponDetailContentProps) {
  const { model } = props;
  const [internalSection, setInternalSection] = useState<WeaponDetailSection>("configuration");
  const [poolOpen, setPoolOpen] = useState(false);
  const [analysisPrompt, setAnalysisPrompt] = useState("");
  const [allowExternalSearch, setAllowExternalSearch] = useState(false);
  const [targetSource, setTargetSource] = useState<WeaponTargetSource>("dim");
  const [instanceRailOpen, setInstanceRailOpen] = useState(false);
  const section = props.activeSection ?? internalSection;
  const sectionIdPrefix = useId();
  const detailRef = useRef<HTMLElement>(null);
  const instanceRailRef = useRef<HTMLElement>(null);
  const instanceRailTriggerRef = useRef<HTMLButtonElement>(null);
  const instanceRailCloseRef = useRef<HTMLButtonElement>(null);
  const observedSectionRef = useRef<WeaponDetailSection>("configuration");
  const sectionRefs = useRef<Record<WeaponDetailSection, HTMLElement | null>>({
    overview: null,
    configuration: null,
    recommendations: null,
    upgrades: null,
    analysis: null
  });

  useEffect(() => {
    setPoolOpen(false);
    setInternalSection("configuration");
    setAnalysisPrompt("");
    setAllowExternalSearch(false);
    setTargetSource("dim");
    setInstanceRailOpen(false);
    observedSectionRef.current = "configuration";
  }, [model.identity.hash, model.context.object_id, model.context.kind]);

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

    const updateActiveSection = () => {
      const rootTop = scrollRoot.getBoundingClientRect().top;
      const activationLine = rootTop + 96;
      let nextSection: WeaponDetailSection = "configuration";
      for (const item of sectionLabels) {
        const sectionElement = sectionRefs.current[item.key];
        if (sectionElement && sectionElement.getBoundingClientRect().top <= activationLine) {
          nextSection = item.key;
        }
      }
      if (observedSectionRef.current === nextSection) return;
      observedSectionRef.current = nextSection;
      if (props.activeSection === undefined) setInternalSection(nextSection);
      props.onSectionChange?.(nextSection);
    };

    scrollRoot.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    updateActiveSection();
    return () => {
      scrollRoot.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [model.identity.hash, model.context.object_id, props.activeSection, props.onSectionChange]);

  const changeSection = (next: WeaponDetailSection) => {
    observedSectionRef.current = next;
    if (props.activeSection === undefined) setInternalSection(next);
    props.onSectionChange?.(next);
    sectionRefs.current[next]?.scrollIntoView({ behavior: "smooth", block: "start" });
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
              {item.label}
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
        >我的同名武器</button>
      </nav>

      <div className="weapon-detail-workspace" data-surface="split">
        <div className="weapon-detail-sections" data-surface="content-stack">
          <section ref={(node) => { sectionRefs.current.configuration = node; }} id={`${sectionIdPrefix}-configuration`} className="weapon-detail-section">
            <ConfigurationSection
              model={model}
              poolOpen={poolOpen}
              onTogglePool={() => setPoolOpen((value) => !value)}
              actions={props.actions}
              configurationWriteFeedback={props.configurationWriteFeedback}
            />
          </section>
          <section ref={(node) => { sectionRefs.current.overview = node; }} id={`${sectionIdPrefix}-overview`} className="weapon-detail-section">
            <OverviewSection model={model} onOpenSource={props.actions?.openSource} />
          </section>
          <section ref={(node) => { sectionRefs.current.recommendations = node; }} id={`${sectionIdPrefix}-recommendations`} className="weapon-detail-section">
            <RecommendationSection model={model} source={targetSource} onSourceChange={setTargetSource} />
          </section>
          <section ref={(node) => { sectionRefs.current.upgrades = node; }} id={`${sectionIdPrefix}-upgrades`} className="weapon-detail-section">
            <UpgradeSection model={model} />
          </section>
          <section ref={(node) => { sectionRefs.current.analysis = node; }} id={`${sectionIdPrefix}-analysis`} className="weapon-detail-section">
            <AnalysisSection
              model={model}
              analysis={props.analysis}
              prompt={analysisPrompt}
              onPromptChange={setAnalysisPrompt}
              allowExternalSearch={allowExternalSearch}
              onAllowExternalSearchChange={setAllowExternalSearch}
              onRun={props.actions?.runAnalysis}
              personalKnowledge={props.personalKnowledge ?? []}
              onSaveKnowledge={props.actions?.saveKnowledge}
              onSetKnowledgeEnabled={props.actions?.setKnowledgeEnabled}
              onDeleteKnowledge={props.actions?.deleteKnowledge}
            />
          </section>
        </div>
        <aside
          ref={instanceRailRef}
          id={`${sectionIdPrefix}-instance-rail`}
          className={["weapon-detail-instance-rail", instanceRailOpen && "is-open"].filter(Boolean).join(" ")}
          data-surface="drawer"
          data-ui-kind="drawer"
          data-scroll-region="pane"
          aria-label="当前装备与我的同名武器"
          onKeyDown={handleInstanceRailKeyDown}
        >
          <header className="weapon-detail-rail-drawer-head">
            <div><span>武器操作</span><strong>我的同名武器</strong></div>
            <button
              ref={instanceRailCloseRef}
              type="button"
              className="weapon-detail-rail-close"
              data-ui-kind="button"
              data-control-variant="quiet"
              aria-label="关闭我的同名武器"
              title="关闭"
              onClick={() => setInstanceRailOpen(false)}
            >×</button>
          </header>
          {props.instanceActions ? (
            <div className="weapon-detail-instance-actions">{props.instanceActions}</div>
          ) : (
            <div className="weapon-detail-instance-readonly">
              <h3>当前内容仅供查看</h3>
              <p>选择下方账号中已有的同版本武器后，可执行装备、转移、锁定和本地整理。</p>
            </div>
          )}
          <InstancesRail
            model={model}
            onSelect={props.actions?.selectInstance ? (instance) => {
              const selected = props.actions?.selectInstance?.(instance);
              if (selected !== false) setInstanceRailOpen(false);
            } : undefined}
          />
        </aside>
      </div>
      <button
        type="button"
        className={["weapon-detail-rail-scrim", instanceRailOpen && "is-open"].filter(Boolean).join(" ")}
        data-ui-kind="button"
        data-control-variant="quiet"
        aria-label="关闭我的同名武器"
        onClick={() => setInstanceRailOpen(false)}
      />
    </article>
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
  const canSelectDefinitionVersion = context.kind === "definition" && versions.length > 1 && Boolean(props.onSelectVersion);
  const versionLabel = context.kind === "account_instance"
    ? "装备版本"
    : context.kind === "vendor_offer"
      ? "售卖版本"
      : "发布版本";
  return (
    <header className="weapon-detail-identity" data-surface="section">
      <div className="weapon-detail-identity-main">
        <GameAssetImage src={identity.icon} alt="" loading="eager" fallback={<span className="weapon-detail-icon-placeholder" aria-hidden="true" />} />
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
          </div>
        </div>
      </div>

      <div className="weapon-detail-identity-context">
        <EquipmentDetailContextLedger
          entryLabel={context.entry_label}
          currentViewLabel={weaponObjectLabel(context.kind)}
          locationLabel={identity.slot ?? identity.item_type ?? "武器"}
          versionFieldLabel={versionLabel}
          versionValue={currentDefinition?.label ?? releaseLabel}
          versionOptions={canSelectDefinitionVersion
            ? versions.map((version) => ({ hash: version.hash, label: version.label }))
            : undefined}
          selectedVersionHash={currentDefinition?.hash ?? identity.hash}
          watermarkIcon={identity.definition_version?.current_watermark_icon}
          versionLoading={props.model.loading_state.versions}
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
            <dl><dt>版本水印</dt><dd>{watermarks.length ? <span className="weapon-detail-definition-watermarks">{watermarks.map((icon, index) => <GameAssetImage key={`${icon}:${index}`} src={icon} alt={`官方版本水印 ${index + 1}`} title="官方定义版本水印" loading="eager" />)}</span> : "资料未返回"}</dd></dl>
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
  if (kind === "account_instance") return "当前装备";
  if (kind === "vendor_offer") return "当前售卖";
  return "资料库版本";
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
        : <GameAssetImage src={props.icon} alt="" loading="eager" />}
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
  const expectCurrent = props.model.context.kind !== "definition";
  const showCurrent = expectCurrent
    && props.model.stats.some((stat) => stat.current_value !== undefined);
  const showStandard = props.model.stats.some((stat) => stat.standard_value !== undefined);
  const showPending = props.model.context.kind === "account_instance"
    && props.model.stats.some((stat) => stat.pending_delta !== undefined && stat.pending_delta !== 0);
  const statSource = props.model.context.kind === "account_instance"
    ? "资料库定义 + 当前装备"
    : props.model.context.kind === "vendor_offer"
      ? "资料库定义 + 商人当前售卖"
      : "资料库定义";
  return (
    <>
      <SectionHeading eyebrow="属性与获取" title="属性与获取详情" description="区分资料库标准值、这件武器的实际值和待应用配置变化。" />
      <div className="weapon-detail-overview-grid">
        <section className="weapon-detail-block" aria-labelledby="weapon-stat-title">
          <DataBlockHeading
            id="weapon-stat-title"
            title="武器属性"
            source={`${statSource} · ${props.model.stats.length} 项`}
          />
          {props.model.stats.length ? (
            <div className="weapon-detail-stats">
              <div className="weapon-detail-stat-legend">
                {expectCurrent ? <span><i className="is-current" />{showCurrent ? "当前实际值" : props.model.loading_state.instance ? "当前实际值读取中" : "当前实际值未返回"}</span> : null}
                {expectCurrent || showStandard ? <span><i className="is-standard" />{showStandard ? "资料库标准值" : props.model.loading_state.definition ? "资料库标准值读取中" : "资料库标准值未返回"}</span> : null}
                {showPending ? <span><i className="is-pending" />待应用变化</span> : null}
              </div>
              {props.model.stats.map((stat) => (
                <StatTrack
                  key={stat.key}
                  stat={stat}
                  expectCurrent={expectCurrent}
                  showStandard={showStandard}
                  showPending={showPending}
                  isDefinitionLoading={props.model.loading_state.definition}
                  isInstanceLoading={props.model.loading_state.instance}
                />
              ))}
            </div>
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
                    <GameAssetImage src={source.icon} alt="" loading="eager" />
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

function StatTrack(props: {
  stat: WeaponStatTrack;
  expectCurrent: boolean;
  showStandard: boolean;
  showPending: boolean;
  isDefinitionLoading: boolean;
  isInstanceLoading: boolean;
}) {
  const { stat } = props;
  const hasCurrent = props.expectCurrent && stat.current_value !== undefined;
  const maximum = Math.max(100, stat.standard_value ?? 0, stat.current_value ?? 0, stat.pending_value ?? 0);
  const currentPercent = ((stat.current_value ?? 0) / maximum) * 100;
  const pendingPercent = ((stat.pending_value ?? stat.current_value ?? 0) / maximum) * 100;
  const style = {
    "--weapon-standard": `${((stat.standard_value ?? 0) / maximum) * 100}%`,
    "--weapon-current": `${currentPercent}%`,
    "--weapon-pending-start": `${Math.min(currentPercent, pendingPercent)}%`,
    "--weapon-pending-size": `${Math.abs(pendingPercent - currentPercent)}%`
  } as CSSProperties;
  const currentTone = stat.current_delta ? statDeltaTone(stat, stat.current_delta) : "neutral";
  const pendingTone = stat.pending_delta ? statDeltaTone(stat, stat.pending_delta) : "neutral";
  const currentText = stat.current_delta === undefined
    ? undefined
    : stat.current_delta === 0
      ? "与标准一致"
      : `当前 ${stat.current_delta > 0 ? "+" : ""}${stat.current_delta} · ${toneLabel(currentTone)}`;
  const pendingText = stat.pending_delta
    ? `${stat.pending_delta > 0 ? "+" : ""}${stat.pending_delta} → ${stat.pending_value} · ${toneLabel(pendingTone)}`
    : "无变化";
  const currentModifierText = stat.current_modifiers.length
    ? formatStatModifiers(stat.current_modifiers)
    : "";
  const pendingModifierText = stat.pending_modifiers.length
    ? formatStatModifiers(stat.pending_modifiers)
    : "";
  const primaryValue = hasCurrent ? stat.current_value : stat.standard_value;
  return (
    <div className={[
      "weapon-detail-stat-row",
      !hasCurrent && "is-definition",
      props.expectCurrent && "has-standard"
    ].filter(Boolean).join(" ")} style={style}>
      <strong>{stat.label}</strong>
      <span className="weapon-detail-stat-value">{primaryValue ?? "—"}</span>
      <span className="weapon-detail-stat-track" aria-hidden="true">
        {hasCurrent ? <i /> : null}
        {props.showStandard && stat.standard_value !== undefined ? <b /> : null}
        {props.showPending && stat.pending_delta ? <em className={stat.pending_delta > 0 ? "is-increase" : "is-decrease"} /> : null}
      </span>
      {props.expectCurrent ? (
        <span className="weapon-detail-stat-comparison">
          {stat.standard_value !== undefined ? (
            <small>标准 {stat.standard_value}</small>
          ) : <small>{props.isDefinitionLoading ? "标准值读取中" : "标准值未返回"}</small>}
          {hasCurrent
            ? (
              <small className={`is-${currentTone}`} title={currentModifierText || undefined}>
                {[currentText ?? "当前值已读取", currentModifierText].filter(Boolean).join(" · ")}
              </small>
            )
            : <small>{props.isInstanceLoading ? "实际值读取中" : "实际值未返回"}</small>}
          {props.showPending ? (
            <small className={`is-${pendingTone}`} title={pendingModifierText || undefined}>
              {[
                `待应用 ${pendingText}`,
                pendingModifierText
              ].filter(Boolean).join(" · ")}
            </small>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

function statDeltaTone(stat: WeaponStatTrack, delta: number): "improved" | "worsened" | "neutral" {
  if (!delta || stat.direction === "neutral") return "neutral";
  const improved = stat.direction === "higher" ? delta > 0 : delta < 0;
  return improved ? "improved" : "worsened";
}

function toneLabel(tone: "improved" | "worsened" | "neutral"): string {
  return tone === "improved" ? "改善" : tone === "worsened" ? "降低" : "变化";
}

function formatStatModifiers(modifiers: WeaponStatTrack["current_modifiers"]): string {
  return modifiers.map((modifier) => (
    `${modifier.source} ${modifier.amount > 0 ? "+" : ""}${modifier.amount}`
  )).join(" / ");
}

function ConfigurationSection(props: {
  model: WeaponDetailViewModel;
  poolOpen: boolean;
  onTogglePool: () => void;
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
  const canWriteConfiguration = context.kind === "account_instance"
    && configuration.kind !== "fixed"
    && configuration.selection_columns.some((column) => column.candidates.some((candidate) => candidate.can_apply));
  const writeFeedback = props.configurationWriteFeedback ?? { status: "idle" as const };
  const isBusy = writeFeedback.status === "submitting" || writeFeedback.status === "refreshing";
  const pendingChangeCount = configuration.selection_columns.reduce(
    (count, column) => count + (column.candidates.some((candidate) => candidate.pending) ? 1 : 0),
    0
  );
  const panelState = writeFeedback.status === "idle" && configuration.has_pending_changes
    ? "pending"
    : writeFeedback.status;
  const showWritePanel = canWriteConfiguration && panelState !== "idle";
  const panelContent = configurationPanelContent(panelState, pendingChangeCount, writeFeedback.message);
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
  const description = isConfigurationLoading
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
      <div className="weapon-detail-config-summary" aria-busy={isConfigurationLoading}>
        {configurationSummaryItems(
          props.model,
          pendingChangeCount,
          operationLabel,
          isDefinitionLoading,
          isInstanceLoading
        ).map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
      <p className="weapon-detail-config-source">
        {context.kind === "account_instance"
          ? "依据：当前装备插槽与资料库 Perk 信息"
          : context.kind === "vendor_offer"
            ? "依据：商人当前售卖配置与资料库 Perk 信息"
            : "依据：资料库 Perk 信息"}
      </p>
      {isConfigurationLoading ? (
        <p className="weapon-detail-config-loading-note" role="status" aria-live="polite">
          <span aria-hidden="true" />
          {loadingCopy.status}
        </p>
      ) : null}
      {hasConfigurationData ? (
        <div className="weapon-detail-config-grid" aria-busy={isConfigurationLoading}>
          {configuration.intrinsic
            ? <PerkColumn label="固有能力" role="intrinsic" candidates={[configuration.intrinsic]} />
            : isDefinitionLoading
              ? <ConfigurationLoadingColumn />
              : <div className="weapon-detail-intrinsic-empty">未返回固有能力</div>}
          {columns.map((column) => (
            <PerkColumn
              key={column.key}
              label={column.label}
              role={column.role}
              candidates={column.candidates}
              interactive={showSelection && canWriteConfiguration && !isBusy}
              onSelect={(perk) => props.actions?.stagePerk?.(column as WeaponPerkSelectionColumn, perk)}
            />
          ))}
          {isConfigurationLoading && columns.length === 0 ? <ConfigurationLoadingColumn /> : null}
        </div>
      ) : isConfigurationLoading ? (
        <ConfigurationLoadingGrid />
      ) : (
        <EmptyState text={configurationEmptyText(context.kind)} />
      )}

      {showWritePanel ? (
        <div
          className={`weapon-detail-write-panel is-${panelState}`}
          role={panelState === "error" || panelState === "refresh-error" ? "alert" : "status"}
          aria-live={panelState === "error" || panelState === "refresh-error" ? "assertive" : "polite"}
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
            {panelState === "refresh-error" ? (
              <button type="button" data-ui-kind="button" data-control-variant="primary" onClick={() => void props.actions?.refreshConfiguration?.()}>重新读取配置</button>
            ) : null}
            {isBusy ? <span className="weapon-detail-write-busy-label">处理中</span> : null}
          </div>
        </div>
      ) : null}

      {context.kind !== "definition" && configuration.kind === "random_roll" && configuration.pool_columns.length ? (
        <section className="weapon-detail-full-pool">
          <button type="button" data-ui-kind="button" data-control-variant="secondary" aria-expanded={props.poolOpen} onClick={props.onTogglePool}>
            <strong>{props.poolOpen ? "收起完整掉落池" : "查看完整掉落池"}</strong>
            <span>{props.poolOpen ? "收起" : `展开 ${countPool(configuration.pool_columns)} 个候选`}</span>
          </button>
          {props.poolOpen ? (
            <><div className="weapon-detail-pool-grid">
              {configuration.pool_columns.map((column) => <PerkColumn key={column.key} label={column.label} role={column.role} candidates={column.candidates} />)}
            </div><p className="weapon-detail-note">这里只展示可能掉落的候选，不标记当前已选状态；这件武器未拥有的 Perk 不能远程安装。</p></>
          ) : null}
        </section>
      ) : null}

      {context.kind !== "definition"
      && isVariableExotic
      && configuration.pool_kind === "randomized"
      && configuration.pool_columns.length ? (
        <section className="weapon-detail-full-pool">
          <button type="button" data-ui-kind="button" data-control-variant="secondary" aria-expanded={props.poolOpen} onClick={props.onTogglePool}>
            <strong>{props.poolOpen ? "收起异域配置候选" : "查看异域配置候选"}</strong>
            <span>{props.poolOpen ? "收起" : `展开 ${countPool(configuration.pool_columns)} 个候选`}</span>
          </button>
          {props.poolOpen ? (
            <><div className="weapon-detail-pool-grid">
              {configuration.pool_columns.map((column) => <PerkColumn key={column.key} label={column.label} role={column.role} candidates={column.candidates} />)}
            </div><p className="weapon-detail-note">这些是当前资料库可确认的特殊异域随机配置候选，不代表这件武器已经拥有，也不属于普通传说武器掉落池。</p></>
          ) : null}
        </section>
      ) : null}
    </>
  );
}

function configurationSummaryItems(
  model: WeaponDetailViewModel,
  pendingChangeCount: number,
  operationLabel: string,
  isDefinitionLoading: boolean,
  isInstanceLoading: boolean
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
      { label: "当前查看", value: "当前装备" },
      { label: "本件 Roll", value: currentRoll.join(" / ") || (isInstanceLoading ? "正在读取" : "当前配置未返回") },
      { label: "可切换", value: switchableColumns ? `${switchableColumns} 个插槽` : isInstanceLoading ? "正在核对" : "没有可远程切换项" },
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

function ConfigurationLoadingColumn() {
  return (
    <div className="weapon-detail-config-placeholder-column" aria-hidden="true">
      <span />
      <div><i /><b /><em /></div>
    </div>
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
      return { title: "正在提交武器配置", step: "第 1/2 步", message: message ?? "正在将 Perk 更改提交到游戏服务..." };
    case "refreshing":
      return { title: "正在同步最新配置", step: "第 2/2 步", message: message ?? "正在读取游戏返回的最新装备状态..." };
    case "success":
      return { title: "武器配置已更新", step: "已完成", message: message ?? "详情已按服务器最新状态重绘。" };
    case "error":
      return { title: "武器配置未更新", step: "需要处理", message: message ?? "提交失败，已核对服务器当前配置。你可以保留选择重试。" };
    case "refresh-error":
      return { title: "写入成功，详情同步失败", step: "需要刷新", message: message ?? "请重新读取服务器配置，确认当前实际状态。" };
    default:
      return { title: "", step: "", message: "" };
  }
}

function PerkColumn(props: {
  label: string;
  role: WeaponPerkColumnRole;
  candidates: readonly WeaponPerkCandidate[];
  interactive?: boolean;
  onSelect?: (perk: WeaponPerkCandidate) => void;
}) {
  return (
    <section className={`weapon-detail-perk-column role-${props.role}`}>
      <h4>{props.label}</h4>
      <div>
        {props.candidates.length ? props.candidates.map((perk) => {
          const selection = "selected" in perk ? perk as WeaponPerkSelectionColumn["candidates"][number] : undefined;
          const stateLabel = selection
            ? selection.pending ? "待应用" : selection.selected ? "当前已选" : selection.can_apply ? "这件武器拥有 · 可切换" : "这件武器拥有"
            : undefined;
          const content = <>{stateLabel || perk.enhanced_of_hash ? <small>{[stateLabel, perk.enhanced_of_hash ? "强化版本" : undefined].filter(Boolean).join(" · ")}</small> : null}<GameAssetImage className="game-definition-icon" src={perk.icon} alt="" loading="eager" /><span><strong>{perk.name}</strong><p>{perk.description}</p></span></>;
          return props.interactive && selection?.can_apply ? (
            <button key={perk.hash} type="button" className={["weapon-detail-perk", selection.selected && "is-selected", selection.pending && "is-pending"].filter(Boolean).join(" ")} aria-pressed={selection.selected || selection.pending} onClick={() => props.onSelect?.(perk)}>{content}</button>
          ) : <article key={perk.hash} className={["weapon-detail-perk", selection?.selected && "is-selected", selection?.pending && "is-pending"].filter(Boolean).join(" ")}>{content}</article>;
        }) : <EmptyState text="此列没有返回候选。" />}
      </div>
    </section>
  );
}

function RecommendationSection(props: {
  model: WeaponDetailViewModel;
  source: WeaponTargetSource;
  onSourceChange: (source: WeaponTargetSource) => void;
}) {
  const { model } = props;
  const isFixedExotic = model.identity.is_exotic && model.configuration.kind === "fixed";
  const panelId = useId();
  const targetsBySource: Record<WeaponTargetSource, WeaponRecommendation[]> = {
    dim: model.personal_targets.filter((target) => target.source === "dim"),
    community: model.recommendations.filter((target) => target.source === "builtin" || target.source === "external"),
    personal: model.recommendations.filter((target) => target.source === "user")
  };
  const targets = targetsBySource[props.source];
  const sourceOrder: WeaponTargetSource[] = ["dim", "community", "personal"];
  const handleSourceKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const currentIndex = sourceOrder.indexOf(props.source);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? sourceOrder.length - 1
        : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + sourceOrder.length) % sourceOrder.length;
    const nextSource = sourceOrder[nextIndex];
    event.preventDefault();
    props.onSourceChange(nextSource);
    requestAnimationFrame(() => document.getElementById(`${panelId}-${nextSource}`)?.focus());
  };
  return (
    <>
      <SectionHeading eyebrow="目标匹配" title="独立数据源目标匹配" description={isFixedExotic ? "固定异域不进行随机 Roll 命中；DIM、社区和个人知识只记录拥有状态、催化剂进度与使用建议。" : "DIM Wishlist、社区推荐和个人知识分别匹配，不合并、不排序，也不生成应用结论。"} />
      <div className="weapon-detail-target-tabs" data-ui-kind="segmented-control" role="tablist" aria-label="选择目标数据源">
        {([
          ["dim", "DIM Wishlist"],
          ["community", "社区推荐"],
          ["personal", "个人知识"]
        ] as const).map(([key, label]) => (
          <button
            key={key}
            id={`${panelId}-${key}`}
            type="button"
            role="tab"
            aria-controls={`${panelId}-panel`}
            aria-selected={props.source === key}
            tabIndex={props.source === key ? 0 : -1}
            onClick={() => props.onSourceChange(key)}
            onKeyDown={handleSourceKeyDown}
          >
            {label}<span>{targetsBySource[key].length}</span>
          </button>
        ))}
      </div>
      {targets.length ? (
        <div
          id={`${panelId}-panel`}
          className="weapon-detail-recommendations"
          role="tabpanel"
          aria-labelledby={`${panelId}-${props.source}`}
        >
          {targets.map((target) => <RecommendationCard key={target.id} model={model} recommendation={target} />)}
        </div>
      ) : <div id={`${panelId}-panel`} role="tabpanel" aria-labelledby={`${panelId}-${props.source}`}><EmptyState text="当前来源没有可显示的目标数据。" /></div>}
    </>
  );
}

function RecommendationCard(props: { model: WeaponDetailViewModel; recommendation: WeaponRecommendation }) {
  const { model, recommendation } = props;
  const hasObject = model.context.kind !== "definition";
  const perkMatches = recommendation.perk_options.map((option) => ({
    ...option,
    owned: hasObject && matchTargetPerks(model, option.column_key, option.names, false),
    active: hasObject && matchTargetPerks(model, option.column_key, option.names, true)
  }));
  const masterworkMatch = hasObject && recommendation.masterwork_names.some((name) => sameLabel(name, model.upgrades.masterwork?.name));
  const modMatch = hasObject && recommendation.mod_names.some((name) => sameLabel(name, model.upgrades.mod?.name));
  const isFixedExotic = model.identity.is_exotic && model.configuration.kind === "fixed";
  return (
    <article className="weapon-detail-recommendation">
      <header>
        <div>
          <h4>{recommendation.title}</h4>
          <p>{recommendation.source_label} · {recommendation.mode.toUpperCase()}{recommendation.updated_at ? ` · ${formatUpdatedAt(recommendation.updated_at)}` : ""}</p>
        </div>
        {recommendation.external_url ? <a href={recommendation.external_url} target="_blank" rel="noreferrer">查看原始来源</a> : <span>本地数据</span>}
      </header>
      {recommendation.reason ? <p className="weapon-detail-source-quote" data-ui-kind="callout" data-callout-tone="info">{recommendation.reason}</p> : null}
      {perkMatches.length ? (
        <div className="weapon-detail-match-grid">
          <div><span>目标插槽</span><strong>这件武器拥有</strong><strong>当前启用</strong></div>
          {perkMatches.map((option) => (
            <div key={option.column_key}>
              <span>{option.column_key}<small>目标：{option.names.join(" / ")}</small></span>
              <strong className={hasObject ? option.owned ? "is-hit" : "is-miss" : undefined}>{matchFactLabel(hasObject, option.owned)}</strong>
              <strong className={hasObject ? option.active ? "is-hit" : "is-miss" : undefined}>{matchFactLabel(hasObject, option.active)}</strong>
            </div>
          ))}
        </div>
      ) : <p className="weapon-detail-match-empty">{isFixedExotic ? "固定异域不使用随机 Perk 目标；此处保留来源说明和使用建议。" : "该来源没有指定随机 Perk 目标。"}</p>}
      <div className="weapon-detail-match-summary">
        {isFixedExotic ? (
          <>
            <span>配置：固定 Perk · 不执行 Roll 命中</span>
            {model.upgrades.catalyst ? <span>催化剂：{catalystStateLabel(model)}</span> : null}
            <span>当前查看：{weaponObjectLabel(model.context.kind)}</span>
          </>
        ) : (
          <>
            <span>Perk：{!perkMatches.length ? "未指定" : !hasObject ? "未选择账号装备" : `${perkMatches.filter((option) => option.owned).length}/${perkMatches.length} 这件武器拥有 · ${perkMatches.filter((option) => option.active).length}/${perkMatches.length} 当前启用`}</span>
            <span>大师杰作：{recommendation.masterwork_names.length ? matchFactLabel(hasObject, masterworkMatch) : "未指定"}</span>
            <span>武器模组：{recommendation.mod_names.length ? matchFactLabel(hasObject, modMatch) : "未指定"}</span>
          </>
        )}
      </div>
    </article>
  );
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
        {upgrades.catalyst ? <article className="weapon-detail-catalyst"><header><GameAssetImage className="game-definition-icon" src={upgrades.catalyst.icon} alt="" loading="eager" /><div><strong>{upgrades.catalyst.name}</strong><span>{upgrades.catalyst.objective || catalystStateLabel(model)}</span></div></header>{upgrades.catalyst.acquired !== undefined ? <progress value={upgrades.catalyst.progress ?? (upgrades.catalyst.complete ? 100 : 0)} max={100} /> : null}{upgrades.catalyst.acquisition ? <p>获取：{upgrades.catalyst.acquisition}</p> : null}{upgrades.catalyst.effects.length ? <ul>{upgrades.catalyst.effects.map((effect) => <li key={effect}>{effect}</li>)}</ul> : null}</article> : null}
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

function InstancesRail(props: { model: WeaponDetailViewModel; onSelect?: (instance: WeaponDetailInstance) => void }) {
  const currentInstance = props.model.same_hash_instances.find((instance) => instance.current);
  return (
    <details className="weapon-detail-rail-instances" open>
      <summary className="weapon-detail-rail-heading">
        <div><span>账号装备</span><h3>账号中的同版本武器</h3></div>
        <strong>{props.model.same_hash_instances.length} 件</strong>
      </summary>
      <div className="weapon-detail-rail-instances-body">
        {props.model.same_hash_instances.length ? (
          <div className="weapon-detail-instance-list" role="list">
            {props.model.same_hash_instances.map((instance) => {
              const visiblePlugs = instance.plugs.slice(0, 5);
              const upgrade = instanceUpgradeLabel(instance);
              const rollDifference = instanceRollDifferenceLabel(instance, currentInstance);
              return (
                <button
                  key={instance.instance_id}
                  type="button"
                  role="listitem"
                  className={instance.current ? "is-current" : undefined}
                  aria-current={instance.current ? "true" : undefined}
                  onClick={() => props.onSelect?.(instance)}
                  disabled={!props.onSelect}
                >
                  <header>
                    <strong>{instance.current ? "当前装备" : instance.location}</strong>
                    <span>{instance.power !== undefined ? `${instance.power} 光等` : "光等未知"}</span>
                  </header>
                  <span className="weapon-detail-instance-perks" aria-label={visiblePlugs.map((plug) => plug.name).join("、") || "配置未返回"}>
                    {visiblePlugs.filter((plug) => Boolean(plug.icon)).map((plug) => (
                      <GameAssetImage className="game-definition-icon" key={plug.hash} src={plug.icon} alt="" title={plug.name} loading="eager" />
                    ))}
                  </span>
                  <strong className="weapon-detail-instance-roll">{visiblePlugs.map((plug) => plug.name).join(" / ") || "配置未返回"}</strong>
                  <span className="weapon-detail-instance-meta">
                    <span>{rollDifference}</span>
                    {upgrade ? <span>{upgrade}</span> : null}
                    <span>{instanceStateLabel(instance)}</span>
                    {instance.local_tag ? <span>{instanceTagLabel(instance.local_tag)}</span> : null}
                  </span>
                </button>
              );
            })}
          </div>
        ) : <EmptyState text="账号中没有这个版本的同名武器。" />}
        <p className="weapon-detail-rail-note">这里只列出账号中相同发布版本的武器，便于快速切换和比较 Roll。</p>
      </div>
    </details>
  );
}

function instanceRollDifferenceLabel(
  instance: WeaponDetailInstance,
  currentInstance: WeaponDetailInstance | undefined
): string {
  if (instance.current) return "当前 Roll";
  if (!currentInstance?.plugs.length || !instance.plugs.length) return "Roll 差异未知";
  const currentHashes = currentInstance.plugs.slice(0, 5).map((plug) => plug.hash);
  const instanceHashes = instance.plugs.slice(0, 5).map((plug) => plug.hash);
  const slotCount = Math.max(currentHashes.length, instanceHashes.length);
  const differenceCount = Array.from({ length: slotCount }, (_, index) => (
    currentHashes[index] === instanceHashes[index] ? 0 : 1
  )).reduce((total, difference) => total + difference, 0);
  return differenceCount ? `${differenceCount} 个 Perk 不同` : "Roll 相同";
}

function instanceTagLabel(tag: NonNullable<WeaponDetailInstance["local_tag"]>): string {
  return {
    keep: "保留",
    review: "关注",
    farm: "待刷",
    loadout: "配装用",
    junk: "可清理"
  }[tag] ?? tag;
}

function instanceUpgradeLabel(instance: WeaponDetailInstance): string | undefined {
  const upgrades = instance.upgrade_status;
  if (!upgrades) return undefined;
  const labels = [
    upgrades.masterwork ? `大师杰作：${upgrades.masterwork.name}` : undefined,
    upgrades.mod ? `模组：${upgrades.mod.name}` : undefined,
    upgrades.catalyst ? `催化剂：${upgrades.catalyst.name}${upgrades.catalyst.complete ? "（完成）" : ""}` : undefined,
    upgrades.enhancement ? `强化阶级：${upgrades.enhancement.name}` : undefined,
    upgrades.crafting_level !== undefined ? `锻造 ${upgrades.crafting_level} 级` : undefined,
    upgrades.enhanced ? "已强化" : undefined
  ].filter(Boolean);
  return labels.length ? labels.join(" · ") : undefined;
}

function instanceStateLabel(instance: WeaponDetailInstance): string {
  const states = [instance.equipped ? "已装备" : undefined, instance.locked ? "已锁定" : undefined].filter(Boolean);
  return states.length ? states.join(" · ") : "可管理";
}

function AnalysisSection(props: {
  model: WeaponDetailViewModel;
  analysis?: WeaponDetailAnalysis;
  prompt: string;
  onPromptChange: (value: string) => void;
  allowExternalSearch: boolean;
  onAllowExternalSearchChange: (value: boolean) => void;
  onRun?: (request: { prompt: string; allow_external_search: boolean }) => void;
  personalKnowledge: PersonalWeaponKnowledgeEntry[];
  onSaveKnowledge?: (draft: SavePersonalWeaponKnowledgeInput["entry"]) => void;
  onSetKnowledgeEnabled?: (id: string, enabled: boolean) => void;
  onDeleteKnowledge?: (id: string) => void;
}) {
  const status = props.analysis?.status ?? "idle";
  const isFixedExotic = props.model.identity.is_exotic && props.model.configuration.kind === "fixed";
  const [knowledgeMode, setKnowledgeMode] = useState<"pve" | "pvp" | "general">("general");
  const [knowledgeTitle, setKnowledgeTitle] = useState("");
  const [knowledgePerks, setKnowledgePerks] = useState("");
  const [knowledgeMasterwork, setKnowledgeMasterwork] = useState("");
  const [knowledgeMod, setKnowledgeMod] = useState("");
  const [knowledgeReason, setKnowledgeReason] = useState("");
  const [knowledgeUrl, setKnowledgeUrl] = useState("");
  const [editingKnowledgeId, setEditingKnowledgeId] = useState<string | undefined>();
  return (
    <>
      <SectionHeading eyebrow="AI 分析" title="结合这件武器与知识库分析" description="用户指定知识优先，其次使用内置知识库，AI 外部查询优先级最低。" />
      <div className="weapon-detail-ai-layout">
        <div className="weapon-detail-ai-analysis">
          {props.analysis?.message ? <p className={`status-message status-${status === "error" ? "error" : status === "ready" ? "ready" : "pending"}`} role="status">{props.analysis.message}</p> : null}
          {props.analysis?.body ? <article className="weapon-detail-ai-result" data-ui-kind="callout" data-callout-tone="ai"><span>AI 生成 · 可以查看依据</span><h4>{props.analysis.title ?? `${props.model.identity.name}分析`}</h4><p>{props.analysis.body}</p>{props.analysis.evidence?.length ? <dl>{props.analysis.evidence.map((entry) => <div key={entry.label}><dt>{entry.label}</dt><dd>{entry.value}</dd></div>)}</dl> : null}</article> : <EmptyState text="运行分析后，这里会显示结论和使用依据。" />}
          {props.analysis?.externalSearchMessage ? <p className="weapon-detail-note">{props.analysis.externalSearchMessage}</p> : null}
          {props.analysis?.externalSources?.length ? (
            <section className="weapon-detail-external-sources" aria-label="AI 外部知识来源">
              <div className="weapon-detail-block-heading"><h4>外部知识来源</h4><span>最低优先级</span></div>
              <ul>{props.analysis.externalSources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title || source.url}</a><span>{formatStandardDateTime(source.queried_at)}</span></li>)}</ul>
            </section>
          ) : null}
        </div>
        <aside className="weapon-detail-ai-tools">
          <div className="weapon-detail-ai-input">
            <label htmlFor="weapon-analysis-prompt">询问这件武器</label>
            <textarea id="weapon-analysis-prompt" value={props.prompt} onChange={(event) => props.onPromptChange(event.target.value)} placeholder={isFixedExotic ? "例如：结合固定配置、当前催化剂状态和获取来源，分析 PvE 使用方向。" : "例如：结合这件武器的全部可切换 Perk，分析 PvE 推荐匹配情况。"} />
            <label className="weapon-detail-ai-external"><input type="checkbox" checked={props.allowExternalSearch} onChange={(event) => props.onAllowExternalSearchChange(event.target.checked)} />允许 AI 查询外部知识，必须保留引用</label>
            <button type="button" data-ui-kind="button" data-control-variant="ai" data-control-size="prominent" disabled={!props.onRun || status === "running"} onClick={() => props.onRun?.({ prompt: props.prompt, allow_external_search: props.allowExternalSearch })}>{status === "running" ? "分析中..." : "结合全部来源分析"}</button>
            <small>AI 结果不会自动进入可靠数据区，保存前必须由用户确认。</small>
          </div>
        </aside>
      </div>
      <section className="weapon-detail-knowledge">
        <div className="weapon-detail-block-heading"><h4>个人知识</h4><span>确认后持久化</span></div>
        {props.personalKnowledge.length ? (
          <div className="weapon-detail-knowledge-list">
            {props.personalKnowledge.map((entry) => (
              <article key={entry.id}>
                <div><strong>{entry.title}</strong><span>{entry.mode.toUpperCase()} · {entry.origin === "confirmed_external" ? "用户确认的外部知识" : "用户知识"} · {entry.enabled ? "已启用" : "已停用"}</span></div>
                <p>{entry.reason || entry.perk_options.flatMap((option) => option.names).join(" / ")}</p>
                <small>更新时间：{formatStandardDateTime(entry.updated_at, "未知")}</small>
                {entry.external_url ? <a href={entry.external_url} target="_blank" rel="noreferrer">查看保存的外部依据</a> : null}
                <div>
                  <button type="button" onClick={() => {
                    setEditingKnowledgeId(entry.id);
                    setKnowledgeMode(entry.mode);
                    setKnowledgeTitle(entry.title);
                    setKnowledgePerks(entry.perk_options.map((option) => `${option.column_key}: ${option.names.join("/")}`).join("；"));
                    setKnowledgeMasterwork(entry.masterwork_names.join(" / "));
                    setKnowledgeMod(entry.mod_names.join(" / "));
                    setKnowledgeReason(entry.reason);
                    setKnowledgeUrl(entry.external_url ?? "");
                  }}>修改</button>
                  <button type="button" onClick={() => props.onSetKnowledgeEnabled?.(entry.id, !entry.enabled)}>{entry.enabled ? "停用" : "启用"}</button>
                  <button type="button" onClick={() => props.onDeleteKnowledge?.(entry.id)}>删除</button>
                </div>
              </article>
            ))}
          </div>
        ) : <EmptyState text="还没有为这件武器保存个人知识。" />}
        {props.onSaveKnowledge ? (
          <div className="weapon-detail-knowledge-form">
            <label>模式<select value={knowledgeMode} onChange={(event) => setKnowledgeMode(event.target.value as typeof knowledgeMode)}><option value="general">通用</option><option value="pve">PvE</option><option value="pvp">PvP</option></select></label>
            <label>推荐名称<input value={knowledgeTitle} onChange={(event) => setKnowledgeTitle(event.target.value)} placeholder="例如：高难 PvE 通用配置" /></label>
            {!isFixedExotic ? <label>推荐 Perk<input value={knowledgePerks} onChange={(event) => setKnowledgePerks(event.target.value)} placeholder="枪管: A/B；Perk 1: C/D" /></label> : null}
            {!isFixedExotic ? <label>大师杰作<input value={knowledgeMasterwork} onChange={(event) => setKnowledgeMasterwork(event.target.value)} /></label> : null}
            {!isFixedExotic ? <label>武器模组<input value={knowledgeMod} onChange={(event) => setKnowledgeMod(event.target.value)} /></label> : null}
            <label className="is-wide">外部依据链接<input type="url" value={knowledgeUrl} onChange={(event) => setKnowledgeUrl(event.target.value)} placeholder="可选；保存外部知识时保留原始链接" /></label>
            <label className="is-wide">理由<textarea value={knowledgeReason} onChange={(event) => setKnowledgeReason(event.target.value)} placeholder={props.analysis?.body ? "可根据上方 AI 结论整理" : "说明适用玩法和理由"} /></label>
            <button
              type="button"
              disabled={!knowledgeTitle.trim()}
              onClick={() => props.onSaveKnowledge?.({
                id: editingKnowledgeId,
                weapon_name: props.model.identity.name,
                weapon_hash: props.model.identity.hash,
                mode: knowledgeMode,
                title: knowledgeTitle.trim(),
                perk_options: isFixedExotic ? [] : parseKnowledgePerkOptions(knowledgePerks),
                masterwork_names: isFixedExotic ? [] : splitKnowledgeValues(knowledgeMasterwork),
                mod_names: isFixedExotic ? [] : splitKnowledgeValues(knowledgeMod),
                reason: knowledgeReason.trim() || props.analysis?.body || "",
                enabled: true,
                origin: knowledgeUrl.trim() ? "confirmed_external" : "user",
                external_url: knowledgeUrl.trim() || undefined
              })}
            >{editingKnowledgeId ? "确认并更新" : "确认并保存"}</button>
          </div>
        ) : null}
      </section>
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

function normalizedLabel(value?: string): string {
  return (value ?? "").trim().toLocaleLowerCase();
}

function sameLabel(left?: string, right?: string): boolean {
  const normalizedLeft = normalizedLabel(left);
  return Boolean(normalizedLeft) && normalizedLeft === normalizedLabel(right);
}

function matchTargetPerks(model: WeaponDetailViewModel, columnKey: string, targetNames: string[], activeOnly: boolean): boolean {
  const matchedColumn = model.configuration.selection_columns.find((column) => (
    sameLabel(column.key, columnKey) || sameLabel(column.label, columnKey)
  ));
  const selectionCandidates = matchedColumn?.candidates
    ?? model.configuration.selection_columns.flatMap((column) => column.candidates);
  const definitionCandidates = [
    ...(model.configuration.intrinsic ? [model.configuration.intrinsic] : []),
    ...model.configuration.pool_columns.flatMap((column) => column.candidates),
    ...selectionCandidates
  ];

  return selectionCandidates.some((candidate) => {
    if (activeOnly && !candidate.selected) return false;
    const baseCandidate = candidate.enhanced_of_hash
      ? definitionCandidates.find((entry) => entry.hash === candidate.enhanced_of_hash)
      : undefined;
    return targetNames.some((targetName) => (
      sameLabel(targetName, candidate.name) || sameLabel(targetName, baseCandidate?.name)
    ));
  });
}

function matchFactLabel(hasObject: boolean, matched: boolean): string {
  return hasObject ? matched ? "命中" : "未命中" : "未选择实际对象";
}

function splitKnowledgeValues(value: string): string[] {
  return [...new Set(value.split(/[\/、,，]/).map((item) => item.trim()).filter(Boolean))];
}

function parseKnowledgePerkOptions(value: string): Array<{ column_key: string; names: string[] }> {
  return value.split(/[；;\n]/).flatMap((segment, index) => {
    const [rawColumn, ...rawNames] = segment.split(/[:：]/);
    const names = splitKnowledgeValues(rawNames.length ? rawNames.join(":") : rawColumn);
    if (!names.length) return [];
    return [{
      column_key: rawNames.length ? rawColumn.trim() || `Perk ${index + 1}` : `Perk ${index + 1}`,
      names
    }];
  });
}
