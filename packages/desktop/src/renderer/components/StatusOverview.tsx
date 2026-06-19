import type { StartupState } from "../api/client";
import { StatusCard } from "./StatusCard";

export function StatusOverview(props: {
  state: StartupState;
  isLoggingIn: boolean;
  isInitializingManifest: boolean;
  onConfigure: () => void;
  onLogin: () => void;
  onInitializeManifest: () => void;
  onConfigureAi: () => void;
}) {
  const accountAction = props.isLoggingIn
    ? "等待授权..."
    : props.state.cards.account.status === "ready"
      ? "重新登录"
      : "登录 Bungie";
  const manifestAction = props.isInitializingManifest
    ? "初始化中..."
    : props.state.cards.manifest.status === "ready"
      ? "更新资料库"
      : "初始化";

  return (
    <section className="status-overview" aria-label="当前状态">
      <StatusCard
        title="Bungie 配置"
        {...props.state.cards.bungieConfig}
        action="去配置"
        onAction={props.onConfigure}
      />
      <StatusCard
        title="账号登录"
        {...props.state.cards.account}
        action={accountAction}
        busy={props.isLoggingIn}
        disabled={props.isLoggingIn}
        onAction={props.onLogin}
      />
      <StatusCard
        title="资料库"
        {...props.state.cards.manifest}
        action={manifestAction}
        busy={props.isInitializingManifest}
        disabled={props.isInitializingManifest}
        onAction={props.onInitializeManifest}
      />
      <StatusCard title="AI" {...props.state.cards.ai} action="配置 AI" onAction={props.onConfigureAi} />
    </section>
  );
}
