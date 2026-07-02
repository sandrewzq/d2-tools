import { app, BrowserWindow, Menu } from "electron";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { registerIpcHandlers } from "./ipc.js";
import { scheduleInitialManifestVersionCheck } from "./ipc/manifest.js";
import { scheduleInitialUpdateCheck } from "./ipc/updates.js";
import { createTitleBarOverlayOptions, getWindowBackgroundColor } from "./ipc/window.js";

const currentDir = fileURLToPath(new URL(".", import.meta.url));
const isDevelopment = process.env.NODE_ENV === "development";
const visualCaptureDir = process.env.D2_VISUAL_CAPTURE_DIR;
const visualCaptureViewport = process.env.D2_VISUAL_CAPTURE_VIEWPORT ?? "1365x900";
const visualCaptureFile = process.env.D2_VISUAL_CAPTURE_FILE;
const visualCapturePage = process.env.D2_VISUAL_CAPTURE_PAGE ?? "home";
const rendererUrl = process.env.D2_RENDERER_URL ?? "http://127.0.0.1:53172";
const rendererFile = join(currentDir, "../renderer/index.html");
const isVisualCapture = Boolean(visualCaptureDir);

if (isVisualCapture) {
  app.commandLine.appendSwitch("disable-gpu");
}

async function createWindow(): Promise<void> {
  const [captureWidth, captureHeight] = parseVisualViewport(visualCaptureViewport);
  const window = new BrowserWindow({
    width: isVisualCapture ? captureWidth : 1200,
    height: isVisualCapture ? captureHeight : 800,
    minWidth: 980,
    minHeight: 680,
    show: !isVisualCapture,
    title: "d2-tools",
    autoHideMenuBar: true,
    titleBarStyle: "hidden",
    titleBarOverlay: createTitleBarOverlayOptions("light"),
    backgroundColor: getWindowBackgroundColor("light"),
    webPreferences: {
      preload: join(currentDir, "../preload/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: !isVisualCapture
    }
  });

  if (isDevelopment) {
    await window.loadURL(rendererUrl);
    await captureVisualSnapshot(window);
    return;
  }

  await window.loadFile(rendererFile);
  await captureVisualSnapshot(window);
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  registerIpcHandlers();
  await createWindow();
  if (isVisualCapture) {
    return;
  }
  scheduleInitialUpdateCheck();
  scheduleInitialManifestVersionCheck();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function parseVisualViewport(value: string): [number, number] {
  const [width, height] = value.split("x").map((part) => Number.parseInt(part, 10));
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return [1365, 900];
  }
  return [width, height];
}

async function captureVisualSnapshot(window: BrowserWindow): Promise<void> {
  if (!visualCaptureDir) return;

  const waitSelector = visualCapturePage === "settings" ? ".settings-app-page" : ".home-app-page";
  const waitText = visualCapturePage === "settings" ? "" : "刷新中...";

  await window.webContents.executeJavaScript(`
    new Promise((resolve, reject) => {
      const started = Date.now();
      const poll = () => {
        const target = document.querySelector(${JSON.stringify(waitSelector)});
        const text = document.body.innerText;
        if (target && (${JSON.stringify(waitText)} === "" || !text.includes(${JSON.stringify(waitText)}))) {
          requestAnimationFrame(() => requestAnimationFrame(resolve));
          return;
        }
        if (Date.now() - started > 30000) {
          reject(new Error("Timed out waiting for ${waitSelector}: " + document.body.innerText.slice(0, 300)));
          return;
        }
        setTimeout(poll, 100);
      };
      poll();
    })
  `);

  await window.webContents.executeJavaScript(`
    new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setTimeout(resolve, 250));
      });
    })
  `);

  const image = await window.webContents.capturePage();
  const imagePath = visualCaptureFile ?? join(visualCaptureDir, "app-dark-1365x900.png");
  await mkdir(visualCaptureDir, { recursive: true });
  await writeFile(imagePath, image.toPNG());

  const report = await window.webContents.executeJavaScript(`
    (() => {
      const selectors = [
        ".app-shell",
        ".shell-topbar",
        ".shell-sidebar",
        ".shell-content",
        ".page-header",
        ".home-app-page",
        ".home-data-strip",
        ".home-data-point",
        ".home-weekly-dashboard",
        ".home-reward-item",
        ".home-intel-row",
        ".home-main-grid",
        ".settings-app-page",
        ".app-settings-shell",
        ".settings-menu",
        ".settings-detail.active",
        ".settings-diagnostics-toolbar",
        ".settings-log-row",
        ".settings-background-tasks"
      ];
      const pick = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return {
          selector,
          text: element.textContent?.trim().slice(0, 120) ?? "",
          rect: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          },
          style: {
            display: style.display,
            gridTemplateColumns: style.gridTemplateColumns,
            gap: style.gap,
            padding: style.padding,
            backgroundColor: style.backgroundColor,
            borderColor: style.borderColor,
            color: style.color,
            fontSize: style.fontSize,
            lineHeight: style.lineHeight
          }
        };
      };
      return {
        url: location.href,
        title: document.title,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio
        },
        page: ${JSON.stringify(visualCapturePage)},
        homeTitleCount: Array.from(document.querySelectorAll("h1, h2")).filter((item) => {
          const text = item.textContent?.trim();
          return text === "首页" || text === "今日工作台";
        }).length,
        settingsTitleCount: Array.from(document.querySelectorAll("h1, h2")).filter((item) => item.textContent?.trim() === "设置").length,
        computedStyles: Object.fromEntries(selectors.map((selector) => [selector, pick(selector)])),
        bodyTextSample: document.body.innerText.slice(0, 500)
      };
    })()
  `);

  await writeFile(join(visualCaptureDir, "report.json"), JSON.stringify(report, null, 2), "utf8");
  app.quit();
}
