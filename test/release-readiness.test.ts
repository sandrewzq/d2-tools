import { describe, expect, it } from "vitest";

import { checkReleaseReadiness } from "../scripts/check-release-readiness.mjs";

describe("checkReleaseReadiness", () => {
  it("checks the current Tauri release metadata without signing secrets", () => {
    const result = checkReleaseReadiness({
      repository: "sandrew/d2-tools",
      signingEnv: {
        TAURI_SIGNING_PRIVATE_KEY: "private-key",
        TAURI_SIGNING_PRIVATE_KEY_PASSWORD: "password",
        TAURI_UPDATER_PUBLIC_KEY: "public-key"
      }
    });

    expect(result).toEqual({
      version: "0.0.6",
      tagName: "v0.0.6",
      updaterEndpoint:
        "https://github.com/sandrew/d2-tools/releases/latest/download/latest.json",
      releasePublicationCheck:
        "npx pnpm@9.15.0 release:verify -- v0.0.6",
      releaseAssetsCheck:
        "npx pnpm@9.15.0 release:verify-assets -- v0.0.6",
      updaterMetadataCheck:
        "npx pnpm@9.15.0 release:verify-updater -- latest.json"
    });
  });

  it("fails when release notes still describe old package formats", () => {
    expect(() =>
      checkReleaseReadiness({
        repository: "sandrew/d2-tools",
        signingEnv: {
          TAURI_SIGNING_PRIVATE_KEY: "private-key",
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: "password",
          TAURI_UPDATER_PUBLIC_KEY: "public-key"
        },
        releaseNotes: "Windows x64 绿色包，7z 格式。"
      })
    ).toThrow("Release notes must not describe the old 7z package");
  });
});
