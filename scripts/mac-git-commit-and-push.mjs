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

if (process.argv.includes("--help")) {
  console.log("Mac Git 提交推送：暂存全部改动，创建默认提交并推送当前分支。不会创建 release tag。");
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
    console.log("创建提交...");
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
