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
    "development.md": "# 开发说明\n"
  };

  for (const [name, content] of Object.entries(docs)) {
    writeFileSync(join(root, "docs", name), content, "utf8");
  }

  writeFileSync(join(root, "package.json"), JSON.stringify({ version: "0.0.4" }, null, 2), "utf8");
  writeFileSync(join(root, "README.md"), "# demo\n", "utf8");

  return root;
}

describe("collectDocPolicyErrors", () => {
  it("rejects deleting docs/todo.md without replacement", () => {
    const root = createDocsRoot();
    const errors = collectDocPolicyErrors(root, [["D", "docs/todo.md"]]);
    expect(errors).toContain("Protected document must not be deleted or moved without an explicit replacement: docs/todo.md");
  });

  it("rejects unexpected docs root files such as roadmap.md", () => {
    const root = createDocsRoot();
    writeFileSync(join(root, "docs", "roadmap.md"), "# 路线图\n", "utf8");

    const errors = collectDocPolicyErrors(root, []);

    expect(errors).toContain("Unexpected docs root file: docs/roadmap.md. Move work material under docs/work/.");
  });

  it("accepts docs/work files without a README index", () => {
    const root = createDocsRoot();
    writeFileSync(join(root, "docs", "work", "references", "sample.md"), "# 参考\n", "utf8");

    const errors = collectDocPolicyErrors(root, []);

    expect(errors).toEqual([]);
  });

  it("rejects hardcoded current package version in README", () => {
    const root = createDocsRoot();
    writeFileSync(join(root, "README.md"), "当前公开测试版本：`0.0.4`\n", "utf8");

    const errors = collectDocPolicyErrors(root, []);

    expect(errors).toContain("README.md must not hardcode the current package version. Link to Releases or use a version-agnostic artifact pattern instead.");
  });
});
