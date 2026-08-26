import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptsDir, "..");
const desktopDir = join(repoRoot, "packages", "desktop");
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const viteCli = join(desktopDir, "node_modules", "vite", "bin", "vite.js");
const electronLauncher = join(repoRoot, "scripts", "run-electron-dev.mjs");

const options = parseOptions(process.argv.slice(2));
const requestedRendererPort = options.port ?? 53172;
const outputFiles = {
  core: join(repoRoot, "packages", "core", "dist", "index.js"),
  http: join(repoRoot, "packages", "http", "dist", "server.js"),
  services: join(repoRoot, "packages", "services", "dist", "index.js"),
  app: join(repoRoot, "packages", "app", "dist", "index.js"),
  main: join(desktopDir, "dist", "main", "main.js"),
  preload: join(desktopDir, "dist", "preload", "preload.cjs")
};

if (!existsSync(viteCli)) {
  throw new Error(`Vite CLI 不存在，请先运行 pnpm install。\n路径：${viteCli}`);
}

if (options.clean) {
  rmSync(join(desktopDir, "dist", "main"), { recursive: true, force: true });
  rmSync(join(desktopDir, "dist", "preload"), { recursive: true, force: true });
}

const buildPlan = options.force ? {
  core: true, http: true, services: true, app: true, main: true, preload: true
} : calculateBuildPlan();

console.log("=== 准备 Desktop 开发产物 ===");
await buildIfNeeded("core", ["--filter", "@d2-tools/core", "build"]);
await buildIfNeeded("http", ["--filter", "@d2-tools/http", "build"]);
await buildIfNeeded("services", ["--filter", "@d2-tools/services", "build"]);
await buildIfNeeded("app", ["--filter", "@d2-tools/app", "build"]);
await buildIfNeeded("main", ["--filter", "@d2-tools/desktop", "exec", "tsc", "-p", "tsconfig.main.json"]);
await buildIfNeeded("preload", ["--filter", "@d2-tools/desktop", "exec", "vite", "build", "--config", "vite.preload.config.ts"]);

const rendererPort = await findAvailablePort(requestedRendererPort);
const rendererUrl = `http://127.0.0.1:${rendererPort}`;
if (rendererPort !== requestedRendererPort) {
  console.log(`端口 ${requestedRendererPort} 正在使用，改用 ${rendererPort}。`);
}

const viteProcess = spawn(process.execPath, [viteCli, "--host", "127.0.0.1", "--port", String(rendererPort), "--strictPort"], {
  cwd: desktopDir,
  env: {
    ...process.env,
    ...(options.dataDir ? { D2_DATA_DIR: options.dataDir } : {})
  },
  stdio: "inherit"
});

try {
  await waitForRenderer();
  console.log(`Renderer 已就绪：${rendererUrl}`);
  await run(process.execPath, [electronLauncher], repoRoot, {
    D2_RENDERER_URL: rendererUrl,
    ...(options.dataDir ? { D2_DATA_DIR: options.dataDir } : {})
  });
} finally {
  stop(viteProcess);
}

function calculateBuildPlan() {
  const core = needsBuild(outputFiles.core, [join(repoRoot, "packages", "core", "src"), join(repoRoot, "packages", "core", "package.json"), join(repoRoot, "packages", "core", "tsconfig.json")]);
  const http = core || needsBuild(outputFiles.http, [outputFiles.core, join(repoRoot, "packages", "http", "src"), join(repoRoot, "packages", "http", "package.json"), join(repoRoot, "packages", "http", "tsconfig.json")]);
  const services = core || http || needsBuild(outputFiles.services, [outputFiles.core, join(repoRoot, "packages", "services", "src"), join(repoRoot, "packages", "services", "package.json"), join(repoRoot, "packages", "services", "tsconfig.json")]);
  const app = core || services || needsBuild(outputFiles.app, [outputFiles.core, outputFiles.services, join(repoRoot, "packages", "app", "src"), join(repoRoot, "packages", "app", "package.json"), join(repoRoot, "packages", "app", "tsconfig.json")]);
  const main = core || http || services || needsBuild(outputFiles.main, [outputFiles.core, outputFiles.http, outputFiles.services, join(desktopDir, "src", "main"), join(desktopDir, "src", "contracts"), join(desktopDir, "tsconfig.main.json")]);
  const preload = core || services || needsBuild(outputFiles.preload, [outputFiles.core, outputFiles.services, join(desktopDir, "src", "preload"), join(desktopDir, "src", "contracts"), join(desktopDir, "vite.preload.config.ts")]);
  return { core, http, services, app, main, preload };
}

async function buildIfNeeded(name, args) {
  if (!buildPlan[name]) {
    console.log(`跳过 ${name}：产物仍是最新。`);
    return;
  }
  console.log(`构建 ${name}...`);
  await run(pnpmCommand, args, repoRoot);
}

function needsBuild(output, inputs) {
  if (!existsSync(output)) return true;
  const outputTime = statSync(output).mtimeMs;
  return inputs.some((input) => latestMtime(input) > outputTime);
}

function latestMtime(input) {
  if (!existsSync(input)) return 0;
  const info = statSync(input);
  if (!info.isDirectory()) return info.mtimeMs;
  return Math.max(info.mtimeMs, ...readdirSync(input, { withFileTypes: true }).map((entry) => latestMtime(join(input, entry.name))));
}

async function waitForRenderer() {
  const started = Date.now();
  while (Date.now() - started < 30_000) {
    try {
      const response = await fetch(rendererUrl);
      if (response.ok) return;
    } catch {
      // Vite still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 300));
  }
  throw new Error(`Renderer dev server 启动超时：${rendererUrl}`);
}

function run(command, args, cwd, extraEnv = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...extraEnv },
      stdio: "inherit",
      windowsHide: true
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

function stop(child) {
  if (!child || child.killed) return;
  if (process.platform === "win32") {
    spawn("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
  } else {
    child.kill("SIGTERM");
  }
}

async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + 20; port += 1) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`找不到可用的 Renderer 端口（${startPort}-${startPort + 19}）`);
}

function isPortAvailable(port) {
  return new Promise((resolvePort) => {
    const server = createServer()
      .once("error", () => resolvePort(false))
      .once("listening", () => server.close(() => resolvePort(true)))
      .listen(port, "127.0.0.1");
  });
}

function parseOptions(args) {
  const result = { force: false, clean: false, port: undefined, dataDir: undefined };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--force") result.force = true;
    else if (arg === "--clean") result.clean = true;
    else if (arg === "--port") result.port = Number(args[++index]);
    else if (arg === "--data-dir") result.dataDir = resolve(repoRoot, args[++index]);
    else throw new Error(`未知参数：${arg}`);
  }
  if (result.port !== undefined && (!Number.isInteger(result.port) || result.port < 1024 || result.port > 65535)) {
    throw new Error("--port 必须是 1024 到 65535 之间的整数");
  }
  return result;
}
