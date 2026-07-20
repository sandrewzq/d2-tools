import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type {
  ArmorDetailInstance,
  ArmorDetailViewModel,
  ArmorRecommendation,
  ArmorStatTrack
} from "@d2-tools/app/items";

export type ArmorDetailSection = "overview" | "ability" | "mods" | "recommendations" | "instances" | "analysis";

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

const sectionLabels: Array<{ key: ArmorDetailSection; label: string }> = [
  { key: "overview", label: "属性与获取" },
  { key: "ability", label: "护甲能力" },
  { key: "mods", label: "模组与升级" },
  { key: "recommendations", label: "玩法推荐" },
  { key: "instances", label: "我的同名护甲" },
  { key: "analysis", label: "AI 分析" }
];

export function ArmorDetailContent(props: ArmorDetailContentProps) {
  const [internalSection, setInternalSection] = useState<ArmorDetailSection>("overview");
  const [analysisPrompt, setAnalysisPrompt] = useState("这件护甲是否值得购买或保留，适合什么属性方向和玩法？");
  const [allowExternalSearch, setAllowExternalSearch] = useState(false);
  const section = props.activeSection ?? internalSection;
  const sectionIdPrefix = useId();
  const detailRef = useRef<HTMLElement>(null);
  const observedSectionRef = useRef<ArmorDetailSection>("overview");
  const sectionRefs = useRef<Record<ArmorDetailSection, HTMLElement | null>>({
    overview: null,
    ability: null,
    mods: null,
    recommendations: null,
    instances: null,
    analysis: null
  });

  useEffect(() => {
    setInternalSection("overview");
    observedSectionRef.current = "overview";
  }, [props.model.identity.hash, props.model.context.object_id, props.model.context.kind]);

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
  }, [props.activeSection, props.model.context.object_id, props.model.identity.hash, props.onSectionChange]);

  const changeSection = (next: ArmorDetailSection) => {
    observedSectionRef.current = next;
    if (props.activeSection === undefined) setInternalSection(next);
    props.onSectionChange?.(next);
    sectionRefs.current[next]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <article ref={detailRef} className={["armor-detail", props.className].filter(Boolean).join(" ")} aria-busy={props.model.loading}>
      <ArmorIdentity model={props.model} />
      <nav className="armor-detail-nav" aria-label="护甲详情章节">
        <div>
          {sectionLabels.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-current={section === item.key ? "location" : undefined}
              aria-controls={`${sectionIdPrefix}-${item.key}`}
              className={section === item.key ? "is-active" : undefined}
              onClick={() => changeSection(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>
      <div className="armor-detail-sections">
        <section ref={(node) => { sectionRefs.current.overview = node; }} id={`${sectionIdPrefix}-overview`} className="armor-detail-section">
          <OverviewSection model={props.model} />
        </section>
        <section ref={(node) => { sectionRefs.current.ability = node; }} id={`${sectionIdPrefix}-ability`} className="armor-detail-section">
          <AbilitySection model={props.model} />
        </section>
        <section ref={(node) => { sectionRefs.current.mods = node; }} id={`${sectionIdPrefix}-mods`} className="armor-detail-section">
          <ModsSection model={props.model} />
        </section>
        <section ref={(node) => { sectionRefs.current.recommendations = node; }} id={`${sectionIdPrefix}-recommendations`} className="armor-detail-section">
          <RecommendationSection model={props.model} />
        </section>
        <section ref={(node) => { sectionRefs.current.instances = node; }} id={`${sectionIdPrefix}-instances`} className="armor-detail-section">
          <InstancesSection model={props.model} onSelect={props.actions?.selectInstance} actions={props.instanceActions} />
        </section>
        <section ref={(node) => { sectionRefs.current.analysis = node; }} id={`${sectionIdPrefix}-analysis`} className="armor-detail-section">
          <AnalysisSection
            model={props.model}
            analysis={props.analysis}
            prompt={analysisPrompt}
            allowExternalSearch={allowExternalSearch}
            onPromptChange={setAnalysisPrompt}
            onAllowExternalSearchChange={setAllowExternalSearch}
            onRun={props.actions?.runAnalysis}
          />
        </section>
      </div>
    </article>
  );
}

function ArmorIdentity(props: { model: ArmorDetailViewModel }) {
  const { identity, context } = props.model;
  const highest = highestStat(props.model.stats);
  const recommendation = props.model.recommendations[0];
  return (
    <header className="armor-detail-identity">
      <div className="armor-detail-identity-main">
        {identity.icon ? <img src={identity.icon} alt="" /> : <span className="armor-detail-icon-placeholder" aria-hidden="true" />}
        <div>
          <h2>{identity.name}</h2>
          <p>{[identity.tier && `${identity.tier}${identity.item_type ?? "护甲"}`, identity.class_name, context.object_label].filter(Boolean).join(" · ")}</p>
          <div className="armor-detail-facts" aria-label="护甲摘要">
            {identity.tier ? <Fact label={identity.tier} tone={/异域|exotic/i.test(identity.tier) ? "exotic" : "legendary"} /> : null}
            {identity.item_type ? <Fact label={identity.item_type} /> : null}
            {identity.class_name ? <Fact label={identity.class_name} /> : null}
            <Fact label={context.kind === "vendor_offer" ? "当前在售" : context.kind === "account_item" ? "账号装备" : "装备信息"} tone={context.kind === "definition" ? "info" : "ready"} />
          </div>
        </div>
      </div>
      <dl className="armor-detail-summary">
        <div><dt>当前状态</dt><dd>{context.object_label}</dd></div>
        <div><dt>属性情况</dt><dd>{highest ? `总计 ${props.model.stat_total ?? "—"} · ${highest.label}最高` : context.kind === "vendor_offer" ? "暂未获取售卖属性" : "选择账号装备后显示"}</dd></div>
        <div><dt>账号持有</dt><dd>{props.model.same_hash_instances.length} 件同名护甲</dd></div>
        <div><dt>推荐方向</dt><dd>{recommendation?.value ?? "暂无应用推荐"}</dd></div>
      </dl>
    </header>
  );
}

function OverviewSection(props: { model: ArmorDetailViewModel }) {
  const highest = highestStat(props.model.stats);
  return (
    <>
      <SectionHeading eyebrow="属性与获取" title="属性与获取详情" description="装备信息页说明能力与获取方式；商人售卖和账号装备显示实际六维属性。" />
      <div className="armor-detail-overview-grid">
        <section className="armor-detail-block">
          <BlockHeading title="这件护甲的属性" meta={props.model.stats.length ? props.model.context.object_label : "暂无实际属性"} />
          {props.model.stats.length ? (
            <>
              <div className="armor-detail-stat-summary">
                <div><span>当前总属性</span><strong>{props.model.stat_total ?? "—"}</strong></div>
                <div><span>最高属性</span><strong>{highest ? `${highest.label} ${highest.value}` : "—"}</strong></div>
                <div><span>升级状态</span><strong>{energyLabel(props.model.energy)}</strong></div>
              </div>
              <div className="armor-detail-stat-list">
                {props.model.stats.map((stat) => <ArmorStatRow key={stat.key} stat={stat} />)}
              </div>
            </>
          ) : (
            <EmptyState text={props.model.context.kind === "vendor_offer"
              ? "当前售卖暂未返回可显示的六维属性。"
              : "同名护甲的实际属性会因商人售卖或账号中的装备而不同，请切换到对应内容查看。"} />
          )}
        </section>
        <section className="armor-detail-block">
          <BlockHeading title="获取方式" meta={sourceStatusLabel(props.model.sources.status)} />
          {props.model.sources.entries.length ? (
            <div className="armor-detail-source-list">
              {props.model.sources.entries.map((source) => (
                <article key={source.id} className="armor-detail-source-row">
                  <div><strong>{source.label}</strong><p>{source.description}</p></div>
                  <span className={source.available_now === false ? "is-muted" : undefined}>{source.status_label ?? (source.available_now ? "当前可获得" : "来源已记录")}</span>
                </article>
              ))}
            </div>
          ) : <EmptyState text="这件护甲的获取方式暂未确认。" />}
          <p className="armor-detail-note">获取方式和商人售卖状态会同时展示；账号持有情况与 AI 分析不会改写这些信息。</p>
        </section>
      </div>
    </>
  );
}

function AbilitySection(props: { model: ArmorDetailViewModel }) {
  const isExotic = /异域|exotic/i.test(props.model.identity.tier ?? "");
  return (
    <>
      <SectionHeading eyebrow="护甲能力" title="护甲能力与装备规则" description="这里会显示异域固有能力、套装效果、特殊护甲效果或额外插槽。" />
      <div className="armor-detail-ability-grid">
        <div className="armor-detail-ability-list">
          {props.model.abilities.length ? props.model.abilities.map((ability) => (
            <article key={ability.hash} className={isExotic ? "is-exotic" : undefined}>
              {ability.icon ? <img src={ability.icon} alt="" /> : null}
              <div><span>{isExotic ? "异域固有能力" : "护甲能力"}</span><h4>{ability.name}</h4><p>{ability.description}</p></div>
            </article>
          )) : <EmptyState text="资料库暂未提供可确认的护甲固有能力。" />}
        </div>
        <dl className="armor-detail-capabilities">
          <div><dt>适用职业</dt><dd>{props.model.identity.class_name ?? "所有职业"}</dd><span>装备要求</span></div>
          <div><dt>护甲部位</dt><dd>{props.model.identity.bucket_name ?? props.model.identity.item_type ?? "护甲"}</dd><span>支持对应部位模组</span></div>
          <div><dt>随机属性</dt><dd>每件商人售卖或账号装备可能拥有不同属性分布</dd><span>每件可能不同</span></div>
          {isExotic ? <div><dt>异域限制</dt><dd>同一时间只能装备一件异域护甲</dd><span>装备规则</span></div> : null}
        </dl>
      </div>
    </>
  );
}

function ModsSection(props: { model: ArmorDetailViewModel }) {
  const hasCurrentConfiguration = props.model.context.kind !== "definition";
  return (
    <>
      <SectionHeading eyebrow="模组与升级" title={hasCurrentConfiguration ? "这件装备的模组与升级" : "支持的模组与升级"} description={hasCurrentConfiguration ? "显示当前安装内容和能量状态，推荐搭配单独列出。" : "装备基础信息不会把推荐模组显示成已安装。"} />
      <div className="armor-detail-mod-grid">
        <section className="armor-detail-block">
          <BlockHeading title="插槽与当前配置" meta={hasCurrentConfiguration ? "当前装备" : "装备信息"} />
          {props.model.sockets.length ? (
            <div className="armor-detail-socket-list">
              {props.model.sockets.map((socket) => (
                <article key={socket.key} data-kind={socket.kind}>
                  {socket.icon ? <img src={socket.icon} alt="" /> : null}
                  <div><span>{socket.label}</span><strong>{socket.name}</strong><p>{socket.description ?? "当前插槽内容"}</p></div>
                </article>
              ))}
            </div>
          ) : <EmptyState text={hasCurrentConfiguration ? "当前没有可显示的已安装模组。" : "选择商人售卖或账号装备后查看实际模组配置。"} />}
        </section>
        <aside className="armor-detail-block">
          <BlockHeading title="推荐模组与升级" meta="应用推荐" />
          {props.model.recommendations.length ? (
            <div className="armor-detail-recommendation-list">
              {props.model.recommendations.map((recommendation) => <RecommendationCard key={recommendation.id} recommendation={recommendation} />)}
            </div>
          ) : <EmptyState text="暂无可确认的模组与升级推荐。可在 AI 分析中结合你的玩法继续询问。" />}
        </aside>
      </div>
    </>
  );
}

function RecommendationSection(props: { model: ArmorDetailViewModel }) {
  return (
    <>
      <SectionHeading eyebrow="玩法推荐" title="属性目标与配装适配" description="推荐会结合属性方向、职业玩法、模组和大师杰作，帮助判断是否值得购买或保留。" />
      <div className="armor-detail-recommendation-grid">
        <div>
          {props.model.recommendations.length
            ? props.model.recommendations.map((recommendation) => <RecommendationCard key={recommendation.id} recommendation={recommendation} />)
            : <EmptyState text="当前没有已保存的护甲推荐。AI 可以解释现有属性，但不会把推测写成固定结论。" />}
        </div>
        <aside className="armor-detail-recommendation-sources">
          <article><strong>1 · 我的推荐</strong><p>优先使用你已经保存的属性与玩法偏好。</p></article>
          <article><strong>2 · 应用推荐</strong><p>提供属性目标、模组组合和职业玩法建议。</p></article>
          <article><strong>3 · 在线补充推荐</strong><p>只补充缺失信息，不覆盖装备与售卖信息。</p></article>
        </aside>
      </div>
    </>
  );
}

function InstancesSection(props: { model: ArmorDetailViewModel; onSelect?: (instance: ArmorDetailInstance) => void; actions?: ReactNode }) {
  return (
    <>
      <SectionHeading eyebrow="账号护甲" title="我的同名护甲" description="集中比较账号中的同名护甲；选择一件后，属性、模组、升级状态和 AI 分析会同步更新。" />
      {props.model.same_hash_instances.length ? (
        <div className="armor-detail-instance-list">
          {props.model.same_hash_instances.map((instance, index) => (
            <button
              key={instance.instance_id}
              type="button"
              className={instance.current ? "is-current" : undefined}
              disabled={instance.current || !props.onSelect}
              onClick={() => props.onSelect?.(instance)}
            >
              {instance.icon ? <img src={instance.icon} alt="" /> : <span className="armor-detail-instance-icon" aria-hidden="true" />}
              <span><strong>{instance.equipped ? "当前装备" : `同名护甲 ${index + 1}`}</strong><small>{instance.location}{instance.power ? ` · ${instance.power} 光等` : ""}</small></span>
              <span><strong>{instance.stats ? `总属性 ${instance.stats.total}` : "属性暂未获取"}</strong><small>{instance.stats ? instanceHighlights(instance.stats) : "打开后查看实际属性"}</small></span>
              <span><strong>{energyLabel(instance.energy)}</strong><small>{instance.locked ? "已锁定" : "未锁定"}</small></span>
              <span>{instance.current ? "正在查看" : "查看这件"}</span>
            </button>
          ))}
        </div>
      ) : <EmptyState text="当前账号中没有这件同版本护甲，或账号装备尚未读取。" />}
      {props.actions}
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
  const analysis = props.analysis;
  return (
    <>
      <SectionHeading eyebrow="智能分析" title="AI 护甲分析" description="分析内容会随装备信息、当前商人售卖或选中的账号装备变化。" />
      <div className="armor-detail-ai-grid">
        <article className="armor-detail-ai-result">
          <span>AI 生成 · 可以查看依据</span>
          <h4>{analysis?.title ?? `${props.model.identity.name}分析`}</h4>
          <p>{analysis?.body ?? analysis?.message ?? defaultAnalysis(props.model)}</p>
          {analysis?.evidence?.length ? <dl>{analysis.evidence.map((entry) => <div key={entry.label}><dt>{entry.label}</dt><dd>{entry.value}</dd></div>)}</dl> : null}
          {analysis?.externalSources?.length ? (
            <ul>{analysis.externalSources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title ?? source.url}</a></li>)}</ul>
          ) : null}
        </article>
        <div className="armor-detail-ai-input">
          <label htmlFor="armor-detail-question">询问这件护甲</label>
          <textarea id="armor-detail-question" value={props.prompt} onChange={(event) => props.onPromptChange(event.target.value)} />
          <label className="armor-detail-ai-external"><input type="checkbox" checked={props.allowExternalSearch} onChange={(event) => props.onAllowExternalSearchChange(event.target.checked)} />在线补充推荐</label>
          <button type="button" className="primary-button" disabled={!props.onRun || analysis?.status === "running"} onClick={() => props.onRun?.({ prompt: props.prompt, allow_external_search: props.allowExternalSearch })}>{analysis?.status === "running" ? "正在分析…" : "分析这件护甲"}</button>
        </div>
      </div>
    </>
  );
}

function SectionHeading(props: { eyebrow: string; title: string; description: string }) {
  return <div className="armor-detail-section-heading"><span>{props.eyebrow}</span><div><h3>{props.title}</h3><p>{props.description}</p></div></div>;
}

function BlockHeading(props: { title: string; meta: string }) {
  return <div className="armor-detail-block-heading"><h4>{props.title}</h4><span>{props.meta}</span></div>;
}

function Fact(props: { label: string; tone?: string }) {
  return <span className={["armor-detail-fact", props.tone].filter(Boolean).join(" ")}>{props.label}</span>;
}

function ArmorStatRow(props: { stat: ArmorStatTrack }) {
  const width = Math.max(0, Math.min(100, (props.stat.value / 45) * 100));
  const style = { "--armor-stat-width": `${width}%` } as CSSProperties;
  return (
    <div className="armor-detail-stat-row">
      <strong>{props.stat.label}</strong><span>{props.stat.value}</span>
      <i style={style} aria-hidden="true" />
      <small>{props.stat.base !== undefined ? `基础 ${props.stat.base}` : ""}{props.stat.mod ? ` · 加成 +${props.stat.mod}` : ""}</small>
    </div>
  );
}

function RecommendationCard(props: { recommendation: ArmorRecommendation }) {
  return (
    <article className="armor-detail-recommendation">
      <header><span>{props.recommendation.source_label}</span>{props.recommendation.match ? <strong data-match={props.recommendation.match}>{props.recommendation.match === "full" ? "达到目标" : props.recommendation.match === "partial" ? "部分达到" : "未达到"}</strong> : null}</header>
      <h4>{props.recommendation.title}</h4><strong>{props.recommendation.value}</strong><p>{props.recommendation.reason}</p>
    </article>
  );
}

function EmptyState(props: { text: string }) {
  return <p className="armor-detail-empty">{props.text}</p>;
}

function highestStat(stats: ArmorStatTrack[]): ArmorStatTrack | undefined {
  return stats.reduce<ArmorStatTrack | undefined>((highest, stat) => !highest || stat.value > highest.value ? stat : highest, undefined);
}

function energyLabel(energy: ArmorDetailViewModel["energy"]): string {
  if (!energy) return "升级状态暂未获取";
  return `${energy.capacity} 级能量 · 剩余 ${energy.unused}`;
}

function sourceStatusLabel(status: ArmorDetailViewModel["sources"]["status"]): string {
  if (status === "ready") return "获取方式已更新";
  if (status === "partial") return "已记录部分来源";
  return "获取方式暂未确认";
}

function instanceHighlights(stats: NonNullable<ArmorDetailInstance["stats"]>): string {
  const entries = [
    ["生命值", stats.health], ["近战", stats.melee], ["手雷", stats.grenade],
    ["超能", stats.super], ["职业", stats.class], ["武器", stats.weapon]
  ] as const;
  return [...entries].sort((left, right) => right[1] - left[1]).slice(0, 2).map(([label, value]) => `${label} ${value}`).join(" · ");
}

function defaultAnalysis(model: ArmorDetailViewModel): string {
  const highest = highestStat(model.stats);
  if (highest) return `这件护甲总属性为 ${model.stat_total ?? "暂未获取"}，当前最高属性是${highest.label}。可以继续结合职业玩法、已安装模组和你的属性目标进行判断。`;
  if (model.context.kind === "vendor_offer") return "当前商人售卖暂未返回实际属性，可以先查看获取方式和护甲能力，但不会生成不存在的售卖属性。";
  return "当前查看的是装备基础信息。实际六维属性需要查看商人售卖或账号中的装备。";
}
