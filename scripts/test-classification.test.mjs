import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  classifyTestFiles,
  collectTestQualityErrors,
  isSourceInspectionTest
} from "./test-classification.mjs";

function createTestRoot(files) {
  const root = mkdtempSync(join(tmpdir(), "d2-test-classification-"));
  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = join(root, relativePath);
    mkdirSync(join(absolutePath, ".."), { recursive: true });
    writeFileSync(absolutePath, content, "utf8");
  }
  return root;
}

describe("test classification", () => {
  it("assigns every test file to exactly one test layer", () => {
    const files = [
      "packages/core/test/behavior.test.ts",
      "packages/desktop/test/renderer-boundaries.test.ts",
      "packages/desktop/test/legacy-ui.test.ts"
    ];

    const result = classifyTestFiles(files, {
      architectureTests: ["packages/desktop/test/renderer-boundaries.test.ts"],
      legacyTests: ["packages/desktop/test/legacy-ui.test.ts"]
    });

    expect(result).toEqual({
      behavior: ["packages/core/test/behavior.test.ts"],
      architecture: ["packages/desktop/test/renderer-boundaries.test.ts"],
      legacy: ["packages/desktop/test/legacy-ui.test.ts"]
    });
  });

  it("recognizes desktop tests that read implementation files as source inspection", () => {
    const source = `
      import { readFileSync } from "node:fs";
      const view = readFileSync("packages/ui/src/account/AccountPageContentView.tsx", "utf8");
      expect(view).toContain("account-page-shell");
    `;

    expect(isSourceInspectionTest("packages/desktop/test/account-ui.test.ts", source)).toBe(true);
  });

  it("recognizes production source reads regardless of the assertion matcher", () => {
    const source = `
      import { readFileSync } from "node:fs";
      const view = readFileSync("packages/ui/src/account/AccountPageContentView.tsx", "utf8");
      expect(view).toBeDefined();
    `;

    expect(isSourceInspectionTest("packages/ui/test/account-source.test.ts", source)).toBe(true);
  });

  it("does not mistake fixture-backed behavior tests for source inspection", () => {
    const source = `
      import { readFileSync } from "node:fs";
      import { selectAccountPageModel } from "../src/accountPage";
      const fixture = JSON.parse(readFileSync("fixtures/account.json", "utf8"));
      expect(selectAccountPageModel(fixture).status).toContain("ready");
    `;

    expect(isSourceInspectionTest("packages/core/test/account.test.ts", source)).toBe(false);
  });

  it("rejects new source-inspection tests outside the frozen legacy list", () => {
    const testPath = "packages/desktop/test/new-ui-source-check.test.ts";
    const root = createTestRoot({
      [testPath]: `
        import { readFileSync } from "node:fs";
        const source = readFileSync("packages/ui/src/home/HomePageView.tsx", "utf8");
        expect(source).toContain("home-page");
      `
    });

    expect(collectTestQualityErrors(root, [testPath], {
      architectureTests: [],
      legacyTests: []
    })).toEqual([
      `禁止新增源码字符串测试：${testPath}。请通过 import、渲染结果、role、label 或 ViewModel 输出验证行为。`
    ]);
  });

  it("requires the legacy list to shrink after a test stops reading source", () => {
    const testPath = "packages/desktop/test/migrated-ui.test.ts";
    const root = createTestRoot({
      [testPath]: `
        import { selectHomePageModel } from "@d2-tools/app";
        expect(selectHomePageModel({})).toBeDefined();
      `
    });

    expect(collectTestQualityErrors(root, [testPath], {
      architectureTests: [],
      legacyTests: [testPath]
    })).toEqual([
      `遗留源码测试清单已有过期项：${testPath}。请从清单中删除。`
    ]);
  });

  it("rejects missing architecture tests and overlapping policy entries", () => {
    const testPath = "packages/desktop/test/renderer-boundaries.test.ts";
    const root = createTestRoot({
      [testPath]: "expect(true).toBe(true);"
    });

    expect(collectTestQualityErrors(root, [testPath], {
      architectureTests: [testPath, "packages/desktop/test/missing-boundary.test.ts"],
      legacyTests: [testPath]
    })).toEqual([
      `测试分类重复：${testPath} 同时属于 architecture 和 legacy。`,
      "架构测试文件已不存在：packages/desktop/test/missing-boundary.test.ts。请恢复测试或明确修改架构白名单。"
    ]);
  });
});
