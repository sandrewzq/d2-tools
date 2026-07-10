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

// Temporary inventory. Entries leave this list as they are replaced by behavior tests.
export const legacySourceInspectionTests = [
  "packages/desktop/test/account-inventory-ui.test.ts",
  "packages/desktop/test/account-postmaster-loadouts.test.ts",
  "packages/desktop/test/account-workspace-hook.test.ts",
  "packages/desktop/test/activity-loadout-wiring.test.ts",
  "packages/desktop/test/ai-analysis-wiring.test.ts",
  "packages/desktop/test/ai-settings-panel.test.ts",
  "packages/desktop/test/app-services-wiring.test.ts",
  "packages/desktop/test/armor-stats-ui.test.ts",
  "packages/desktop/test/assistant-context-history.test.ts",
  "packages/desktop/test/assistant-task-context.test.ts",
  "packages/desktop/test/auth-login-wiring.test.ts",
  "packages/desktop/test/background-task-wiring.test.ts",
  "packages/desktop/test/cleanup-mode-wiring.test.ts",
  "packages/desktop/test/config-help-copy.test.ts",
  "packages/desktop/test/copy-rules.test.ts",
  "packages/desktop/test/cross-platform-ui-completion.test.ts",
  "packages/desktop/test/cross-platform-ui-page-internals.test.ts",
  "packages/desktop/test/daily-panel-items.test.ts",
  "packages/desktop/test/daily-theme-colors.test.ts",
  "packages/desktop/test/daily-weekly-layout.test.ts",
  "packages/desktop/test/desktop-menu-provider-wiring.test.ts",
  "packages/desktop/test/desktop-product-redesign-wiring.test.ts",
  "packages/desktop/test/desktop-t5-visual-redesign.test.ts",
  "packages/desktop/test/desktop-ui-prototype-fidelity.test.ts",
  "packages/desktop/test/diagnostics-settings-split.test.ts",
  "packages/desktop/test/dim-tools-wiring.test.ts",
  "packages/desktop/test/global-ai-sidebar-wiring.test.ts",
  "packages/desktop/test/highest-power-batch-wiring.test.ts",
  "packages/desktop/test/home-page-app-workspace-wiring.test.ts",
  "packages/desktop/test/item-ai-analysis-wiring.test.ts",
  "packages/desktop/test/item-detail-performance.test.ts",
  "packages/desktop/test/item-detail-structure.test.ts",
  "packages/desktop/test/item-note-wiring.test.ts",
  "packages/desktop/test/item-write-actions-wiring.test.ts",
  "packages/desktop/test/item-write-performance.test.ts",
  "packages/desktop/test/kohinata-bot-wiring.test.ts",
  "packages/desktop/test/kohinata-loadout-draft-ui.test.ts",
  "packages/desktop/test/kohinata-sidebar-ui.test.ts",
  "packages/desktop/test/library-filters.test.ts",
  "packages/desktop/test/library-prototype-redesign.test.ts",
  "packages/desktop/test/loadout-library-ui.test.ts",
  "packages/desktop/test/loadouts-prototype-workspace.test.ts",
  "packages/desktop/test/local-data-services-wiring.test.ts",
  "packages/desktop/test/local-target-rules-wiring.test.ts",
  "packages/desktop/test/next-ten-wiring.test.ts",
  "packages/desktop/test/prototype-fixture-runtime.test.ts",
  "packages/desktop/test/settings-language-preferences.test.ts",
  "packages/desktop/test/ui-polish-copy.test.ts",
  "packages/desktop/test/ui-style-system.test.ts",
  "packages/desktop/test/update-installer-wiring.test.ts",
  "packages/desktop/test/vault-page-app-workspace-wiring.test.ts",
  "packages/desktop/test/vault-page-local-drafts.test.ts",
  "packages/desktop/test/vault-panel.test.ts",
  "packages/desktop/test/vendors-page-ui.test.tsx",
  "packages/desktop/test/visual-prototype-harness.test.ts",
  "packages/desktop/test/weekly-summary-wiring.test.ts",
  "packages/desktop/test/wishlist-detail-ui.test.ts",
  "packages/desktop/test/wishlist-import-wiring.test.ts",
  "packages/desktop/test/workspace-layout.test.ts"
];

export const repositoryTestPolicy = {
  architectureTests,
  legacyTests: legacySourceInspectionTests
};

export function discoverTestFiles(root = process.cwd()) {
  return ["packages", "scripts"]
    .flatMap((directory) => walkTests(root, directory))
    .sort();
}

export function classifyTestFiles(testFiles, policy = repositoryTestPolicy) {
  const architecture = new Set(policy.architectureTests.map(toPosixPath));
  const legacy = new Set(policy.legacyTests.map(toPosixPath));
  const result = { behavior: [], architecture: [], legacy: [] };

  for (const file of testFiles.map(toPosixPath).sort()) {
    if (architecture.has(file)) {
      result.architecture.push(file);
    } else if (legacy.has(file)) {
      result.legacy.push(file);
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
  const legacy = new Set(policy.legacyTests.map(toPosixPath));

  for (const file of [...architecture].filter((entry) => legacy.has(entry)).sort()) {
    errors.push(`测试分类重复：${file} 同时属于 architecture 和 legacy。`);
  }

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
    if (inspectsSource && !legacy.has(file)) {
      errors.push(`禁止新增源码字符串测试：${file}。请通过 import、渲染结果、role、label 或 ViewModel 输出验证行为。`);
    } else if (!inspectsSource && legacy.has(file)) {
      errors.push(`遗留源码测试清单已有过期项：${file}。请从清单中删除。`);
    }
  }

  for (const file of [...legacy].sort()) {
    if (!fileSet.has(file)) {
      errors.push(`遗留源码测试文件已不存在：${file}。请从清单中删除。`);
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
