#!/usr/bin/env node

import { fileURLToPath } from "node:url";

import { validateReleaseAssets } from "./verify-release-assets.mjs";
import { validateUpdaterMetadata } from "./verify-updater-metadata.mjs";

const DEFAULT_REPOSITORY = "sandrew/d2-tools";

export async function verifyReleasePublication({
  repository = DEFAULT_REPOSITORY,
  tagName = "latest",
  fetchImpl = fetch
}) {
  const release = await fetchRelease({ repository, tagName, fetchImpl });
  const releaseAssets = validateReleaseAssets(release);
  const metadataAsset = release.assets.find((asset) => asset?.name === "latest.json");

  if (!metadataAsset?.browser_download_url) {
    throw new Error(`Release ${releaseAssets.tagName} latest.json asset is missing a download URL`);
  }

  const metadata = await fetchJson(metadataAsset.browser_download_url, fetchImpl);
  const updaterMetadata = validateUpdaterMetadata(metadata);

  return {
    tagName: releaseAssets.tagName,
    installer: releaseAssets.installer,
    updaterMetadata: releaseAssets.updaterMetadata,
    updaterVersion: updaterMetadata.version,
    updaterTarget: updaterMetadata.target
  };
}

async function fetchRelease({ repository, tagName, fetchImpl }) {
  const endpoint =
    tagName === "latest"
      ? `https://api.github.com/repos/${repository}/releases/latest`
      : `https://api.github.com/repos/${repository}/releases/tags/${tagName}`;

  const release = await fetchJson(endpoint, fetchImpl);
  return {
    tagName: release.tag_name,
    assets: release.assets ?? []
  };
}

async function fetchJson(url, fetchImpl) {
  const response = await fetchImpl(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "d2-tools-release-verifier"
    }
  });

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
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
    const result = await verifyReleasePublication(parseArgs(process.argv.slice(2)));

    console.log(`Release publication OK: ${result.tagName}`);
    console.log(`Installer: ${result.installer}`);
    console.log(`Updater metadata: ${result.updaterMetadata}`);
    console.log(`Updater target: ${result.updaterTarget}`);
    console.log(`Updater version: ${result.updaterVersion}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

const isMain = import.meta.url.startsWith("file:") && process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  await main();
}
