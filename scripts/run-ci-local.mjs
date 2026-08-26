import { spawn } from "node:child_process";

const repoRoot = process.cwd();
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const steps = [
  { label: "安装冻结依赖", args: ["install", "--frozen-lockfile"] },
  { label: "运行完整测试门禁", args: ["test"] },
  { label: "安装 Playwright Chromium", args: ["exec", "playwright", "install", "chromium"] },
  {
    label: "检查共享 Shell 视觉契约",
    args: ["visual:shell-contract"],
    env: { D2_VISUAL_SKIP_BUILD: "1" }
  },
  { label: "运行构建后的全量类型检查", args: ["typecheck:ci"] }
];

for (const step of steps) {
  console.log(`\n[ci:local] ${step.label}`);
  await run(pnpm, step.args, step.env);
}

console.log("\n[ci:local] 本地 CI 门禁全部通过。");

function run(command, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: { ...process.env, ...extraEnv },
      stdio: "inherit",
      windowsHide: true
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} ${args.join(" ")} terminated by ${signal}`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code ?? 1}`));
        return;
      }
      resolve();
    });
  });
}
