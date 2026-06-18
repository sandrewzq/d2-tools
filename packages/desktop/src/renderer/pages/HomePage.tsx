import { useState } from "react";
import { api } from "../api/client";
import type { StartupState } from "../api/client";
import { StatusCard } from "../components/StatusCard";

export function HomePage(props: {
  state: StartupState;
  onManifestInitialized: () => void;
}) {
  const [manifestMessage, setManifestMessage] = useState("");
  const [manifestError, setManifestError] = useState("");
  const [isInitializingManifest, setIsInitializingManifest] = useState(false);

  async function initializeManifest() {
    setIsInitializingManifest(true);
    setManifestMessage("");
    setManifestError("");

    try {
      const status = await api.initializeManifest();
      setManifestMessage(`资料库元数据已初始化：${status.version ?? "未知版本"}`);
      props.onManifestInitialized();
    } catch (error) {
      setManifestError(error instanceof Error ? error.message : "资料库初始化失败");
    } finally {
      setIsInitializingManifest(false);
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
    </main>
  );
}
