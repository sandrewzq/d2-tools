import type { AppSettings } from "@d2-tools/core";
import { Panel } from "../primitives/Panel";

export interface SettingsSummaryProps {
  readonly settings: AppSettings;
}

export function SettingsSummary({ settings }: SettingsSummaryProps) {
  return (
    <Panel title="设置">
      <dl>
        <dt>数据目录</dt>
        <dd>{settings.dataDir}</dd>
        <dt>Bungie API</dt>
        <dd>{settings.bungie.apiKeyConfigured ? "已配置" : "未配置"}</dd>
        <dt>AI 模型</dt>
        <dd>{settings.ai.model ?? "未配置"}</dd>
      </dl>
    </Panel>
  );
}
