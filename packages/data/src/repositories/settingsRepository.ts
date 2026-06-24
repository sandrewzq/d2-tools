import { createDefaultSettings, type AppSettings } from "@d2-tools/core";
import type { PlatformServices } from "@d2-tools/platform";

export type AppSettingsPatch = Partial<{
  dataDir: string;
  bungie: Partial<AppSettings["bungie"]>;
  ai: Partial<AppSettings["ai"]>;
}>;

export interface SettingsRepository {
  getSettings(): Promise<AppSettings>;
  saveSettings(input: AppSettingsPatch): Promise<AppSettings>;
}

const SETTINGS_PATH = "settings/app.json";

export function createSettingsRepository(
  platform: PlatformServices
): SettingsRepository {
  async function readStoredSettings(): Promise<AppSettings | null> {
    const raw = await platform.files.readText(SETTINGS_PATH);
    return raw === null ? null : (JSON.parse(raw) as AppSettings);
  }

  async function getSettings(): Promise<AppSettings> {
    const stored = await readStoredSettings();
    if (stored !== null) {
      return stored;
    }

    return createDefaultSettings(await platform.paths.getDataDir());
  }

  return {
    getSettings,
    async saveSettings(input) {
      const current = await getSettings();
      const bungiePatch = input.bungie ?? {};
      const aiPatch = input.ai ?? {};
      const next: AppSettings = {
        dataDir: input.dataDir ?? current.dataDir,
        bungie: {
          apiKeyConfigured:
            bungiePatch.apiKeyConfigured ?? current.bungie.apiKeyConfigured
        },
        ai: {
          providerConfigured:
            aiPatch.providerConfigured ?? current.ai.providerConfigured,
          providerId: Object.hasOwn(aiPatch, "providerId")
            ? aiPatch.providerId ?? null
            : current.ai.providerId,
          model: Object.hasOwn(aiPatch, "model")
            ? aiPatch.model ?? null
            : current.ai.model
        }
      };

      await platform.files.writeText(SETTINGS_PATH, JSON.stringify(next, null, 2));
      return next;
    }
  };
}
