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

  it("runs the same local CI gate before changing release files or pushing", () => {
    const script = readFileSync(join(repoRoot, "tools", "git-auto-release.cmd"), "utf8");
    const installIndex = script.indexOf("call npx pnpm@9.15.0 install --frozen-lockfile");
    const testIndex = script.indexOf("call npx pnpm@9.15.0 test");
    const typecheckIndex = script.indexOf("call npx pnpm@9.15.0 typecheck");
    const prepareIndex = script.lastIndexOf("node scripts\\prepare-auto-release.mjs");
    const stageIndex = script.indexOf("\ngit add -A");
    const pushIndex = script.indexOf("\n  git push -u origin");

    expect(installIndex).toBeGreaterThanOrEqual(0);
    expect(testIndex).toBeGreaterThan(installIndex);
    expect(typecheckIndex).toBeGreaterThan(testIndex);
    expect(prepareIndex).toBeGreaterThan(typecheckIndex);
    expect(stageIndex).toBeGreaterThan(typecheckIndex);
    expect(pushIndex).toBeGreaterThan(typecheckIndex);
  });

  it("pauses with a readable failure reason instead of closing immediately", () => {
    const script = readFileSync(join(repoRoot, "tools", "git-auto-release.cmd"), "utf8");

    expect(script).toContain(":release_failed");
    expect(script).toContain("Failure stage: %FAILURE_STAGE%");
    expect(script).toContain("No commit, push, tag, or GitHub Release was created.");
    expect(script).toContain("pause");
  });

  it("reuses a manually prepared changelog section for the target version", () => {
    const prepareScript = readFileSync(join(repoRoot, "scripts", "prepare-auto-release.mjs"), "utf8");

    expect(prepareScript).toContain("Reusing existing CHANGELOG.md section for ${version}.");
    expect(prepareScript).toContain("return false;");
    expect(prepareScript).not.toContain("CHANGELOG.md already contains a section for ${version}.");
  });
});
