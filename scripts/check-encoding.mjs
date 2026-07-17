import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { TextDecoder } from "node:util";

const textExtensions = new Set([
  ".cjs",
  ".css",
  ".csv",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".ps1",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml"
]);

const ignoredDirs = new Set([
  ".git",
  ".local-data",
  ".vite",
  "coverage",
  "dist",
  "node_modules",
  "release"
]);

const mojibakePatterns = [
  "\u951b",
  "\u9286",
  "\u9225",
  "\u9428",
  "\u6d60",
  "\u7ec0\u60e7",
  "\u95ab",
  "\u5997",
  "\u935b",
  "\u6086",
  "\u6fb6",
  "\u74a7",
  "\u93ba",
  "\u59dd",
  "\u7039",
  "\u93c8",
  "\u7441\u546d",
  "\u6d5c\u5b2a",
  "\u9352\u55d8",
  "\u5be4\u9e3f",
  "\u93bf\u5d84"
];

const strictUtf8Decoder = new TextDecoder("utf-8", { fatal: true });

function toRepoPath(path) {
  return path.split(sep).join("/");
}

function walkTextFiles(root, dir = root) {
  if (!existsSync(dir)) return [];

  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        files.push(...walkTextFiles(root, join(dir, entry.name)));
      }
      continue;
    }

    const extension = entry.name.includes(".")
      ? entry.name.slice(entry.name.lastIndexOf(".")).toLowerCase()
      : "";
    if (textExtensions.has(extension)) {
      files.push(join(dir, entry.name));
    }
  }
  return files;
}

export function collectEncodingErrors(root) {
  const errors = [];
  const files = walkTextFiles(root);

  for (const file of files) {
    const repoPath = toRepoPath(relative(root, file));
    const buffer = readFileSync(file);
    let text;
    try {
      text = strictUtf8Decoder.decode(buffer);
    } catch {
      errors.push(`${repoPath}: file is not valid UTF-8`);
      continue;
    }

    if (text.includes("\uFFFD")) {
      errors.push(`${repoPath}: contains Unicode replacement character`);
    }

    if (isEncodingFixture(repoPath)) {
      continue;
    }

    const foundPattern = mojibakePatterns.find((pattern) => text.includes(pattern));
    if (foundPattern) {
      errors.push(`${repoPath}: contains likely mojibake text "${foundPattern}"`);
    }

    if (/\?{3,}/.test(text)) {
      errors.push(`${repoPath}: contains repeated question marks that may indicate encoding loss`);
    }
  }

  return errors;
}

function isEncodingFixture(repoPath) {
  return repoPath === "scripts/check-encoding.mjs"
    || /\.test\.[cm]?[jt]sx?$/.test(repoPath);
}

function main() {
  const errors = collectEncodingErrors(process.cwd());

  if (errors.length) {
    console.error("Encoding check failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("Encoding check passed.");
}

const isMain = import.meta.url.startsWith("file:") && process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
