#!/usr/bin/env node

import { readFileSync } from "node:fs";

import { readJson, verifyReleaseVersions } from "./release-config.mjs";

const tagName = process.argv[2] ?? process.env.GITHUB_REF_NAME;

if (!tagName) {
  throw new Error("Release tag is required");
}

const rootPackage = readJson("package.json");
const desktopPackage = readJson("apps/desktop/package.json");
const tauriConfig = readJson("apps/desktop/src-tauri/tauri.conf.json");
const cargoToml = readFileSync("apps/desktop/src-tauri/Cargo.toml", "utf8");
const cargoVersion = cargoToml.match(/^version = "([^"]+)"$/m)?.[1];

if (!cargoVersion) {
  throw new Error("Cargo package version was not found");
}

verifyReleaseVersions({
  tagName,
  rootPackageVersion: rootPackage.version,
  desktopPackageVersion: desktopPackage.version,
  cargoVersion,
  tauriVersion: tauriConfig.version
});
