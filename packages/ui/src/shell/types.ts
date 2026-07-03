import type { ReactNode } from "react";
import type { InterfaceLocale, ProductPreferences } from "../i18n/types.js";

export type ShellPageKey = "home" | "account" | "vault" | "loadouts" | "library" | "vendors" | "settings";
export type ShellAssistantMode = "ai" | "tasks" | null;

export type ShellNavItem = {
  key: ShellPageKey;
  label: string;
};

export type ShellStatusItem = {
  key?: "bungie" | "account" | "library" | "ai" | "background" | "app-version";
  label: string;
  value: string;
  tone?: "neutral" | "ready" | "warning" | "error";
};

export type PlatformActions = {
  openExternal: (url: string) => Promise<void> | void;
  setColorMode?: (mode: "light" | "dark") => Promise<void> | void;
  persistPreferences?: (preferences: ProductPreferences) => Promise<void> | void;
  windowControls?: {
    minimize: () => Promise<void> | void;
    toggleMaximize: () => Promise<void> | void;
    close: () => Promise<void> | void;
  };
};

export type AppShellLayoutProps = {
  activePage: ShellPageKey;
  assistantMode: ShellAssistantMode;
  onNavigate: (page: ShellPageKey) => void;
  onAssistantModeChange: (mode: ShellAssistantMode) => void;
  onColorModeToggle: () => void;
  onInterfaceLocaleToggle?: () => void;
  colorMode: "light" | "dark";
  interfaceLocale?: InterfaceLocale;
  assistantPanel: ReactNode;
  shellStatus: ShellStatusItem[];
  children: ReactNode;
};
