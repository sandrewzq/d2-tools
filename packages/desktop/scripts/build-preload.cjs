const fs = require("node:fs");
const path = require("node:path");

const desktopRoot = path.resolve(__dirname, "..");
const srcFile = path.join(desktopRoot, "dist", "preload", "preload.js");
const outFile = path.join(desktopRoot, "dist", "preload", "preload.cjs");

if (!fs.existsSync(srcFile)) {
  throw new Error(`preload source not found: ${srcFile}`);
}

const source = fs.readFileSync(srcFile, "utf8");
const transformed = source
  .replace(/^import\s+\{\s*contextBridge\s*,\s*ipcRenderer\s*\}\s+from\s+["']electron["'];?\s*$/m, 'const { contextBridge, ipcRenderer } = require("electron");')
  .replace(/^export\s*\{\s*\};?\s*$/gm, "");

fs.writeFileSync(outFile, `${transformed}\n`, "utf8");
