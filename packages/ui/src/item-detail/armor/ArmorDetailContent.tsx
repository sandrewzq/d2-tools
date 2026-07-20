import { useRef, useState, type ReactNode } from "react";
import type {
  ArmorDetailInstance,
  ArmorDetailViewModel,
  ArmorSourceEntry,
  ArmorStatTrack
} from "@d2-tools/app/items";

export type ArmorDetailSection = "overview" | "abilities" | "upgrades" | "recommendations" | "instances" | "analysis";

export type ArmorDetailAnalysis = {
  status: "idle" | "running" | "ready" | "error";
  title?: string;
  body?: string;
  message?: string;
  evidence?: Array<{ label: string; value: string }>;
  externalSources?: Array<{ title: string; url: string; queried_at?: string }>;
  externalSearchMessage?: string;
};

export type ArmorDetailContentActions = {
  selectVersion?: (hash: number) => void;
  openSource?: (source: ArmorSourceEntry) => void;
  selectInstance?: (instance: ArmorDetailInstance) => void;
  runAnalysis?: (request: { prompt: string; allow_external_search: boolean }) => void;
};

export type ArmorDetailContentProps = {
  model: ArmorDetailViewModel;
  actions?: ArmorDetailContentActions;
  analysis?: ArmorDetailAnalysis;
  activeSection?: ArmorDetailSection;
  onSectionChange?: (section: ArmorDetailSection) => void;
  instanceActions?: ReactNode;
};

const sections: Array<{ key: ArmorDetailSection; label: string }> = [
  { key: "overview", label: "属性与获取" },
  { key: "abilities", label: "护甲能力" },
  { key: "upgrades", label: "模组与升级" },
  { key: "recommendations", label: "玩法推荐" },
  { key: "instances", label: "我的同名护甲" },
  { key: "analysis", label: "AI 分析" }
];

export function ArmorDetailContent(props: ArmorDetailContentProps) {
  const [internalSection, setInternalSection] = useState<ArmorDetailSection>("overview");
  const [analysisPrompt, setAnalysisPrompt] = useState("");
  const [allowExternalSearch, setAllowExternalSearch] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const section = props.activeSection ?? internalSection;
  const currentVersion = props.model.versions.find((version) => version.is_current) ?? props.model.versions[0];

  function selectSection(next: ArmorDetailSection) {
    setInternalSection(next);
    props.onSectionChange?.(next);
    const detail = rootRef.current;
    const target = detail?.querySelector<HTMLElement>(`[data-armor-section="${next}"]`);
    const scrollRoot = detail?.closest<HTMLElement>(".shared-item-detail-body");
    if (!detail || !target || !scrollRoot) return;
    const offset = target.getBoundingClientRect().top - scrollRoot.getBoundingClientRect().top + scrollRoot.scrollTop - 50;
    scrollRoot.scrollTo({ top: Math.max(0, offset), behavior: "smooth" });
  }

  return (
    <div ref={rootRef} className="armor-detail">
      <header className="armor-detail-identity">
        <div className="armor-detail-identity-main">
          {props.model.identity.icon ? <img alt="" src={props.model.identity.icon} /> : <div className="armor-detail-icon-placeholder" />}
          <div>
            <span className="armor-detail-kicker">{props.model.identity.tier ?? "护甲档案"}</span>
            <h2>{props.model.identity.name}</h2>
            <p>{props.model.identity.description || "资料库未提供护甲说明。"}</p>
            <div className="armor-detail-facts">
              {[props.model.identity.item_type, props.model.identity.slot, props.model.identity.class_name]
                .filter(Boolean)
                .map((fact) => <span key={fact}>{fact}</span>)}
            </div>
          </div>
        </div>
        <dl className="armor-detail-context">
          <div><dt>当前对象</dt><dd>{props.model.context.object_label}</dd></div>
          <div><dt>入口</dt><dd>{props.model.context.entry_label}</dd></div>
          <div>
            <dt>当前装备版本</dt>
            <dd>
              {props.model.versions.length > 1 ? (
                <select value={currentVersion?.hash} onChange={(event) => props.actions?.selectVersion?.(Number(event.target.value))}>
                  {props.model.versions.map((version) => <option key={version.hash} value={version.hash}>{version.label}</option>)}
                </select>
              ) : currentVersion?.label ?? props.model.identity.name}
            </dd>
          </div>
          <div><dt>状态</dt><dd>{props.model.context.read_only ? "只读查看" : "可管理实例"}</dd></div>
        </dl>
      </header>

      <nav className="armor-detail-nav" aria-label="护甲详情章节">
        <div>
          {sections.map((item) => (
            <button key={item.key} type="button" className={section === item.key ? "is-active" : ""} onClick={() => selectSection(item.key)}>
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="armor-detail-sections">
        <ArmorSection section="overview" eyebrow="01 / 属性与获取" title="属性与获取" description="判断当前对象是否有真实属性 Roll，并核对官方来源。">
          <div className="armor-detail-overview-grid">
            <section className="armor-detail-block">
              <div className="armor-detail-block-heading">
                <h4>六维属性</h4>
                <span>{props.model.stats.available ? `总属性 ${props.model.stats.total}` : "当前对象没有实际属性 Roll"}</span>
              </div>
              {props.model.stats.available ? (
                <>
                  <div className="armor-detail-stat-summary">
                    <strong>{props.model.stats.total}</strong>
                    <span>基础 {formatValue(props.model.stats.base_total)}</span>
                    <span>模组 {formatSigned(props.model.stats.mod_total)}</span>
                    <span>大师杰作 {props.model.stats.masterwork_separable ? formatSigned(props.model.stats.masterwork_total) : "未单独返回"}</span>
                  </div>
                  <div className="armor-detail-stat-list">
                    {props.model.stats.tracks.map((track) => <ArmorStatRow key={track.key} track={track} />)}
                  </div>
                  {!props.model.stats.masterwork_separable ? <p className="armor-detail-note">当前数据可追溯基础值与模组修正，但无法可靠地把大师杰作加成单独拆出。</p> : null}
                </>
              ) : (
                <div className="armor-detail-empty">
                  <strong>资料库定义不包含实际属性 Roll</strong>
                  <p>选择当前商人 Offer 或账号实例后，才会显示六维属性、总属性和可追溯修正。</p>
                </div>
              )}
            </section>

            <section className="armor-detail-block">
              <div className="armor-detail-block-heading"><h4>官方来源</h4><span>{sourceStatusLabel(props.model.sources.status)}</span></div>
              {props.model.sources.entries.length ? (
                <div className="armor-detail-source-list">
                  {props.model.sources.entries.map((source) => (
                    <article key={source.id} className="armor-detail-source-row">
                      {source.icon ? <img alt="" src={source.icon} /> : <span className="armor-detail-source-mark">源</span>}
                      <div><strong>{source.label}</strong><p>{source.description}</p></div>
                      <div className="armor-detail-source-meta">
                        <span>{source.available_now === false ? "当前不可用" : source.available_now ? "当前可用" : "来源提示"}</span>
                        {props.actions?.openSource ? <button type="button" onClick={() => props.actions?.openSource?.(source)}>查看</button> : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : <div className="armor-detail-empty"><strong>尚无可确认来源</strong><p>账号拥有和 AI 内容不会被当作官方获取来源。</p></div>}
            </section>
          </div>
        </ArmorSection>

        <ArmorSection section="abilities" eyebrow="02 / 护甲能力" title="护甲能力" description="异域固有、套装效果、诡计能力和特殊插槽集中展示。">
          {props.model.abilities.length ? (
            <div className="armor-detail-ability-grid">
              {props.model.abilities.map((ability) => (
                <article key={ability.id} className={`armor-detail-ability ability-${ability.kind}`}>
                  {ability.icon ? <img alt="" src={ability.icon} /> : <span className="armor-detail-ability-mark">能</span>}
                  <div><span>{ability.kind_label}</span><h4>{ability.name}</h4><p>{ability.description || "资料库未提供说明。"}</p></div>
                </article>
              ))}
            </div>
          ) : <div className="armor-detail-empty"><strong>没有已解析的护甲能力</strong><p>普通护甲可能只有属性、模组和能量信息。</p></div>}
        </ArmorSection>

        <ArmorSection section="upgrades" eyebrow="03 / 模组与升级" title="模组与升级" description="只展示当前 Offer 或实例实际返回的模组、能量与升级状态。">
          <div className="armor-detail-upgrade-grid">
            <section className="armor-detail-block">
              <div className="armor-detail-block-heading"><h4>护甲能量</h4><span>{props.model.upgrades.energy ? `${props.model.upgrades.energy.used}/${props.model.upgrades.energy.capacity} 已用` : "未读取"}</span></div>
              {props.model.upgrades.energy ? (
                <div className="armor-detail-energy">
                  <div><i style={{ width: `${Math.min(100, props.model.upgrades.energy.capacity * 10)}%` }} /><b style={{ width: `${Math.min(100, props.model.upgrades.energy.used * 10)}%` }} /></div>
                  <dl><div><dt>容量</dt><dd>{props.model.upgrades.energy.capacity}</dd></div><div><dt>已用</dt><dd>{props.model.upgrades.energy.used}</dd></div><div><dt>剩余</dt><dd>{props.model.upgrades.energy.unused}</dd></div></dl>
                </div>
              ) : <div className="armor-detail-empty compact"><p>装备定义没有实例能量状态。</p></div>}
            </section>
            <section className="armor-detail-block">
              <div className="armor-detail-block-heading"><h4>升级状态</h4><span>{props.model.upgrades.masterwork.complete ? "大师杰作完成" : "未完成"}</span></div>
              <div className="armor-detail-upgrade-status">
                <strong>{props.model.upgrades.masterwork.level !== undefined ? `${props.model.upgrades.masterwork.level} 阶` : "未读取阶级"}</strong>
                <p>{props.model.upgrades.masterwork.stat_bonus_separable ? "大师杰作属性加成可单独追溯。" : "当前接口没有单独返回大师杰作属性加成。"}</p>
              </div>
            </section>
          </div>
          <section className="armor-detail-block">
            <div className="armor-detail-block-heading"><h4>实际安装模组</h4><span>{props.model.upgrades.installed_mods.length} 个</span></div>
            {props.model.upgrades.installed_mods.length ? (
              <div className="armor-detail-mod-grid">
                {props.model.upgrades.installed_mods.map((mod) => (
                  <article key={`${mod.socket_index ?? "plug"}:${mod.hash}`}>
                    {mod.icon ? <img alt="" src={mod.icon} /> : <span>模</span>}
                    <div><strong>{mod.name}</strong><p>{mod.description || "无额外说明"}</p></div>
                  </article>
                ))}
              </div>
            ) : <div className="armor-detail-empty compact"><p>{props.model.context.kind === "definition" ? "装备定义不表示实际安装状态。" : "当前对象未返回可识别的护甲模组。"}</p></div>}
          </section>
        </ArmorSection>

        <ArmorSection section="recommendations" eyebrow="04 / 玩法推荐" title="玩法推荐" description="以玩家目标和当前实际属性为依据，给出属性与模组方向。">
          {props.model.recommendations.targets.length ? (
            <div className="armor-detail-target-grid">
              {props.model.recommendations.targets.map((target) => (
                <article key={target.id} className="armor-detail-target">
                  <header><div><span>{target.source_label}</span><h4>{target.title}</h4></div><strong className={`match-${target.match}`}>{targetMatchLabel(target.match)}</strong></header>
                  <p>{target.reason}</p>
                  <div className="armor-detail-target-conditions">
                    {target.conditions.map((condition) => <span key={`${target.id}:${condition.stat}`}>{condition.label} {condition.current ?? "-"} / 目标 {condition.minimum}</span>)}
                  </div>
                </article>
              ))}
            </div>
          ) : <div className="armor-detail-empty compact"><p>尚未配置护甲属性目标。</p></div>}
          <div className="armor-detail-fit-grid">
            <section className="armor-detail-block">
              <div className="armor-detail-block-heading"><h4>职业与配装适配</h4><span>基础判断</span></div>
              {props.model.recommendations.build_fits.length ? props.model.recommendations.build_fits.map((fit) => <article key={fit.title} className="armor-detail-fit"><strong>{fit.title}</strong><p>{fit.description}</p></article>) : <div className="armor-detail-empty compact"><p>需要实际属性 Roll 后再判断。</p></div>}
            </section>
            <section className="armor-detail-block">
              <div className="armor-detail-block-heading"><h4>推荐模组</h4><span>按目标缺口</span></div>
              {props.model.recommendations.suggested_mods.length ? <div className="armor-detail-chip-list">{props.model.recommendations.suggested_mods.map((mod) => <span key={mod}>{mod}</span>)}</div> : <div className="armor-detail-empty compact"><p>当前没有可追溯的属性缺口建议。</p></div>}
            </section>
          </div>
        </ArmorSection>

        <ArmorSection section="instances" eyebrow="05 / 我的同名护甲" title="我的同名护甲" description="仅比较当前 Hash 下的账号实例，不跨版本合并。">
          {props.model.same_hash_instances.length ? (
            <div className="armor-detail-instance-list">
              {props.model.same_hash_instances.map((instance) => (
                <button key={instance.instance_id} type="button" className={instance.current ? "is-current" : ""} onClick={() => props.actions?.selectInstance?.(instance)}>
                  {instance.icon ? <img alt="" src={instance.icon} /> : <span className="armor-detail-instance-mark">甲</span>}
                  <div><strong>{instance.location}</strong><span>{instance.power ? `光等 ${instance.power}` : "未读取光等"} · {instance.locked ? "已锁定" : "未锁定"}</span></div>
                  <div className="armor-detail-instance-stats"><strong>{instance.total ?? "-"}</strong><span>总属性</span></div>
                  <div className="armor-detail-instance-meta"><span>{instance.energy ? `能量 ${instance.energy.used}/${instance.energy.capacity}` : "能量未读取"}</span><span>{instance.local_tag ? localTagLabel(instance.local_tag) : "未标记"}</span></div>
                </button>
              ))}
            </div>
          ) : <div className="armor-detail-empty"><strong>账号中没有当前版本实例</strong><p>商人 Offer 不会计入拥有数量。</p></div>}
          {props.instanceActions}
        </ArmorSection>

        <ArmorSection section="analysis" eyebrow="06 / AI 分析" title="AI 分析" description="基于当前对象、官方数据和本地目标补充判断。">
          <div className="armor-detail-ai-input">
            <textarea value={analysisPrompt} onChange={(event) => setAnalysisPrompt(event.target.value)} placeholder="例如：这件护甲是否值得保留，适合哪类属性目标？" />
            <label><input type="checkbox" checked={allowExternalSearch} onChange={(event) => setAllowExternalSearch(event.target.checked)} />允许补充外部知识</label>
            <button type="button" disabled={props.analysis?.status === "running"} onClick={() => props.actions?.runAnalysis?.({ prompt: analysisPrompt, allow_external_search: allowExternalSearch })}>{props.analysis?.status === "running" ? "分析中..." : "分析当前护甲"}</button>
          </div>
          <ArmorAnalysisResult analysis={props.analysis} />
        </ArmorSection>
      </div>
    </div>
  );
}

function ArmorSection(props: { section: ArmorDetailSection; eyebrow: string; title: string; description: string; children: ReactNode }) {
  return <section className="armor-detail-section" data-armor-section={props.section}><header className="armor-detail-section-heading"><span>{props.eyebrow}</span><div><h3>{props.title}</h3><p>{props.description}</p></div></header>{props.children}</section>;
}

function ArmorStatRow({ track }: { track: ArmorStatTrack }) {
  const value = track.final_value ?? 0;
  return (
    <div className="armor-detail-stat-row">
      <strong>{track.label}</strong><span className="armor-detail-stat-value">{track.final_value}</span>
      <div className="armor-detail-stat-track"><i style={{ width: `${Math.min(100, value)}%` }} /><b style={{ left: `${Math.min(100, track.base_value ?? value)}%` }} /></div>
      <small>基础 {formatValue(track.base_value)} · 模组 {formatSigned(track.mod_value)} · 大师杰作 {track.masterwork_separable ? formatSigned(track.masterwork_value) : "未拆分"}</small>
    </div>
  );
}

function ArmorAnalysisResult({ analysis }: { analysis: ArmorDetailAnalysis | undefined }) {
  if (!analysis || analysis.status === "idle") return <div className="armor-detail-empty compact"><p>运行分析后，这里会显示保留、购买或配装建议。</p></div>;
  if (analysis.status === "running") return <div className="armor-detail-empty compact"><p>正在分析当前护甲...</p></div>;
  if (analysis.status === "error") return <div className="armor-detail-empty compact is-error"><p>{analysis.message || "护甲分析失败。"}</p></div>;
  return (
    <article className="armor-detail-ai-result">
      <h4>{analysis.title ?? "护甲分析"}</h4><p>{analysis.body}</p>
      {analysis.evidence?.length ? <dl>{analysis.evidence.map((item) => <div key={`${item.label}:${item.value}`}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl> : null}
      {analysis.externalSearchMessage ? <small>{analysis.externalSearchMessage}</small> : null}
      {analysis.externalSources?.length ? <div className="armor-detail-external-sources">{analysis.externalSources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}</a>)}</div> : null}
    </article>
  );
}

function formatValue(value: number | undefined): string { return value === undefined ? "-" : String(value); }
function formatSigned(value: number | undefined): string { return value === undefined ? "-" : value > 0 ? `+${value}` : String(value); }
function sourceStatusLabel(status: ArmorDetailViewModel["sources"]["status"]): string { return status === "ready" ? "已确认" : status === "partial" ? "部分来源" : "待确认"; }
function targetMatchLabel(match: "matched" | "missed" | "unavailable"): string { return match === "matched" ? "已命中" : match === "missed" ? "未命中" : "待实例"; }
function localTagLabel(tag: string): string { return tag === "keep" ? "保留" : tag === "review" ? "关注" : tag === "farm" ? "待刷" : tag === "loadout" ? "配装用" : tag === "junk" ? "可清理" : tag; }
