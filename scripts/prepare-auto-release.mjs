import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const args = [...argv];
  const dryRunIndex = args.indexOf("--dry-run");
  const dryRun = dryRunIndex !== -1;
  if (dryRun) {
    args.splice(dryRunIndex, 1);
  }
  if (args.length > 0) {
    throw new Error("prepare-auto-release does not accept positional arguments.");
  }
  return { dryRun };
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function writeJson(file, json) {
  writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`, "utf8");
}

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    throw new Error(`Unsupported package version: ${version}. Expected x.y.z.`);
  }
  return match.slice(1).map((part) => Number.parseInt(part, 10));
}

function bumpVersion(version) {
  const [major, minor, patch] = parseVersion(version);
  return `${major}.${minor}.${patch + 1}`;
}

function getPackageFiles() {
  const files = [join(repoRoot, "package.json")];
  const packagesDir = join(repoRoot, "packages");
  if (!existsSync(packagesDir)) return files;
  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const packageJson = join(packagesDir, entry.name, "package.json");
    if (existsSync(packageJson)) {
      files.push(packageJson);
    }
  }
  return files;
}

function formatDate(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(date);
}

function getGitSubjectsSinceLastTag() {
  let lastTag = "";
  try {
    lastTag = execFileSync("git", ["describe", "--tags", "--abbrev=0"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return [];
  }

  try {
    const output = execFileSync("git", ["log", "--pretty=format:%s", `${lastTag}..HEAD`], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
    return output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function buildChangelogSection(version) {
  const subjects = getGitSubjectsSinceLastTag()
    .filter((subject) => !subject.startsWith("release: prepare "))
    .slice(0, 12);
  const date = formatDate();
  const bullets = subjects.length
    ? subjects.map((subject) => `- ${subject}`)
    : ["- 自动发布当前工作区变更。"];

  return [
    `## ${version} - ${date}`,
    "",
    "### 工程",
    "",
    ...bullets,
    ""
  ].join("\n");
}

function updateChangelog(version, dryRun) {
  const changelogPath = join(repoRoot, "CHANGELOG.md");
  const changelog = readFileSync(changelogPath, "utf8");
  const heading = `## ${version}`;
  if (changelog.split(/\r?\n/).some((line) => line.startsWith(heading))) {
    console.log(`Reusing existing CHANGELOG.md section for ${version}.`);
    return false;
  }

  const section = buildChangelogSection(version);
  const firstVersionHeading = changelog.search(/^## \d+\.\d+\.\d+/m);
  const nextChangelog = firstVersionHeading === -1
    ? `${changelog.trimEnd()}\n\n${section}\n`
    : `${changelog.slice(0, firstVersionHeading)}${section}\n${changelog.slice(firstVersionHeading)}`;

  if (!dryRun) {
    writeFileSync(changelogPath, nextChangelog, "utf8");
  }
  return true;
}

function main() {
  const { dryRun } = parseArgs(process.argv.slice(2));
  const packageFiles = getPackageFiles();
  const rootPackage = readJson(packageFiles[0]);
  const currentVersion = rootPackage.version;
  const nextVersion = bumpVersion(currentVersion);

  for (const file of packageFiles) {
    const json = readJson(file);
    if (json.version !== currentVersion) {
      throw new Error(`${file} version ${json.version} does not match root version ${currentVersion}.`);
    }
    json.version = nextVersion;
    if (!dryRun) {
      writeJson(file, json);
    }
  }

  const changelogUpdated = updateChangelog(nextVersion, dryRun);

  console.log(JSON.stringify({
    currentVersion,
    nextVersion,
    releaseTag: `v${nextVersion}`,
    changelogUpdated,
    packageFiles: packageFiles.map((file) => file.replace(`${repoRoot}\\`, "").replaceAll("\\", "/")),
    dryRun
  }, null, 2));
}

main();
