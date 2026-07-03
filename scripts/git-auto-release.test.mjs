import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

describe("git-auto-release script", () => {
  it("retries the current package version when its GitHub release is missing", () => {
    const script = readFileSync(join(repoRoot, "tools", "git-auto-release.cmd"), "utf8");

    expect(script).toContain('set "GIT_PAGER=cat"');
    expect(script).toContain('set "CURRENT_TAG=v%CURRENT_VERSION%"');
    expect(script).toContain('gh release view "%CURRENT_TAG%"');
    expect(script).toContain('set "RELEASE_MODE=retry-current"');
    expect(script).toContain('set "RELEASE_MODE=bump-patch"');
    expect(script).toContain('if "%RELEASE_MODE%"=="bump-patch" (');
    expect(script).toContain('if "%RELEASE_MODE%"=="retry-current" (');
    expect(script).toContain("node scripts\\prepare-auto-release.mjs");
    expect(script).toContain('git tag -f "%RELEASE_TAG%"');
    expect(script).toContain('git push --force origin "%RELEASE_TAG%"');
  });
});
