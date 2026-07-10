import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const devScripts = [
  { file: "dev-prototype.cmd", port: "53170", command: "dev:prototype" },
  { file: "dev-web.cmd", port: "53171", command: "dev:web" },
  { file: "dev-desktop.cmd", port: "53172", command: "dev:desktop" }
];

describe("dev tool scripts", () => {
  it.each(devScripts)("clears stale port listeners before starting $file", ({ file, port, command }) => {
    const script = readFileSync(join(repoRoot, "tools", file), "utf8");

    expect(script).toContain(`set "DEV_PORT=${port}"`);
    expect(script).toContain("Stop-Process -Id $processId -Force");
    expect(script).toContain("Get-NetTCPConnection -LocalPort %DEV_PORT% -State Listen");
    expect(script).toContain("Stale process cleanup failed");
    expect(script).toContain(`call npx pnpm@9.15.0 ${command}`);
    expect(script).not.toContain("Opening existing server without starting another process");
    expect(script).not.toContain("Opening existing renderer page without starting another process");
  });

  it("keeps finish verification aliases free of test suites already covered by vibe checks", () => {
    const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));

    expect(packageJson.scripts["verify:finish:docs"]).toBe("pnpm check");
    expect(packageJson.scripts["verify:finish:ui"]).toBe("pnpm typecheck:ui");
    expect(packageJson.scripts["verify:finish:desktop"]).toBe("pnpm typecheck:desktop-fast");
  });
});
