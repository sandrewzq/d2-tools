import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptsDir, "..");
const desktopDir = join(repoRoot, "packages", "desktop");
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const rendererPort = 53172;
const rendererUrl = `http://127.0.0.1:${rendererPort}`;
const viteCli = join(desktopDir, "node_modules", "vite", "bin", "vite.js");
const electronLauncher = join(repoRoot, "scripts", "run-electron-dev.mjs");

function run(command, args, cwd = repoRoot) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: "inherit"
    });
    child.once("error", rejectRun);
    child.once("exit", (code, signal) => {
      if (signal || code !== 0) {
        rejectRun(new Error(`${command} ${args.join(" ")} failed`));
        return;
      }
      resolveRun();
    });
  });
}

async function waitForRenderer() {
  const started = Date.now();
  while (Date.now() - started < 30_000) {
    try {
      const response = await fetch(rendererUrl);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error(`Renderer dev server timed out: ${rendererUrl}`);
}

if (!existsSync(viteCli)) {
  throw new Error("Vite CLI 不存在，请先运行 pnpm install。\n路径：" + viteCli);
}

await run(pnpmCommand, ["--filter", "@d2-tools/core", "build"]);
await run(pnpmCommand, ["--filter", "@d2-tools/http", "build"]);
await run(pnpmCommand, ["--filter", "@d2-tools/services", "build"]);
await run(pnpmCommand, ["--filter", "@d2-tools/app", "build"]);
await run(pnpmCommand, ["--filter", "@d2-tools/desktop", "exec", "tsc", "-p", "tsconfig.main.json"]);
await run(pnpmCommand, ["--filter", "@d2-tools/desktop", "exec", "vite", "build", "--config", "vite.preload.config.ts"]);

const viteProcess = spawn(process.execPath, [viteCli, "--host", "127.0.0.1", "--port", String(rendererPort), "--strictPort"], {
  cwd: desktopDir,
  env: process.env,
  stdio: "inherit"
});

try {
  await waitForRenderer();
  await run(process.execPath, [electronLauncher], repoRoot);
} finally {
  if (!viteProcess.killed) viteProcess.kill("SIGTERM");
}
