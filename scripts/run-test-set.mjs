import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { classifyTestFiles, discoverTestFiles } from "./test-classification.mjs";

const root = process.cwd();

const exactSets = {
  ui: [
    "packages/desktop/test/shared-ui-app-shell.test.tsx",
    "packages/desktop/test/shared-ui-i18n.test.tsx",
    "packages/desktop/test/home-weekly-briefing.test.tsx",
    "packages/desktop/test/shared-ui-page-views.test.tsx",
    "packages/desktop/test/shared-ui-product-host.test.tsx",
    "packages/desktop/test/shared-ui-shell-model.test.ts",
    "packages/desktop/test/vendors-page-ui.test.tsx",
    "packages/desktop/test/cross-platform-ui-packages.test.ts",
  ],
  release: [
    "scripts/extract-changelog.test.mjs",
    "scripts/git-auto-release.test.mjs",
    "packages/desktop/test/release-workflow.test.ts",
    "packages/desktop/test/package-format.test.ts",
  ],
};

const dynamicSets = {
  "desktop-wiring": {
    root: "packages/desktop/test",
    suffixes: ["wiring.test.ts"],
    extra: [
      "packages/desktop/test/renderer-boundaries.test.ts",
      "packages/desktop/test/renderer-api-boundaries.test.ts",
      "packages/desktop/test/preload-format.test.ts",
      "packages/desktop/test/package-format.test.ts",
    ],
  },
  "desktop-account": {
    root: "packages/desktop/test",
    includes: ["account"],
    extra: [],
  },
  "desktop-ai": {
    root: "packages/desktop/test",
    includes: ["ai-", "-ai-", "assistant", "kohinata"],
    extra: [],
  },
  "desktop-loadouts": {
    root: "packages/desktop/test",
    includes: ["loadout"],
    extra: [],
  },
  "desktop-vault": {
    root: "packages/desktop/test",
    includes: ["vault", "wishlist", "cleanup", "dim", "target-rules"],
    extra: [],
  },
};

const setName = process.argv[2];
const passthroughArgs = process.argv.slice(3);

if (!setName || setName === "--help" || setName === "/?") {
  console.log("用法: node scripts/run-test-set.mjs <behavior|architecture|ui|desktop-ai|desktop-vault|desktop-loadouts|desktop-account|desktop-wiring|release> [vitest 参数]");
  process.exit(setName ? 0 : 1);
}

const testFiles = resolveSet(setName);
if (!testFiles.length) {
  console.error(`No test files found for test set: ${setName}`);
  process.exit(1);
}

console.log(`Running ${setName} test set (${testFiles.length} files).`);

const vitestCli = path.join(root, "node_modules", "vitest", "vitest.mjs");
if (!existsSync(vitestCli)) {
  console.error("Cannot find local Vitest CLI. Run pnpm install first.");
  process.exit(1);
}

const child = spawn(process.execPath, [vitestCli, "--run", ...testFiles, ...passthroughArgs], {
  cwd: root,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`vitest terminated by signal ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});

function resolveSet(name) {
  if (["behavior", "architecture"].includes(name)) {
    return classifyTestFiles(discoverTestFiles(root))[name];
  }

  if (exactSets[name]) {
    return assertExistingFiles(exactSets[name]);
  }

  const dynamicSet = dynamicSets[name];
  if (!dynamicSet) {
    console.error(`Unknown test set: ${name}`);
    console.error(`Known test sets: ${["behavior", "architecture", ...Object.keys(exactSets), ...Object.keys(dynamicSets)].sort().join(", ")}`);
    process.exit(1);
  }

  const discovered = walk(dynamicSet.root)
    .filter((file) => matchesDynamicSet(file, dynamicSet))
    .sort();

  return assertExistingFiles([...discovered, ...dynamicSet.extra]);
}

function matchesDynamicSet(file, dynamicSet) {
  const normalizedFile = toPosixPath(file).toLowerCase();
  if (dynamicSet.suffixes?.some((suffix) => normalizedFile.endsWith(suffix.toLowerCase()))) {
    return true;
  }
  if (dynamicSet.includes?.some((part) => normalizedFile.includes(part.toLowerCase()))) {
    return true;
  }
  return false;
}

function walk(relativeDir) {
  const absoluteDir = path.join(root, relativeDir);
  if (!existsSync(absoluteDir)) {
    return [];
  }

  const entries = readdirSync(absoluteDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(relativePath));
    } else if (entry.isFile()) {
      files.push(toPosixPath(relativePath));
    }
  }

  return files;
}

function assertExistingFiles(files) {
  const uniqueFiles = [...new Set(files)].map(toPosixPath);
  const missingFiles = uniqueFiles.filter((file) => !existsSync(path.join(root, file)));
  if (missingFiles.length) {
    console.error(`Missing test files for ${setName}:`);
    for (const file of missingFiles) {
      console.error(`- ${file}`);
    }
    process.exit(1);
  }
  return uniqueFiles;
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}
