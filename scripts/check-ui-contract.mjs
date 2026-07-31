import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const sourceExtensions = new Set([".css", ".html", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const ignoredDirectories = new Set(["dist", "node_modules"]);
const forbiddenPatterns = [
  { label: "旧按钮语义 class", pattern: /\b(?:primary-button|secondary-button|danger-button)\b/ },
  { label: "旧按钮 modifier class", pattern: /\b(?:button|instance-command)\s+(?:primary|danger|violet)\b/ },
  { label: "旧按钮 modifier selector", pattern: /(?:\.(?:button\.(?:primary|danger|violet)|instance-command\.primary|is-primary)\b|\.rail-primary-actions\s+\.primary\b|\.write-actions\s+\.apply\b)/ },
  { label: "旧边界或圆角 token", pattern: /--(?:line(?:-strong)?|divider|radius-panel|radius-pill)(?![\w-])/ },
  { label: "旧 action token", pattern: /--(?:action-primary|action-secondary|text-on-accent)\b/ },
  { label: "旧共享样式入口", pattern: /01-legacy-operations\.css/ }
];

function toRepoPath(path) {
  return path.split(sep).join("/");
}

function walkSourceFiles(dir) {
  if (!existsSync(dir)) return [];

  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...walkSourceFiles(join(dir, entry.name)));
      }
      continue;
    }

    if (sourceExtensions.has(extname(entry.name).toLowerCase())) {
      files.push(join(dir, entry.name));
    }
  }
  return files;
}

export function collectUiContractErrors(root) {
  const roots = [
    join(root, "packages"),
    join(root, "docs", "work", "references", "ui-specs")
  ];
  const errors = [];

  for (const file of roots.flatMap(walkSourceFiles)) {
    const repoPath = toRepoPath(relative(root, file));
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const rule of forbiddenPatterns) {
        if (rule.pattern.test(line)) {
          errors.push(`${repoPath}:${index + 1} ${rule.label}`);
        }
      }
    });
  }

  return errors;
}

const currentFile = fileURLToPath(import.meta.url);
const root = join(dirname(currentFile), "..");
const errors = collectUiContractErrors(root);

if (errors.length) {
  console.error("UI Control 合同检查失败：");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log("UI Control 合同检查通过：未发现旧按钮 class、旧边界/圆角 token 或旧 action token。");
}
