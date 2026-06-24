#!/usr/bin/env node

import { fileURLToPath } from "node:url";

const DEFAULT_REPOSITORY = "sandrew/d2-tools";

export function validateReleaseAssets({ tagName, assets }) {
  if (!tagName) {
    throw new Error("Release tag is required");
  }

  if (!Array.isArray(assets)) {
    throw new Error(`Release ${tagName} assets must be an array`);
  }

  const assetNames = assets.map((asset) => asset?.name).filter(Boolean);

  if (assetNames.some((name) => /\.7z$/i.test(name))) {
    throw new Error(`Release ${tagName} must not publish old .7z green packages`);
  }

  const updaterMetadata = assetNames.find((name) => name === "latest.json");
  if (!updaterMetadata) {
    throw new Error(`Release ${tagName} must include latest.json`);
  }

  const installer = assetNames.find((name) => /\.exe$/i.test(name) && /setup/i.test(name));
  if (!installer) {
    throw new Error(`Release ${tagName} must include a Windows NSIS .exe installer`);
  }

  return {
    tagName,
    installer,
    updaterMetadata
  };
}

export async function fetchReleaseAssets({ repository = DEFAULT_REPOSITORY, tagName }) {
  const endpoint =
    tagName === "latest"
      ? `https://api.github.com/repos/${repository}/releases/latest`
      : `https://api.github.com/repos/${repository}/releases/tags/${tagName}`;

  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "d2-tools-release-verifier"
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub Release lookup failed: ${response.status} ${response.statusText}`);
  }

  const release = await response.json();
  return {
    tagName: release.tag_name,
    assets: release.assets ?? []
  };
}

function parseArgs(argv) {
  const args = [...argv];
  const tagName = args[0] ?? "latest";
  const repositoryIndex = args.indexOf("--repo");
  const repository =
    repositoryIndex === -1 ? DEFAULT_REPOSITORY : args[repositoryIndex + 1];

  if (!repository) {
    throw new Error("--repo requires an owner/name value");
  }

  return { tagName, repository };
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const release = await fetchReleaseAssets(options);
    const result = validateReleaseAssets(release);

    console.log(`Release assets OK: ${result.tagName}`);
    console.log(`Installer: ${result.installer}`);
    console.log(`Updater metadata: ${result.updaterMetadata}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

const isMain = import.meta.url.startsWith("file:") && process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  await main();
}
