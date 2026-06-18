import { useEffect, useState } from "react";
import {
  api,
  type AccountItemSummary,
  type AccountItemPlugSummary,
  type AccountSummary,
  type ItemDefinitionDetail,
  type ItemSearchResult,
  type StartupState,
  type VaultTags,
  type VaultTagValue
} from "../api/client";
import { AiSettingsPanel } from "../components/AiSettingsPanel";
import { AiAnalysisPanel } from "../components/AiAnalysisPanel";
import { buildDiagnosticRows, DiagnosticsPanel } from "../components/DiagnosticsPanel";
import { ShellLayout, type ShellPageKey } from "../components/ShellLayout";
import { StatusOverview } from "../components/StatusOverview";
import { VaultPanel } from "../components/VaultPanel";

export function HomePage(props: {
  state: StartupState;
  onConfigure: () => void;
  onConfigChanged: () => void;
  onLoginComplete: () => void;
  onManifestInitialized: () => void;
}) {
  const [activePage, setActivePage] = useState<ShellPageKey>("home");
  const [loginMessage, setLoginMessage] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [manifestMessage, setManifestMessage] = useState("");
  const [manifestError, setManifestError] = useState("");
  const [isInitializingManifest, setIsInitializingManifest] = useState(false);
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(null);
  const [vaultTags, setVaultTags] = useState<VaultTags>({ items: {} });
  const [accountError, setAccountError] = useState("");
  const [isLoadingAccount, setIsLoadingAccount] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SelectedItemDetail | null>(null);
  const [itemDetailError, setItemDetailError] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ItemSearchResult[]>([]);
  const [searchError, setSearchError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [diagnosticDataDir, setDiagnosticDataDir] = useState("");
  const [diagnosticManifestVersion, setDiagnosticManifestVersion] = useState<string | undefined>();
  const [diagnosticError, setDiagnosticError] = useState("");
  const [isRefreshingDiagnostics, setIsRefreshingDiagnostics] = useState(false);

  async function refreshDiagnostics() {
    setIsRefreshingDiagnostics(true);
    setDiagnosticError("");

    try {
      const [config, manifest] = await Promise.all([api.getConfig(), api.getManifestStatus()]);
      setDiagnosticDataDir(config.data.data_dir);
      setDiagnosticManifestVersion(manifest.version);
    } catch (error) {
      setDiagnosticError(error instanceof Error ? error.message : "状态诊断失败");
    } finally {
      setIsRefreshingDiagnostics(false);
    }
  }

  useEffect(() => {
    void refreshDiagnostics();
  }, []);

  async function loginBungie() {
    setIsLoggingIn(true);
    setLoginMessage("");
    setLoginError("");

    try {
      const result = await api.loginBungie();
      setLoginMessage(result.message);
      props.onLoginComplete();
      await refreshDiagnostics();
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Bungie 登录失败");
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function initializeManifest() {
    setIsInitializingManifest(true);
    setManifestMessage("");
    setManifestError("");

    try {
      const status = await api.initializeManifest();
      setManifestMessage(`资料库已初始化：${status.version ?? "未知版本"}`);
      props.onManifestInitialized();
      await refreshDiagnostics();
    } catch (error) {
      setManifestError(error instanceof Error ? error.message : "资料库初始化失败");
    } finally {
      setIsInitializingManifest(false);
    }
  }

  async function loadAccountSummary() {
    setIsLoadingAccount(true);
    setAccountError("");

    try {
      const [summary, tags] = await Promise.all([api.getAccountSummary(), api.getVaultTags()]);
      setAccountSummary(summary);
      setVaultTags(tags);
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "账号数据读取失败");
      setAccountSummary(null);
    } finally {
      setIsLoadingAccount(false);
    }
  }

  async function openItemDetail(item: AccountItemSummary | ItemSearchResult) {
    setItemDetailError("");

    try {
      const detail = await api.getItemDetail(item.hash);
      setSelectedItem({
        ...detail,
        instance_id: "instance_id" in item ? item.instance_id : undefined,
        power: "power" in item ? item.power : undefined,
        locked: "locked" in item ? item.locked : undefined,
        socket_plugs: "socket_plugs" in item ? item.socket_plugs : undefined
      });
    } catch (error) {
      setItemDetailError(error instanceof Error ? error.message : "物品详情读取失败");
    }
  }

  async function searchItems() {
    setIsSearching(true);
    setSearchError("");

    try {
      setItems(await api.searchItems(query));
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "搜索失败");
      setItems([]);
    } finally {
      setIsSearching(false);
    }
  }

  async function saveVaultTag(item: AccountItemSummary, tag: VaultTagValue) {
    const itemKey = item.instance_id ?? `hash:${item.hash}`;
    try {
      setVaultTags(await api.saveVaultTag({
        item_key: itemKey,
        tag
      }));
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "本地标记保存失败");
    }
  }

  const diagnosticRows = buildDiagnosticRows({
    state: props.state,
    dataDir: diagnosticDataDir,
    manifestVersion: diagnosticManifestVersion
  });

  return (
    <ShellLayout activePage={activePage} onNavigate={setActivePage}>
      <header className="page-header">
        <div>
          <h2>{pageTitle(activePage)}</h2>
          <p>{pageSubtitle(activePage)}</p>
        </div>
      </header>

      <StatusOverview
        state={props.state}
        isLoggingIn={isLoggingIn}
        isInitializingManifest={isInitializingManifest}
        onConfigure={props.onConfigure}
        onLogin={() => void loginBungie()}
        onInitializeManifest={() => void initializeManifest()}
        onConfigureAi={() => setActivePage("ai")}
      />

      {loginMessage ? <p className="notice">{loginMessage}</p> : null}
      {loginError ? <p className="error">{loginError}</p> : null}
      {manifestMessage ? <p className="notice">{manifestMessage}</p> : null}
      {manifestError ? <p className="error">{manifestError}</p> : null}

      {activePage === "home" ? (
        <>
          <DiagnosticsPanel
            rows={diagnosticRows}
            isRefreshing={isRefreshingDiagnostics}
            onRefresh={() => void refreshDiagnostics()}
          />
          {diagnosticError ? <p className="error">{diagnosticError}</p> : null}
          <section className="tool-panel">
            <div className="section-heading">
              <div>
                <h2>常用入口</h2>
                <p>先完成状态诊断，再进入账号、资料库或设置。</p>
              </div>
            </div>
            <div className="quick-actions">
              <button type="button" onClick={() => setActivePage("account")}>查看账号</button>
              <button type="button" onClick={() => setActivePage("library")}>搜索物品</button>
              <button type="button" className="secondary-button" onClick={() => setActivePage("settings")}>打开设置</button>
            </div>
          </section>
        </>
      ) : null}

      {activePage === "account" ? renderAccountPanel() : null}
      {activePage === "library" ? renderSearchPanel() : null}
      {activePage === "vault" ? renderVaultPanel() : null}
      {activePage === "ai" ? (
        <>
          <AiSettingsPanel onSaved={props.onConfigChanged} />
          <AiAnalysisPanel
            items={accountSummary?.vault.items ?? []}
            tags={vaultTags}
            isLoadingAccount={isLoadingAccount}
            onLoadAccount={() => void loadAccountSummary()}
          />
        </>
      ) : null}
      {activePage === "settings" ? (
        <section className="tool-panel">
          <div className="section-heading">
            <div>
              <h2>设置</h2>
              <p>查看或修改 Bungie 配置。</p>
            </div>
            <button type="button" onClick={props.onConfigure}>打开配置</button>
          </div>
          <div className="diagnostic-grid">
            <div className="diagnostic-row diagnostic-neutral">
              <span>本地数据目录</span>
              <strong>{diagnosticDataDir || "未读取到配置目录"}</strong>
            </div>
          </div>
        </section>
      ) : null}

      {selectedItem ? renderItemModal() : null}
    </ShellLayout>
  );

  function renderAccountPanel() {
    return (
      <section className="tool-panel">
        <div className="section-heading">
          <div>
            <h2>账号摘要</h2>
            <p>读取当前 Bungie 账号、角色装备和仓库简表。</p>
          </div>
          <button type="button" disabled={isLoadingAccount} onClick={() => void loadAccountSummary()}>
            {isLoadingAccount ? "读取中..." : "读取账号数据"}
          </button>
        </div>
        {accountError ? <p className="error">{accountError}</p> : null}
        {itemDetailError ? <p className="error">{itemDetailError}</p> : null}
        {accountSummary ? (
          <div className="account-summary">
            <div>
              <h3>{accountSummary.account_name}</h3>
              <p>
                Membership {accountSummary.membership_type} / {accountSummary.destiny_membership_id}
              </p>
              <p>仓库物品：{accountSummary.vault.item_count}</p>
            </div>
            <div className="character-grid">
              {accountSummary.characters.map((character) => (
                <article className="character-card" key={character.character_id}>
                  <div className="character-title">
                    {character.emblem_url ? <img alt="" src={character.emblem_url} /> : null}
                    <div>
                      <h3>{character.class_name}</h3>
                      <p>光等 {character.light ?? "-"}</p>
                    </div>
                  </div>
                  <div className="equipment-groups">
                    {character.equipment_groups.map((group) => (
                      <section className="equipment-group" key={group.key}>
                        <h4>{group.label}</h4>
                        <div className="equipment-grid">
                          {group.items.map((item) => (
                            <button
                              className="equipment-item"
                              key={`${item.hash}-${item.instance_id ?? ""}`}
                              type="button"
                              onClick={() => void openItemDetail(item)}
                            >
                              {item.icon ? <img alt="" src={item.icon} /> : <div className="item-icon-placeholder" />}
                              <div>
                                <strong>{item.name}</strong>
                                <span>{formatAccountItemMeta(item)}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </article>
              ))}
            </div>
            <section className="vault-preview">
              <h3>仓库预览</h3>
              <div className="vault-grid">
                {accountSummary.vault.sample_items.slice(0, 30).map((item) => (
                  <button
                    className="vault-item"
                    title={item.name}
                    key={`${item.hash}-${item.instance_id ?? ""}`}
                    type="button"
                    onClick={() => void openItemDetail(item)}
                  >
                    {item.icon ? <img alt="" src={item.icon} /> : <div className="item-icon-placeholder" />}
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </section>
    );
  }

  function renderSearchPanel() {
    return (
      <section className="tool-panel">
        <div>
          <h2>物品搜索</h2>
          <p>先初始化资料库，然后搜索本地 Manifest 物品定义和可用 perk。</p>
        </div>
        <div className="search-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="例如：风险管理者 / Riskrunner"
          />
          <button type="button" disabled={isSearching} onClick={() => void searchItems()}>
            {isSearching ? "搜索中..." : "搜索"}
          </button>
        </div>
        {searchError ? <p className="error">{searchError}</p> : null}
        <div className="item-results">
          {items.map((item) => (
            <article className="item-result" key={item.hash}>
              {item.icon ? <img alt="" src={item.icon} /> : null}
              <div>
                <h3>{item.name}</h3>
                <p>{[item.tier, item.item_type].filter(Boolean).join(" / ")}</p>
                <p>{item.description}</p>
                {item.perks?.length ? (
                  <div className="perk-groups">
                    {item.perks.slice(0, 6).map((group) => (
                      <div className="perk-group" key={group.socket_index}>
                        {group.plugs.slice(0, 6).map((plug) => (
                          <span className="perk-chip" key={plug.hash}>{plug.name}</span>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : null}
                <button type="button" className="inline-action" onClick={() => void openItemDetail(item)}>
                  查看详情
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  function renderVaultPanel() {
    if (!accountSummary) {
      return (
        <section className="tool-panel placeholder-panel">
          <div className="section-heading">
            <div>
              <h2>仓库</h2>
              <p>先读取账号数据，然后查看完整仓库列表。</p>
            </div>
            <button type="button" disabled={isLoadingAccount} onClick={() => void loadAccountSummary()}>
              {isLoadingAccount ? "读取中..." : "读取账号数据"}
            </button>
          </div>
          {accountError ? <p className="error">{accountError}</p> : null}
        </section>
      );
    }

    return (
      <VaultPanel
        items={accountSummary.vault.items}
        tags={vaultTags}
        onOpenItem={(item) => void openItemDetail(item)}
        onSaveTag={(item, tag) => void saveVaultTag(item, tag)}
      />
    );
  }

  function renderItemModal() {
    if (!selectedItem) return null;

    return (
      <div className="modal-backdrop" role="presentation" onClick={() => setSelectedItem(null)}>
        <section className="item-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
          <button className="modal-close" type="button" onClick={() => setSelectedItem(null)}>关闭</button>
          <div className="modal-title">
            {selectedItem.icon ? <img alt="" src={selectedItem.icon} /> : null}
            <div>
              <h2>{selectedItem.name}</h2>
              <p>{[selectedItem.tier, selectedItem.item_type].filter(Boolean).join(" / ")}</p>
              {selectedItem.power ? <p>光等 {selectedItem.power}</p> : null}
              {selectedItem.locked !== undefined ? <p>{selectedItem.locked ? "已锁定" : "未锁定"}</p> : null}
            </div>
          </div>
          {selectedItem.description ? <p>{selectedItem.description}</p> : null}
          {selectedItem.socket_plugs?.length ? (
            <section className="modal-perk-group">
              <h3>实际 Roll</h3>
              <div className="modal-plug-grid">
                {selectedItem.socket_plugs.map((plug) => (
                  <div className="modal-plug" key={plug.hash}>
                    {plug.icon ? <img alt="" src={plug.icon} /> : null}
                    <div>
                      <strong>{plug.name}</strong>
                      {plug.description ? <p>{plug.description}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          {selectedItem.perks?.length ? (
            <div className="modal-perks">
              {selectedItem.perks.map((group) => (
                <section className="modal-perk-group" key={group.socket_index}>
                  <h3>插槽 {group.socket_index + 1}</h3>
                  <div className="modal-plug-grid">
                    {group.plugs.map((plug) => (
                      <div className="modal-plug" key={plug.hash}>
                        {plug.icon ? <img alt="" src={plug.icon} /> : null}
                        <div>
                          <strong>{plug.name}</strong>
                          {plug.description ? <p>{plug.description}</p> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <p className="notice">暂无可展示 perk。</p>
          )}
        </section>
      </div>
    );
  }
}

type SelectedItemDetail = ItemDefinitionDetail & {
  instance_id?: string;
  power?: number;
  locked?: boolean;
  socket_plugs?: AccountItemPlugSummary[];
};

function formatAccountItemMeta(item: AccountItemSummary): string {
  return [
    item.bucket_name,
    item.tier,
    item.power ? `光等 ${item.power}` : undefined,
    item.locked ? "已锁定" : undefined
  ].filter(Boolean).join(" / ");
}

function pageTitle(page: ShellPageKey) {
  const titles: Record<ShellPageKey, string> = {
    home: "首页",
    account: "账号",
    vault: "仓库",
    library: "资料库",
    ai: "AI 助手",
    settings: "设置"
  };
  return titles[page];
}

function pageSubtitle(page: ShellPageKey) {
  const subtitles: Record<ShellPageKey, string> = {
    home: "检查当前状态，快速进入常用功能。",
    account: "读取 Bungie 账号、角色装备和仓库预览。",
    vault: "查看完整仓库列表、筛选、排序和实际 roll。",
    library: "搜索本地 Manifest 物品定义和 perk。",
    ai: "基于仓库、实际 roll 和本地标记生成分析建议。",
    settings: "管理 Bungie 配置和本地数据目录。"
  };
  return subtitles[page];
}

function PlaceholderPanel(props: { title: string; children: string }) {
  return (
    <section className="tool-panel placeholder-panel">
      <h2>{props.title}</h2>
      <p>{props.children}</p>
    </section>
  );
}
