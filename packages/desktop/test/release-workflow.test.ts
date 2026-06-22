import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

describe("release workflow", () => {
  it("builds one Windows 7z package and publishes it to GitHub releases", () => {
    const workflow = readFileSync(join(repoRoot, ".github", "workflows", "release.yml"), "utf8");

    expect(workflow).toContain("tags:");
    expect(workflow).toContain("v*.*.*");
    expect(workflow).toContain("electron-builder");
    expect(workflow).toContain("publish-github");
    expect(workflow).toContain("softprops/action-gh-release@v3");
    expect(workflow).not.toContain("publish-gitee");
    expect(workflow).toContain("d2-tools-win-x64");
    expect(workflow).toContain("*.7z");
    expect(workflow).not.toContain("*.zip");
  });
});
