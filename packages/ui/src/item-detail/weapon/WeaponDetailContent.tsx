import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { formatStandardDateTime } from "../../time/formatTime.js";
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
  selectInstance?: (instance: WeaponDetailInstance) => void;
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
  { key: "overview", label: "属性与获取" },
  { key: "configuration", label: "武器配置" },
  { key: "recommendations", label: "目标匹配" },
  { key: "upgrades", label: "升级与锻造" },
  { key: "analysis", label: "AI 分析" }
];

export function WeaponDetailContent(props: WeaponDetailContentProps) {
  const { model } = props;
  const [internalSection, setInternalSection] = useState<WeaponDetailSection>("overview");
  const [poolOpen, setPoolOpen] = useState(true);
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
  const observedSectionRef = useRef<WeaponDetailSection>("overview");
  const sectionRefs = useRef<Record<WeaponDetailSection, HTMLElement | null>>({
    overview: null,
    configuration: null,
    recommendations: null,
    upgrades: null,
    analysis: null
  });

  useEffect(() => {
    setPoolOpen(true);
    setInternalSection("overview");
    setAnalysisPrompt("");
    setAllowExternalSearch(false);
    setTargetSource("dim");
    setInstanceRailOpen(false);
    observedSectionRef.current = "overview";
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
      let nextSection: WeaponDetailSection = "overview";
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
        >实例与操作</button>
      </nav>

      <div className="weapon-detail-workspace" data-surface="split">
        <div className="weapon-detail-sections" data-surface="content-stack">
          <section ref={(node) => { sectionRefs.current.overview = node; }} id={`${sectionIdPrefix}-overview`} className="weapon-detail-section">
            <OverviewSection model={model} onOpenSource={props.actions?.openSource} />
          </section>
          <section ref={(node) => { sectionRefs.current.configuration = node; }} id={`${sectionIdPrefix}-configuration`} className="weapon-detail-section">
            <ConfigurationSection
              model={model}
              poolOpen={poolOpen}
              onTogglePool={() => setPoolOpen((value) => !value)}
              actions={props.actions}
              configurationWriteFeedback={props.configurationWriteFeedback}
            />
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
          aria-label="当前实例与同名武器"
          onKeyDown={handleInstanceRailKeyDown}
        >
          <header className="weapon-detail-rail-drawer-head">
            <div><span>武器实例</span><strong>实例与操作</strong></div>
            <button
              ref={instanceRailCloseRef}
              type="button"
              className="weapon-detail-rail-close"
              data-ui-kind="button"
              data-control-variant="quiet"
              aria-label="关闭实例与操作栏"
              title="关闭"
              onClick={() => setInstanceRailOpen(false)}
            >×</button>
          </header>
          {props.instanceActions ? (
            <div className="weapon-detail-instance-actions">{props.instanceActions}</div>
          ) : (
            <div className="weapon-detail-instance-readonly">
              <h3>当前是只读对象</h3>
              <p>选择下方当前 Hash 的账号实例后，可执行装备、转移、锁定和本地整理。</p>
            </div>
          )}
          <InstancesRail
            model={model}
            onSelect={props.actions?.selectInstance ? (instance) => {
              props.actions?.selectInstance?.(instance);
              setInstanceRailOpen(false);
            } : undefined}
          />
        </aside>
      </div>
      <button
        type="button"
        className={["weapon-detail-rail-scrim", instanceRailOpen && "is-open"].filter(Boolean).join(" ")}
        data-ui-kind="button"
        data-control-variant="quiet"
        aria-label="关闭实例与操作"
        onClick={() => setInstanceRailOpen(false)}
      />
    </article>
  );
}

function WeaponIdentity(props: {
  model: WeaponDetailViewModel;
  onSelectVersion?: (hash: number) => void;
}) {
  const { identity, context, versions, configuration } = props.model;
  const currentVersion = versions.find((version) => version.is_current) ?? versions[0];
  return (
    <header className="weapon-detail-identity" data-surface="section">
      <div className="weapon-detail-identity-main">
        {identity.icon ? <img src={identity.icon} alt="" /> : <span className="weapon-detail-icon-placeholder" aria-hidden="true" />}
        <div>
          <div className="weapon-detail-identity-title-line">
            <span className="weapon-detail-version-badge" data-ui-part="state" data-text-tone="status" data-info-priority="support" data-status="success">当前装备版本</span>
            <span className="weapon-detail-identity-version" data-ui-part="detail" data-text-tone="meta" data-info-priority="trace">
              {currentVersion?.season_label ?? currentVersion?.label ?? "当前 Hash"}
            </span>
          </div>
          <h2 data-ui-part="value" data-text-tone="primary" data-info-priority="display">{identity.name}</h2>
          <p data-ui-part="detail" data-text-tone="body" data-info-priority="reading">{[identity.item_type, identity.frame?.name].filter(Boolean).join(" · ")}</p>
          <div className="weapon-detail-facts" aria-label="武器摘要">
            {identity.slot ? <Fact label={identity.slot} tone="slot" /> : null}
            {identity.ammo ? <Fact label={identity.ammo.label} icon={identity.ammo.icon} tone={`ammo-${identity.ammo.key}`} /> : null}
            {identity.damage ? <Fact label={identity.damage.label} icon={identity.damage.icon} title={identity.damage.description} tone={`damage-${identity.damage.key}`} /> : null}
            {identity.champion ? (
              <Fact
                label={identity.champion.label}
                icon={identity.champion.icon}
                title={`${identity.champion.label}：${identity.champion.effect_label}。${identity.champion.description ?? ""}`}
                tone={`champion-${identity.champion.key}`}
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="weapon-detail-identity-context">
        <dl className="weapon-detail-context">
          <div><dt data-ui-part="label" data-text-tone="meta" data-info-priority="support">入口</dt><dd data-ui-part="value" data-text-tone="primary" data-info-priority="context">{context.entry_label}</dd></div>
          <div><dt data-ui-part="label" data-text-tone="meta" data-info-priority="support">当前查看</dt><dd data-ui-part="value" data-text-tone="primary" data-info-priority="context">{context.object_label}</dd></div>
          <div><dt data-ui-part="label" data-text-tone="meta" data-info-priority="support">对象</dt><dd data-ui-part="value" data-text-tone="primary" data-info-priority="context">{contextKindLabel(context.kind)}</dd></div>
          <div><dt data-ui-part="label" data-text-tone="meta" data-info-priority="support">配置</dt><dd data-ui-part="value" data-text-tone="primary" data-info-priority="context">{configurationKindLabel(configuration.kind)}</dd></div>
          <div className="weapon-detail-version">
            <dt data-ui-part="label" data-text-tone="meta" data-info-priority="support">版本</dt>
            <dd data-ui-part="value" data-text-tone="primary" data-info-priority="context">
              {versions.length > 1 && props.onSelectVersion ? (
                <select
                  aria-label="选择装备版本"
                  value={currentVersion?.hash ?? identity.hash}
                  onChange={(event) => props.onSelectVersion?.(Number(event.target.value))}
                >
                  {versions.map((version) => (
                    <option key={version.hash} value={version.hash}>
                      {version.label}{version.season_label ? ` · ${version.season_label}` : ""}
                    </option>
                  ))}
                </select>
              ) : <strong>{currentVersion?.label ?? "当前 Hash"}</strong>}
            </dd>
            <span className="weapon-detail-version-state" data-ui-part="state" data-text-tone="status" data-info-priority="support" data-status="success">{currentVersion?.season_label ?? "当前版本"}</span>
          </div>
        </dl>
        <details className="weapon-detail-definition-details">
          <summary>武器定义信息</summary>
          <div>
            <dl><dt>官方描述</dt><dd>{identity.description || "当前 Manifest 未返回描述"}</dd></dl>
            <dl><dt>Manifest Hash</dt><dd>{identity.hash}</dd></dl>
            <dl><dt>数据来源</dt><dd>当前 Manifest{context.kind === "account_instance" ? " + Profile 实例" : context.kind === "vendor_offer" ? " + Vendor Offer" : ""}</dd></dl>
            <dl><dt>操作方式</dt><dd>{context.read_only ? "只读查看" : "可管理实例"}</dd></dl>
          </div>
        </details>
      </div>
    </header>
  );
}

function Fact(props: { label: string; icon?: string; tone?: string; title?: string }) {
  return (
    <span
      className={["weapon-detail-fact", props.tone].filter(Boolean).join(" ")}
      data-ui-part="value"
      data-text-tone="primary"
      data-info-priority="support"
      title={props.title}
      tabIndex={props.title ? 0 : undefined}
    >
      {props.icon ? <img src={props.icon} alt="" /> : null}
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
    ? "Manifest 定义 + Profile 当前实例"
    : props.model.context.kind === "vendor_offer"
      ? "Manifest 定义 + Vendor Offer"
      : "Manifest 定义";
  return (
    <>
      <SectionHeading eyebrow="属性与获取" title="属性与获取详情" description="区分资料库标准值、当前对象实际值和待应用配置变化。" />
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
                {showCurrent ? <span><i className="is-current" />当前实际值</span> : null}
                {showStandard ? <span><i className="is-standard" />资料库标准值</span> : null}
                {showPending ? <span><i className="is-pending" />待应用变化</span> : null}
              </div>
              {props.model.stats.map((stat) => (
                <StatTrack
                  key={stat.key}
                  stat={stat}
                  expectCurrent={expectCurrent}
                  showStandard={showStandard}
                  showPending={showPending}
                />
              ))}
            </div>
          ) : <EmptyState text="当前定义没有可显示的武器属性。" />}
        </section>
        <section className="weapon-detail-block" aria-labelledby="weapon-source-title">
          <DataBlockHeading
            id="weapon-source-title"
            title="官方获取来源"
            source={`Vendor / 活动轮换 / Manifest${props.model.sources.updated_at ? ` · ${formatUpdatedAt(props.model.sources.updated_at)}` : ""}`}
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
                    {source.icon ? <img src={source.icon} alt="" /> : null}
                    <strong data-ui-part="value" data-text-tone="primary" data-info-priority="context">{source.label}</strong>
                  </div>
                  <div className="weapon-detail-source-copy">
                    <p data-ui-part="detail" data-text-tone="body" data-info-priority="reading">{source.description}</p>
                    {source.offer?.purchase_requirements?.length ? <small>{source.offer.purchase_requirements.join(" / ")}</small> : null}
                    {source.offer?.can_purchase === false ? <small data-text-tone="status" data-status="warning">{source.offer.failure_messages.join(" / ") || "当前无法购买"}</small> : null}
                  </div>
                  <div className="weapon-detail-source-meta">
                    <span data-ui-part="state" data-text-tone={source.available_now === true ? "status" : "meta"} data-info-priority="support" data-status={source.available_now === true ? "success" : undefined}>{source.available_now === true ? "当前可获取" : "官方来源"}</span>
                    {source.offer?.inventory_path ? <span>{source.offer.inventory_path}</span> : null}
                    {source.offer?.price_labels.length ? <span>{source.offer.price_labels.join(" + ")}</span> : null}
                    {source.offer?.refresh_at ? <span>{formatStandardDateTime(source.offer.refresh_at)}</span> : null}
                    {source.updated_at ? <span>更新于 {formatUpdatedAt(source.updated_at)}</span> : null}
                    {props.onOpenSource ? <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={() => props.onOpenSource?.(source)}>查看</button> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : <EmptyState text="暂未查询到官方来源。" />}
          <p className="weapon-detail-data-note">{sourceStatusLabel(props.model.sources.status)}。实时来源读取失败时不显示旧 Offer。</p>
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
}) {
  const { stat } = props;
  const hasCurrent = props.expectCurrent && stat.current_value !== undefined;
  const currentUnavailable = props.expectCurrent && stat.current_value === undefined;
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
  const primaryValue = hasCurrent ? stat.current_value : stat.standard_value;
  return (
    <div className={[
      "weapon-detail-stat-row",
      !hasCurrent && "is-definition",
      ((hasCurrent && props.showStandard) || currentUnavailable) && "has-standard",
      props.showPending && "has-pending"
    ].filter(Boolean).join(" ")} style={style}>
      <strong>{stat.label}</strong>
      <span className="weapon-detail-stat-value">{primaryValue ?? "—"}</span>
      <span className="weapon-detail-stat-track" aria-hidden="true">
        {hasCurrent ? <i /> : null}
        {props.showStandard && stat.standard_value !== undefined ? <b /> : null}
        {props.showPending && stat.pending_delta ? <em className={stat.pending_delta > 0 ? "is-increase" : "is-decrease"} /> : null}
      </span>
      {hasCurrent && props.showStandard ? (
        <span className="weapon-detail-stat-comparison">
          <small>标准 {stat.standard_value ?? "—"}</small>
          {currentText ? <small className={`is-${currentTone}`}>{currentText}</small> : null}
          {stat.current_modifiers.length ? <small>{formatStatModifiers(stat.current_modifiers)}</small> : null}
        </span>
      ) : currentUnavailable ? <span className="weapon-detail-stat-comparison"><small>实际值未返回，当前显示标准值</small></span> : null}
      {props.showPending ? (
        <span className="weapon-detail-stat-comparison">
          <small className={`is-${pendingTone}`}>{pendingText}</small>
          {stat.pending_modifiers.length ? <small>{formatStatModifiers(stat.pending_modifiers)}</small> : null}
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
  const showSelection = context.kind !== "definition" && configuration.selection_columns.length > 0;
  const columns = showSelection ? configuration.selection_columns : configuration.pool_columns;
  const writeFeedback = props.configurationWriteFeedback ?? { status: "idle" as const };
  const isBusy = writeFeedback.status === "submitting" || writeFeedback.status === "refreshing";
  const pendingChangeCount = configuration.selection_columns.reduce(
    (count, column) => count + (column.candidates.some((candidate) => candidate.pending) ? 1 : 0),
    0
  );
  const panelState = writeFeedback.status === "idle" && configuration.has_pending_changes
    ? "pending"
    : writeFeedback.status;
  const showWritePanel = panelState !== "idle";
  const panelContent = configurationPanelContent(panelState, pendingChangeCount, writeFeedback.message);
  return (
    <>
      <SectionHeading
        eyebrow="武器配置"
        title={context.kind === "definition" ? "完整 Perk 池" : context.kind === "vendor_offer" ? "当前售卖配置" : "当前实例配置"}
        description={context.kind === "account_instance" ? "只允许切换当前实例真实拥有且可应用的 Perk。" : "当前对象为只读，不提供远程配置操作。"}
      />
      <DataBlockHeading
        title="配置数据"
        source={context.kind === "account_instance" ? "Profile 实例插槽 + Manifest Perk 定义 · 当前读取" : context.kind === "vendor_offer" ? "Vendor Offer + Manifest Perk 定义 · 当前读取" : "Manifest Perk 定义 · 当前读取"}
      />
      <div className="weapon-detail-config-summary">
        <span>{context.object_label}</span>
        <span>{configurationKindLabel(configuration.kind)}</span>
        <span>{context.read_only ? "只读" : "需要联网"}</span>
        <span>{context.kind === "account_instance" ? "Manifest + Profile 当前实例" : context.kind === "vendor_offer" ? "Manifest + Vendor Offer" : "Manifest 定义"}</span>
      </div>
      <div className="weapon-detail-config-grid">
        {configuration.intrinsic ? <PerkColumn label="武器框架" role="intrinsic" candidates={[configuration.intrinsic]} /> : <div className="weapon-detail-intrinsic-empty">未返回武器框架</div>}
        {columns.map((column) => (
          <PerkColumn
            key={column.key}
            label={column.label}
            role={column.role}
            candidates={column.candidates}
            interactive={showSelection && context.kind === "account_instance" && !isBusy}
            onSelect={(perk) => props.actions?.stagePerk?.(column as WeaponPerkSelectionColumn, perk)}
          />
        ))}
      </div>

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

      {context.kind !== "definition" && configuration.pool_columns.length ? (
        <section className="weapon-detail-full-pool">
          <button type="button" data-ui-kind="button" data-control-variant="secondary" aria-expanded={props.poolOpen} onClick={props.onTogglePool}>
            <strong>{props.poolOpen ? "收起完整掉落池" : "查看完整掉落池"}</strong>
            <span>{props.poolOpen ? "收起" : `展开 ${countPool(configuration.pool_columns)} 个候选`}</span>
          </button>
          {props.poolOpen ? (
            <><div className="weapon-detail-pool-grid">
              {configuration.pool_columns.map((column) => <PerkColumn key={column.key} label={column.label} role={column.role} candidates={column.candidates} />)}
            </div><p className="weapon-detail-note">这里只展示可能掉落的候选，不标记当前已选状态；实例未拥有的 Perk 不能远程安装。</p></>
          ) : null}
        </section>
      ) : null}
    </>
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
      return { title: "正在提交武器配置", step: "第 1/2 步", message: message ?? "正在将 Perk 更改提交到 Bungie..." };
    case "refreshing":
      return { title: "正在同步最新配置", step: "第 2/2 步", message: message ?? "正在读取服务器返回的实例状态..." };
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
            ? selection.pending ? "待应用" : selection.selected ? "已选" : selection.can_apply ? "本实例拥有 · 可切换" : "本实例拥有"
            : undefined;
          const content = <>{stateLabel || perk.enhanced_of_hash ? <small>{[stateLabel, perk.enhanced_of_hash ? "强化版本" : undefined].filter(Boolean).join(" · ")}</small> : null}{perk.icon ? <img src={perk.icon} alt="" /> : null}<span><strong>{perk.name}</strong><p>{perk.description}</p></span></>;
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
      <SectionHeading eyebrow="目标匹配" title="独立数据源目标匹配" description="DIM Wishlist、社区推荐和个人知识分别匹配，不合并、不排序，也不生成应用结论。" />
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
  return (
    <article className="weapon-detail-recommendation">
      <header>
        <div>
          <h4>{recommendation.title}</h4>
          <p>{recommendation.source_label} · {recommendation.mode.toUpperCase()}{recommendation.updated_at ? ` · ${formatUpdatedAt(recommendation.updated_at)}` : ""}</p>
        </div>
        {recommendation.external_url ? <a href={recommendation.external_url} target="_blank" rel="noreferrer">查看原始来源</a> : <span>本地数据</span>}
      </header>
      {recommendation.reason ? <p className="weapon-detail-source-quote">{recommendation.reason}</p> : null}
      {perkMatches.length ? (
        <div className="weapon-detail-match-grid">
          <div><span>目标插槽</span><strong>实例拥有</strong><strong>当前启用</strong></div>
          {perkMatches.map((option) => (
            <div key={option.column_key}>
              <span>{option.column_key}<small>目标：{option.names.join(" / ")}</small></span>
              <strong className={hasObject ? option.owned ? "is-hit" : "is-miss" : undefined}>{matchFactLabel(hasObject, option.owned)}</strong>
              <strong className={hasObject ? option.active ? "is-hit" : "is-miss" : undefined}>{matchFactLabel(hasObject, option.active)}</strong>
            </div>
          ))}
        </div>
      ) : <p className="weapon-detail-match-empty">该来源没有指定随机 Perk 目标。</p>}
      <div className="weapon-detail-match-summary">
        <span>Perk：{!perkMatches.length ? "未指定" : !hasObject ? "未选择实际对象" : `${perkMatches.filter((option) => option.owned).length}/${perkMatches.length} 实例拥有 · ${perkMatches.filter((option) => option.active).length}/${perkMatches.length} 当前启用`}</span>
        <span>大师杰作：{recommendation.masterwork_names.length ? matchFactLabel(hasObject, masterworkMatch) : "未指定"}</span>
        <span>武器模组：{recommendation.mod_names.length ? matchFactLabel(hasObject, modMatch) : "未指定"}</span>
      </div>
    </article>
  );
}

function UpgradeSection({ model }: { model: WeaponDetailViewModel }) {
  const { upgrades } = model;
  const objectSource = model.context.kind === "account_instance"
    ? "Profile 当前实例"
    : model.context.kind === "vendor_offer"
      ? "Vendor Offer"
      : "Manifest 定义";
  const rows = [
    upgrades.masterwork ? { key: "masterwork", label: "大师杰作", current: `${upgrades.masterwork.name}${upgrades.masterwork.level ? ` · ${upgrades.masterwork.level} 级` : ""}`, detail: `${upgrades.masterwork.complete ? "已完成" : "未完成"}${upgrades.masterwork.stat_amount ? ` · 属性 ${upgrades.masterwork.stat_amount > 0 ? "+" : ""}${upgrades.masterwork.stat_amount}` : ""}`, source: objectSource } : null,
    upgrades.mod ? { key: "mod", label: "武器模组", current: upgrades.mod.name, detail: upgrades.mod.description, source: objectSource } : null,
    upgrades.catalyst ? { key: "catalyst", label: "催化剂", current: upgrades.catalyst.name, detail: upgrades.catalyst.complete ? "已完成并生效" : upgrades.catalyst.acquired ? `进度 ${upgrades.catalyst.progress ?? 0}%` : "尚未获取", source: "Profile + Manifest" } : null,
    upgrades.enhancement ? { key: "enhancement", label: "强化阶级", current: upgrades.enhancement.name, detail: upgrades.enhancement.level !== undefined ? `当前 ${upgrades.enhancement.level} 阶` : "当前装备强化状态", source: objectSource } : null,
    upgrades.crafting_level !== undefined ? { key: "crafting", label: "锻造等级", current: `${upgrades.crafting_level} 级`, detail: upgrades.enhanced ? "已包含强化能力" : "未强化", source: objectSource } : null
  ].filter((row): row is NonNullable<typeof row> => Boolean(row));
  return (
    <>
      <SectionHeading eyebrow="升级与锻造" title={upgrades.catalyst ? "催化剂、杰作与当前进度" : "大师杰作、模组与强化"} description="当前对象状态与定义能力分别标明来源，不把未返回的信息补成结论。" />
      <DataBlockHeading title="升级状态" source="Profile 进度 + Manifest 定义 · 当前读取" />
      <div className={["weapon-detail-upgrade-layout", !upgrades.catalyst && "without-catalyst"].filter(Boolean).join(" ")}>
        {upgrades.catalyst ? <article className="weapon-detail-catalyst"><div><strong>{upgrades.catalyst.name}</strong><span>{upgrades.catalyst.objective ?? "未返回完成条件"}</span></div><progress value={upgrades.catalyst.progress ?? (upgrades.catalyst.complete ? 100 : 0)} max={100} /><p>{upgrades.catalyst.acquisition ? `获取：${upgrades.catalyst.acquisition}` : "未返回催化剂获取方式"}</p>{upgrades.catalyst.effects.length ? <ul>{upgrades.catalyst.effects.map((effect) => <li key={effect}>{effect}</li>)}</ul> : null}</article> : null}
        {rows.length ? (
          <div className="weapon-detail-upgrade-table" role="table" aria-label="升级与锻造状态">
            <div role="row"><strong role="columnheader">项目</strong><strong role="columnheader">当前对象</strong><strong role="columnheader">状态</strong><strong role="columnheader">数据来源</strong></div>
            {rows.map((row) => <div key={row.key} role="row"><strong role="cell">{row.label}</strong><span role="cell">{row.current}</span><span role="cell">{row.detail}</span><span role="cell">{row.source}</span></div>)}
          </div>
        ) : <EmptyState text="当前对象没有可显示的升级或附加能力。" />}
      </div>
    </>
  );
}

function InstancesRail(props: { model: WeaponDetailViewModel; onSelect?: (instance: WeaponDetailInstance) => void }) {
  return (
    <section className="weapon-detail-rail-instances">
      <div className="weapon-detail-rail-heading">
        <div><span>当前 Hash</span><h3>同名实例</h3></div>
        <strong>{props.model.same_hash_instances.length} 件</strong>
      </div>
      {props.model.same_hash_instances.length ? (
        <div className="weapon-detail-instance-list" role="list">
          {props.model.same_hash_instances.map((instance, index) => {
            const perkIcons = instance.plug_names.slice(0, 4).map((name) => ({ name, icon: findPerkIcon(props.model, name) }));
            const upgrade = instanceUpgradeLabel(instance);
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
                <header><strong>实例 {index + 1}</strong><span>{instance.location} · {instance.power ?? "光等未知"}</span></header>
                <span className="weapon-detail-instance-perks" aria-label={instance.plug_names.slice(0, 4).join("、") || "配置未返回"}>
                  {perkIcons.map((perk, perkIndex) => perk.icon
                    ? <img key={`${perk.name}-${perkIndex}`} src={perk.icon} alt="" title={perk.name} />
                    : <i key={`${perk.name}-${perkIndex}`} title={perk.name} aria-hidden="true" />)}
                </span>
                <strong className="weapon-detail-instance-roll">{instance.plug_names.slice(0, 4).join(" / ") || "配置未返回"}</strong>
                <span className="weapon-detail-instance-meta">
                  {upgrade ? <span>{upgrade}</span> : null}
                  <span>{instanceStateLabel(instance)}</span>
                  {instance.local_tag ? <span>{instanceTagLabel(instance.local_tag)}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : <EmptyState text="账号中没有当前版本的同名武器。" />}
      <p className="weapon-detail-rail-note">仅显示当前版本、当前 Hash 的账号实例。</p>
    </section>
  );
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
      <SectionHeading eyebrow="AI 分析" title="结合当前对象与知识库分析" description="用户指定知识优先，其次使用内置知识库，AI 外部查询优先级最低。" />
      <div className="weapon-detail-ai-layout">
        <div className="weapon-detail-ai-analysis">
          {props.analysis?.message ? <p className={`status-message status-${status === "error" ? "error" : status === "ready" ? "ready" : "pending"}`} role="status">{props.analysis.message}</p> : null}
          {props.analysis?.body ? <article className="weapon-detail-ai-result"><span>AI 生成 · 可以查看依据</span><h4>{props.analysis.title ?? `${props.model.identity.name}分析`}</h4><p>{props.analysis.body}</p>{props.analysis.evidence?.length ? <dl>{props.analysis.evidence.map((entry) => <div key={entry.label}><dt>{entry.label}</dt><dd>{entry.value}</dd></div>)}</dl> : null}</article> : <EmptyState text="运行分析后，这里会显示结论和使用依据。" />}
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
            <textarea id="weapon-analysis-prompt" value={props.prompt} onChange={(event) => props.onPromptChange(event.target.value)} placeholder="例如：结合我当前实例的全部可切换 Perk，分析 PvE 推荐匹配情况。" />
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
            <label>推荐 Perk<input value={knowledgePerks} onChange={(event) => setKnowledgePerks(event.target.value)} placeholder="枪管: A/B；Perk 1: C/D" /></label>
            <label>大师杰作<input value={knowledgeMasterwork} onChange={(event) => setKnowledgeMasterwork(event.target.value)} /></label>
            <label>武器模组<input value={knowledgeMod} onChange={(event) => setKnowledgeMod(event.target.value)} /></label>
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
                perk_options: parseKnowledgePerkOptions(knowledgePerks),
                masterwork_names: splitKnowledgeValues(knowledgeMasterwork),
                mod_names: splitKnowledgeValues(knowledgeMod),
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

function sourceStatusLabel(status: WeaponDetailViewModel["sources"]["status"]) {
  return status === "ready" ? "来源完整" : status === "partial" ? "来源可能不完整" : "来源未知";
}

function contextKindLabel(kind: WeaponDetailViewModel["context"]["kind"]) {
  if (kind === "account_instance") return "账号实例";
  if (kind === "vendor_offer") return "商人 Offer";
  return "装备定义";
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

function findPerkIcon(model: WeaponDetailViewModel, name: string): string | undefined {
  const candidates = [
    ...(model.configuration.intrinsic ? [model.configuration.intrinsic] : []),
    ...model.configuration.selection_columns.flatMap((column) => column.candidates),
    ...model.configuration.pool_columns.flatMap((column) => column.candidates)
  ];
  return candidates.find((candidate) => sameLabel(candidate.name, name))?.icon;
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
