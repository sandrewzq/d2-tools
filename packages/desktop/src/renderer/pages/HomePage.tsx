import { useState } from "react";
import {
  api,
  type AccountItemSummary,
  type AccountSummary,
  type ItemDefinitionDetail,
  type ItemSearchResult,
  type StartupState
} from "../api/client";
import { StatusCard } from "../components/StatusCard";

export function HomePage(props: {
  state: StartupState;
  onLoginComplete: () => void;
  onManifestInitialized: () => void;
}) {
  const [loginMessage, setLoginMessage] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [manifestMessage, setManifestMessage] = useState("");
  const [manifestError, setManifestError] = useState("");
  const [isInitializingManifest, setIsInitializingManifest] = useState(false);
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(null);
  const [accountError, setAccountError] = useState("");
  const [isLoadingAccount, setIsLoadingAccount] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemDefinitionDetail | null>(null);
  const [itemDetailError, setItemDetailError] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ItemSearchResult[]>([]);
  const [searchError, setSearchError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  async function loginBungie() {
    setIsLoggingIn(true);
    setLoginMessage("");
    setLoginError("");

    try {
      const result = await api.loginBungie();
      setLoginMessage(result.message);
      props.onLoginComplete();
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
      setAccountSummary(await api.getAccountSummary());
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
      setSelectedItem(await api.getItemDetail(item.hash));
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

  return (
    <main className="page">
      <h1>d2-service</h1>
      <p>今日面板会在后续阶段接入遗失区域、商人、角色和 AI 摘要。</p>
      <div className="status-grid">
        <StatusCard title="Bungie 配置" {...props.state.cards.bungieConfig} action="去配置" />
        <StatusCard
          title="账号登录"
          {...props.state.cards.account}
          action={isLoggingIn ? "等待授权..." : "登录 Bungie"}
          disabled={isLoggingIn}
          onAction={() => void loginBungie()}
        />
        <StatusCard
          title="资料库"
          {...props.state.cards.manifest}
          action={isInitializingManifest ? "初始化中..." : "初始化"}
          disabled={isInitializingManifest}
          onAction={() => void initializeManifest()}
        />
        <StatusCard title="AI" {...props.state.cards.ai} action="配置 AI" />
      </div>
      {loginMessage ? <p className="notice">{loginMessage}</p> : null}
      {loginError ? <p className="error">{loginError}</p> : null}
      {manifestMessage ? <p className="notice">{manifestMessage}</p> : null}
      {manifestError ? <p className="error">{manifestError}</p> : null}

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
                                <span>{[item.bucket_name, item.tier].filter(Boolean).join(" / ")}</span>
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

      {selectedItem ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedItem(null)}>
          <section className="item-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setSelectedItem(null)}>关闭</button>
            <div className="modal-title">
              {selectedItem.icon ? <img alt="" src={selectedItem.icon} /> : null}
              <div>
                <h2>{selectedItem.name}</h2>
                <p>{[selectedItem.tier, selectedItem.item_type].filter(Boolean).join(" / ")}</p>
              </div>
            </div>
            {selectedItem.description ? <p>{selectedItem.description}</p> : null}
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
      ) : null}
    </main>
  );
}
