import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode
} from "react";
import type {
  ArmorDetailInstance,
  ArmorDetailViewModel,
  ArmorRecommendation,
  ArmorStatTrack
} from "@d2-tools/app/items";
import type { ItemReleaseKind } from "@d2-tools/core/items/release";
import { GameAssetImage } from "../../media/GameAssetImage.js";
import { formatStandardDateTime } from "../../time/formatTime.js";

export type ArmorDetailSection = "overview" | "configuration" | "targets" | "upgrades" | "analysis";

export type ArmorDetailContentActions = {
  selectInstance?: (instance: ArmorDetailInstance) => void;
  runAnalysis?: (request: { prompt: string; allow_external_search: boolean }) => void;
};

export type ArmorDetailAnalysis = {
  status?: "idle" | "running" | "ready" | "error";
  title?: string;
  body?: string;
  evidence?: Array<{ label: string; value: string }>;
  externalSources?: Array<{ title?: string; url: string; queried_at: string }>;
  externalSearchMessage?: string;
  message?: string;
};

export type ArmorDetailContentProps = {
  model: ArmorDetailViewModel;
  actions?: ArmorDetailContentActions;
  analysis?: ArmorDetailAnalysis;
  activeSection?: ArmorDetailSection;
  onSectionChange?: (section: ArmorDetailSection) => void;
  instanceActions?: ReactNode;
  className?: string;
};

type ArmorTargetSource = "personal" | "loadout" | "community";

const sectionLabels: Array<{ key: ArmorDetailSection; label: string }> = [
  { key: "overview", label: "属性与获取" },
  { key: "configuration", label: "护甲配置" },
  { key: "targets", label: "目标匹配" },
  { key: "upgrades", label: "升级状态" },
  { key: "analysis", label: "AI 分析" }
];

export function ArmorDetailContent(props: ArmorDetailContentProps) {
  const { model } = props;
  const [internalSection, setInternalSection] = useState<ArmorDetailSection>("overview");
  const [analysisPrompt, setAnalysisPrompt] = useState("结合当前实例、目标匹配和获取来源分析这件护甲。");
  const [allowExternalSearch, setAllowExternalSearch] = useState(false);
  const [instanceRailOpen, setInstanceRailOpen] = useState(false);
  const section = props.activeSection ?? internalSection;
  const sectionIdPrefix = useId();
  const detailRef = useRef<HTMLElement>(null);
  const instanceRailRef = useRef<HTMLElement>(null);
  const instanceRailTriggerRef = useRef<HTMLButtonElement>(null);
  const instanceRailCloseRef = useRef<HTMLButtonElement>(null);
  const observedSectionRef = useRef<ArmorDetailSection>("overview");
  const sectionRefs = useRef<Record<ArmorDetailSection, HTMLElement | null>>({
    overview: null,
    configuration: null,
    targets: null,
    upgrades: null,
    analysis: null
  });

  useEffect(() => {
    setInternalSection("overview");
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
      const activationLine = scrollRoot.getBoundingClientRect().top + 96;
      let next: ArmorDetailSection = "overview";
      for (const item of sectionLabels) {
        const element = sectionRefs.current[item.key];
        if (element && element.getBoundingClientRect().top <= activationLine) next = item.key;
      }
      if (observedSectionRef.current === next) return;
      observedSectionRef.current = next;
      if (props.activeSection === undefined) setInternalSection(next);
      props.onSectionChange?.(next);
    };
    scrollRoot.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    updateActiveSection();
    return () => {
      scrollRoot.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [model.context.object_id, model.identity.hash, props.activeSection, props.onSectionChange]);

  const changeSection = (next: ArmorDetailSection) => {
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
    <>
      <article
        ref={detailRef}
        className={["armor-detail", props.className].filter(Boolean).join(" ")}
        data-contract-root="detail-dossier"
        data-contract-id="armor.detail"
        data-detail-contract="detail.dossier"
        data-layout="hybrid-workspace"
        data-surface="page"
        data-state={model.loading ? "loading" : "normal"}
        aria-busy={model.loading}
      >
        <ArmorIdentity model={model} />

        <nav className="armor-detail-nav" data-ui-kind="section-navigation" aria-label="护甲详情章节">
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
            className="armor-detail-rail-toggle"
            data-ui-kind="button"
            data-control-variant="secondary"
            aria-expanded={instanceRailOpen}
            aria-controls={`${sectionIdPrefix}-instance-rail`}
            onClick={() => setInstanceRailOpen((value) => !value)}
          >实例与操作</button>
        </nav>

        <div className="armor-detail-workspace" data-surface="split">
          <div className="armor-detail-sections" data-surface="content-stack">
            <section ref={(node) => { sectionRefs.current.overview = node; }} id={`${sectionIdPrefix}-overview`} className="armor-detail-section">
              <OverviewSection model={model} />
            </section>
            <section ref={(node) => { sectionRefs.current.configuration = node; }} id={`${sectionIdPrefix}-configuration`} className="armor-detail-section">
              <ConfigurationSection model={model} />
            </section>
            <section ref={(node) => { sectionRefs.current.targets = node; }} id={`${sectionIdPrefix}-targets`} className="armor-detail-section">
              <TargetSection model={model} />
            </section>
            <section ref={(node) => { sectionRefs.current.upgrades = node; }} id={`${sectionIdPrefix}-upgrades`} className="armor-detail-section">
              <UpgradeSection model={model} />
            </section>
            <section ref={(node) => { sectionRefs.current.analysis = node; }} id={`${sectionIdPrefix}-analysis`} className="armor-detail-section">
              <AnalysisSection
                model={model}
                analysis={props.analysis}
                prompt={analysisPrompt}
                allowExternalSearch={allowExternalSearch}
                onPromptChange={setAnalysisPrompt}
                onAllowExternalSearchChange={setAllowExternalSearch}
                onRun={props.actions?.runAnalysis}
              />
            </section>
          </div>

          <aside
            ref={instanceRailRef}
            id={`${sectionIdPrefix}-instance-rail`}
            className={["armor-detail-instance-rail", instanceRailOpen && "is-open"].filter(Boolean).join(" ")}
            data-surface="drawer"
            data-ui-kind="drawer"
            data-scroll-region="pane"
            aria-label="当前实例与同名护甲"
            onKeyDown={handleInstanceRailKeyDown}
          >
            <header className="armor-detail-rail-drawer-head">
              <div><span>护甲实例</span><strong>实例与操作</strong></div>
              <button
                ref={instanceRailCloseRef}
                type="button"
                className="armor-detail-rail-close"
                data-ui-kind="button"
                data-control-variant="quiet"
                aria-label="关闭实例与操作栏"
                title="关闭"
                onClick={() => setInstanceRailOpen(false)}
              >×</button>
            </header>
            {props.instanceActions ? (
              <div className="armor-detail-instance-actions">{props.instanceActions}</div>
            ) : (
              <div className="armor-detail-instance-readonly" data-status="neutral">
                <span>当前对象只读</span>
                <h3>{model.context.object_label}</h3>
                <p>从下方选择账号中的同 Hash 护甲后，可执行装备、转移、锁定、标签和备注操作。</p>
              </div>
            )}
            <InstancesRail model={model} onSelect={props.actions?.selectInstance} />
          </aside>
        </div>
      </article>
      <button
        type="button"
        className={["armor-detail-rail-scrim", instanceRailOpen && "is-open"].filter(Boolean).join(" ")}
        data-ui-kind="button"
        data-control-variant="quiet"
        aria-label="关闭实例与操作栏"
        onClick={() => setInstanceRailOpen(false)}
      />
    </>
  );
}

function ArmorIdentity({ model }: { model: ArmorDetailViewModel }) {
  const { identity, context } = model;
  const feature = identity.armor_set
    ? { label: identity.armor_set.name, tone: "set", title: identity.armor_set.description }
    : model.abilities[0]
      ? { label: model.abilities[0].name, tone: "ability", title: model.abilities[0].description }
      : undefined;
  const releaseLabel = identity.release?.description ?? "官方定义未提供发布信息";
  const versionLabel = identity.definition_version?.label ?? "定义版本资料未返回";
  const versionStatus = identity.definition_version ? "success" : "neutral";
  const releaseStatus = identity.release?.status === "ready" ? "success" : "neutral";
  const releaseTrace = identity.release?.description ?? "发布资料未返回";
  const watermarks = identity.definition_version?.watermark_icons ?? [];
  const currentWatermark = identity.definition_version?.current_watermark_icon;
  return (
    <header className="armor-detail-identity" data-surface="section">
      <div className="armor-detail-identity-main">
        <GameAssetImage src={identity.icon} alt="" loading="eager" fallback={<span className="armor-detail-icon-placeholder" aria-hidden="true" />} />
        <div>
          <div className="armor-detail-identity-title-line">
            <span className="armor-detail-version-badge" data-ui-part="state" data-text-tone="status" data-info-priority="support" data-status={versionStatus}>当前定义版本</span>
            <span className="armor-detail-identity-version" data-ui-part="source" data-text-tone="meta" data-info-priority="trace">{releaseLabel}</span>
          </div>
          <h2 data-ui-part="value" data-text-tone="primary" data-info-priority="display">{identity.name}</h2>
          <p data-ui-part="detail" data-text-tone="body" data-info-priority="reading">{[identity.tier, identity.item_type, identity.class_name].filter(Boolean).join(" · ")}</p>
          <div className="armor-detail-facts" aria-label="护甲摘要">
            {identity.tier ? <Fact label={identity.tier} tone={/异域|exotic/i.test(identity.tier) ? "exotic" : "legendary"} /> : null}
            {identity.item_type ? <Fact label={identity.item_type} /> : null}
            {identity.class_name ? <Fact label={identity.class_name} /> : null}
            {feature ? <Fact label={feature.label} tone={feature.tone} title={feature.title} /> : <Fact label="套装或固有能力未返回" tone="incomplete" />}
          </div>
        </div>
      </div>

      <div className="armor-detail-identity-context">
        <dl className="armor-detail-context-ledger">
          <div><dt>入口</dt><dd>{context.entry_label}</dd></div>
          <div><dt>当前查看</dt><dd>{context.object_label}</dd></div>
          <div><dt>对象</dt><dd>{contextKindLabel(context.kind)}</dd></div>
          <div><dt>位置</dt><dd>{identity.bucket_name ?? identity.item_type ?? "护甲"}</dd></div>
          <div className="armor-detail-context-version" data-status={versionStatus}><dt>版本</dt><dd><strong>{versionLabel}</strong>{currentWatermark ? <span className="armor-detail-version-watermarks"><GameAssetImage src={currentWatermark} alt="当前官方版本水印" title="当前官方定义版本水印" loading="eager" /></span> : null}</dd><span data-ui-part="state" data-text-tone="status" data-info-priority="trace" data-status={releaseStatus}>{releaseTrace}</span></div>
        </dl>
        <details className="armor-detail-definition-details">
          <summary>护甲定义信息</summary>
          <div>
            <dl><dt>装备 Hash</dt><dd>{identity.hash}</dd></dl>
            <dl><dt>发布版本</dt><dd>{identity.release?.description ?? "资料未返回"}</dd></dl>
            <dl><dt>赛季 Hash</dt><dd>{identity.release?.season_hash ?? "资料未返回"}</dd></dl>
            <dl><dt>发布类型</dt><dd>{armorReleaseKindLabel(identity.release?.kind)}</dd></dl>
            <dl><dt>定义版本</dt><dd>{identity.definition_version?.label ?? "资料未返回"}</dd></dl>
            <dl><dt>光等上限 Hash</dt><dd>{identity.definition_version?.power_cap_hash ?? "资料未返回"}</dd></dl>
            <dl><dt>版本水印</dt><dd>{watermarks.length ? <span className="armor-detail-definition-watermarks">{watermarks.map((icon, index) => <GameAssetImage key={`${icon}:${index}`} src={icon} alt={`官方版本水印 ${index + 1}`} title="官方定义版本水印" loading="eager" />)}</span> : "资料未返回"}</dd></dl>
            <dl><dt>职业限制</dt><dd>{identity.class_name ?? "所有职业"}</dd></dl>
            <dl><dt>护甲部位</dt><dd>{identity.bucket_name ?? identity.item_type ?? "护甲"}</dd></dl>
              <dl><dt>套装或固有能力</dt><dd>{identity.armor_set?.name ?? (model.abilities.map((ability) => ability.name).join(" / ") || "资料未返回")}</dd></dl>
            <dl><dt>套装 Hash</dt><dd>{identity.armor_set?.hash ?? "资料未返回"}</dd></dl>
            <dl className="is-wide"><dt>定义说明</dt><dd>{identity.description || "当前游戏资料未返回额外说明"}</dd></dl>
          </div>
        </details>
      </div>
    </header>
  );
}

function armorReleaseKindLabel(kind: ItemReleaseKind | undefined): string {
  if (kind === "season") return "赛季";
  if (kind === "annual") return "年度资料片";
  if (kind === "dlc") return "内容包";
  if (kind === "core") return "常规版本";
  if (kind === "update") return "版本更新";
  return "官方未标注";
}

function OverviewSection({ model }: { model: ArmorDetailViewModel }) {
  const baseTotal = confirmedBaseTotal(model.stats);
  return (
    <>
      <SectionHeading eyebrow="属性与获取" title="属性与获取详情" description="属性只展示基础值和当前实际值；获取来源只使用当前已确认数据。" />
      <div className={["armor-detail-overview-grid", !model.stats.length && "is-stat-empty"].filter(Boolean).join(" ")}>
        <section className="armor-detail-data-block">
          <DataBlockHeading title="护甲属性" source={model.stats.length ? model.context.kind === "vendor_offer" ? "商人 Offer 实际值" : "账号当前实例 · 已确认" : "护甲定义没有固定属性"} />
          {model.stats.length ? (
            <>
              <div className="armor-detail-stat-summary">
                <div><span>基础总属性</span><strong>{baseTotal ?? "未返回"}</strong></div>
                <div><span>当前总属性</span><strong>{model.stat_total ?? sumCurrentStats(model.stats)}</strong></div>
                <div><span>升级状态</span><strong>{energyLabel(model.energy)}</strong></div>
              </div>
              <p className="armor-detail-stat-note">当前实际值只包含接口可确认归属于这件护甲的数值；未返回的角色级加成不会补入。</p>
              <div className="armor-detail-stat-list">
                {model.stats.map((stat) => <ArmorStatRow key={stat.key} stat={stat} />)}
              </div>
            </>
          ) : (
            <EmptyState text={model.context.kind === "vendor_offer"
              ? "当前没有可显示的售卖属性；不会回退展示旧 Offer 的属性。"
              : "护甲定义没有固定六维属性，实际属性只存在于商人 Offer 或账号实例。"} />
          )}
        </section>

        <section className="armor-detail-data-block">
          <DataBlockHeading title="获取来源" source={sourceStatusLabel(model.sources.status)} />
          {model.sources.entries.length ? (
            <div className="armor-detail-source-ledger">
              {model.sources.entries.map((source) => (
                <article key={source.id} className="armor-detail-source-row" data-surface="row" data-status={source.available_now === true ? "success" : source.available_now === false ? "warning" : "neutral"}>
                  <strong>{source.label}</strong>
                  <p>{source.description}</p>
                  <span className={source.available_now === false ? "is-muted" : undefined}>{source.status_label ?? (source.available_now ? "当前可获得" : "来源已记录")}</span>
                </article>
              ))}
            </div>
          ) : <EmptyState text="这件护甲的获取方式暂未确认。" />}
          <p className="armor-detail-note">获取方式和当前售卖状态分别展示；实时读取失败时不回退显示旧 Offer。</p>
        </section>
      </div>
    </>
  );
}

function ConfigurationSection({ model }: { model: ArmorDetailViewModel }) {
  const isExotic = /异域|exotic/i.test(model.identity.tier ?? "");
  const armorSet = model.identity.armor_set;
  const configurationSockets = model.sockets.filter((socket) => socket.kind !== "upgrade");
  const hasCurrentConfiguration = model.context.kind !== "definition";
  return (
    <>
      <SectionHeading
        eyebrow="护甲配置"
        title={isExotic ? "异域能力与当前配置" : armorSet ? "套装效果与当前配置" : "固定能力与当前配置"}
        description={hasCurrentConfiguration ? "固定能力、官方套装规则和当前实例实际插槽分别展示。" : "资料库定义只说明固定能力、套装规则和支持的插槽。"}
      />
      <DataBlockHeading title="配置数据" source="游戏资料 + 当前账号配置 · 当前确认" />
      <div className="armor-detail-configuration">
        <div className="armor-detail-configuration-grid">
          <div className="armor-detail-core-features">
            {armorSet ? <ArmorSetBonus armorSet={armorSet} /> : null}
            {model.abilities.length ? model.abilities.map((ability) => (
              <article key={ability.hash} className={["armor-detail-core-feature", isExotic && "is-exotic"].filter(Boolean).join(" ")}>
                <GameAssetImage className="game-definition-icon" src={ability.icon} alt="" loading="eager" fallback={<span className="armor-detail-core-feature-icon" aria-hidden="true" />} />
                <div><span>{isExotic ? "异域固有能力" : "护甲能力"}</span><h4>{ability.name}</h4><p>{ability.description}</p><small>固定能力与实例随机属性分开显示。</small></div>
              </article>
            )) : !armorSet ? <EmptyState text="当前游戏资料未返回可确认的固定护甲能力。" /> : null}
          </div>
          <div className="armor-detail-capability-table">
            <CapabilityRow label="适用职业" value={model.identity.class_name ?? "所有职业"} status="装备要求" />
            <CapabilityRow label="护甲部位" value={model.identity.bucket_name ?? model.identity.item_type ?? "护甲"} status="部位规则" />
            <CapabilityRow label="随机属性" value="每件商人 Offer 或账号实例可能拥有不同属性分布" status="每件可能不同" />
            <CapabilityRow label="当前对象" value={model.context.object_label} status={model.context.read_only ? "只读" : "可管理"} />
            {isExotic ? <CapabilityRow label="异域限制" value="同一时间只能装备一件异域护甲" status="装备规则" /> : null}
          </div>
        </div>

        <div className="armor-detail-socket-block">
          <div className="armor-detail-socket-heading">
            <strong>{hasCurrentConfiguration ? `${configurationSockets.length} 个当前配置插槽` : `${configurationSockets.length} 个已确认插槽`}</strong>
            <span>{hasCurrentConfiguration ? model.context.object_label : "当前装备版本"}</span>
          </div>
          {configurationSockets.length ? configurationSockets.map((socket) => (
            <article key={socket.key} className={socket.kind === "special" ? "is-special" : undefined}>
              <strong>{socket.label}</strong>
              <div><GameAssetImage className="game-definition-icon" src={socket.icon} alt="" loading="eager" /><p>{socket.name}</p></div>
              <small>{socket.description ?? (hasCurrentConfiguration ? "当前已安装内容" : "定义支持内容")}</small>
            </article>
          )) : <EmptyState text={hasCurrentConfiguration ? "当前对象没有返回可显示的护甲配置插槽。" : "当前定义没有返回可确认的玩家配置插槽。"} />}
        </div>
      </div>
    </>
  );
}

function ArmorSetBonus(props: { armorSet: NonNullable<ArmorDetailViewModel["identity"]["armor_set"]> }) {
  const bonuses = props.armorSet.bonuses ?? [];
  return (
    <section className="armor-detail-set-bonus" aria-label={`${props.armorSet.name}套装效果`}>
      <header>
        <div><span>套装效果</span><h4>{props.armorSet.name}</h4></div>
        <small>官方套装 Hash {props.armorSet.hash}</small>
      </header>
      {props.armorSet.description ? <p className="armor-detail-set-description">{props.armorSet.description}</p> : null}
      {bonuses.length ? (
        <ol>
          {bonuses.map((bonus) => (
            <li key={`${bonus.required_piece_count}:${bonus.perk_hash}`}>
              <strong>{bonus.required_piece_count} 件套</strong>
              <GameAssetImage className="game-definition-icon" src={bonus.icon} alt="" loading="eager" fallback={<span className="armor-detail-set-perk-icon" aria-hidden="true" />} />
              <div><b>{bonus.name ?? `套装效果 Hash ${bonus.perk_hash}`}</b><p>{bonus.description ?? "官方套装效果定义未返回说明。"}</p></div>
            </li>
          ))}
        </ol>
      ) : <EmptyState text="官方套装定义未返回可确认的套装效果。" />}
    </section>
  );
}

function TargetSection({ model }: { model: ArmorDetailViewModel }) {
  const [source, setSource] = useState<ArmorTargetSource>("personal");
  const panelId = useId();
  const recommendationsBySource: Record<ArmorTargetSource, ArmorRecommendation[]> = {
    personal: model.recommendations.filter((recommendation) => recommendation.source_label === "我的推荐"),
    loadout: model.recommendations.filter((recommendation) => recommendation.source_label === "应用推荐"),
    community: model.recommendations.filter((recommendation) => recommendation.source_label === "在线补充推荐")
  };
  const sourceOrder: ArmorTargetSource[] = ["personal", "loadout", "community"];
  const targets = recommendationsBySource[source];
  const handleSourceKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const currentIndex = sourceOrder.indexOf(source);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? sourceOrder.length - 1
        : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + sourceOrder.length) % sourceOrder.length;
    const nextSource = sourceOrder[nextIndex];
    event.preventDefault();
    setSource(nextSource);
    requestAnimationFrame(() => document.getElementById(`${panelId}-${nextSource}`)?.focus());
  };
  return (
    <>
      <SectionHeading eyebrow="目标匹配" title="独立数据源条件匹配" description="个人目标、配装与攻略要求、社区来源分别匹配，不合并排序，不生成保留或购买结论。" />
      <div className="armor-detail-target-tabs" data-ui-kind="segmented-control" role="tablist" aria-label="选择护甲目标数据源">
        {([[
          "personal", "个人目标"
        ], [
          "loadout", "配装与攻略"
        ], [
          "community", "社区来源"
        ]] as const).map(([key, label]) => (
          <button
            key={key}
            id={`${panelId}-${key}`}
            type="button"
            role="tab"
            aria-controls={`${panelId}-panel`}
            aria-selected={source === key}
            tabIndex={source === key ? 0 : -1}
            onClick={() => setSource(key)}
            onKeyDown={handleSourceKeyDown}
          >{label}<span>{recommendationsBySource[key].length}</span></button>
        ))}
      </div>
      <div id={`${panelId}-panel`} className="armor-detail-target-list" role="tabpanel" aria-labelledby={`${panelId}-${source}`}>
        {targets.length ? targets.map((recommendation) => <RecommendationCard key={recommendation.id} recommendation={recommendation} />) : <EmptyState text="当前来源没有护甲目标；不会从其他来源补齐。" />}
      </div>
    </>
  );
}

function UpgradeSection({ model }: { model: ArmorDetailViewModel }) {
  const upgradeSockets = model.sockets.filter((socket) => socket.kind === "upgrade");
  const baseTotal = confirmedBaseTotal(model.stats);
  const rows = [
    model.energy ? { key: "capacity", label: "能量容量", definition: "当前接口可确认", current: `${model.energy.capacity} 级`, source: "账号最新状态" } : null,
    model.energy ? { key: "usage", label: "能量使用", definition: "已用与剩余能量", current: `已用 ${model.energy.used} · 剩余 ${model.energy.unused}`, source: "账号最新状态" } : null,
    baseTotal !== undefined ? { key: "stats", label: "属性变化", definition: `基础 ${baseTotal}`, current: `当前 ${model.stat_total ?? sumCurrentStats(model.stats)}`, source: "账号属性与模组" } : null,
    ...upgradeSockets.map((socket) => ({ key: socket.key, label: socket.label, definition: socket.description ?? "升级类插槽", current: socket.name, source: model.context.kind === "definition" ? "游戏资料" : "账号最新状态" }))
  ].filter((row): row is NonNullable<typeof row> => Boolean(row));
  return (
    <>
      <SectionHeading eyebrow="升级状态" title="能量与当前升级状态" description="只展示当前升级事实；材料成本没有可靠数据时不补造。" />
      <DataBlockHeading title="升级数据" source={rows.length ? "账号最新状态 + 游戏规则 · 当前确认" : "当前对象未返回可确认升级数据"} />
      <div className="armor-detail-upgrade-layout">
        <div className="armor-detail-upgrade-summary">
          <div><span>当前能量</span><strong>{model.energy ? `${model.energy.capacity} 级` : "未返回"}</strong></div>
          <div><span>已用能量</span><strong>{model.energy?.used ?? "未返回"}</strong></div>
          <div><span>剩余能量</span><strong>{model.energy?.unused ?? "未返回"}</strong></div>
          <div><span>升级插槽</span><strong>{upgradeSockets.length ? `${upgradeSockets.length} 项` : "未返回"}</strong></div>
        </div>
        {rows.length ? (
          <div className="armor-detail-upgrade-table" role="table" aria-label="护甲升级状态">
            <div role="row"><strong role="columnheader">项目</strong><strong role="columnheader">定义能力</strong><strong role="columnheader">当前对象</strong><strong role="columnheader">数据来源</strong></div>
            {rows.map((row) => <div key={row.key} role="row"><strong role="cell">{row.label}</strong><span role="cell">{row.definition}</span><span role="cell">{row.current}</span><span role="cell">{row.source}</span></div>)}
          </div>
        ) : <EmptyState text="当前对象没有返回可确认的升级状态。" />}
      </div>
    </>
  );
}

function AnalysisSection(props: {
  model: ArmorDetailViewModel;
  analysis?: ArmorDetailAnalysis;
  prompt: string;
  allowExternalSearch: boolean;
  onPromptChange: (value: string) => void;
  onAllowExternalSearchChange: (value: boolean) => void;
  onRun?: (request: { prompt: string; allow_external_search: boolean }) => void;
}) {
  const status = props.analysis?.status ?? "idle";
  return (
    <>
      <SectionHeading eyebrow="智能分析" title="AI 护甲分析" description="只有这里生成主观分析；事实区和目标匹配区不会给出购买、保留或升级建议。" />
      <div className="armor-detail-ai-layout" aria-busy={status === "running"}>
        <div className="armor-detail-ai-analysis">
          {props.analysis?.message || status === "running" ? <p className={`status-message status-${status === "error" ? "error" : status === "ready" ? "ready" : "pending"}`} role="status">{props.analysis?.message ?? "正在分析这件护甲..."}</p> : null}
          {props.analysis?.body ? (
            <article className="armor-detail-ai-result">
              <span>AI 生成 · 用户尚未确认</span>
              <h4>{props.analysis.title ?? `${props.model.identity.name}分析`}</h4>
              <p>{props.analysis.body}</p>
              {props.analysis.evidence?.length ? <dl>{props.analysis.evidence.map((entry) => <div key={entry.label}><dt>{entry.label}</dt><dd>{entry.value}</dd></div>)}</dl> : null}
            </article>
          ) : <EmptyState text="运行分析后，这里会显示主观结论和使用依据。" />}
          {props.analysis?.externalSearchMessage ? <p className="armor-detail-note">{props.analysis.externalSearchMessage}</p> : null}
          {props.analysis?.externalSources?.length ? (
            <section className="armor-detail-external-sources" aria-label="AI 外部知识来源">
              <DataBlockHeading title="外部知识来源" source="最低优先级" />
              <ul>{props.analysis.externalSources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title ?? source.url}</a><span>{formatStandardDateTime(source.queried_at)}</span></li>)}</ul>
            </section>
          ) : null}
        </div>
        <aside className="armor-detail-ai-tools">
          <label htmlFor="armor-detail-question">询问这件护甲</label>
          <textarea id="armor-detail-question" value={props.prompt} onChange={(event) => props.onPromptChange(event.target.value)} />
          <label className="armor-detail-ai-external"><input type="checkbox" checked={props.allowExternalSearch} onChange={(event) => props.onAllowExternalSearchChange(event.target.checked)} />允许 AI 查询外部知识，必须保留引用</label>
          <button type="button" data-ui-kind="button" data-control-variant="ai" data-control-size="prominent" disabled={!props.onRun || status === "running"} onClick={() => props.onRun?.({ prompt: props.prompt, allow_external_search: props.allowExternalSearch })}>{status === "running" ? "正在分析..." : "分析这件护甲"}</button>
          <small>AI 结果不会自动进入可靠数据区。</small>
        </aside>
      </div>
    </>
  );
}

function InstancesRail(props: { model: ArmorDetailViewModel; onSelect?: (instance: ArmorDetailInstance) => void }) {
  return (
    <section className="armor-detail-rail-instances">
      <div className="armor-detail-rail-heading">
        <div><span>当前 Hash</span><h3>同名实例</h3></div>
        <strong>{props.model.same_hash_instances.length} 件</strong>
      </div>
      {props.model.same_hash_instances.length ? (
        <div className="armor-detail-instance-list" role="list">
          {props.model.same_hash_instances.map((instance, index) => (
            <button
              key={instance.instance_id}
              type="button"
              role="listitem"
              className={instance.current ? "is-current" : undefined}
              aria-current={instance.current ? "true" : undefined}
              onClick={() => props.onSelect?.(instance)}
              disabled={!props.onSelect}
            >
              <header><strong>{instance.equipped ? "当前装备" : `实例 ${index + 1}`}</strong><span>{instance.location}{instance.power ? ` · ${instance.power}` : ""}</span></header>
              <div className="armor-detail-instance-total"><strong>{instance.stats?.total ?? "—"}</strong><span>{energyLabel(instance.energy)}</span></div>
              {instance.stats ? <div className="armor-detail-stat-strip">{instanceStatEntries(instance).map(([label, value]) => <span key={label}>{label}<b>{value}</b></span>)}</div> : <small className="armor-detail-instance-no-stats">属性暂未获取</small>}
              <div className="armor-detail-instance-foot">
                <span>{instance.locked === undefined ? "锁定状态未知" : instance.locked ? "已锁定" : "未锁定"}</span>
                <span>{instance.equipped ? "已装备" : "未装备"}</span>
                {instance.plug_names.slice(0, 2).map((name, plugIndex) => <span key={`${name}-${plugIndex}`}>{name}</span>)}
              </div>
            </button>
          ))}
        </div>
      ) : <EmptyState text="账号中没有当前版本、当前 Hash 的同名护甲。" />}
      <p className="armor-detail-rail-note">仅显示当前版本、当前 Hash 的账号实例；装备和转移仍受职业兼容性限制。</p>
    </section>
  );
}

function SectionHeading(props: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="armor-detail-section-heading">
      <div><span data-ui-part="label" data-text-tone="meta" data-info-priority="support">{props.eyebrow}</span><h3 data-ui-part="value" data-text-tone="primary" data-info-priority="display">{props.title}</h3></div>
      <p data-ui-part="detail" data-text-tone="body" data-info-priority="reading">{props.description}</p>
    </div>
  );
}

function DataBlockHeading(props: { title: string; source: string }) {
  return <div className="armor-detail-data-heading"><h4 data-ui-part="value" data-text-tone="primary" data-info-priority="context">{props.title}</h4><span data-ui-part="source" data-text-tone="meta" data-info-priority="trace">{props.source}</span></div>;
}

function Fact(props: { label: string; tone?: string; title?: string }) {
  return <span className={["armor-detail-fact", props.tone].filter(Boolean).join(" ")} title={props.title} data-ui-part="value" data-text-tone="primary" data-info-priority="support">{props.label}</span>;
}

function CapabilityRow(props: { label: string; value: string; status: string }) {
  return <div><strong>{props.label}</strong><span>{props.value}</span><em>{props.status}</em></div>;
}

function ArmorStatRow({ stat }: { stat: ArmorStatTrack }) {
  const base = stat.base;
  const baseWidth = Math.max(0, Math.min(100, ((base ?? stat.value) / 45) * 100));
  const currentWidth = Math.max(0, Math.min(100, (stat.value / 45) * 100));
  const style = {
    "--armor-stat-base": `${baseWidth}%`,
    "--armor-stat-current": `${currentWidth}%`
  } as CSSProperties;
  return (
    <div className="armor-detail-stat-row" data-surface="row">
      <strong>{stat.label}</strong>
      <span className="armor-detail-stat-base">{base !== undefined ? `基础 ${base}` : "基础未返回"}</span>
      <i style={style} aria-hidden="true"><b className="is-current" /><b className="is-base" /></i>
      <span className="armor-detail-stat-current">{stat.value}</span>
      {stat.mod ? <small>已确认加成 +{stat.mod}</small> : null}
    </div>
  );
}

function RecommendationCard({ recommendation }: { recommendation: ArmorRecommendation }) {
  const match = recommendationMatch(recommendation.match);
  return (
    <article className="armor-detail-recommendation" data-surface="object-card" data-ui-kind="object-card">
      <header><div><h4>{recommendation.title}</h4><p>{recommendation.source_label} · 独立来源</p></div><span>条件匹配</span></header>
      <div className="armor-detail-condition-list">
        <div><span>目标条件</span><strong>{recommendation.value}</strong><em>来源定义</em></div>
        <div data-status={recommendation.match === "full" ? "success" : "warning"}><span>当前事实</span><strong>{recommendation.match ? `当前对象：${match}` : "当前对象没有可确认匹配数据"}</strong><em className={recommendation.match === "full" ? "is-hit" : recommendation.match ? "is-miss" : "is-unknown"}>{match}</em></div>
      </div>
      <p className="armor-detail-source-quote">{recommendation.reason}</p>
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="armor-detail-empty">{text}</p>;
}

function confirmedBaseTotal(stats: ArmorStatTrack[]): number | undefined {
  return stats.length && stats.every((stat) => stat.base !== undefined)
    ? stats.reduce((total, stat) => total + (stat.base ?? 0), 0)
    : undefined;
}

function sumCurrentStats(stats: ArmorStatTrack[]): number {
  return stats.reduce((total, stat) => total + stat.value, 0);
}

function energyLabel(energy: ArmorDetailViewModel["energy"]): string {
  if (!energy) return "升级状态未返回";
  return `${energy.capacity} 级能量 · 剩余 ${energy.unused}`;
}

function contextKindLabel(kind: ArmorDetailViewModel["context"]["kind"]): string {
  if (kind === "vendor_offer") return "商人 Offer";
  if (kind === "account_item") return "账号实例";
  return "护甲定义";
}

function sourceStatusLabel(status: ArmorDetailViewModel["sources"]["status"]): string {
  if (status === "ready") return "商人实时数据 + 游戏资料 · 当前确认";
  if (status === "partial") return "商人实时数据 + 游戏资料 · 部分可用";
  return "商人实时数据 + 游戏资料 · 尚未确认";
}

function recommendationMatch(match: ArmorRecommendation["match"]): string {
  if (match === "full") return "达到条件";
  if (match === "partial") return "部分达到";
  if (match === "none") return "未达到条件";
  return "无实例数据";
}

function instanceStatEntries(instance: ArmorDetailInstance): Array<[string, number]> {
  if (!instance.stats) return [];
  return [
    ["生", instance.stats.health],
    ["近", instance.stats.melee],
    ["雷", instance.stats.grenade],
    ["超", instance.stats.super],
    ["职", instance.stats.class],
    ["武", instance.stats.weapon]
  ];
}
