import type { PlatformServices } from "@d2-tools/platform";
import {
  createSettingsRepository,
  type SettingsRepository
} from "./repositories/settingsRepository";
import {
  createManifestRepository,
  type ManifestRepository
} from "./repositories/manifestRepository";
import {
  createAiRepository,
  type AiRepository
} from "./repositories/aiRepository";

export interface DataServices {
  readonly settings: SettingsRepository;
  readonly manifest: ManifestRepository;
  readonly ai: AiRepository;
}

export async function createDataServices(
  platform: PlatformServices
): Promise<DataServices> {
  return {
    settings: createSettingsRepository(platform),
    manifest: createManifestRepository(),
    ai: createAiRepository()
  };
}
