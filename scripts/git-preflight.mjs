import { spawnSync } from "node:child_process";
import process from "node:process";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("/?")) {
  console.log(`Usage:
  tools/mac-git-preflight.command  (macOS)
  tools/win-git-preflight.cmd      (Windows)

Behavior:
  - Shows current Git changes grouped by common development area.
  - Detects menu/private lanes, shared-risk lanes, and multi-lane edits.
  - Reports the repository validation policy without running validation.
  - Highlights known conflict hotspot files.
  - Gives parallel-development and worktree advice.
  - Does not stage, commit, push, stop processes, or modify files.`);
  process.exit(0);
}

const repoCheck = git(["rev-parse", "--is-inside-work-tree"], { allowFailure: true });
if (repoCheck.status !== 0) {
  console.error("This script must be run inside a Git repository.");
  process.exit(1);
}

const branch = git(["branch", "--show-current"], { allowFailure: true }).stdout.trim();

console.log(`Repository: ${process.cwd()}`);
if (branch) {
  console.log(`Branch: ${branch}`);
}

printStatusSection("all changes", []);
printStatusSection("docs and agent rules", ["AGENTS.md", "README.md", "CHANGELOG.md", "docs"]);
printStatusSection("tools and automation", ["package.json", "pnpm-lock.yaml", "tools", "scripts", ".github"]);
printStatusSection("cross-platform UI and web", ["packages/ui", "packages/web"]);
printStatusSection("desktop", ["packages/desktop"]);
printStatusSection("core, services, app, http", ["packages/core", "packages/services", "packages/app", "packages/http"]);

const groups = {
  docs: statusLines(["AGENTS.md", "README.md", "docs", "tools", "package.json", "pnpm-lock.yaml", "scripts", ".github"]),
  release: statusLines([
    "CHANGELOG.md",
    "tools/win-git-auto-release.cmd",
    "tools/mac-git-auto-release.command",
    "scripts/prepare-auto-release.mjs",
    "scripts/generate-release-notes.mjs",
    "scripts/preview-release-notes.mjs",
    "scripts/extract-changelog.mjs",
    "scripts/extract-changelog.test.mjs",
    ".github/workflows",
  ]),
  ui: statusLines(["packages/ui", "packages/web"]),
  desktop: statusLines(["packages/desktop"]),
  domain: statusLines(["packages/core", "packages/services", "packages/app", "packages/http"]),
};

const lanes = [
  menuLane("desktop-menu: account", "packages/desktop/src/renderer/features/account"),
  menuLane("desktop-menu: ai", "packages/desktop/src/renderer/features/ai"),
  menuLane("desktop-menu: daily", "packages/desktop/src/renderer/features/daily"),
  menuLane("desktop-menu: home", "packages/desktop/src/renderer/features/home"),
  menuLane("desktop-menu: library", "packages/desktop/src/renderer/features/library"),
  menuLane("desktop-menu: loadouts", "packages/desktop/src/renderer/features/loadouts"),
  menuLane("desktop-menu: settings", "packages/desktop/src/renderer/features/settings"),
  menuLane("desktop-menu: vault", "packages/desktop/src/renderer/features/vault"),
  sharedLane("shared-risk: desktop renderer shared", "packages/desktop/src/renderer/shared"),
  sharedLane("shared-risk: desktop renderer api", "packages/desktop/src/renderer/api"),
  sharedLane("shared-risk: desktop main ipc modules", "packages/desktop/src/main/ipc"),
  sharedLane("shared-risk: desktop main ipc aggregator", "packages/desktop/src/main/ipc.ts"),
  appLane("app-workspace: cross-platform workspace/view model", "packages/app"),
  sharedLane("shared-risk: packages/ui", "packages/ui"),
  normalLane("web-lane", "packages/web"),
  normalLane("core-domain-lane", "packages/core"),
  normalLane("services-lane", "packages/services"),
  normalLane("http-lane", "packages/http"),
  normalLane("docs-lane", "docs"),
  normalLane("agent-rules-lane", "AGENTS.md"),
  normalLane("tools-lane", "tools"),
  normalLane("scripts-lane", "scripts"),
  releaseLane("release-lane: changelog", "CHANGELOG.md"),
  releaseLane("release-lane: git-auto-release", "tools/win-git-auto-release.cmd"),
  releaseLane("release-lane: mac-git-auto-release", "tools/mac-git-auto-release.command"),
  releaseLane("release-lane: prepare-auto-release", "scripts/prepare-auto-release.mjs"),
  releaseLane("release-lane: release-notes", "scripts/generate-release-notes.mjs"),
  releaseLane("release-lane: release-preview", "scripts/preview-release-notes.mjs"),
  releaseLane("release-lane: changelog extraction", "scripts/extract-changelog.mjs"),
  releaseLane("release-lane: changelog extraction test", "scripts/extract-changelog.test.mjs"),
].filter((lane) => lane.lines.length > 0);

const menuLanes = lanes.filter((lane) => lane.kind === "menu");
const sharedRiskLanes = lanes.filter((lane) => lane.kind === "shared" || lane.kind === "app");
const appLanes = lanes.filter((lane) => lane.kind === "app");
const releaseLanes = lanes.filter((lane) => lane.kind === "release");

console.log();
console.log("[detected lanes]");
if (lanes.length === 0) {
  console.log("- No known lane detected.");
} else {
  for (const lane of lanes) {
    console.log(`- ${lane.name}`);
  }
}

console.log();
console.log("[validation policy]");
console.log("- Local development, completion, review, handoff, and ordinary commits: do not run automated validation.");
console.log("- Normal push: GitHub CI runs build, behavior tests, architecture tests, quality checks, and typecheck asynchronously.");
console.log("- Release: the platform Git Release entry runs the full local gate, then waits for the GitHub Release workflow.");

const hotspots = [
  "packages/desktop/src/renderer/pages/HomePage.tsx",
  "packages/desktop/src/renderer/shared/components/item-detail/ItemDetailModal.tsx",
  "packages/desktop/src/renderer/shared/hooks/useItemDetailWorkspace.ts",
  "packages/desktop/src/renderer/api/types.ts",
  "packages/desktop/src/renderer/api/client.ts",
  "packages/desktop/src/main/ipc.ts",
]
  .flatMap((path) => statusLines([path]));

console.log();
console.log("[conflict hotspots]");
if (hotspots.length === 0) {
  console.log("- No known conflict hotspot changed.");
} else {
  for (const line of hotspots) {
    console.log(`- ${line}`);
  }
}

console.log();
console.log("[parallel safety]");
let hasParallelAdvice = false;
if (menuLanes.length > 0 && sharedRiskLanes.length === 0 && hotspots.length === 0 && lanes.length === 1) {
  console.log("- Menu-private lane only: worktree is not required by default.");
  hasParallelAdvice = true;
}
if (sharedRiskLanes.length > 0) {
  console.log("- Shared layer changed: coordinate with other agents; consider a worktree for parallel work.");
  hasParallelAdvice = true;
}
if (appLanes.length > 0) {
  console.log("- packages/app changed: this can affect multiple platforms or menus; coordinate before merging.");
  hasParallelAdvice = true;
}
if (releaseLanes.length > 0) {
  console.log("- Release/version lane changed: use an isolated worktree or pause other agents before release.");
  hasParallelAdvice = true;
}
if (hotspots.length > 0) {
  console.log("- Conflict hotspot changed: avoid parallel edits in the same area until this is committed or split.");
  hasParallelAdvice = true;
}
if (lanes.length > 1) {
  console.log("- Multiple lanes detected: do not use full git add -A commit scripts unless you intend to include every lane.");
  hasParallelAdvice = true;
}
if (!hasParallelAdvice) {
  console.log("- No extra parallel-development risk detected.");
}

console.log();
console.log("This script is read-only. It does not stage, commit, push, stop processes, or modify files.");

function printStatusSection(title, paths) {
  console.log();
  console.log(`[${title}]`);
  const lines = statusLines(paths);
  for (const line of lines) {
    console.log(line);
  }
}

function statusLines(paths) {
  const args = ["status", "--short", "--untracked-files=all"];
  if (paths.length > 0) {
    args.push("--", ...paths);
  }
  return git(args, { allowFailure: true })
    .stdout
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);
}

function normalLane(name, path) {
  return { kind: "normal", name, lines: statusLines([path]) };
}

function menuLane(name, path) {
  return { kind: "menu", name, lines: statusLines([path]) };
}

function sharedLane(name, path) {
  return { kind: "shared", name, lines: statusLines([path]) };
}

function appLane(name, path) {
  return { kind: "app", name, lines: statusLines([path]) };
}

function releaseLane(name, path) {
  return { kind: "release", name, lines: statusLines([path]) };
}

function git(gitArgs, options = {}) {
  const result = spawnSync("git", gitArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(result.stderr || `git ${gitArgs.join(" ")} failed`);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  return result;
}
