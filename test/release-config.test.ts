import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import {
  assertReleaseSigningEnvironment,
  buildUpdaterEndpoint,
  patchTauriUpdaterConfig,
  prepareTauriReleaseConfig,
  verifyReleaseVersions
} from "../scripts/release-config.mjs";

describe("release config helpers", () => {
  it("verifies all release versions match the tag", () => {
    expect(() =>
      verifyReleaseVersions({
        tagName: "v0.0.6",
        rootPackageVersion: "0.0.6",
        desktopPackageVersion: "0.0.6",
        cargoVersion: "0.0.6",
        tauriVersion: "0.0.6"
      })
    ).not.toThrow();

    expect(() =>
      verifyReleaseVersions({
        tagName: "v0.0.7",
        rootPackageVersion: "0.0.6",
        desktopPackageVersion: "0.0.6",
        cargoVersion: "0.0.6",
        tauriVersion: "0.0.6"
      })
    ).toThrow("Release tag v0.0.7 must match root package version v0.0.6");

    expect(() =>
      verifyReleaseVersions({
        tagName: "0.0.6",
        rootPackageVersion: "0.0.6",
        desktopPackageVersion: "0.0.6",
        cargoVersion: "0.0.6",
        tauriVersion: "0.0.6"
      })
    ).toThrow("Release tag must start with v");
  });

  it("builds the GitHub latest updater endpoint", () => {
    expect(buildUpdaterEndpoint("sandrew/d2-tools")).toBe(
      "https://github.com/sandrew/d2-tools/releases/latest/download/latest.json"
    );
  });

  it("requires all signing environment variables before preparing release config", () => {
    expect(() =>
      assertReleaseSigningEnvironment({
        TAURI_SIGNING_PRIVATE_KEY: "private-key",
        TAURI_SIGNING_PRIVATE_KEY_PASSWORD: "password",
        TAURI_UPDATER_PUBLIC_KEY: "public-key"
      })
    ).not.toThrow();

    expect(() =>
      assertReleaseSigningEnvironment({
        TAURI_SIGNING_PRIVATE_KEY: "private-key",
        TAURI_UPDATER_PUBLIC_KEY: "public-key"
      })
    ).toThrow("TAURI_SIGNING_PRIVATE_KEY_PASSWORD is required");
  });

  it("patches Tauri config with updater metadata", () => {
    const config = {
      productName: "d2-tools",
      bundle: {
        active: true,
        targets: ["nsis"]
      }
    };

    expect(
      patchTauriUpdaterConfig(config, {
        endpoint: "https://github.com/sandrew/d2-tools/releases/latest/download/latest.json",
        publicKey: "release-public-key"
      })
    ).toEqual({
      productName: "d2-tools",
      bundle: {
        active: true,
        targets: ["nsis"],
        createUpdaterArtifacts: true
      },
      plugins: {
        updater: {
          endpoints: [
            "https://github.com/sandrew/d2-tools/releases/latest/download/latest.json"
          ],
          pubkey: "release-public-key"
        }
      }
    });
  });

  it("prepares Tauri updater config from CI environment", () => {
    const config = {
      bundle: {
        active: true,
        targets: ["nsis"]
      }
    };

    expect(
      prepareTauriReleaseConfig({
        config,
        env: {
          GITHUB_REPOSITORY: "sandrew/d2-tools",
          TAURI_SIGNING_PRIVATE_KEY: "private-key",
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: "password",
          TAURI_UPDATER_PUBLIC_KEY: "public-key"
        }
      })
    ).toEqual({
      bundle: {
        active: true,
        targets: ["nsis"],
        createUpdaterArtifacts: true
      },
      plugins: {
        updater: {
          endpoints: [
            "https://github.com/sandrew/d2-tools/releases/latest/download/latest.json"
          ],
          pubkey: "public-key"
        }
      }
    });

    expect(() =>
      prepareTauriReleaseConfig({
        config,
        env: {
          TAURI_SIGNING_PRIVATE_KEY: "private-key",
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: "password",
          TAURI_UPDATER_PUBLIC_KEY: "public-key"
        }
      })
    ).toThrow("GITHUB_REPOSITORY is required");
  });

  it("keeps the release workflow wired for signed NSIS updater artifacts", () => {
    const workflow = readFileSync(".github/workflows/release.yml", "utf8");

    expect(workflow).toContain("tauri-apps/tauri-action@v0");
    expect(workflow).toContain("includeUpdaterJson: true");
    expect(workflow).toContain("updaterJsonPreferNsis: true");
    expect(workflow).toContain("args: --bundles nsis");
    expect(workflow).toContain("TAURI_SIGNING_PRIVATE_KEY:");
    expect(workflow).toContain("TAURI_SIGNING_PRIVATE_KEY_PASSWORD:");
    expect(workflow).toContain("TAURI_UPDATER_PUBLIC_KEY:");
    expect(workflow).toContain("node scripts/prepare-tauri-release-config.mjs");
    expect(workflow).toContain("pnpm release:check");
  });
});
