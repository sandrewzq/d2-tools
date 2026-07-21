import {
  closeSync,
  existsSync,
  openSync,
  readSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { basename, join, relative, resolve } from "node:path";

const bungieStaticBaseUrl = "https://www.bungie.net";

export function findExtractedDatabase(directory: string): string {
  const candidates = listFiles(directory)
    .filter(isSqliteFile)
    .sort((left, right) => statSync(right).size - statSync(left).size);
  if (!candidates[0]) throw new Error("Downloaded Manifest archive does not contain a SQLite database");
  return candidates[0];
}

export async function downloadManifestFile(url: string, destination: string): Promise<void> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(180_000),
    headers: { "Accept": "application/zip, application/octet-stream" }
  });
  if (!response.ok) throw new Error(`SQLite Manifest download failed: HTTP ${response.status}`);
  writeFileSync(destination, Buffer.from(await response.arrayBuffer()));
}

export function staticContentUrl(path: string): string {
  return new URL(path, bungieStaticBaseUrl).toString();
}

export function safeArchiveName(sourcePath: string): string {
  return basename(sourcePath).replace(/[^a-zA-Z0-9._-]+/g, "-") || "manifest";
}

export function normalizeManifestLanguage(language: string): string {
  return language.trim().toLowerCase() || "en";
}

export function removeManifestWorkDirectory(root: string, target: string): void {
  const relativePath = relative(resolve(root), resolve(target));
  if (!relativePath || relativePath.startsWith("..")) return;
  try {
    rmSync(resolve(target), { recursive: true, force: true });
  } catch {
    // Locked stale directories are retried during the next startup.
  }
}

function listFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

export function isSqliteFile(path: string): boolean {
  if (!existsSync(path) || statSync(path).size < 16) return false;
  const file = openSync(path, "r");
  try {
    const header = Buffer.alloc(16);
    readSync(file, header, 0, header.length, 0);
    return header.toString("utf8") === "SQLite format 3\0";
  } finally {
    closeSync(file);
  }
}
