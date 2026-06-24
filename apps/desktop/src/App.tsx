import { useEffect, useState } from "react";
import {
  createDefaultSettings,
  type AiConversation,
  type AppSettings,
  type ManifestStatus
} from "@d2-tools/core";
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

function FoundationDashboard() {
  const { data, platform } = useAppServices();
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

    void Promise.all([
      platform.paths.getDataDir().then((dataDir) => createDefaultSettings(dataDir)),
      data.manifest.getStatus(),
      data.ai.listConversations()
    ]).then(([nextSettings, nextManifest, nextConversations]) => {
      if (active) {
        setSettings(nextSettings);
        setManifest(nextManifest);
        setConversations(nextConversations);
      }
    });

    return () => {
      active = false;
    };
  }, [data, platform]);

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
