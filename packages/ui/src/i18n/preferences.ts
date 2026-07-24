import type { BungieManifestLocale, InterfaceLocale, ProductPreferences } from "./types.js";

export const defaultProductPreferences: ProductPreferences = {
  interfaceLocale: "zh-CN",
  bungieLocale: "zh-chs",
  followInterfaceLocaleForBungie: true,
  colorMode: "light",
  density: "standard"
};

export function getBungieLocaleForInterface(locale: InterfaceLocale): BungieManifestLocale {
  return locale === "en-US" ? "en" : "zh-chs";
}

export function getEffectiveBungieLocale(preferences: ProductPreferences): BungieManifestLocale {
  if (preferences.followInterfaceLocaleForBungie) {
    return getBungieLocaleForInterface(preferences.interfaceLocale);
  }

  return preferences.bungieLocale;
}

export function getNextInterfaceLocale(locale: InterfaceLocale): InterfaceLocale {
  return locale === "zh-CN" ? "en-US" : "zh-CN";
}
