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

  it("removes local development verification aliases while keeping the release gate", () => {
    const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));

    expect(Object.keys(packageJson.scripts).filter((name) => name.startsWith("verify:") && name !== "verify:release")).toEqual([]);
    expect(packageJson.scripts["verify:release"]).toBe("pnpm check && pnpm test:docs && pnpm test:release");
  });
});
