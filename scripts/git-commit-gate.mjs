import { spawn } from "node:child_process";
import process from "node:process";

/**
 * 提交前门禁：跑一遍 `pnpm test`（约 30 秒），没过就返回非零码，让提交脚本中止。
 *
 * 放在提交这一步、而不是塞进开发流程，是为了不拖慢写代码：`pnpm dev` 一行都不碰，
 * 只有主动提交时才跑。CI 常红的那几类（类型错误、UI 合同、断言失配）在这里就能拦下来。
 *
 * 用法：node scripts/git-commit-gate.mjs [--skip-check]
 */

const repoRoot = process.cwd();
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

if (process.argv.includes("--help")) {
  console.log("提交前门禁：跑 pnpm test（约 30 秒），失败则中止提交。");
  console.log("  --skip-check  跳过检查直接提交（CI 仍会跑这些检查）");
  process.exit(0);
}

if (process.argv.includes("--skip-check")) {
  console.log("[commit-gate] 已跳过提交前检查。CI 仍会跑这些检查。");
  process.exit(0);
}

console.log("[commit-gate] 正在跑提交前检查（pnpm test，约 30 秒）...");
console.log("[commit-gate] 改动已在暂存区，这一步失败不会丢改动，修完重跑提交脚本即可。\n");

const code = await run(pnpm, ["test"]);

if (code !== 0) {
  console.error("\n[commit-gate] 提交前检查未通过，已中止提交。");
  console.error("[commit-gate] 改动仍在暂存区里，没有丢。修完重新跑一次提交脚本即可。");
  console.error("[commit-gate] 确实要推一个未过检查的半成品时，加 --skip-check。");
  process.exit(code);
}

console.log("\n[commit-gate] 提交前检查通过。");

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: process.env,
      stdio: "inherit",
      windowsHide: true
    });
    child.once("error", reject);
    child.once("exit", (exitCode, signal) => {
      if (signal) {
        reject(new Error(`${command} ${args.join(" ")} terminated by ${signal}`));
        return;
      }
      resolve(exitCode ?? 1);
    });
  });
}
