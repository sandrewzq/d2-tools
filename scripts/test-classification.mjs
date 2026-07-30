import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export const architectureTests = [
  "packages/app/test/multi-platform-boundaries.test.ts",
  "packages/desktop/test/architecture-maintenance.test.ts",
  "packages/desktop/test/cross-platform-ui-packages.test.ts",
  "packages/desktop/test/package-format.test.ts",
  "packages/desktop/test/preload-format.test.ts",
  "packages/desktop/test/release-workflow.test.ts",
  "packages/desktop/test/renderer-api-boundaries.test.ts",
  "packages/desktop/test/renderer-boundaries.test.ts",
  "scripts/check-doc-policy.test.mjs",
  "scripts/check-encoding.test.mjs",
  "scripts/dev-tools.test.mjs",
  "scripts/git-auto-release.test.mjs",
  "scripts/git-preflight.test.mjs",
  "scripts/test-classification.test.mjs"
];

export const repositoryTestPolicy = {
  architectureTests
};

export function discoverTestFiles(root = process.cwd()) {
  return ["packages", "scripts"]
    .flatMap((directory) => walkTests(root, directory))
    .sort();
}

export function classifyTestFiles(testFiles, policy = repositoryTestPolicy) {
  const architecture = new Set(policy.architectureTests.map(toPosixPath));
  const result = { behavior: [], architecture: [] };

  for (const file of testFiles.map(toPosixPath).sort()) {
    if (architecture.has(file)) {
      result.architecture.push(file);
    } else {
      result.behavior.push(file);
    }
  }

  return result;
}

export function isSourceInspectionTest(relativePath, source) {
  if (!/\b(?:readFileSync|readFile)\s*\(/.test(source)) {
    return false;
  }

  // Imports from production modules are normal behavior tests. Only inspect paths
  // used by file-reading code after static import declarations are removed.
  const executableSource = source.replace(/^\s*import(?:[\s\S]*?\sfrom\s*)?["'][^"']+["'];?\s*$/gm, "");
  return /["'`]packages[\\/][^"'`]+[\\/]src[\\/]/.test(executableSource)
    || /["'`]src(?:[\\/]|["'`])/.test(executableSource)
    || /["'`]\.\.[\\/]src[\\/]/.test(executableSource);
}

export function collectTestQualityErrors(root, testFiles = discoverTestFiles(root), policy = repositoryTestPolicy) {
  const errors = [];
  const normalizedFiles = testFiles.map(toPosixPath);
  const fileSet = new Set(normalizedFiles);
  const architecture = new Set(policy.architectureTests.map(toPosixPath));

  for (const file of [...architecture].sort()) {
    if (!fileSet.has(file)) {
      errors.push(`架构测试文件已不存在：${file}。请恢复测试或明确修改架构白名单。`);
    }
  }

  for (const file of normalizedFiles.sort()) {
    if (architecture.has(file)) {
      continue;
    }

    const absolutePath = path.join(root, file);
    if (!existsSync(absolutePath)) {
      continue;
    }

    const inspectsSource = isSourceInspectionTest(file, readFileSync(absolutePath, "utf8"));
    if (inspectsSource) {
      errors.push(`禁止新增源码字符串测试：${file}。请通过 import、渲染结果、role、label 或 ViewModel 输出验证行为。`);
    }
  }

  return errors;
}

function walkTests(root, relativeDirectory) {
  const absoluteDirectory = path.join(root, relativeDirectory);
  if (!existsSync(absoluteDirectory)) {
    return [];
  }

  const files = [];
  for (const entry of readdirSync(absoluteDirectory, { withFileTypes: true })) {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkTests(root, relativePath));
    } else if (entry.isFile() && /\.test\.(?:[cm]?[jt]sx?)$/.test(entry.name)) {
      files.push(toPosixPath(relativePath));
    }
  }
  return files;
}

export function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}
