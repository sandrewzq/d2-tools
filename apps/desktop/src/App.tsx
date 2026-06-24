import { useEffect, useState } from "react";
import {
  type AiConversation,
  type AppSettings,
  type ManifestStatus
} from "@d2-tools/core";
import type { DataServices } from "@d2-tools/data";
import type {
  PlatformServices,
  PlatformUpdateCheckResult
} from "@d2-tools/platform";
import {
  AiConversationList,
  AppShell,
  ManifestStatusView,
  SettingsSummary,
  type UpdateStatusViewState,
  UpdateStatusView
} from "@d2-tools/ui";
import { createDesktopPlatform } from "./platform/createDesktopPlatform";
import { AppProviders } from "./providers/AppProviders";
import { useAppServices } from "./providers/AppServicesContext";

export const LATEST_RELEASE_URL =
  "https://github.com/sandrew/d2-tools/releases/latest";

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

export function createUpdateStatusFromCheckResult(
  result: PlatformUpdateCheckResult
): UpdateStatusViewState {
  return {
    phase: result.available ? "available" : "current",
    version: result.version,
    notes: result.notes,
    errorMessage: null
  };
}

export function createUpdateErrorStatus(error: unknown): UpdateStatusViewState {
  return {
    phase: "error",
    version: null,
    notes: null,
    errorMessage:
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "更新操作失败"
  };
}

export function createUpdateInstallErrorStatus(
  current: UpdateStatusViewState,
  error: unknown
): UpdateStatusViewState {
  return {
    ...createUpdateErrorStatus(error),
    version: current.version,
    notes: current.notes
  };
}

export function createUpdateInstallRequestedStatus(
  current: UpdateStatusViewState
): UpdateStatusViewState {
  return {
    phase: "restartRequested",
    version: current.version,
    notes: current.notes,
    errorMessage: null
  };
}

function FoundationDashboard() {
  const { data, platform } = useAppServices();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [manifest, setManifest] = useState<ManifestStatus | null>(null);
  const [conversations, setConversations] = useState<readonly AiConversation[]>(
    []
  );
  const [updateStatus, setUpdateStatus] = useState<UpdateStatusViewState>({
    phase: "idle",
    version: null,
    notes: null,
    errorMessage: null
  });

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

  async function checkForUpdates() {
    setUpdateStatus({
      phase: "checking",
      version: null,
      notes: null,
      errorMessage: null
    });

    try {
      const result = await platform.updates.check();
      setUpdateStatus(createUpdateStatusFromCheckResult(result));
    } catch (error) {
      setUpdateStatus(createUpdateErrorStatus(error));
    }
  }

  async function installUpdate() {
    setUpdateStatus((current) => ({
      phase: "installing",
      version: current.version,
      notes: current.notes,
      errorMessage: null
    }));

    try {
      await platform.updates.install();
      setUpdateStatus((current) => createUpdateInstallRequestedStatus(current));
    } catch (error) {
      setUpdateStatus((current) => createUpdateInstallErrorStatus(current, error));
    }
  }

  async function openReleasePage() {
    await platform.external.openExternal(LATEST_RELEASE_URL);
  }

  return (
    <AppShell title="d2-tools">
      <p>架构底座</p>
      {settings === null ? (
        <p>正在读取设置</p>
      ) : (
        <SettingsSummary settings={settings} />
      )}
      {manifest === null ? null : <ManifestStatusView status={manifest} />}
      <UpdateStatusView
        status={updateStatus}
        onCheck={() => {
          void checkForUpdates();
        }}
        onInstall={() => {
          void installUpdate();
        }}
        onOpenReleasePage={() => {
          void openReleasePage();
        }}
      />
      <AiConversationList conversations={conversations} />
    </AppShell>
  );
}
