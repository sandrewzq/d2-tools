export const uiPackageName = "@d2-tools/ui";
export { AccountPageView } from "./account/AccountPageView.js";
export { AppShell } from "./shell/AppShell.js";
export { HomePageView } from "./home/HomePageView.js";
export type { HomeDailySummary, HomeStartupState } from "./home/HomePageView.js";
export { getLocaleCopy, localeCopy } from "./i18n/copy.js";
export {
  defaultProductPreferences,
  getBungieLocaleForInterface,
  getEffectiveBungieLocale,
  getNextInterfaceLocale
} from "./i18n/preferences.js";
export type { BungieManifestLocale, InterfaceLocale, LocaleCopy, ProductPreferences, ShellCopy } from "./i18n/types.js";
export { ProductShellHost } from "./product/ProductShellHost.js";
export type { ProductShellHostProps } from "./product/types.js";
export { getLocalizedNavItems, navItems } from "./shell/navigation.js";
export { SettingsPageView } from "./settings/SettingsPageView.js";
export type {
  AppShellLayoutProps,
  PlatformActions,
  ShellAssistantMode,
  ShellNavItem,
  ShellPageKey,
  ShellStatusItem
} from "./shell/types.js";
