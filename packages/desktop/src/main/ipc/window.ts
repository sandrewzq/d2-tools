import { BrowserWindow, ipcMain, shell } from "electron";

export type WindowColorMode = "light" | "dark";

export function getWindowBackgroundColor(colorMode: WindowColorMode): string {
  return colorMode === "light" ? "#edf1f6" : "#0d1118";
}

export function applyWindowColorMode(window: BrowserWindow, colorMode: WindowColorMode): void {
  window.setBackgroundColor(getWindowBackgroundColor(colorMode));
}

export function registerWindowIpcHandlers(): void {
  ipcMain.handle("window:set-color-mode", (event, colorMode: WindowColorMode) => {
    if (colorMode !== "light" && colorMode !== "dark") return;
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window || window.isDestroyed()) return;
    applyWindowColorMode(window, colorMode);
  });

  ipcMain.handle("window:minimize", (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window || window.isDestroyed()) return;
    window.minimize();
  });

  ipcMain.handle("window:toggle-maximize", (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window || window.isDestroyed()) return;
    if (window.isMaximized()) {
      window.unmaximize();
      return;
    }
    window.maximize();
  });

  ipcMain.handle("window:close", (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window || window.isDestroyed()) return;
    window.close();
  });

  ipcMain.handle("shell:open-external", (_event, url: string) => {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return;
    return shell.openExternal(url);
  });
}
