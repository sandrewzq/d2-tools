import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

// 界面文案的唯一真源是 i18n copy 表：zh-CN 表的 key 就是中文原文，en-US 表用同一段原文
// 当 key 写英文，渲染层只查表、不写字面量。这个脚本守这条边界，只认两种没有歧义的字面量：
//
//   1. JSX 文本节点里直接写的中文          <button>刷新账号</button>
//   2. 展示属性上直接写的中文              aria-label="复制 DIM 链接"
//
// 这两种形状一定是渲染出来的可见文案，改法也统一：套一层 `{xxxText(copy, "中文原文")}`。
// 注释、正则字面量、fixture 数据、落盘数据和剪贴板文本不在这两类里，脚本不会误报；
// 拼装型文案（模板串里带 `${}`）也留给 review，不在这里做模糊匹配。

const cjkPattern = /[㐀-䶿一-鿿豈-﫿]/;
const sourceExtensions = new Set([".tsx"]);
const ignoredDirectories = new Set(["dist", "node_modules", "test", "__tests__", "fixtures"]);
const scanRoots = ["packages/ui/src", "packages/desktop/src/renderer", "packages/web/src"];

// 展示属性：写在 JSX 标签上、直接呈现给用户或读屏的字符串属性。
const displayAttributes = ["aria-label", "aria-description", "title", "placeholder", "alt"];
const attributePattern = new RegExp(`\\b(?:${displayAttributes.join("|")})=(["'])([^"']*)\\1`, "g");
// JSX 文本节点：`>` 与 `<` 之间、且不含 `{` `}` `=` 的连续文本。
const jsxTextPattern = />([^<>{}]*[㐀-䶿一-鿿豈-﫿][^<>{}]*)</g;

// fixture 目录整份是模拟数据，不算产品文案。
const exemptDirectories = ["/fixtures/"];

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

/** 按行剥离注释；跨行块注释用状态标记延续。返回 null 表示整行在注释里。 */
function stripComments(rawLine, state) {
  let line = rawLine;
  if (state.inBlockComment) {
    const end = line.indexOf("*/");
    if (end === -1) return null;
    line = line.slice(end + 2);
    state.inBlockComment = false;
  }
  line = line.replace(/\/\*[\s\S]*?\*\//g, "");
  const blockStart = line.indexOf("/*");
  if (blockStart !== -1) {
    state.inBlockComment = true;
    line = line.slice(0, blockStart);
  }
  const lineComment = line.indexOf("//");
  if (lineComment !== -1) line = line.slice(0, lineComment);
  return line;
}

export function collectI18nHardcodedErrors(root) {
  const errors = [];

  for (const scanRoot of scanRoots) {
    for (const file of walkSourceFiles(join(root, scanRoot))) {
      const repoPath = toRepoPath(relative(root, file));
      if (exemptDirectories.some((segment) => repoPath.includes(segment))) continue;

      const lines = readFileSync(file, "utf8").split(/\r?\n/);
      const state = { inBlockComment: false };

      lines.forEach((rawLine, index) => {
        const line = stripComments(rawLine, state);
        if (!line || !cjkPattern.test(line)) return;

        for (const match of line.matchAll(attributePattern)) {
          if (cjkPattern.test(match[2])) {
            errors.push(`${repoPath}:${index + 1} ${match[0].split("=")[0]} 直接写了中文，请改走 copy 表：${JSON.stringify(match[2].slice(0, 60))}`);
          }
        }

        for (const match of line.matchAll(jsxTextPattern)) {
          const text = match[1].trim();
          if (!cjkPattern.test(text)) continue;
          errors.push(`${repoPath}:${index + 1} JSX 文本节点直接写了中文，请改走 copy 表：${JSON.stringify(text.slice(0, 60))}`);
        }
      });
    }
  }

  return errors;
}

const currentFile = fileURLToPath(import.meta.url);
const root = join(dirname(currentFile), "..");
const errors = collectI18nHardcodedErrors(root);

if (errors.length) {
  console.error("界面文案 i18n 检查失败：");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log("界面文案 i18n 检查通过：渲染层的 JSX 文本与展示属性未发现硬编码中文。");
}
