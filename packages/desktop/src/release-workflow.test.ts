import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

describe("release workflow", () => {
  it("builds one Windows package and publishes it to GitHub and Gitee releases", () => {
    const workflow = readFileSync(join(repoRoot, ".github", "workflows", "release.yml"), "utf8");

    expect(workflow).toContain("tags:");
    expect(workflow).toContain("v*.*.*");
    expect(workflow).toContain("package:win");
    expect(workflow).toContain("publish-github");
    expect(workflow).toContain("publish-gitee");
    expect(workflow).toContain("GITEE_TOKEN");
    expect(workflow).toContain("GITEE_SSH_PRIVATE_KEY");
    expect(workflow).toContain("d2-service-win-x64");
  });
});
