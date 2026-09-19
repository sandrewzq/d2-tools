import { execFileSync } from "node:child_process";
import process from "node:process";

const run = (command, args, options = {}) => execFileSync(command, args, {
  cwd: process.cwd(),
  stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
  encoding: options.capture ? "utf8" : undefined
});

const hasStagedChanges = () => {
  try {
    run("git", ["diff", "--cached", "--quiet"]);
    return false;
  } catch (error) {
    if (error.status === 1) return true;
    throw error;
  }
};

/**
 * 提交前门禁：跑一遍 pnpm test，没过就中止提交。
 * 这一步在 `git add -A` 之后，所以检查的正是将要提交的内容；中止也不会丢改动（已在暂存区）。
 */
const runCommitGate = () => {
  try {
    run("node", ["scripts/git-commit-gate.mjs", ...process.argv.slice(2)]);
  } catch (error) {
    if (typeof error?.status === "number") {
      console.error("\n提交已中止，改动仍在暂存区。");
      process.exit(1);
    }
    throw error;
  }
};

if (process.argv.includes("--help")) {
  console.log("Mac Git 提交推送：暂存全部改动，跑一遍提交前检查，创建默认提交并推送当前分支。不会创建 release tag。");
  console.log("  --skip-check  跳过提交前检查（CI 仍会跑这些检查）");
  process.exit(0);
}

try {
  run("git", ["rev-parse", "--is-inside-work-tree"]);
  const branch = run("git", ["branch", "--show-current"], { capture: true }).trim();
  if (!branch) throw new Error("当前处于 detached HEAD，请先切换到分支。");

  console.log(`Repository: ${process.cwd()}`);
  console.log(`Branch: ${branch}`);
  console.log("\n暂存全部改动...");
  run("git", ["add", "-A"]);

  if (hasStagedChanges()) {
    // 全量暂存会把工作区里所有东西一起带走，包括别的会话改到一半的文件。
    // 先把清单打出来，一眼能看出有没有夹带。
    console.log("\n待提交文件：");
    console.log(run("git", ["status", "--short", "--untracked-files=no"], { capture: true }).trimEnd());

    runCommitGate();

    console.log("\n创建提交...");
    run("git", ["commit", "-m", "chore: sync local changes"]);
  } else {
    console.log("没有 staged 改动，跳过提交。");
  }

  let upstream = "";
  try {
    upstream = run("git", ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], { capture: true }).trim();
  } catch {
    // No upstream configured yet.
  }

  if (upstream) {
    console.log("推送到已配置的 upstream...");
    run("git", ["push"]);
  } else {
    console.log(`未配置 upstream，推送并设置 origin/${branch}...`);
    run("git", ["push", "-u", "origin", branch]);
  }

  console.log("\n完成。未创建 release tag。");
} catch (error) {
  console.error(error?.stderr?.toString?.() || error?.message || error);
  process.exitCode = 1;
}
