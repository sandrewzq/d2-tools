import { createRoot } from "react-dom/client";
import { useMemo, useState, type FormEvent } from "react";
import {
  AccountPageView,
  defaultProductPreferences,
  HomePageView,
  LibraryPageContentView,
  LoadoutsPageContentView,
  ProductShellHost,
  SettingsPageView,
  VaultPageView,
  type LibraryEquipmentFilter,
  type LibraryPerkFilter,
  type LibraryViewMode,
  type ShellPageKey,
  type ShellStatusItem,
} from "@d2-tools/ui";
import "@d2-tools/ui/styles.css";
import {
  defaultPrototypeScenarioKey,
  prototypeScenarios,
  type PrototypeScenarioKey
} from "./mock/scenarios";
import "./styles.css";

function PrototypeApp() {
  const env = import.meta.env as Record<string, string | undefined>;
  const initialPage = isShellPageKey(env.VITE_D2_VISUAL_PAGE) ? env.VITE_D2_VISUAL_PAGE : "home";
  const initialTheme = env.VITE_D2_VISUAL_THEME === "dark" ? "dark" : "light";
  const initialScenario = isPrototypeScenarioKey(env.VITE_D2_VISUAL_SCENARIO)
    ? env.VITE_D2_VISUAL_SCENARIO
    : defaultPrototypeScenarioKey;
  const [activePage, setActivePage] = useState<ShellPageKey>(initialPage);
  const [scenarioKey, setScenarioKey] = useState<PrototypeScenarioKey>(initialScenario);
  const [selectedTemplateId, setSelectedTemplateId] = useState(prototypeLoadoutTemplates[0]?.id ?? "");
  const [compareTemplateId, setCompareTemplateId] = useState(prototypeLoadoutTemplates[1]?.id ?? "");
  const [renameDraft, setRenameDraft] = useState(prototypeLoadoutTemplates[0]?.name ?? "");
  const [showDiffOnly, setShowDiffOnly] = useState(false);
  const [libraryViewMode, setLibraryViewMode] = useState<LibraryViewMode>("equipment");
  const [equipmentFilters, setEquipmentFilters] = useState<LibraryEquipmentFilter>(prototypeEquipmentFilters);
  const [perkFilters, setPerkFilters] = useState<LibraryPerkFilter>(prototypePerkFilters);
  const [aliasDraft, setAliasDraft] = useState("ff");
  const [aliasTargetDraft, setAliasTargetDraft] = useState("喂食狂热");
  const [aliasKind, setAliasKind] = useState<"item" | "perk">("perk");
  const scenario = prototypeScenarios[scenarioKey];
  const selectedTemplate = prototypeLoadoutTemplates.find((template) => template.id === selectedTemplateId)
    ?? prototypeLoadoutTemplates[0]
    ?? null;
  const compareTemplate = prototypeLoadoutTemplates.find((template) => template.id === compareTemplateId)
    ?? null;
  const platformActions = useMemo(() => ({
    openExternal: (url: string) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
    setColorMode: (mode: "light" | "dark") => {
      document.documentElement.dataset.colorMode = mode;
    }
  }), []);

  return (
    <ProductShellHost
      activePage={activePage}
      onPageChange={setActivePage}
      initialPreferences={{
        ...defaultProductPreferences,
        colorMode: initialTheme
      }}
      shellStatus={scenario.shellStatus}
      assistantPanel={(
        <PrototypeAssistantPanel
          activePage={activePage}
          scenarioLabel={scenario.label}
          shellStatus={scenario.shellStatus}
        />
      )}
      platformActions={platformActions}
      renderPage={(activePage, preferences) => (
        <>
          <div className="prototype-controls" aria-label="Prototype scenario controls">
            <label>
              <span>状态</span>
              <select value={scenarioKey} onChange={(event) => setScenarioKey(event.target.value as PrototypeScenarioKey)}>
                {Object.values(prototypeScenarios).map((item) => (
                  <option key={item.key} value={item.key}>{item.label}</option>
                ))}
              </select>
            </label>
            <small>{scenario.description}</small>
          </div>
          {activePage === "home" ? (
            <>
              <header className="page-header">
                <div>
                  <h2>今日工作台</h2>
                  <p>先看官方可确认的今日 / 本周内容，再处理商人、账号和仓库提醒。</p>
                </div>
                <button type="button" className="secondary-button">刷新今日信息</button>
              </header>
              <HomePageView
                interfaceLocale={preferences.interfaceLocale}
                state={scenario.homeState}
                diagnosticRows={scenario.diagnosticRows}
                accountError={scenario.accountError}
                hasAccountData={scenario.hasAccountData}
                dailySummary={scenario.homeDailySummary}
                isInitializingManifest={scenario.isInitializingManifest}
                isLoadingDaily={scenario.isLoadingDaily}
                isRefreshingDiagnostics={scenario.isRefreshingDiagnostics}
                onCopyDailySummary={() => undefined}
                onRefreshDiagnostics={() => undefined}
              />
            </>
          ) : null}
          {activePage === "account" ? (
            <AccountPageView interfaceLocale={preferences.interfaceLocale} />
          ) : null}
          {activePage === "vault" ? (
            <VaultPageView
              interfaceLocale={preferences.interfaceLocale}
              accountReady={scenario.hasAccountData}
              accountError={scenario.accountError}
              onLoadAccount={() => undefined}
            >
              <section className="vault-dashboard-panel vault-prototype-summary">
                <div className="section-heading">
                  <div>
                    <h2>仓库整理工作台</h2>
                    <p>按同名重复、社区推荐、本地目标和当前配装影响来决定保留、观察或清理。</p>
                  </div>
                  <button type="button" className="secondary-button">刷新账号</button>
                </div>
                <div className="vault-decision-summary">
                  <span><strong>496</strong>仓库总数</span>
                  <span><strong>37</strong>推荐复查</span>
                  <span><strong>12</strong>可清理候选</span>
                  <span><strong>8</strong>配装占用</span>
                </div>
                <div className="vault-toolbar">
                  <div className="segmented-control" aria-label="仓库视图">
                    <button type="button" className="active">全部</button>
                    <button type="button">武器</button>
                    <button type="button">护甲</button>
                    <button type="button">清理候选</button>
                  </div>
                  <input aria-label="仓库搜索" placeholder="搜索装备、框架或 Perk" defaultValue="脉冲" />
                </div>
                <div className="vault-card-grid">
                  {prototypeVaultItems.map((item) => (
                    <article className="vault-item-card" key={item.name}>
                      <div className="vault-card-visual">{item.short}</div>
                      <div className="vault-card-body">
                        <div className="vault-title-row">
                          <strong>{item.name}</strong>
                          <span className={`vault-score-badge score-${item.tone}`}>{item.score}</span>
                        </div>
                        <span>{item.bucket} / {item.frame}</span>
                        <small>{item.perks}</small>
                        <div className="vault-card-signals">
                          {item.signals.map((signal) => <span key={signal}>{signal}</span>)}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </VaultPageView>
          ) : null}
          {activePage === "loadouts" ? (
            <LoadoutsPageContentView
              interfaceLocale={preferences.interfaceLocale}
              accountSummary={prototypeAccountSummary}
              templates={prototypeLoadoutTemplates}
              selectedTemplate={selectedTemplate}
              compareTemplate={compareTemplate}
              selectedAnalysis={prototypeSelectedAnalysis}
              transferPlan={prototypeTransferPlan}
              statusSummary={prototypeLoadoutStatusSummary}
              visibleCompareRows={prototypeCompareRows}
              missingCount={2}
              readyCount={3}
              actionableCount={2}
              compareTemplateId={compareTemplateId}
              renameDraft={renameDraft}
              showDiffOnly={showDiffOnly}
              message="Prototype：已接入共享配装页 View，写操作为 mock。"
              isRunningItemAction={false}
              actionFeedback={{}}
              getItemStatus={getPrototypeLoadoutItemStatus}
              getBlockedDetails={() => null}
              getSourceItem={getPrototypeSourceItem}
              getActionFeedbackKey={(templateId, item, action) => `${templateId}:${item.instance_id ?? item.hash}:${action}`}
              formatComparePerks={(perks) => perks.length ? perks.join(" / ") : "无"}
              onSelectTemplate={(id) => {
                setSelectedTemplateId(id);
                const template = prototypeLoadoutTemplates.find((item) => item.id === id);
                if (template) setRenameDraft(template.name);
              }}
              onSelectCompareTemplate={setCompareTemplateId}
              onRenameDraftChange={setRenameDraft}
              onShowDiffOnlyChange={setShowDiffOnly}
              onRenameTemplate={() => undefined}
              onDeleteTemplate={() => undefined}
              onCreateTransferPlan={() => undefined}
              onCopyMissingItems={() => undefined}
              onExecuteMissingTransfer={() => undefined}
              onExecuteSingleItemTransfer={() => undefined}
              onEquipSingleItem={() => undefined}
              onEquipSavedLoadout={() => undefined}
              onSnapshotCurrentLoadout={() => undefined}
              onOpenTemplateSourceItem={() => undefined}
            />
          ) : null}
          {activePage === "library" ? (
            <LibraryPageContentView
              interfaceLocale={preferences.interfaceLocale}
              libraryViewMode={libraryViewMode}
              items={prototypeLibraryItems}
              perks={prototypeLibraryPerks}
              equipmentFilters={equipmentFilters}
              perkFilters={perkFilters}
              equipmentSearchTouched
              perkSearchTouched
              isSearching={false}
              searchError=""
              aliasDraft={aliasDraft}
              aliasTargetDraft={aliasTargetDraft}
              aliasKind={aliasKind}
              aliasMessage="Prototype：别名保存为 mock 状态。"
              libraryHistory={prototypeLibraryHistory}
              libraryCommunityMatch={prototypeLibraryCommunityMatch}
              liveAvailability={prototypeLiveAvailability}
              liveAvailabilityError=""
              isLoadingLiveAvailability={false}
              manifestStatus={prototypeManifestStatus}
              manifestStatusError=""
              isLoadingManifestStatus={false}
              isInitializingManifest={false}
              itemDetailLoadingKey=""
              onViewModeChange={setLibraryViewMode}
              onEquipmentFiltersChange={(patch) => setEquipmentFilters((current) => ({ ...current, ...patch }))}
              onPerkFiltersChange={(patch) => setPerkFilters((current) => ({ ...current, ...patch }))}
              onSearch={() => undefined}
              onClearFilters={() => {
                setEquipmentFilters(prototypeEquipmentFilters);
                setPerkFilters(prototypePerkFilters);
              }}
              onRefreshManifestStatus={() => undefined}
              onInitializeManifest={() => undefined}
              onAliasDraftChange={setAliasDraft}
              onAliasTargetDraftChange={setAliasTargetDraft}
              onAliasKindChange={setAliasKind}
              onSaveAlias={() => undefined}
              onOpenItemDetail={() => undefined}
              onAddFavorite={() => undefined}
              onRemoveFavorite={() => undefined}
            />
          ) : null}
          {activePage === "settings" ? (
            <SettingsPageView interfaceLocale={preferences.interfaceLocale} />
          ) : null}
        </>
      )}
    />
  );
}

createRoot(document.getElementById("root")!).render(<PrototypeApp />);

type PrototypeAssistantMessage = {
  id: string;
  role: "user" | "assistant";
  title: string;
  body: string;
  bullets?: string[];
};

type PrototypeAssistantPanelProps = {
  activePage: ShellPageKey;
  scenarioLabel: string;
  shellStatus: ShellStatusItem[];
};

function PrototypeAssistantPanel(props: PrototypeAssistantPanelProps) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<PrototypeAssistantMessage[]>(() => [
    {
      id: "assistant-initial",
      role: "assistant",
      title: "小日向",
      body: "我已经读取当前 Prototype 上下文，可以按今日重点、仓库清理、配装缺口或资料库来源给出 mock 建议。",
      bullets: ["优先处理顶部黄色或红色状态", "首页只放每日 / 每周和账号相关高频信息", "低频设置只在异常时提示"]
    }
  ]);
  const contextRows = getPrototypeAssistantContextRows(props.activePage, props.scenarioLabel, props.shellStatus);

  function appendMockConversation(prompt: string) {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    setMessages((current) => [
      ...current,
      {
        id: `user-${current.length + 1}`,
        role: "user",
        title: "你",
        body: trimmedPrompt
      },
      {
        id: `assistant-${current.length + 2}`,
        role: "assistant",
        title: "小日向",
        body: getPrototypeAssistantReply(trimmedPrompt, props.activePage),
        bullets: getPrototypeAssistantBullets(props.activePage)
      }
    ]);
    setDraft("");
  }

  function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    appendMockConversation(draft);
  }

  return (
    <section className="prototype-assistant-panel" aria-label="Prototype AI assistant mock">
      <header className="prototype-assistant-header">
        <div>
          <span className="prototype-assistant-eyebrow">Prototype / Mock</span>
          <h2>小日向</h2>
          <p>围绕当前页面和顶部状态生成可视化建议，作为真实 AI 抽屉的交互基准。</p>
        </div>
        <span className="prototype-assistant-badge">AI</span>
      </header>

      <section className="assistant-context-card" aria-label="当前上下文">
        <div className="assistant-section-title">
          <span>当前上下文</span>
          <strong>{getPrototypePageLabel(props.activePage)}</strong>
        </div>
        <dl>
          {contextRows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="assistant-quick-prompts" aria-label="快捷问题">
        {prototypeAssistantPrompts.map((prompt) => (
          <button key={prompt} type="button" onClick={() => appendMockConversation(prompt)}>
            {prompt}
          </button>
        ))}
      </div>

      <div className="assistant-chat-log" aria-label="mock 对话记录">
        {messages.map((message) => (
          <article className={`assistant-chat-message message-${message.role}`} key={message.id}>
            <strong>{message.title}</strong>
            <p>{message.body}</p>
            {message.bullets?.length ? (
              <ul>
                {message.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
              </ul>
            ) : null}
          </article>
        ))}
      </div>

      <form className="assistant-chat-input" onSubmit={handleSend}>
        <label>
          <span>输入问题</span>
          <textarea
            value={draft}
            rows={3}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="例如：今天先刷什么，或者这套配装缺什么？"
          />
        </label>
        <button type="submit" disabled={!draft.trim()}>发送</button>
      </form>
    </section>
  );
}

function isShellPageKey(value: string | undefined): value is ShellPageKey {
  return value === "home"
    || value === "account"
    || value === "vault"
    || value === "loadouts"
    || value === "library"
    || value === "settings";
}

function isPrototypeScenarioKey(value: string | undefined): value is PrototypeScenarioKey {
  return value === "ready"
    || value === "account-missing"
    || value === "manifest-stale"
    || value === "background-running"
    || value === "update-available"
    || value === "ai-unconfigured"
    || value === "account-error"
    || value === "manifest-missing-components";
}

const prototypeAssistantPrompts = [
  "今天先刷什么",
  "仓库清理建议",
  "这套配装缺什么",
  "资料库来源怎么确认"
];

function getPrototypePageLabel(page: ShellPageKey) {
  const labels: Record<ShellPageKey, string> = {
    home: "首页工作台",
    account: "账号摘要",
    vault: "仓库整理",
    loadouts: "配装方案",
    library: "资料库搜索",
    settings: "设置中心"
  };

  return labels[page];
}

function getPrototypeAssistantContextRows(
  activePage: ShellPageKey,
  scenarioLabel: string,
  shellStatus: ShellStatusItem[]
) {
  const statusValue = (key: NonNullable<ShellStatusItem["key"]>) => {
    const item = shellStatus.find((status) => status.key === key);
    return item ? `${item.label}：${item.value}` : "未提供";
  };

  return [
    { label: "页面", value: getPrototypePageLabel(activePage) },
    { label: "状态方案", value: scenarioLabel },
    { label: "账号", value: statusValue("account") },
    { label: "资料库", value: statusValue("library") },
    { label: "后台", value: statusValue("background") }
  ];
}

function getPrototypeAssistantReply(prompt: string, page: ShellPageKey) {
  if (prompt.includes("仓库")) {
    return "先从重复同名和无目标命中的装备开始，保留 DIM 命中、配装占用和当前商人可替代项需要复查的装备。";
  }
  if (prompt.includes("配装")) {
    return "这套 mock 配装有两件需要处理：一件在仓库待取，一件在当前角色背包，真实实现应拆成补齐和应用两个动作。";
  }
  if (prompt.includes("资料库") || prompt.includes("来源")) {
    return "资料库页应优先展示来源状态、Perk 池命中和公开商人线索；版本过期时只提示更新，不把配置细节常驻在首页。";
  }
  if (page === "home") {
    return "首页建议先看今日 / 本周官方可确认内容，再处理账号、资料库、应用版本这类顶部状态异常。";
  }
  return "我会按当前页面上下文给出下一步：先处理高风险状态，再看能直接行动的按钮，最后检查低频设置。";
}

function getPrototypeAssistantBullets(page: ShellPageKey) {
  if (page === "vault") {
    return ["复查同名重复和清理候选", "保留配装占用与目标命中装备", "清理动作先做确认队列"];
  }
  if (page === "loadouts") {
    return ["先补仓库待取装备", "再应用已在背包的装备", "缺失项复制为检查清单"];
  }
  if (page === "library") {
    return ["优先看来源可确认项", "Perk 搜索支持别名", "版本过期时先更新资料库"];
  }
  if (page === "settings") {
    return ["账号、资料库、AI 和备份都保留操作按钮", "顶部只展示状态，不堆大卡片", "异常时给出明确修复入口"];
  }
  return ["今日重点放在首页", "账号和资料库状态在顶部可见", "AI 抽屉负责解释原因和下一步"];
}

const prototypeAccountSummary: any = {
  account_name: "Prototype Guardian",
  destiny_membership_id: "4611686018429000000",
  membership_type: 3,
  characters: [
    {
      character_id: "hunter-1",
      class_name: "猎人",
      light: 2022,
      equipped_items: [
        prototypeAccountItem("pulse-equipped", 1001, "快速命中脉冲", "动能武器", "轻质框架", "已装备"),
        prototypeAccountItem("rocket-equipped", 1004, "边缘迁移火箭筒", "威能武器", "自适应框架", "已装备")
      ],
      equipment_groups: [],
      inventory_items: [
        prototypeAccountItem("shotgun-inventory", 1003, "终局霰弹枪", "能量武器", "精确框架", "背包")
      ],
      inventory_groups: [],
      postmaster_items: [],
      loadout_slots: [
        {
          index: 0,
          name: "日落速刷",
          item_count: 8,
          items: [
            { instance_id: "pulse-equipped", name: "快速命中脉冲", bucket_name: "动能武器" },
            { instance_id: "shotgun-inventory", name: "终局霰弹枪", bucket_name: "能量武器" },
            { instance_id: "rocket-equipped", name: "边缘迁移火箭筒", bucket_name: "威能武器" }
          ]
        }
      ]
    },
    {
      character_id: "warlock-1",
      class_name: "术士",
      light: 2018,
      equipped_items: [],
      equipment_groups: [],
      inventory_items: [
        prototypeAccountItem("fusion-warlock", 1005, "适配融合步枪", "能量武器", "适配框架", "术士背包")
      ],
      inventory_groups: [],
      postmaster_items: [],
      loadout_slots: []
    }
  ],
  vault: {
    item_count: 496,
    items: [
      prototypeAccountItem("handcannon-vault", 1002, "精准手炮", "能量武器", "精确框架", "仓库"),
      prototypeAccountItem("sword-vault", 1006, "连锁反应刀剑", "威能武器", "旋风框架", "仓库")
    ],
    sample_items: []
  },
  materials: { item_count: 0, items: [] }
};

const prototypeLoadoutTemplates: any[] = [
  {
    id: "nightfall-hunter",
    name: "宗师夜幕安全位",
    character_id: "hunter-1",
    class_name: "猎人",
    created_at: "2026-06-18T10:00:00.000Z",
    updated_at: "2026-07-02T14:18:00.000Z",
    items: [
      { hash: 1001, instance_id: "pulse-equipped", name: "快速命中脉冲", bucket_name: "动能武器", weapon_frame_name: "轻质框架", perk_names: ["快速命中", "动能震颤"] },
      { hash: 1002, instance_id: "handcannon-vault", name: "精准手炮", bucket_name: "能量武器", weapon_frame_name: "精确框架", perk_names: ["丰盈满溢", "爆炸载荷"] },
      { hash: 1003, instance_id: "shotgun-inventory", name: "终局霰弹枪", bucket_name: "能量武器", weapon_frame_name: "精确框架", perk_names: ["自动装填", "重组"] },
      { hash: 1004, instance_id: "rocket-equipped", name: "边缘迁移火箭筒", bucket_name: "威能武器", weapon_frame_name: "自适应框架", perk_names: ["追踪模块", "诱导推销"] }
    ]
  },
  {
    id: "raid-warlock",
    name: "突袭输出位",
    character_id: "warlock-1",
    class_name: "术士",
    created_at: "2026-06-24T09:00:00.000Z",
    updated_at: "2026-07-01T21:30:00.000Z",
    items: [
      { hash: 1001, name: "快速命中脉冲", bucket_name: "动能武器", weapon_frame_name: "轻质框架", perk_names: ["快速命中", "动能震颤"] },
      { hash: 1005, instance_id: "fusion-warlock", name: "适配融合步枪", bucket_name: "能量武器", weapon_frame_name: "适配框架", perk_names: ["自填", "控制爆破"] },
      { hash: 1006, instance_id: "sword-vault", name: "连锁反应刀剑", bucket_name: "威能武器", weapon_frame_name: "旋风框架", perk_names: ["无情打击", "连锁反应"] }
    ]
  }
];

const prototypeSelectedAnalysis = {
  equipped: [prototypeLoadoutTemplates[0].items[0], prototypeLoadoutTemplates[0].items[3]],
  missing: [prototypeLoadoutTemplates[0].items[1], prototypeLoadoutTemplates[0].items[2]]
};

const prototypeTransferPlan = {
  steps: [],
  blocked: []
};

const prototypeLoadoutStatusSummary = [
  { key: "equipped", label: "已装备", count: 2 },
  { key: "vault", label: "仓库", count: 1 },
  { key: "current-inventory", label: "背包待穿", count: 1 }
];

const prototypeCompareRows = [
  {
    slot: "能量武器",
    changed: true,
    left: { name: "精准手炮", frame: "精确框架", perks: ["丰盈满溢", "爆炸载荷"] },
    right: { name: "适配融合步枪", frame: "适配框架", perks: ["自填", "控制爆破"] }
  },
  {
    slot: "威能武器",
    changed: true,
    left: { name: "边缘迁移火箭筒", frame: "自适应框架", perks: ["追踪模块", "诱导推销"] },
    right: { name: "连锁反应刀剑", frame: "旋风框架", perks: ["无情打击", "连锁反应"] }
  }
];

const prototypeEquipmentFilters: LibraryEquipmentFilter = {
  query: "",
  group: "all",
  tier: "all",
  bucket: "all",
  ammo: "all",
  frame: [],
  sourceStatus: "all",
  perkPool: "all",
  dropAccess: "all",
  perkQuery: ""
};

const prototypePerkFilters: LibraryPerkFilter = {
  query: "",
  relatedGroup: "all",
  hasRelatedItems: "all"
};

const prototypeLibraryItems: any[] = [
  {
    hash: 1001,
    name: "快速命中脉冲",
    description: "适合宗师和赛季活动的稳定主手武器。",
    item_type: "脉冲步枪",
    tier: "传说",
    group_key: "weapons",
    bucket_name: "动能武器",
    ammo_type: "primary",
    weapon_frame: { key: "lightweight", name: "轻质框架" },
    source: { status: "ready", label: "来源可确认", description: "夜幕轮换奖励，需要等本周或后续轮换复查。" },
    perks: [{ socket_index: 3, plugs: [{ hash: 2001, name: "快速命中", description: "精准命中提高稳定性和装填速度。" }, { hash: 2002, name: "动能震颤", description: "持续命中会产生冲击波。" }] }]
  },
  {
    hash: 1002,
    name: "精准手炮",
    description: "PVE 清怪和勇士控制都能使用。",
    item_type: "手炮",
    tier: "传说",
    group_key: "weapons",
    bucket_name: "能量武器",
    ammo_type: "primary",
    weapon_frame: { key: "precision", name: "精确框架" },
    source: { status: "ready", label: "来源可确认", description: "当前公开商人库存有售卖线索。" },
    perks: [{ socket_index: 3, plugs: [{ hash: 2003, name: "丰盈满溢", description: "拾取特殊或重弹溢出弹匣。" }, { hash: 2004, name: "爆炸载荷", description: "弹体造成范围爆炸伤害。" }] }]
  },
  {
    hash: 1007,
    name: "旧赛季斥候",
    description: "传承来源，当前不作为优先刷取目标。",
    item_type: "斥候步枪",
    tier: "传说",
    group_key: "weapons",
    bucket_name: "动能武器",
    ammo_type: "primary",
    weapon_frame: { key: "adaptive", name: "适配框架" },
    source: { status: "ready", label: "传承来源", description: "已下架或传承来源，需等待官方恢复入口。" },
    perks: []
  }
];

const prototypeLibraryPerks: any[] = [
  {
    hash: 2002,
    name: "动能震颤",
    description: "连续命中目标后产生动能冲击波。",
    related_items: [{ hash: 1001, name: "快速命中脉冲", group_key: "weapons" }]
  },
  {
    hash: 2003,
    name: "丰盈满溢",
    description: "拾取弹药时溢出当前武器弹匣。",
    related_items: [{ hash: 1002, name: "精准手炮", group_key: "weapons" }]
  }
];

const prototypeLibraryHistory = {
  recent: [
    { hash: 1001, name: "快速命中脉冲" },
    { hash: 1002, name: "精准手炮" }
  ],
  favorites: [
    { hash: 1002, name: "精准手炮" }
  ]
};

const prototypeLibraryCommunityMatch = new Map<number, any>([
  [1001, { available: 3, sample_perks: [{ name: "快速命中" }, { name: "动能震颤" }] }],
  [1002, { available: 2, sample_perks: [{ name: "丰盈满溢" }, { name: "爆炸载荷" }] }]
]);

const prototypeLiveAvailability = {
  account_scope: "character" as const,
  items: {
    "1002": {
      status: "public_vendor" as const,
      label: "公开商人售卖",
      description: "Prototype mock：当前公开商人库存命中，需进游戏确认价格和资格。",
      sources: [{ kind: "public_vendor" as const, label: "Banshee-44" }]
    }
  }
};

const prototypeManifestStatus = {
  initialized: true,
  version: "DestinyInventoryItemDefinition.26.06.16.0000",
  latest_version: "DestinyInventoryItemDefinition.26.06.16.0000",
  needs_update: false,
  missing_required_components: []
};

const prototypeVaultItems = [
  {
    name: "快速命中脉冲",
    short: "脉",
    bucket: "动能武器",
    frame: "轻质框架",
    perks: "快速命中 / 动能震颤",
    score: "保留",
    tone: "keep",
    signals: ["DIM 命中", "配装占用"]
  },
  {
    name: "精准手炮",
    short: "手",
    bucket: "能量武器",
    frame: "精确框架",
    perks: "丰盈满溢 / 爆炸载荷",
    score: "复查",
    tone: "review",
    signals: ["商人售卖", "同名 2 件"]
  },
  {
    name: "旧赛季斥候",
    short: "侦",
    bucket: "动能武器",
    frame: "适配框架",
    perks: "边打边劫 / 禅意时刻",
    score: "清理",
    tone: "junk",
    signals: ["传承来源", "无目标命中"]
  }
];

function prototypeAccountItem(instanceId: string, hash: number, name: string, bucketName: string, frameName: string, location: string) {
  return {
    hash,
    instance_id: instanceId,
    name,
    item_type: bucketName.includes("武器") ? "武器" : "装备",
    tier: "传说",
    bucket_name: bucketName,
    group_key: "weapons",
    weapon_frame: { key: frameName, name: frameName },
    socket_plugs: [
      { hash: hash + 10000, name: "快速命中" },
      { hash: hash + 20000, name: "目标锁定" }
    ],
    source_kind: location === "仓库" ? "vault" : location.includes("背包") ? "inventory" : "equipped",
    source_character_id: location === "术士背包" ? "warlock-1" : "hunter-1"
  };
}

function getPrototypeLoadoutItemStatus(item: any) {
  if (item.instance_id === "pulse-equipped" || item.instance_id === "rocket-equipped") {
    return {
      key: "equipped",
      badge_label: "已装备",
      badge_tone: "ready",
      location_label: "当前角色已装备"
    };
  }
  if (item.instance_id === "shotgun-inventory") {
    return {
      key: "current-inventory",
      badge_label: "背包待穿",
      badge_tone: "info",
      location_label: "当前角色背包",
      guidance_label: "已在当前角色背包",
      guidance_hint: "直接应用配装即可穿上。"
    };
  }
  return {
    key: "vault",
    badge_label: "仓库待取",
    badge_tone: "info",
    location_label: "仓库",
    guidance_label: "可自动补齐",
    guidance_hint: "执行补齐时会从仓库转入目标角色。"
  };
}

function getPrototypeSourceItem(item: any) {
  return item.instance_id
    ? { instance_id: item.instance_id, source_kind: item.instance_id.includes("vault") ? "vault" : "inventory", source_character_id: "hunter-1" }
    : null;
}
