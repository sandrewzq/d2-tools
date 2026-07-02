import type { ReactNode } from "react";
import type { ProductPreferences } from "../i18n/types.js";
import type { PlatformActions, ShellAssistantMode, ShellPageKey, ShellStatusItem } from "../shell/types.js";

export type ProductShellHostProps = {
  activePage?: ShellPageKey;
  assistantMode?: ShellAssistantMode;
  preferences?: ProductPreferences;
  initialPage?: ShellPageKey;
  initialAssistantMode?: ShellAssistantMode;
  initialPreferences?: ProductPreferences;
  onPageChange?: (page: ShellPageKey) => void;
  onAssistantModeChange?: (mode: ShellAssistantMode) => void;
  onPreferencesChange?: (preferences: ProductPreferences) => void;
  shellStatus: ShellStatusItem[];
  assistantPanel: ReactNode;
  platformActions: PlatformActions;
  renderPage: (page: ShellPageKey) => ReactNode;
};
