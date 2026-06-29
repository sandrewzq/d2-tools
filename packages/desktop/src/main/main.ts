import { app, BrowserWindow, Menu } from "electron";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { registerIpcHandlers } from "./ipc.js";
import { scheduleInitialManifestVersionCheck } from "./ipc/manifest.js";
import { scheduleInitialUpdateCheck } from "./ipc/updates.js";

const currentDir = fileURLToPath(new URL(".", import.meta.url));
const isDevelopment = process.env.NODE_ENV === "development";

async function createWindow(): Promise<void> {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 980,
    minHeight: 680,
    title: "d2-tools",
    autoHideMenuBar: true,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#10151d",
      symbolColor: "#d7deea",
      height: 44
    },
    backgroundColor: "#0d1118",
    webPreferences: {
      preload: join(currentDir, "../preload/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDevelopment) {
    await window.loadURL("http://127.0.0.1:5173");
    return;
  }

  await window.loadFile(join(currentDir, "../renderer/index.html"));
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  registerIpcHandlers();
  await createWindow();
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
