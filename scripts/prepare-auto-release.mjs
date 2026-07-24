import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertBilingualChangelogSection, extractChangelogSection } from "./extract-changelog.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const args = [...argv];
  const dryRunIndex = args.indexOf("--dry-run");
  const dryRun = dryRunIndex !== -1;
  if (dryRun) args.splice(dryRunIndex, 1);
  if (args.length > 0) throw new Error("prepare-auto-release does not accept positional arguments.");
  return { dryRun };
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function writeJson(file, json) {
  writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`, "utf8");
}

function bumpVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`Unsupported package version: ${version}. Expected x.y.z.`);
  return `${match[1]}.${match[2]}.${Number.parseInt(match[3], 10) + 1}`;
}

function getPackageFiles() {
  const files = [join(repoRoot, "package.json")];
  const packagesDir = join(repoRoot, "packages");
  if (!existsSync(packagesDir)) return files;
  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const packageJson = join(packagesDir, entry.name, "package.json");
    if (existsSync(packageJson)) files.push(packageJson);
  }
  return files;
}

function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function promoteUnreleasedChangelog(version, dryRun) {
  const changelogPath = join(repoRoot, "CHANGELOG.md");
  const changelog = readFileSync(changelogPath, "utf8");
  const existing = extractChangelogSection(changelog, version);
  if (existing !== null) {
    assertBilingualChangelogSection(existing, version);
    console.log(`Reusing existing bilingual CHANGELOG.md section for ${version}.`);
    return false;
  }

  const unreleased = extractChangelogSection(changelog, "Unreleased");
  if (unreleased === null) {
    throw new Error("CHANGELOG.md must contain a prepared ## Unreleased section before release.");
  }
  assertBilingualChangelogSection(unreleased, "Unreleased");

  const lines = changelog.split(/\r?\n/);
  const unreleasedHeading = lines.findIndex((line) => line.trim() === "## Unreleased");
  if (unreleasedHeading < 0) throw new Error("CHANGELOG.md has an invalid Unreleased heading.");
  lines[unreleasedHeading] = `## ${version} - ${formatDate()}`;
  if (!dryRun) writeFileSync(changelogPath, `${lines.join("\n").trimEnd()}\n`, "utf8");
  console.log(`Promoted bilingual Unreleased CHANGELOG.md section to ${version}.`);
  return true;
}

function main() {
  const { dryRun } = parseArgs(process.argv.slice(2));
  const packageFiles = getPackageFiles();
  const currentVersion = readJson(packageFiles[0]).version;
  const nextVersion = bumpVersion(currentVersion);

  const packages = packageFiles.map((file) => {
    const json = readJson(file);
    if (json.version !== currentVersion) {
      throw new Error(`${file} version ${json.version} does not match root version ${currentVersion}.`);
    }
    return { file, json };
  });
  promoteUnreleasedChangelog(nextVersion, dryRun);
  for (const { file, json } of packages) {
    json.version = nextVersion;
    if (!dryRun) writeJson(file, json);
  }

  console.log(JSON.stringify({
    currentVersion,
    nextVersion,
    releaseTag: `v${nextVersion}`,
    packageFiles: packageFiles.map((file) => file.replace(`${repoRoot}\\`, "").replaceAll("\\", "/")),
    dryRun
  }, null, 2));
}

main();
