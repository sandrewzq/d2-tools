import type { StartupState } from "../api/client";
import { StatusCard } from "../components/StatusCard";

export function HomePage({ state }: { state: StartupState }) {
  return (
    <main className="page">
      <h1>d2-service</h1>
      <p>今日面板会在后续阶段接入遗失区域、商人、角色和 AI 摘要。</p>
      <div className="status-grid">
        <StatusCard title="Bungie 配置" {...state.cards.bungieConfig} action="去配置" />
        <StatusCard title="账号登录" {...state.cards.account} action="登录 Bungie" />
        <StatusCard title="资料库" {...state.cards.manifest} action="初始化" />
        <StatusCard title="AI" {...state.cards.ai} action="配置 AI" />
      </div>
    </main>
  );
}
