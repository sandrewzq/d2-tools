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
  { label: "旧共享样式入口", pattern: /01-legacy-operations\.css/ },
  { label: "已废弃的 HTML 原型根标记", pattern: /data-prototype-root/ },
  { label: "选中态不得使用底部方向线", pattern: /box-shadow:\s*inset\s+0\s+-\d+(?:\.\d+)?px/ }
];

const allowedFontWeights = new Set(["400", "600", "700"]);
const allowedSurfaceValues = new Set([
  "page",
  "section",
  "frame",
  "object-card",
  "list",
  "row",
  "split",
  "content-stack",
  "empty",
  "menu",
  "dialog",
  "drawer"
]);
const hardcodedColorPattern = /#[\da-f]{3,8}\b|rgba?\s*\(/i;

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
    const isCss = extname(file).toLowerCase() === ".css";
    const isMenuCss = repoPath.startsWith("packages/ui/src/styles/menus/") && isCss;
    const checksSurfaceValues = repoPath.startsWith("packages/ui/src/") && /\.(?:[jt]sx?)$/.test(repoPath);
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const rule of forbiddenPatterns) {
        if (rule.pattern.test(line)) {
          errors.push(`${repoPath}:${index + 1} ${rule.label}`);
        }
      }

      if (isCss) {
        for (const fontSize of line.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)) {
          if (Number(fontSize[1]) < 12) {
            errors.push(`${repoPath}:${index + 1} 可见字号不得小于 12px`);
          }
        }

        for (const fontWeight of line.matchAll(/font-weight:\s*(\d+)\b/g)) {
          if (!allowedFontWeights.has(fontWeight[1])) {
            errors.push(`${repoPath}:${index + 1} 字重只允许 400 / 600 / 700`);
          }
        }

        for (const zIndex of line.matchAll(/z-index:\s*(-?\d+)\b/g)) {
          if (zIndex[1] !== "0" && zIndex[1] !== "1") {
            errors.push(`${repoPath}:${index + 1} 页面级层级必须使用语义 token`);
          }
        }
      }

      if (isMenuCss && hardcodedColorPattern.test(line)) {
        errors.push(`${repoPath}:${index + 1} 菜单样式不得写主题硬编码颜色`);
      }

      if (checksSurfaceValues) {
        for (const match of line.matchAll(/data-surface=["']([^"']+)["']/g)) {
          if (!allowedSurfaceValues.has(match[1])) {
            errors.push(`${repoPath}:${index + 1} 未登记的 data-surface 值：${match[1]}`);
          }
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
  console.log("UI 合同检查通过：共享语义、排版、层级、主题颜色和表面枚举未发现违规。");
}
