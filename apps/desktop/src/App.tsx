import { useEffect, useState } from "react";
import {
  type AiConversation,
  type AppSettings,
  type ManifestStatus
} from "@d2-tools/core";
import type { DataServices } from "@d2-tools/data";
import type { PlatformServices } from "@d2-tools/platform";
import {
  AiConversationList,
  AppShell,
  ManifestStatusView,
  SettingsSummary
} from "@d2-tools/ui";
import { createDesktopPlatform } from "./platform/createDesktopPlatform";
import { AppProviders } from "./providers/AppProviders";
import { useAppServices } from "./providers/AppServicesContext";

export interface AppProps {
  readonly platform?: PlatformServices;
}

export function App({ platform = createDesktopPlatform() }: AppProps) {
  return (
    <AppProviders platform={platform}>
      <FoundationDashboard />
    </AppProviders>
  );
}

export interface FoundationDashboardData {
  readonly settings: AppSettings;
  readonly manifest: ManifestStatus;
  readonly conversations: readonly AiConversation[];
}

export async function loadFoundationDashboardData(
  data: DataServices
): Promise<FoundationDashboardData> {
  const [settings, manifest, conversations] = await Promise.all([
    data.settings.getSettings(),
    data.manifest.getStatus(),
    data.ai.listConversations()
  ]);

  return { settings, manifest, conversations };
}

function FoundationDashboard() {
  const { data } = useAppServices();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [manifest, setManifest] = useState<ManifestStatus | null>(null);
  const [conversations, setConversations] = useState<readonly AiConversation[]>(
    []
  );

  useEffect(() => {
    if (data === null) {
      return;
    }

    let active = true;

    void loadFoundationDashboardData(data).then((nextData) => {
      if (active) {
        setSettings(nextData.settings);
        setManifest(nextData.manifest);
        setConversations(nextData.conversations);
      }
    });

    return () => {
      active = false;
    };
  }, [data]);

  return (
    <AppShell title="d2-tools">
      <p>架构底座</p>
      {settings === null ? (
        <p>正在读取设置</p>
      ) : (
        <SettingsSummary settings={settings} />
      )}
      {manifest === null ? null : <ManifestStatusView status={manifest} />}
      <AiConversationList conversations={conversations} />
    </AppShell>
  );
}
