import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptsDir, "..");
const desktopDir = join(repoRoot, "packages", "desktop");
const electronCli = join(desktopDir, "node_modules", "electron", "cli.js");
const mainFile = join(desktopDir, "dist", "main", "main.js");

if (!existsSync(electronCli)) {
  throw new Error("Electron CLI 不存在，请先运行 pnpm install。\n路径：" + electronCli);
}

if (!existsSync(mainFile)) {
  throw new Error("Electron 主进程产物不存在，请先运行 pnpm dev:desktop 或 desktop 构建。\n路径：" + mainFile);
}

const child = spawn(process.execPath, [electronCli, mainFile], {
  cwd: desktopDir,
  env: { ...process.env, NODE_ENV: "development" },
  stdio: "inherit"
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => child.kill(signal));
}

child.once("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});

child.once("exit", (code, signal) => {
  if (signal) {
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
