import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * T56 不变量 I2 / I3 的守卫测试（架构测试）。
 *
 * CSV 与 DIM 只是两种数据格式，格式差异必须止步于「解析 / 适配」层。
 * 从来源实例、规则、事实到消费（判定 / 筛选 / 卡片 / 详情 / 排序），
 * 一切行为只由事实决定——任何按来源类型分叉的代码都是缺陷。
 *
 * 本文件当前为红：违例即 Layer 2 / Layer 5 的工作队列。
 */

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

/**
 * 被扫描的层：来源实例 / 规则 / 事实 / 消费。解析层不在其中。
 *
 * 装备目标域（`source_kind: "dim_wishlist"`）也不在其中——它属另一个领域，不在 T56 范围。
 */
const scannedRoots = [
  "packages/core/src/analysis",
  "packages/core/src/community-perks",
  "packages/core/src/evidence",
  "packages/services/src/community",
  "packages/ui/src",
  "packages/app/src/workspaces"
];

/**
 * 允许按格式分支的文件白名单——当前**为空**。
 *
 * 为什么解析 / 适配层（②）不需要开洞：② 的职责只是把文本读成事实，它同样不需要按来源类型
 * 分叉。`dim:` 键前缀、`kind === "dim"`、`DIM 愿望单` 这类写法是 ③④⑤ 的**存储与展示身份**，
 * 不是解析语法；解析器要分叉的是文件内容里的语法，与这些模式无关。
 *
 * 为什么装备目标域不需要开洞：`source_kind: "dim_wishlist"` 的根目录（`core/src/targets`、
 * `services/src/targets`）根本不在 `scannedRoots` 里——不报是因为**没扫**，不是因为抹掉了。
 *
 * 开洞的规矩：只登记「确实压住了真实违例」的文件，并由下面的用例证明它有用。
 * 为了让红的扫描变绿而往这里加文件，等于把守卫关掉——要开洞就必须同时给出理由和证据。
 */
const allowedFormatAwareFiles = new Map<string, string>();

/** ③④⑤ 层禁止出现的「按来源类型分叉」模式。 */
const forbiddenPatterns: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /startsWith\(\s*["']dim:/, reason: "按 sourceId 前缀判断来源类型" },
  { pattern: /\bkind\s*===\s*["']dim["']/, reason: "按 kind 判别位分支" },
  { pattern: /\bisDim[A-Za-z]*/, reason: "按来源类型命名的标识符" },
  { pattern: /[A-Za-z]+IsDim\b/, reason: "按来源类型命名的标识符" },
  { pattern: /\bdimDocumentSourceKey\b/, reason: "把 dim:<doc>[:<inst>] 键约定写进服务逻辑" },
  { pattern: /["'`]DIM 完整组合["'`]/, reason: "按来源类型写死的槽位名" },
  { pattern: /["'`]dim_voltron["'`]/, reason: "dim 专属聚合键" },
  { pattern: /["'`]dim_wishlist["'`]/, reason: "把格式名写进来源身份或存储" },
  { pattern: /["'`]DIM 愿望单["'`]/, reason: "把数据格式名写成面向用户的概念" },
  { pattern: /["'`]DIM Wishlist["'`]/, reason: "把格式名写死成显示标签" },
  { pattern: /["'`]DIM PVE["'`]|["'`]DIM PVP["'`]|["'`]DIM General["'`]/, reason: "把格式名写死成显示标签" },
  { pattern: /\bpveClearPerks\b|\bpveDamagePerks\b|\bpvpPerks\b/, reason: "硬编码的判定关键词表" }
];

describe("T56 来源类型边界", () => {
  it("③④⑤ 层不存在按来源类型分叉的代码", () => {
    expect(scanSourceForTypeBranches(scannedRoots).map(formatViolation)).toEqual([]);
  });

  it("边界扫描本身有效（能识别出违例文本）", () => {
    const sample = [
      'if (sourceId.startsWith("dim:")) { const isDim = true; }',
      'const label = "DIM 愿望单";',
      'const heuristics = pveClearPerks;'
    ].join("\n");
    expect(countForbiddenPatterns(sample).length).toBeGreaterThanOrEqual(3);
  });

  it("每个被扫描的根目录都真实存在（根目录改名后守卫不能静默空转）", () => {
    for (const root of scannedRoots) {
      expect(sourceFiles(join(repoRoot, root)), `扫描根目录不存在或没有源文件：${root}`).not.toHaveLength(0);
    }
  });

  it("白名单里每一条都压住了真实违例（不存在为了变绿而加的空洞条目）", () => {
    for (const [allowed, reason] of allowedFormatAwareFiles) {
      const suppressed = scanSourceForTypeBranches(scannedRoots, { ignoreExemptions: true })
        .filter((violation) => isAllowedFormatAwareFile(violation.file));
      expect(suppressed.length, `白名单条目没有任何实际作用，应当删除：${allowed}（${reason}）`)
        .toBeGreaterThan(0);
    }
  });
});

function formatViolation(violation: { file: string; reason: string; text: string }): string {
  return `${violation.file} —— ${violation.reason}：${violation.text}`;
}

function scanSourceForTypeBranches(
  roots: string[],
  options?: { ignoreExemptions?: boolean }
): Array<{ file: string; reason: string; text: string }> {
  const violations: Array<{ file: string; reason: string; text: string }> = [];
  for (const root of roots) {
    for (const file of sourceFiles(join(repoRoot, root))) {
      const path = relative(repoRoot, file).replaceAll("\\", "/");
      if (!options?.ignoreExemptions && isAllowedFormatAwareFile(path)) continue;
      for (const hit of countForbiddenPatterns(stripComments(readFileSync(file, "utf8")))) {
        violations.push({ file: path, ...hit });
      }
    }
  }
  return violations;
}

function isAllowedFormatAwareFile(path: string): boolean {
  for (const [allowed, _reason] of allowedFormatAwareFiles) {
    if (path === allowed || path.startsWith(`${allowed}/`) || path.startsWith(allowed)) return true;
  }
  return false;
}

function countForbiddenPatterns(source: string): Array<{ reason: string; text: string }> {
  const hits: Array<{ reason: string; text: string }> = [];
  const lines = source.split("\n");
  for (const [index, line] of lines.entries()) {
    for (const { pattern, reason } of forbiddenPatterns) {
      if (!pattern.test(line)) continue;
      // 去掉 `//` 之后的尾部注释，避免把说明文字当成代码。
      const code = line.split("//")[0];
      if (!pattern.test(code)) continue;
      hits.push({ reason, text: `:${index + 1} ${line.trim().slice(0, 100)}` });
    }
  }
  return hits;
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "");
}

function sourceFiles(directory: string): string[] {
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (!entry.isFile()) return [];
    if (!/\.(?:ts|tsx)$/.test(entry.name)) return [];
    if (/\.test\./.test(entry.name)) return [];
    return statSync(path).isFile() ? [path] : [];
  });
}
