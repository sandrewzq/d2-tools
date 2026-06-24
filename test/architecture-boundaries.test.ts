import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { globSync } from "glob";

const root = process.cwd();

function readSourceFiles(scope: string): Array<{ path: string; content: string }> {
  return globSync(`${scope}/**/*.{ts,tsx}`, {
    cwd: root,
    ignore: ["**/dist/**", "**/node_modules/**"]
  }).map((path) => ({
    path,
    content: readFileSync(join(root, path), "utf8")
  }));
}

function expectNoImport(scope: string, forbidden: RegExp, reason: string) {
  const offenders = readSourceFiles(scope).filter((file) => forbidden.test(file.content));
  expect(
    offenders.map((file) => `${relative(root, join(root, file.path))}: ${reason}`)
  ).toEqual([]);
}

describe("architecture boundaries", () => {
  it("core does not depend on platform, data, ui, or apps", () => {
    expectNoImport(
      "packages/core/src",
      /from\s+["'](@d2-tools\/(platform|data|ui)|\.\.\/\.\.\/apps)/,
      "core must stay platform independent"
    );
  });

  it("ui does not import tauri or app code", () => {
    expectNoImport(
      "packages/ui/src",
      /from\s+["'](@tauri-apps\/|.*apps\/desktop)/,
      "ui must not call platform APIs directly"
    );
  });

  it("data does not import app code or tauri", () => {
    expectNoImport(
      "packages/data/src",
      /from\s+["'](@tauri-apps\/|.*apps\/desktop)/,
      "data must use platform contracts only"
    );
  });

  it("desktop app exists", () => {
    expect(existsSync(join(root, "apps/desktop/src-tauri/tauri.conf.json"))).toBe(true);
  });
});
