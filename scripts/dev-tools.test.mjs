import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

describe("dev tool scripts", () => {
  const devScripts = [
    { file: "win-dev-web.cmd", port: "53171", command: "dev:web" }
  ];

  it.each(devScripts)("clears stale port listeners before starting $file", ({ file, port, command }) => {
    const script = readFileSync(join(repoRoot, "tools", file), "utf8");

    expect(script).toContain(`set "DEV_PORT=${port}"`);
    expect(script).toContain("Stop-Process -Id $processId -Force");
    expect(script).toContain("Get-NetTCPConnection -LocalPort %DEV_PORT% -State Listen");
    expect(script).toContain("Stale process cleanup failed");
    expect(script).toContain(`call npx pnpm@9.15.0 ${command}`);
  });

  it("provides platform double-click desktop entries backed by one incremental launcher", () => {
    const commandScript = readFileSync(join(repoRoot, "tools", "win-dev-desktop.cmd"), "utf8");
    const macEntry = readFileSync(join(repoRoot, "tools", "mac-dev-desktop.command"), "utf8");
    const launcher = readFileSync(join(repoRoot, "scripts", "dev-desktop.mjs"), "utf8");

    expect(commandScript).toContain("call npx pnpm@9.15.0 dev:desktop");
    expect(macEntry).toContain("pnpm dev:desktop");
    expect(launcher).toContain("calculateBuildPlan");
    expect(launcher).toContain("findAvailablePort");
    expect(launcher).toContain("--force");
    expect(launcher).toContain("--clean");
    expect(launcher).toContain("--data-dir");
  });

  it("provides one cross-platform entry that mirrors the GitHub CI gate", () => {
    const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    const ciLocal = readFileSync(join(repoRoot, "scripts", "run-ci-local.mjs"), "utf8");

    expect(packageJson.scripts["ci:local"]).toBe("node scripts/run-ci-local.mjs");
    expect(ciLocal).toContain('"install", "--frozen-lockfile"');
    expect(ciLocal).toContain('args: ["test"]');
    expect(ciLocal).toContain('"playwright", "install", "chromium"');
    expect(ciLocal).toContain('args: ["visual:shell-contract"]');
    expect(ciLocal).toContain('args: ["typecheck:ci"]');
  });

  it("removes local development verification aliases while keeping the release gate", () => {
    const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));

    expect(Object.keys(packageJson.scripts).filter((name) => name.startsWith("verify:") && name !== "verify:release")).toEqual([]);
    expect(packageJson.scripts["verify:release"]).toBe("pnpm check && pnpm test:docs && pnpm test:release");
  });
});
