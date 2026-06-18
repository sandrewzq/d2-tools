export type DestinyManifestMetadata = {
  version: string;
  mobileWorldContentPaths: Record<string, string>;
  jsonWorldComponentContentPaths?: Record<string, Record<string, string>>;
};

export function selectManifestLanguagePath(
  metadata: DestinyManifestMetadata,
  language: string
): string {
  const normalizedLanguage = language.trim().toLowerCase();
  const paths = metadata.mobileWorldContentPaths;

  if (paths[normalizedLanguage]) {
    return paths[normalizedLanguage];
  }

  if (paths.en) {
    return paths.en;
  }

  const firstPath = Object.values(paths)[0];
  if (!firstPath) {
    throw new Error("Manifest metadata does not include mobile world content paths");
  }

  return firstPath;
}
