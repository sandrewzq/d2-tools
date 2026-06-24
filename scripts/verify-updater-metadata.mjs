#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DEFAULT_TARGET = "windows-x86_64";

export function validateUpdaterMetadata(metadata, target = DEFAULT_TARGET) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new Error("latest.json must be a JSON object");
  }

  if (typeof metadata.version !== "string" || metadata.version.trim() === "") {
    throw new Error("latest.json must include a version");
  }

  const platforms = metadata.platforms;
  if (!platforms || typeof platforms !== "object" || Array.isArray(platforms)) {
    throw new Error("latest.json must include platforms");
  }

  const platform = platforms[target];
  if (!platform || typeof platform !== "object" || Array.isArray(platform)) {
    throw new Error(`latest.json must include platforms.${target}`);
  }

  if (typeof platform.url !== "string" || platform.url.trim() === "") {
    throw new Error(`platforms.${target}.url is required`);
  }

  if (!/^https:\/\/github\.com\/.+\/releases\/download\/.+/i.test(platform.url)) {
    throw new Error(`platforms.${target}.url must point to a GitHub Release asset`);
  }

  if (typeof platform.signature !== "string" || platform.signature.trim() === "") {
    throw new Error(`platforms.${target}.signature is required`);
  }

  if (/^https?:\/\//i.test(platform.signature)) {
    throw new Error(`platforms.${target}.signature must be signature content, not a URL`);
  }

  return {
    version: metadata.version,
    target,
    url: platform.url
  };
}

function readUpdaterMetadata(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function main() {
  const metadataPath = process.argv[2];
  if (!metadataPath) {
    console.error("Usage: node scripts/verify-updater-metadata.mjs <latest.json>");
    process.exit(1);
  }

  try {
    const result = validateUpdaterMetadata(readUpdaterMetadata(metadataPath));
    console.log(`Updater metadata OK: ${result.version} ${result.target}`);
    console.log(`Asset URL: ${result.url}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

const isMain = import.meta.url.startsWith("file:") && process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
