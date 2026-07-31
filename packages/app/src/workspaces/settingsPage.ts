import type { AccountSummary } from "@d2-tools/core/account/summary";

export type SettingsSectionKey =
  | "overview"
  | "language"
  | "account"
  | "library"
  | "bungie"
  | "ai"
  | "backup"
  | "diagnostics";

export type SettingsActionLogResultFilter = "all" | "success" | "failed";

export type SettingsActionLogTypeFilter =
  | "all"
  | "set-lock"
  | "equip"
  | "insert-socket-plug"
  | "transfer"
  | "postmaster-pull"
  | "loadout-equip"
  | "loadout-snapshot"
  | "loadout-clear"
  | "loadout-update-identifiers";

export type SettingsLanguagePreferences = {
  interfaceLocale: "zh-CN" | "en-US";
  bungieLocale: "zh-chs" | "en";
  followInterfaceLocaleForBungie: boolean;
};

export type SettingsPageModel = {
  interfaceLocale?: SettingsLanguagePreferences["interfaceLocale"];
  initialSection: SettingsSectionKey;
  message: string;
  error: string;
  diagnosticDataDir: string;
  writeActionsEnabled: boolean;
  appUpdateSnapshot: any | null;
  manifestStatus: any | null;
  manifestStatusError: string;
  isLoadingManifestStatus: boolean;
  isInitializingManifest: boolean;
  accountSummary: AccountSummary | null;
  accountError: string;
  accountWarning: string;
  isLoadingAccount: boolean;
  lastAccountLoadedAt: Date | null;
  isAiConfigured: boolean;
  backgroundTasks: any[];
  actionLog: any[];
  actionLogResultFilter: SettingsActionLogResultFilter;
  actionLogTypeFilter: SettingsActionLogTypeFilter;
  languagePreferences: SettingsLanguagePreferences;
};

export type SettingsPageModelInput = Omit<SettingsPageModel, "initialSection"> & {
  initialSection?: SettingsSectionKey;
};

export function selectSettingsPageModel(input: SettingsPageModelInput): SettingsPageModel {
  return {
    ...input,
    initialSection: input.initialSection ?? "overview"
  };
}
