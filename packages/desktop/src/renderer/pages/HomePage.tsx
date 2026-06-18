import { useState } from "react";
import { api, type ItemSearchResult, type StartupState } from "../api/client";
import { StatusCard } from "../components/StatusCard";

export function HomePage(props: {
  state: StartupState;
  onManifestInitialized: () => void;
}) {
  const [manifestMessage, setManifestMessage] = useState("");
  const [manifestError, setManifestError] = useState("");
  const [isInitializingManifest, setIsInitializingManifest] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ItemSearchResult[]>([]);
  const [searchError, setSearchError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

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
        <StatusCard title="账号登录" {...props.state.cards.account} action="登录 Bungie" />
        <StatusCard
          title="资料库"
          {...props.state.cards.manifest}
          action={isInitializingManifest ? "初始化中..." : "初始化"}
          disabled={isInitializingManifest}
          onAction={() => void initializeManifest()}
        />
        <StatusCard title="AI" {...props.state.cards.ai} action="配置 AI" />
      </div>
      {manifestMessage ? <p className="notice">{manifestMessage}</p> : null}
      {manifestError ? <p className="error">{manifestError}</p> : null}

      <section className="tool-panel">
        <div>
          <h2>物品搜索</h2>
          <p>先初始化资料库，然后搜索本地 Manifest 物品定义。</p>
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
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
