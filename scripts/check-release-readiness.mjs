#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { extractChangelogForVersion } from "./extract-changelog.mjs";
import { generateReleaseNotes } from "./generate-release-notes.mjs";
import {
  buildUpdaterEndpoint,
  prepareTauriReleaseConfig,
  readJson,
  verifyReleaseVersions
} from "./release-config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

export function checkReleaseReadiness({
  repository,
  signingEnv,
  releaseNotes
} = {}) {
  const rootPackage = readJson("package.json");
  const desktopPackage = readJson("apps/desktop/package.json");
  const tauriConfig = readJson("apps/desktop/src-tauri/tauri.conf.json");
  const cargoToml = readFileSync("apps/desktop/src-tauri/Cargo.toml", "utf8");
  const cargoVersion = cargoToml.match(/^version = "([^"]+)"$/m)?.[1];

  if (!cargoVersion) {
    throw new Error("Cargo package version was not found");
  }

  const version = rootPackage.version;
  const tagName = `v${version}`;

  verifyReleaseVersions({
    tagName,
    rootPackageVersion: version,
    desktopPackageVersion: desktopPackage.version,
    cargoVersion,
    tauriVersion: tauriConfig.version
  });

  extractChangelogForVersion(rootDir, version);

  const notes = releaseNotes ?? generateReleaseNotes(rootDir, version);
  assertCurrentReleaseNotes(notes);

  const effectiveRepository = repository ?? process.env.GITHUB_REPOSITORY ?? "sandrew/d2-tools";
  const env = {
    TAURI_SIGNING_PRIVATE_KEY: "readiness-private-key",
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: "readiness-password",
    TAURI_UPDATER_PUBLIC_KEY: "readiness-public-key",
    ...signingEnv,
    GITHUB_REPOSITORY: effectiveRepository
  };

  prepareTauriReleaseConfig({ config: tauriConfig, env });

  return {
    version,
    tagName,
    updaterEndpoint: buildUpdaterEndpoint(effectiveRepository),
    releasePublicationCheck: `npx pnpm@9.15.0 release:verify -- ${tagName}`,
    releaseAssetsCheck: `npx pnpm@9.15.0 release:verify-assets -- ${tagName}`,
    updaterMetadataCheck: "npx pnpm@9.15.0 release:verify-updater -- latest.json"
  };
}

function assertCurrentReleaseNotes(notes) {
  if (
    (notes.includes("绿色包") || notes.includes("7z")) &&
    !notes.includes("Windows x64 NSIS 安装器")
  ) {
    throw new Error("Release notes must not describe the old 7z package");
  }

  if (!notes.includes("NSIS") || !notes.includes("latest.json")) {
    throw new Error("Release notes must describe the NSIS installer and latest.json updater metadata");
  }
}

function main() {
  try {
    const result = checkReleaseReadiness();
    console.log(`Release readiness check passed for ${result.tagName}`);
    console.log(`Updater endpoint: ${result.updaterEndpoint}`);
    console.log(`Post-release publication check: ${result.releasePublicationCheck}`);
    console.log(`Post-release asset check: ${result.releaseAssetsCheck}`);
    console.log(`Post-release updater metadata check: ${result.updaterMetadataCheck}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

const isMain = import.meta.url.startsWith("file:") && process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
