import type { ShellNavItem, ShellPageKey } from "./types.js";
import { getLocaleCopy } from "../i18n/copy.js";
import type { InterfaceLocale } from "../i18n/types.js";
import { isLoadoutsVisible } from "./featureVisibility.js";

const navItemKeys = [
  "home",
  "account",
  "vault",
  "loadouts",
  "library",
  "vendors",
  "directory",
  "settings"
] as const;

const hiddenNavItemKeys: ReadonlySet<ShellPageKey> = new Set<ShellPageKey>(
  isLoadoutsVisible ? [] : (["loadouts"] as const)
);

export function getLocalizedNavItems(locale: InterfaceLocale): ShellNavItem[] {
  const navigationCopy = getLocaleCopy(locale).shell.navigation;
  return navItemKeys
    .filter((key) => !hiddenNavItemKeys.has(key))
    .map((key) => ({
      key,
      label: navigationCopy[key]
    }));
}

export const navItems: ShellNavItem[] = getLocalizedNavItems("zh-CN");
