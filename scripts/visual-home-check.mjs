import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const isWindows = process.platform === "win32";
const pnpm = isWindows ? "pnpm.cmd" : "pnpm";
const pageArg = process.argv.includes("--page")
  ? process.argv[process.argv.indexOf("--page") + 1]
  : undefined;
const page = process.env.D2_VISUAL_PAGE ?? pageArg ?? "home";
const settingsSectionArg = process.argv.includes("--settings-section")
  ? process.argv[process.argv.indexOf("--settings-section") + 1]
  : undefined;
const settingsSection = process.env.D2_VISUAL_SETTINGS_SECTION ?? settingsSectionArg ?? "overview";
const logPrefix = `[visual:${page}]`;
const defaultViewport = "1365x900";
const defaultTheme = "dark";
const defaultReferencePngName = "reference-dark-1365x900.png";
const defaultAppPngName = "app-dark-1365x900.png";
const defaultComparePngName = "compare-dark-1365x900.png";
const expectedSelectorsByPage = {
  home: [".home-data-point", ".home-weekly-dashboard"],
  loadouts: [".loadout-product-layout", ".in-game-loadout-slots", ".loadout-template-detail"],
  settings: [".settings-app-page", ".app-settings-shell", ".settings-menu"]
};
const viewport = process.env.D2_VISUAL_CAPTURE_VIEWPORT ?? defaultViewport;
const [width, height] = viewport.split("x").map((part) => Number.parseInt(part, 10));
const theme = process.env.D2_VISUAL_THEME ?? defaultTheme;
const outputDir = resolve(process.env.D2_VISUAL_OUTPUT_DIR ?? join(repoRoot, ".local-data", "tmp", "visual", page));
const dataDir = join(outputDir, "data");
const referencePng = join(outputDir, `reference-${theme}-${viewport}.png`);
const appPng = join(outputDir, `app-${theme}-${viewport}.png`);
const comparePng = join(outputDir, `compare-${theme}-${viewport}.png`);
const reportPath = join(outputDir, "report.json");
const requiredDefinitionComponents = [
  "DestinyInventoryItemDefinition",
  "DestinyPlugSetDefinition",
  "DestinySandboxPerkDefinition",
  "DestinyActivityDefinition",
  "DestinyMilestoneDefinition",
  "DestinyVendorDefinition",
  "DestinyInventoryBucketDefinition",
  "DestinyLoadoutNameDefinition"
];

function run(command, args, options = {}) {
  return new Promise((resolveRun, reject) => {
    if (options.label) {
      console.log(`${logPrefix} ${options.label}`);
    }
    const normalized = normalizeSpawn(command, args);
    const child = spawn(normalized.command, normalized.args, {
      cwd: repoRoot,
      env: { ...process.env, ...(options.env ?? {}) },
      stdio: options.stdio ?? "inherit",
      windowsHide: true
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolveRun();
      } else {
        reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
      }
    });
  });
}

function start(command, args, options = {}) {
  if (options.label) {
    console.log(`${logPrefix} ${options.label}`);
  }
  const normalized = normalizeSpawn(command, args);
  const child = spawn(normalized.command, normalized.args, {
    cwd: repoRoot,
    env: { ...process.env, ...(options.env ?? {}) },
    stdio: options.stdio ?? "pipe",
    windowsHide: true
  });
  child.on("error", (error) => {
    console.error(error);
  });
  return child;
}

function normalizeSpawn(command, args) {
  if (isWindows && command === pnpm) {
    return { command: "cmd.exe", args: ["/d", "/s", "/c", command, ...args] };
  }
  return { command, args };
}

async function waitForUrl(url, timeoutMs = 30_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // keep waiting
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function isPortAvailable(port) {
  return new Promise((resolvePort) => {
    const server = createServer()
      .once("error", () => resolvePort(false))
      .once("listening", () => {
        server.close(() => resolvePort(true));
      })
      .listen(port, "127.0.0.1");
  });
}

async function findAvailablePort(startPort = 53172) {
  for (let port = startPort; port < startPort + 20; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available local port found from ${startPort} to ${startPort + 19}`);
}

function findChrome() {
  const candidates = isWindows
    ? [
        join(process.env.ProgramFiles ?? "C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe"),
        join(process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)", "Google", "Chrome", "Application", "chrome.exe"),
        join(process.env.ProgramFiles ?? "C:\\Program Files", "Microsoft", "Edge", "Application", "msedge.exe")
      ]
    : ["google-chrome", "chromium", "chromium-browser", "microsoft-edge"];

  const found = candidates.find((candidate) => !candidate.includes("\\") || existsSync(candidate));
  if (!found) {
    throw new Error("Chrome or Edge is required for prototype screenshot capture.");
  }
  return found;
}

function prepareVisualConfig() {
  mkdirSync(dataDir, { recursive: true });
  const config = {
    bungie: {
      api_key: "visual-api-key",
      client_id: "visual-client-id",
      client_secret: "visual-client-secret",
      redirect_uri: "https://127.0.0.1:28780/oauth/callback"
    },
    data: {
      data_dir: dataDir,
      manifest_language: "zh-chs"
    },
    ai: {
      protocol: "",
      provider: "",
      api_key: "",
      model: "",
      base_url: "",
      enable_lightgg: false,
      force_lightgg: false
    },
    features: {
      write_actions_enabled: false,
      color_mode: theme
    }
  };
  writeFileSync(join(dataDir, "config.json"), JSON.stringify(config, null, 2), "utf8");
  const definitionsDir = join(dataDir, "manifest", "definitions");
  mkdirSync(definitionsDir, { recursive: true });
  const visualComponentPaths = Object.fromEntries(
    requiredDefinitionComponents.map((component) => [
      component,
      `/common/destiny2_content/json/visual/${component}.json`
    ])
  );
  writeFileSync(
    join(dataDir, "manifest", "metadata.json"),
    JSON.stringify({
      cached_at: "2026-06-16T17:00:00.000Z",
      language: "zh-chs",
      sqlite_path: "/common/destiny2_content/sqlite/visual/world_sql_content.sqlite3",
      metadata: {
        version: "visual",
        mobileWorldContentPaths: {
          "zh-chs": "/common/destiny2_content/sqlite/visual/world_sql_content.sqlite3",
          en: "/common/destiny2_content/sqlite/visual/world_sql_content_en.sqlite3"
        },
        jsonWorldComponentContentPaths: {
          "zh-chs": visualComponentPaths,
          en: visualComponentPaths
        }
      }
    }, null, 2),
    "utf8"
  );
  for (const component of requiredDefinitionComponents) {
    writeFileSync(
      join(definitionsDir, `${component}.json`),
      JSON.stringify({
        cached_at: "2026-06-16T17:00:00.000Z",
        component,
        language: "zh-chs",
        source_path: `/common/destiny2_content/json/visual/${component}.json`,
        count: 0,
        data: {}
      }),
      "utf8"
    );
  }
}

async function captureReference() {
  const chrome = findChrome();
  const port = await findAvailablePort(53170);
  const prototypeUrl = `http://127.0.0.1:${port}`;
  const vite = start(pnpm, ["--filter", "@d2-tools/prototype", "exec", "vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
    stdio: "pipe",
    label: `start prototype on ${prototypeUrl}`,
    env: {
      VITE_D2_VISUAL_PAGE: page,
      VITE_D2_VISUAL_SETTINGS_SECTION: settingsSection,
      VITE_D2_VISUAL_THEME: theme
    }
  });
  try {
    await waitForUrl(prototypeUrl);
    console.log(`${logPrefix} capture React prototype reference`);
    await run(chrome, [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      `--window-size=${width},${height}`,
      "--virtual-time-budget=3000",
      `--screenshot=${referencePng}`,
      prototypeUrl
    ], { stdio: "ignore" });
  } finally {
    if (!vite.killed) {
      if (isWindows) {
        spawn("taskkill.exe", ["/PID", String(vite.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
      } else {
        vite.kill("SIGTERM");
      }
    }
  }
}

async function buildElectronOutputs() {
  await run(pnpm, ["--filter", "@d2-tools/core", "build"], { label: "build core" });
  await run(pnpm, ["--filter", "@d2-tools/app", "build"], { label: "build app" });
  await run(pnpm, ["--filter", "@d2-tools/http", "build"], { label: "build http" });
  await run(pnpm, ["--filter", "@d2-tools/desktop", "exec", "tsc", "-p", "tsconfig.main.json"], { label: "compile electron main" });
  await run("node", [join(repoRoot, "packages", "desktop", "scripts", "build-preload.cjs")], { label: "build preload" });
}

async function captureApp() {
  const port = await findAvailablePort(53172);
  const rendererUrl = `http://127.0.0.1:${port}`;
  const vite = start(pnpm, ["--filter", "@d2-tools/desktop", "exec", "vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
    stdio: "pipe",
    label: `start vite on ${rendererUrl}`,
    env: {
      VITE_D2_VISUAL_CAPTURE: "1",
      VITE_D2_VISUAL_PAGE: page,
      VITE_D2_VISUAL_SETTINGS_SECTION: settingsSection,
      VITE_D2_VISUAL_THEME: theme
    }
  });
  try {
    await waitForUrl(rendererUrl);
    await run(pnpm, ["--filter", "@d2-tools/desktop", "exec", "electron", "dist/main/main.js"], {
      label: "capture electron app",
      env: {
        NODE_ENV: "development",
        D2_RENDERER_URL: rendererUrl,
        D2_DATA_DIR: dataDir,
        D2_COLOR_MODE: theme,
        D2_VISUAL_CAPTURE_DIR: outputDir,
        D2_VISUAL_CAPTURE_PAGE: page,
        D2_VISUAL_CAPTURE_VIEWPORT: viewport,
        D2_VISUAL_CAPTURE_FILE: appPng
      }
    });
  } finally {
    if (!vite.killed) {
      if (isWindows) {
        spawn("taskkill.exe", ["/PID", String(vite.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
      } else {
        vite.kill("SIGTERM");
      }
    }
  }
}

function writeComparePlaceholder() {
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  assertVisualReportColorMode(report);
  report.reference = referencePng;
  report.app = appPng;
  report.compare = comparePng;
  report.viewport = viewport;
  report.theme = theme;
  report.page = page;
  report.settingsSection = settingsSection;
  report.expectedSelectors = expectedSelectorsByPage[page] ?? [];
  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  if (!existsSync(comparePng)) {
    writeFileSync(comparePng, readFileSync(appPng));
  }
}

function assertVisualReportColorMode(report) {
  if (report.colorMode !== theme) {
    throw new Error(`Visual ${page} color mode mismatch: expected ${theme}, got ${report.colorMode ?? "unknown"}`);
  }
}

async function main() {
  if (!Object.hasOwn(expectedSelectorsByPage, page)) {
    throw new Error(`Unsupported visual page: ${page}`);
  }
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error(`Invalid D2_VISUAL_CAPTURE_VIEWPORT: ${viewport}`);
  }
  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(dirname(reportPath), { recursive: true });
  prepareVisualConfig();
  await captureReference();
  await buildElectronOutputs();
  await captureApp();
  writeComparePlaceholder();
  console.log(`Visual ${page} report: ${reportPath}`);
  console.log(`Reference: ${referencePng}`);
  console.log(`App: ${appPng}`);
  console.log(`Compare: ${comparePng}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
