import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

describe("dev tool scripts", () => {
  const devScripts = [
    { file: "dev-web.cmd", port: "53171", command: "dev:web" }
  ];

  it.each(devScripts)("clears stale port listeners before starting $file", ({ file, port, command }) => {
    const script = readFileSync(join(repoRoot, "tools", file), "utf8");

    expect(script).toContain(`set "DEV_PORT=${port}"`);
    expect(script).toContain("Stop-Process -Id $processId -Force");
    expect(script).toContain("Get-NetTCPConnection -LocalPort %DEV_PORT% -State Listen");
    expect(script).toContain("Stale process cleanup failed");
    expect(script).toContain(`call npx pnpm@9.15.0 ${command}`);
  });

  it("provides one double-click desktop entry with automatic full-build fallback", () => {
    const commandScript = readFileSync(join(repoRoot, "tools", "dev-desktop.cmd"), "utf8");
    const launcher = readFileSync(join(repoRoot, "scripts", "dev-desktop.ps1"), "utf8");

    expect(commandScript).toContain("dev-desktop.ps1\" -Fast");
    expect(launcher).toContain("[switch] $Fast");
    expect(launcher).toContain("function Test-OutputNeedsBuild");
    expect(launcher).toContain("function Stop-StaleRendererServer");
    expect(launcher).toContain("Get-NetTCPConnection -LocalPort $rendererPort -State Listen");
    expect(launcher).toContain("Required build output is missing; falling back to a full build.");
    expect(launcher).toContain("Workspace outputs are current; skipping package builds.");
    expect(launcher).toContain("Main and preload outputs are current; reusing existing files.");
    expect(launcher).not.toContain("dev-desktop-build.stamp");
  });

  it("removes local development verification aliases while keeping the release gate", () => {
    const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));

    expect(Object.keys(packageJson.scripts).filter((name) => name.startsWith("verify:") && name !== "verify:release")).toEqual([]);
    expect(packageJson.scripts["verify:release"]).toBe("pnpm check && pnpm test:docs && pnpm test:release");
  });
});
