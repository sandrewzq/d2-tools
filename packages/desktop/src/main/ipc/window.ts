import { BrowserWindow, ipcMain, shell } from "electron";

export type WindowColorMode = "light" | "dark";

type TitleBarOverlayOptions = Parameters<BrowserWindow["setTitleBarOverlay"]>[0];

export function createTitleBarOverlayOptions(colorMode: WindowColorMode): TitleBarOverlayOptions {
  return colorMode === "light"
    ? {
        color: "#f7f9fc",
        symbolColor: "#17202c",
        height: 48
      }
    : {
        color: "#10151d",
        symbolColor: "#d7deea",
        height: 48
      };
}

export function getWindowBackgroundColor(colorMode: WindowColorMode): string {
  return colorMode === "light" ? "#edf1f6" : "#0d1118";
}

export function applyWindowColorMode(window: BrowserWindow, colorMode: WindowColorMode): void {
  window.setTitleBarOverlay(createTitleBarOverlayOptions(colorMode));
  window.setBackgroundColor(getWindowBackgroundColor(colorMode));
}

export function registerWindowIpcHandlers(): void {
  ipcMain.handle("window:set-color-mode", (event, colorMode: WindowColorMode) => {
    if (colorMode !== "light" && colorMode !== "dark") return;
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window || window.isDestroyed()) return;
    applyWindowColorMode(window, colorMode);
  });

  ipcMain.handle("shell:open-external", (_event, url: string) => {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return;
    return shell.openExternal(url);
  });
}
