import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { collectEncodingErrors } from "./check-encoding.mjs";

function createRoot() {
  const root = mkdtempSync(join(tmpdir(), "d2-encoding-"));
  mkdirSync(join(root, "docs"), { recursive: true });
  mkdirSync(join(root, "packages", "desktop", "src"), { recursive: true });
  return root;
}

describe("collectEncodingErrors", () => {
  it("accepts normal UTF-8 Chinese text", () => {
    const root = createRoot();
    writeFileSync(join(root, "docs", "todo.md"), "# 当前待办\n- 使用 UTF-8 编码。\n", "utf8");

    expect(collectEncodingErrors(root)).toEqual([]);
  });

  it("rejects invalid UTF-8 bytes", () => {
    const root = createRoot();
    writeFileSync(join(root, "docs", "todo.md"), Buffer.from([0xff, 0xfe, 0xfd]));

    expect(collectEncodingErrors(root)).toContain("docs/todo.md: file is not valid UTF-8");
  });

  it("rejects likely mojibake and repeated question marks", () => {
    const root = createRoot();
    writeFileSync(join(root, "docs", "todo.md"), "澶嶅埗澶辫触\n", "utf8");
    writeFileSync(join(root, "packages", "desktop", "src", "copy.ts"), "const message = \"????\";\n", "utf8");

    expect(collectEncodingErrors(root)).toContain('docs/todo.md: contains likely mojibake text "澶"');
    expect(collectEncodingErrors(root)).toContain("packages/desktop/src/copy.ts: contains repeated question marks that may indicate encoding loss");
  });

  it("rejects mojibake fragments that came from UTF-8 text decoded as a legacy code page", () => {
    const root = createRoot();
    writeFileSync(join(root, "docs", "todo.md"), "d2-tools 瑁呭鎿嶄綔璁″垝\n", "utf8");

    expect(collectEncodingErrors(root)).toContain('docs/todo.md: contains likely mojibake text "瑁呭"');
  });
});
