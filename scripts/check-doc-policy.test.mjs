import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { collectDocPolicyErrors } from "./check-doc-policy.mjs";

function createDocsRoot() {
  const root = mkdtempSync(join(tmpdir(), "d2-doc-policy-"));
  mkdirSync(join(root, "docs", "work", "archive"), { recursive: true });
  mkdirSync(join(root, "docs", "work", "backlog"), { recursive: true });
  mkdirSync(join(root, "docs", "work", "references"), { recursive: true });

  const docs = {
    "todo.md": "# 当前待办\n",
    "bug-list.md": "# Bug 清单\n",
    "development.md": "# 开发说明\n"
  };

  for (const [name, content] of Object.entries(docs)) {
    writeFileSync(join(root, "docs", name), content, "utf8");
  }

  writeFileSync(join(root, "docs", "work", "README.md"), "# 工作文档索引\n", "utf8");
  return root;
}

describe("collectDocPolicyErrors", () => {
  it("rejects duplicate Bug numbers in docs/bug-list.md", () => {
    const root = createDocsRoot();
    writeFileSync(
      join(root, "docs", "bug-list.md"),
      [
        "# Bug 清单",
        "",
        "### Bug #10: 仓库页装备分类错误",
        "### Bug #10: 社区推荐降级提示缺失"
      ].join("\n"),
      "utf8"
    );

    const errors = collectDocPolicyErrors(root, []);

    expect(errors).toContain("Duplicate bug id in docs/bug-list.md: Bug #10");
  });

  it("rejects docs/work/README.md entries that do not exist on disk", () => {
    const root = createDocsRoot();
    writeFileSync(
      join(root, "docs", "work", "README.md"),
      [
        "# 工作文档索引",
        "",
        "## Archive",
        "",
        "- `archive/missing.md`"
      ].join("\n"),
      "utf8"
    );

    const errors = collectDocPolicyErrors(root, []);

    expect(errors).toContain("docs/work/README.md lists missing work document: archive/missing.md");
  });
});
