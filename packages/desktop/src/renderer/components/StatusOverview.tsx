import type { StartupState } from "../api/types";
import { StatusCard } from "./StatusCard";

export function StatusOverview(props: {
  state: StartupState;
  isLoggingIn: boolean;
  isLoadingAccount: boolean;
  accountError: string;
  accountWarning: string;
  hasAccountData: boolean;
  isInitializingManifest: boolean;
  onConfigure: () => void;
  onLogin: () => void;
  onLoadAccount: () => void;
  onInitializeManifest: () => void;
  onConfigureAi: () => void;
}) {
  const needsBungieConfig = props.state.cards.bungieConfig.status !== "ready";
  const accountCard = getAccountStatusCard({
    state: props.state,
    accountError: props.accountError,
    accountWarning: props.accountWarning,
    hasAccountData: props.hasAccountData,
    isLoadingAccount: props.isLoadingAccount
  });
  const accountAction = props.isLoggingIn
    ? "等待授权..."
    : needsBungieConfig
      ? "先配置 Bungie"
      : props.accountError
      ? "重试读取"
      : props.isLoadingAccount
      ? "读取中..."
      : props.hasAccountData
      ? "刷新账号"
      : props.state.cards.account.status === "ready"
      ? "读取账号"
      : "登录 Bungie";
  const accountActionHandler = needsBungieConfig
    ? props.onConfigure
    : props.accountError || props.hasAccountData || props.state.cards.account.status === "ready"
    ? props.onLoadAccount
    : props.onLogin;
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
        {...accountCard}
        action={accountAction}
        busy={props.isLoggingIn || props.isLoadingAccount}
        disabled={props.isLoggingIn || props.isLoadingAccount}
        onAction={accountActionHandler}
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

function getAccountStatusCard(input: {
  state: StartupState;
  accountError: string;
  accountWarning: string;
  hasAccountData: boolean;
  isLoadingAccount: boolean;
}): StartupState["cards"]["account"] {
  if (input.isLoadingAccount) {
    return {
      status: "skipped",
      label: input.hasAccountData ? "正在刷新账号数据" : "正在读取账号数据"
    };
  }

  if (input.accountError && input.hasAccountData) {
    return {
      status: "skipped",
      label: `刷新失败，显示上次账号数据：${input.accountError}`
    };
  }

  if (input.accountError) {
    return {
      status: "missing",
      label: `账号数据读取失败：${input.accountError}`
    };
  }

  if (input.accountWarning && input.hasAccountData) {
    return {
      status: "skipped",
      label: `账号数据已读取，本地增强数据异常：${input.accountWarning}`
    };
  }

  if (input.hasAccountData) {
    return {
      status: "ready",
      label: "账号数据已读取"
    };
  }

  if (input.state.cards.account.status === "ready") {
    return {
      status: "skipped",
      label: "账号凭据已存在，尚未读取账号数据"
    };
  }

  return input.state.cards.account;
}
