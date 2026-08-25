import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";

const cwd = process.cwd();
const dryRun = process.argv.includes("--dry-run");

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd,
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    encoding: options.capture ? "utf8" : undefined,
  });
}

function tryRun(command, args) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : null;
}

function hasRemoteTag(tag) {
  const result = spawnSync("git", ["ls-remote", "--exit-code", "--tags", "origin", `refs/tags/${tag}`], { cwd });
  if (result.status === 0) return true;
  if (result.status === 2) return false;
  throw new Error(`无法检查远程 tag ${tag}，请检查网络和 origin 权限。`);
}

async function waitForReleaseWorkflow(tag, previousRunId) {
  let runId = "";
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    runId = tryRun("gh", ["run", "list", "--workflow", "release.yml", "--branch", tag, "--limit", "1", "--json", "databaseId", "--jq", ".[0].databaseId"]) || "";
    if (runId && runId !== previousRunId) break;
    if (attempt === 1) console.log("等待 GitHub Actions 注册 tag workflow...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  if (!runId || runId === previousRunId) throw new Error(`5 分钟内没有找到 ${tag} 的 GitHub Release workflow。`);
  console.log(`Watching GitHub Actions run ${runId}...`);
  run("gh", ["run", "watch", runId, "--exit-status"]);
  run("gh", ["release", "view", tag]);
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log("Mac Git Release：执行冻结安装、测试、类型检查、版本准备、提交、推送、tag 和 GitHub Release workflow 等完整发布门禁。\n用法：tools/mac-git-auto-release.command [--dry-run]");
    return;
  }

  let stage = "Unknown release step";
  try {
    stage = "Validate Git repository";
    run("git", ["rev-parse", "--is-inside-work-tree"]);
    const branch = run("git", ["branch", "--show-current"], { capture: true }).trim();
    if (!branch) throw new Error("当前处于 detached HEAD，请先切换到分支。");

    const currentVersion = JSON.parse(readFileSync("package.json", "utf8")).version;
    const parts = currentVersion.split(".").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) throw new Error(`package.json 版本号无效：${currentVersion}`);
    const nextVersion = `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
    const currentTag = `v${currentVersion}`;
    const currentReleaseExists = Boolean(tryRun("gh", ["release", "view", currentTag]));
    const releaseMode = currentReleaseExists ? "bump-patch" : "retry-current";
    const targetVersion = currentReleaseExists ? nextVersion : currentVersion;
    const releaseTag = `v${targetVersion}`;
    const commitMessage = currentReleaseExists ? `release: prepare v${nextVersion}` : `release: retry ${currentTag}`;

    run("gh", ["repo", "view"]);
    console.log(`Repository: ${cwd}\nBranch: ${branch}\nCurrent version: ${currentVersion}\nNext version: ${nextVersion}\nRelease mode: ${releaseMode}\nTarget version: ${targetVersion}\nRelease tag: ${releaseTag}`);

    stage = `Validate remote tag ${releaseTag}`;
    const remoteTagExists = hasRemoteTag(releaseTag);
    if (releaseMode === "bump-patch" && remoteTagExists) throw new Error(`远程 tag ${releaseTag} 已存在，请先检查现有 Release 状态。`);
    if (releaseMode === "bump-patch" && tryRun("git", ["rev-parse", "-q", "--verify", `refs/tags/${releaseTag}`])) throw new Error(`本地 tag ${releaseTag} 已存在。`);

    if (dryRun) {
      if (releaseMode === "bump-patch") run("node", ["scripts/prepare-auto-release.mjs", "--dry-run"]);
      console.log("\n[dry-run] 不会修改文件、提交、推送、创建 tag 或发布 Release。");
      console.log(`[dry-run] Would run: pnpm install --frozen-lockfile && pnpm test && pnpm typecheck`);
      return;
    }

    stage = "Local CI dependency installation";
    run("pnpm", ["install", "--frozen-lockfile"]);
    stage = "Local CI release test gate";
    run("pnpm", ["test"]);
    stage = "Local CI typecheck";
    run("pnpm", ["typecheck"]);

    if (releaseMode === "bump-patch") {
      stage = "Prepare release files";
      run("node", ["scripts/prepare-auto-release.mjs"]);
    }

    stage = "Release-specific validation";
    run("pnpm", ["verify:release"]);
    stage = `Validate release notes for ${targetVersion}`;
    run("pnpm", ["release:preview", "--version", targetVersion], { capture: true });

    stage = "Create release commit";
    run("git", ["add", "-A"]);
    const staged = (() => {
      try { run("git", ["diff", "--cached", "--quiet"]); return false; }
      catch (error) { if (error.status === 1) return true; throw error; }
    })();
    if (staged) run("git", ["commit", "-m", commitMessage]);

    stage = "Push release branch";
    const upstream = tryRun("git", ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
    run("git", upstream ? ["push"] : ["push", "-u", "origin", branch]);
    const previousRunId = tryRun("gh", ["run", "list", "--workflow", "release.yml", "--branch", releaseTag, "--limit", "1", "--json", "databaseId", "--jq", ".[0].databaseId"]) || "";

    stage = `Push release tag ${releaseTag}`;
    if (releaseMode === "retry-current") {
      run("git", ["tag", "-f", releaseTag]);
      run("git", ["push", "--force", "origin", releaseTag]);
    } else {
      run("git", ["tag", releaseTag]);
      run("git", ["push", "origin", releaseTag]);
    }

    stage = `Wait for GitHub Release workflow for ${releaseTag}`;
    await waitForReleaseWorkflow(releaseTag, previousRunId);
    console.log(`完成。GitHub Release ${releaseTag} 已确认。`);
  } catch (error) {
    console.error(`\nRELEASE STOPPED\nFailure stage: ${stage}\n${error?.stderr?.toString?.() || error?.message || error}`);
    process.exitCode = 1;
  }
}

await main();
