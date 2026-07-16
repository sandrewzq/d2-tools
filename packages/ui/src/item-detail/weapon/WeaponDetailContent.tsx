import { useEffect, useId, useState, type CSSProperties, type ReactNode } from "react";
import type {
  WeaponDetailInstance,
  WeaponDetailViewModel,
  WeaponPerkCandidate,
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
  | "instances"
  | "analysis";

export type WeaponDetailContentActions = {
  selectVersion?: (hash: number) => void;
  openSource?: (source: WeaponSourceEntry) => void;
  stagePerk?: (column: WeaponPerkSelectionColumn, perk: WeaponPerkCandidate) => void;
  cancelPendingPerks?: () => void;
  applyPendingPerks?: () => void;
  selectInstance?: (instance: WeaponDetailInstance) => void;
  runAnalysis?: (prompt: string) => void;
  saveKnowledge?: (draft: SavePersonalWeaponKnowledgeInput["entry"]) => void;
  setKnowledgeEnabled?: (id: string, enabled: boolean) => void;
  deleteKnowledge?: (id: string) => void;
};

export type WeaponDetailAnalysis = {
  status?: "idle" | "running" | "ready" | "error";
  title?: string;
  body?: string;
  evidence?: Array<{ label: string; value: string }>;
  message?: string;
};

export type WeaponDetailContentProps = {
  model: WeaponDetailViewModel;
  actions?: WeaponDetailContentActions;
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
  { key: "recommendations", label: "玩法推荐" },
  { key: "upgrades", label: "升级与附加能力" },
  { key: "instances", label: "我的同名武器" },
  { key: "analysis", label: "AI 分析" }
];

export function WeaponDetailContent(props: WeaponDetailContentProps) {
  const { model } = props;
  const [internalSection, setInternalSection] = useState<WeaponDetailSection>("overview");
  const [poolOpen, setPoolOpen] = useState(model.context.kind === "definition");
  const [analysisPrompt, setAnalysisPrompt] = useState("");
  const section = props.activeSection ?? internalSection;
  const sectionPanelId = useId();

  useEffect(() => {
    setPoolOpen(model.context.kind === "definition");
    setInternalSection("overview");
  }, [model.identity.hash, model.context.object_id, model.context.kind]);

  const changeSection = (next: WeaponDetailSection) => {
    if (props.activeSection === undefined) setInternalSection(next);
    props.onSectionChange?.(next);
  };

  return (
    <article className={["weapon-detail", props.className].filter(Boolean).join(" ")} aria-busy={model.loading}>
      <WeaponIdentity model={model} onSelectVersion={props.actions?.selectVersion} />

      <nav className="weapon-detail-nav" aria-label="武器详情章节">
        <div role="tablist" aria-orientation="horizontal">
          {sectionLabels.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={section === item.key}
              aria-controls={sectionPanelId}
              className={section === item.key ? "is-active" : undefined}
              onClick={() => changeSection(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      <div id={sectionPanelId} className="weapon-detail-section" role="tabpanel">
        {section === "overview" ? <OverviewSection model={model} onOpenSource={props.actions?.openSource} /> : null}
        {section === "configuration" ? (
          <ConfigurationSection
            model={model}
            poolOpen={poolOpen}
            onTogglePool={() => setPoolOpen((value) => !value)}
            actions={props.actions}
          />
        ) : null}
        {section === "recommendations" ? <RecommendationSection model={model} /> : null}
        {section === "upgrades" ? <UpgradeSection model={model} /> : null}
        {section === "instances" ? <InstancesSection model={model} onSelect={props.actions?.selectInstance} actions={props.instanceActions} /> : null}
        {section === "analysis" ? (
          <AnalysisSection
            model={model}
            analysis={props.analysis}
            prompt={analysisPrompt}
            onPromptChange={setAnalysisPrompt}
            onRun={props.actions?.runAnalysis}
            personalKnowledge={props.personalKnowledge ?? []}
            onSaveKnowledge={props.actions?.saveKnowledge}
            onSetKnowledgeEnabled={props.actions?.setKnowledgeEnabled}
            onDeleteKnowledge={props.actions?.deleteKnowledge}
          />
        ) : null}
      </div>
    </article>
  );
}

function WeaponIdentity(props: {
  model: WeaponDetailViewModel;
  onSelectVersion?: (hash: number) => void;
}) {
  const { identity, context, versions } = props.model;
  return (
    <header className="weapon-detail-identity">
      <div className="weapon-detail-identity-main">
        {identity.icon ? <img src={identity.icon} alt="" /> : <span className="weapon-detail-icon-placeholder" aria-hidden="true" />}
        <div>
          <span className="weapon-detail-kicker">{identity.tier ?? "武器"}</span>
          <h2>{identity.name}</h2>
          <p>{[identity.item_type, identity.frame?.name].filter(Boolean).join(" · ")}</p>
          <div className="weapon-detail-facts" aria-label="武器摘要">
            {identity.slot ? <Fact label={identity.slot} symbol="▰" /> : null}
            {identity.ammo ? <Fact label={identity.ammo.label} icon={identity.ammo.icon} symbol={ammoSymbol(identity.ammo.key)} tone={`ammo-${identity.ammo.key}`} /> : null}
            {identity.damage ? <Fact label={identity.damage.label} icon={identity.damage.icon} symbol="✦" title={identity.damage.description} tone={`damage-${identity.damage.key}`} /> : null}
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

      <dl className="weapon-detail-context">
        <div><dt>当前入口</dt><dd>{context.entry_label}</dd></div>
        <div><dt>当前对象</dt><dd>{context.object_label}</dd></div>
        <div><dt>操作方式</dt><dd>{context.read_only ? "只读查看" : "可管理实例"}</dd></div>
        <div className="weapon-detail-version">
          <dt>装备版本</dt>
          <dd>
            {versions.length > 1 && props.onSelectVersion ? (
              <select
                aria-label="选择装备版本"
                value={versions.find((version) => version.is_current)?.hash ?? identity.hash}
                onChange={(event) => props.onSelectVersion?.(Number(event.target.value))}
              >
                {versions.map((version) => (
                  <option key={version.hash} value={version.hash}>
                    {version.label}{version.season_label ? ` · ${version.season_label}` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <span>{versions.find((version) => version.is_current)?.season_label ?? versions[0]?.label ?? identity.name}</span>
            )}
          </dd>
        </div>
      </dl>
    </header>
  );
}

function Fact(props: { label: string; icon?: string; symbol?: string; tone?: string; title?: string }) {
  return (
    <span className={["weapon-detail-fact", props.tone].filter(Boolean).join(" ")} title={props.title} tabIndex={props.title ? 0 : undefined}>
      {props.icon ? <img src={props.icon} alt="" /> : null}
      {!props.icon && props.symbol ? <i aria-hidden="true">{props.symbol}</i> : null}
      {props.label}
    </span>
  );
}

function SectionHeading(props: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="weapon-detail-section-heading">
      <span>{props.eyebrow}</span>
      <div><h3>{props.title}</h3><p>{props.description}</p></div>
    </div>
  );
}

function OverviewSection(props: {
  model: WeaponDetailViewModel;
  onOpenSource?: (source: WeaponSourceEntry) => void;
}) {
  return (
    <>
      <SectionHeading eyebrow="属性与获取" title="属性与获取详情" description="区分资料库标准值、当前对象实际值和待应用配置变化。" />
      <div className="weapon-detail-overview-grid">
        <section className="weapon-detail-block" aria-labelledby="weapon-stat-title">
          <div className="weapon-detail-block-heading"><h4 id="weapon-stat-title">武器属性</h4><span>{props.model.stats.length} 项</span></div>
          {props.model.stats.length ? (
            <div className="weapon-detail-stats">
              <div className="weapon-detail-stat-legend">
                <span><i className="is-current" />当前实际值</span>
                <span><i className="is-standard" />资料库标准值</span>
                <span><i className="is-pending" />待应用变化</span>
              </div>
              {props.model.stats.map((stat) => <StatTrack key={stat.key} stat={stat} />)}
            </div>
          ) : <EmptyState text="当前定义没有可显示的武器属性。" />}
        </section>
        <section className="weapon-detail-block" aria-labelledby="weapon-source-title">
          <div className="weapon-detail-block-heading"><h4 id="weapon-source-title">官方获取来源</h4><span>{sourceStatusLabel(props.model.sources.status)}</span></div>
          {props.model.sources.entries.length ? (
            <div className="weapon-detail-source-list">
              {props.model.sources.entries.map((source) => (
                <article key={source.id} className="weapon-detail-source-row">
                  {source.icon ? <img src={source.icon} alt="" /> : null}
                  <div><strong>{source.label}</strong><p>{source.description}</p></div>
                  <div className="weapon-detail-source-meta">
                    <span>{source.available_now === true ? "当前可获取" : "官方来源"}</span>
                    {source.offer?.price_labels.length ? <span>{source.offer.price_labels.join(" + ")}</span> : null}
                    {source.offer?.can_purchase === false ? <span>{source.offer.failure_messages.join(" / ") || "当前无法购买"}</span> : null}
                    {props.onOpenSource ? <button type="button" onClick={() => props.onOpenSource?.(source)}>查看</button> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : <EmptyState text="暂未查询到官方来源。" />}
        </section>
      </div>
    </>
  );
}

function StatTrack({ stat }: { stat: WeaponStatTrack }) {
  const maximum = Math.max(100, stat.standard_value ?? 0, stat.current_value ?? 0, stat.pending_value ?? 0);
  const style = {
    "--weapon-standard": `${((stat.standard_value ?? 0) / maximum) * 100}%`,
    "--weapon-current": `${((stat.current_value ?? 0) / maximum) * 100}%`,
    "--weapon-pending": `${((stat.pending_value ?? stat.current_value ?? 0) / maximum) * 100}%`
  } as CSSProperties;
  const pendingText = stat.pending_delta
    ? `${stat.pending_delta > 0 ? "+" : ""}${stat.pending_delta} → ${stat.pending_value}`
    : stat.current_value === undefined ? "未返回实际值" : "无变化";
  return (
    <div className="weapon-detail-stat-row" style={style}>
      <strong>{stat.label}</strong>
      <span className="weapon-detail-stat-value">{stat.current_value ?? "—"}</span>
      <span className="weapon-detail-stat-track" aria-hidden="true"><i /><b /><em /></span>
      <small>标准 {stat.standard_value ?? "—"}</small>
      <small className={stat.pending_delta && stat.pending_delta < 0 ? "is-negative" : "is-positive"}>{pendingText}</small>
    </div>
  );
}

function ConfigurationSection(props: {
  model: WeaponDetailViewModel;
  poolOpen: boolean;
  onTogglePool: () => void;
  actions?: WeaponDetailContentActions;
}) {
  const { configuration, context } = props.model;
  const showSelection = context.kind !== "definition" && configuration.selection_columns.length > 0;
  const columns = showSelection ? configuration.selection_columns : configuration.pool_columns;
  return (
    <>
      <SectionHeading
        eyebrow="武器配置"
        title={context.kind === "definition" ? "完整 Perk 池" : context.kind === "vendor_offer" ? "当前售卖配置" : "当前实例配置"}
        description={context.kind === "account_instance" ? "只允许切换当前实例真实拥有且可应用的 Perk。" : "当前对象为只读，不提供远程配置操作。"}
      />
      <div className="weapon-detail-config-summary">
        <span>{context.object_label}</span>
        <span>{configurationKindLabel(configuration.kind)}</span>
        <span>{context.read_only ? "只读" : "需要联网"}</span>
      </div>
      <div className="weapon-detail-config-grid">
        {configuration.intrinsic ? <PerkColumn label="武器框架" candidates={[configuration.intrinsic]} /> : <div className="weapon-detail-intrinsic-empty">未返回武器框架</div>}
        {columns.map((column) => (
          <PerkColumn
            key={column.key}
            label={column.label}
            candidates={column.candidates}
            interactive={showSelection && context.kind === "account_instance"}
            onSelect={(perk) => props.actions?.stagePerk?.(column as WeaponPerkSelectionColumn, perk)}
          />
        ))}
      </div>

      {configuration.has_pending_changes ? (
        <div className="weapon-detail-write-bar" role="status">
          <div><strong>配置有待应用更改</strong><p>原配置会保留到 Bungie 写操作成功。</p></div>
          <div>
            <button type="button" onClick={props.actions?.cancelPendingPerks}>取消</button>
            <button type="button" className="is-primary" disabled={!configuration.can_apply_changes} onClick={props.actions?.applyPendingPerks}>应用更改</button>
          </div>
        </div>
      ) : null}

      {context.kind !== "definition" && configuration.pool_columns.length ? (
        <section className="weapon-detail-full-pool">
          <button type="button" aria-expanded={props.poolOpen} onClick={props.onTogglePool}>
            <strong>{props.poolOpen ? "收起完整掉落池" : "查看完整掉落池"}</strong>
            <span>{props.poolOpen ? "收起" : `展开 ${countPool(configuration.pool_columns)} 个候选`}</span>
          </button>
          {props.poolOpen ? (
            <><div className="weapon-detail-pool-grid">
              {configuration.pool_columns.map((column) => <PerkColumn key={column.key} label={column.label} candidates={column.candidates} />)}
            </div><p className="weapon-detail-note">这里只展示可能掉落的候选，不标记当前已选状态；实例未拥有的 Perk 不能远程安装。</p></>
          ) : null}
        </section>
      ) : null}
    </>
  );
}

function PerkColumn(props: {
  label: string;
  candidates: readonly WeaponPerkCandidate[];
  interactive?: boolean;
  onSelect?: (perk: WeaponPerkCandidate) => void;
}) {
  return (
    <section className="weapon-detail-perk-column">
      <h4>{props.label}</h4>
      <div>
        {props.candidates.length ? props.candidates.map((perk) => {
          const selection = "selected" in perk ? perk as WeaponPerkSelectionColumn["candidates"][number] : undefined;
          const content = <>{selection ? <small>{selection.pending ? "待应用" : selection.selected ? "已选" : selection.can_apply ? "本实例拥有 · 可切换" : "本实例拥有"}</small> : null}{perk.icon ? <img src={perk.icon} alt="" /> : null}<span><strong>{perk.name}</strong><p>{perk.description}</p></span></>;
          return props.interactive && selection?.can_apply ? (
            <button key={perk.hash} type="button" className={["weapon-detail-perk", selection.selected && "is-selected", selection.pending && "is-pending"].filter(Boolean).join(" ")} aria-pressed={selection.selected || selection.pending} onClick={() => props.onSelect?.(perk)}>{content}</button>
          ) : <article key={perk.hash} className={["weapon-detail-perk", selection?.selected && "is-selected", selection?.pending && "is-pending"].filter(Boolean).join(" ")}>{content}</article>;
        }) : <EmptyState text="此列没有返回候选。" />}
      </div>
    </section>
  );
}

function RecommendationSection({ model }: { model: WeaponDetailViewModel }) {
  return (
    <>
      <SectionHeading eyebrow="玩法推荐" title={model.configuration.kind === "fixed" ? "使用与配装建议" : "推荐 Roll"} description="推荐以用户知识为先，其次使用内置知识；AI 外部查询只作补充。" />
      {model.recommendations.length ? <div className="weapon-detail-recommendations">{model.recommendations.map((recommendation) => <RecommendationCard key={recommendation.id} recommendation={recommendation} />)}</div> : <EmptyState text="知识库暂未收录这件武器的推荐。" />}
    </>
  );
}

function RecommendationCard({ recommendation }: { recommendation: WeaponRecommendation }) {
  return (
    <article className="weapon-detail-recommendation">
      <header><div><span>{recommendation.mode.toUpperCase()}</span><h4>{recommendation.title}</h4></div><strong className={`match-${recommendation.match}`}>{matchLabel(recommendation.match)}</strong></header>
      <p>{recommendation.reason}</p>
      {recommendation.perk_options.length || recommendation.masterwork_names.length || recommendation.mod_names.length ? <dl>
        {recommendation.perk_options.map((option) => <div key={option.column_key}><dt>{option.column_key}</dt><dd>{option.names.join(" / ")}</dd></div>)}
        {recommendation.masterwork_names.length ? <div><dt>大师杰作</dt><dd>{recommendation.masterwork_names.join(" / ")}</dd></div> : null}
        {recommendation.mod_names.length ? <div><dt>武器模组</dt><dd>{recommendation.mod_names.join(" / ")}</dd></div> : null}
      </dl> : null}
      {recommendation.match_notes.length ? <ul>{recommendation.match_notes.map((note) => <li key={note}>{note}</li>)}</ul> : null}
      <footer>依据：{recommendation.source_label}{recommendation.updated_at ? ` · ${new Date(recommendation.updated_at).toLocaleDateString()}` : ""}{recommendation.external_url ? <> · <a href={recommendation.external_url} target="_blank" rel="noreferrer">查看原始链接</a></> : null}</footer>
    </article>
  );
}

function UpgradeSection({ model }: { model: WeaponDetailViewModel }) {
  const { upgrades } = model;
  const recommendedMasterworks = [...new Set(model.recommendations.flatMap((recommendation) => recommendation.masterwork_names))];
  const recommendedMods = [...new Set(model.recommendations.flatMap((recommendation) => recommendation.mod_names))];
  const rows = [
    upgrades.masterwork ? { key: "masterwork", label: "大师杰作", current: `${upgrades.masterwork.name}${upgrades.masterwork.level ? ` · ${upgrades.masterwork.level} 级` : ""}`, detail: `${upgrades.masterwork.complete ? "已完成" : "未完成"}${upgrades.masterwork.stat_amount ? ` · 属性 ${upgrades.masterwork.stat_amount > 0 ? "+" : ""}${upgrades.masterwork.stat_amount}` : ""}` } : null,
    upgrades.mod ? { key: "mod", label: "武器模组", current: upgrades.mod.name, detail: upgrades.mod.description } : null,
    upgrades.catalyst ? { key: "catalyst", label: "催化剂", current: upgrades.catalyst.name, detail: upgrades.catalyst.complete ? "已完成并生效" : upgrades.catalyst.acquired ? `进度 ${upgrades.catalyst.progress ?? 0}%` : "尚未获取" } : null,
    upgrades.crafting_level !== undefined ? { key: "crafting", label: "锻造等级", current: `${upgrades.crafting_level} 级`, detail: upgrades.enhanced ? "包含强化能力" : "普通能力" } : null
  ].filter((row): row is NonNullable<typeof row> => Boolean(row));
  return (
    <>
      <SectionHeading eyebrow="升级与附加能力" title={upgrades.catalyst ? "催化剂与杰作状态" : "大师杰作与武器模组"} description="只显示当前定义和对象真实支持的升级能力。" />
      {rows.length ? <div className="weapon-detail-upgrade-list">{rows.map((row) => <article key={row.key}><span>{row.label}</span><strong>{row.current}</strong><p>{row.detail}</p></article>)}</div> : <EmptyState text="当前对象没有可显示的升级或附加能力。" />}
      {recommendedMasterworks.length || recommendedMods.length ? (
        <div className="weapon-detail-upgrade-list is-recommended">
          {recommendedMasterworks.length ? <article><span>推荐大师杰作</span><strong>{recommendedMasterworks.join(" / ")}</strong><p>来自当前生效的最高优先级知识。</p></article> : null}
          {recommendedMods.length ? <article><span>推荐武器模组</span><strong>{recommendedMods.join(" / ")}</strong><p>推荐项不会冒充当前已安装内容。</p></article> : null}
        </div>
      ) : null}
      {upgrades.catalyst ? <div className="weapon-detail-catalyst"><div><strong>{upgrades.catalyst.name}</strong><span>{upgrades.catalyst.objective ?? "未返回完成条件"}</span></div><progress value={upgrades.catalyst.progress ?? (upgrades.catalyst.complete ? 100 : 0)} max={100} /><p>{upgrades.catalyst.acquisition ? `获取：${upgrades.catalyst.acquisition}` : "未返回催化剂获取方式"}</p>{upgrades.catalyst.effects.length ? <ul>{upgrades.catalyst.effects.map((effect) => <li key={effect}>{effect}</li>)}</ul> : null}</div> : null}
    </>
  );
}

function InstancesSection(props: { model: WeaponDetailViewModel; onSelect?: (instance: WeaponDetailInstance) => void; actions?: ReactNode }) {
  return (
    <>
      <SectionHeading eyebrow="我的同名武器" title="当前版本的账号实例" description="只比较当前 Hash，不把同名复刻版或专家版混在一起。" />
      {props.model.same_hash_instances.length ? <div className="weapon-detail-instance-list" role="list">{props.model.same_hash_instances.map((instance) => (
        <button key={instance.instance_id} type="button" role="listitem" className={instance.current ? "is-current" : undefined} aria-current={instance.current ? "true" : undefined} onClick={() => props.onSelect?.(instance)} disabled={!props.onSelect}>
          {instance.icon ? <img src={instance.icon} alt="" /> : null}<span><strong>{instance.name}</strong><small>{instance.location} · {instance.power ?? "光等未知"}</small></span><span>{instance.plug_names.slice(0, 3).join(" / ") || "配置未返回"}</span><span>{instance.equipped ? "已装备" : instance.locked ? "已锁定" : "可管理"}</span>
        </button>
      ))}</div> : <EmptyState text="账号中没有当前版本的同名武器。" />}
      {props.actions}
    </>
  );
}

function AnalysisSection(props: {
  model: WeaponDetailViewModel;
  analysis?: WeaponDetailAnalysis;
  prompt: string;
  onPromptChange: (value: string) => void;
  onRun?: (prompt: string) => void;
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
      <div className="weapon-detail-ai-input">
        <label htmlFor="weapon-analysis-prompt">补充问题或指定知识</label>
        <textarea id="weapon-analysis-prompt" value={props.prompt} onChange={(event) => props.onPromptChange(event.target.value)} placeholder="例如：结合我当前实例的全部可切换 Perk，分析 PvE 推荐匹配情况。" />
        <button type="button" disabled={!props.onRun || status === "running"} onClick={() => props.onRun?.(props.prompt)}>{status === "running" ? "分析中..." : "开始分析"}</button>
      </div>
      {props.analysis?.message ? <p className={`status-message status-${status === "error" ? "error" : status === "ready" ? "ready" : "pending"}`} role="status">{props.analysis.message}</p> : null}
      {props.analysis?.body ? <article className="weapon-detail-ai-result"><span>AI 生成 · 可以查看依据</span><h4>{props.analysis.title ?? `${props.model.identity.name}分析`}</h4><p>{props.analysis.body}</p>{props.analysis.evidence?.length ? <dl>{props.analysis.evidence.map((entry) => <div key={entry.label}><dt>{entry.label}</dt><dd>{entry.value}</dd></div>)}</dl> : null}</article> : <EmptyState text="运行分析后，这里会显示结论和使用依据。" />}
      <section className="weapon-detail-knowledge">
        <div className="weapon-detail-block-heading"><h4>我的推荐</h4><span>确认后持久化</span></div>
        {props.personalKnowledge.length ? (
          <div className="weapon-detail-knowledge-list">
            {props.personalKnowledge.map((entry) => (
              <article key={entry.id}>
                <div><strong>{entry.title}</strong><span>{entry.mode.toUpperCase()} · {entry.origin === "confirmed_external" ? "用户确认的外部知识" : "用户知识"} · {entry.enabled ? "已启用" : "已停用"}</span></div>
                <p>{entry.reason || entry.perk_options.flatMap((option) => option.names).join(" / ")}</p>
                <small>更新时间：{entry.updated_at ? new Date(entry.updated_at).toLocaleString() : "未知"}</small>
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
        ) : <EmptyState text="还没有为这件武器保存个人推荐。" />}
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

function configurationKindLabel(kind: WeaponDetailViewModel["configuration"]["kind"]) {
  if (kind === "fixed") return "固定 Perk";
  if (kind === "variable_exotic") return "可变异域配置";
  return "随机 Roll";
}

function matchLabel(match: WeaponRecommendation["match"]) {
  if (match === "full") return "完全命中";
  if (match === "partial") return "部分命中";
  if (match === "none") return "未命中";
  return "不适用";
}

function countPool(columns: readonly WeaponPerkPoolColumn[]) {
  return columns.reduce((total, column) => total + column.candidates.length, 0);
}

function ammoSymbol(ammo: "primary" | "special" | "heavy") {
  if (ammo === "special") return "◆";
  if (ammo === "heavy") return "⬢";
  return "●";
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
