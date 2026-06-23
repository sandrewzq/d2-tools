import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const rendererRoot = fileURLToPath(new URL("../src/renderer", import.meta.url));
const featuresRoot = join(rendererRoot, "features");
const sharedRoot = join(rendererRoot, "shared");

describe("renderer architecture boundaries", () => {
  it("keeps feature modules independent from sibling feature modules", () => {
    const violations = sourceFiles(featuresRoot)
      .flatMap((file) => importTargets(file)
        .filter((target) => isInside(target, featuresRoot))
        .filter((target) => featureName(file) !== featureName(target))
        .map((target) => `${relative(rendererRoot, file)} -> ${relative(rendererRoot, target)}`));

    expect(violations).toEqual([]);
  });

  it("keeps shared renderer modules independent from feature modules", () => {
    const violations = sourceFiles(sharedRoot)
      .flatMap((file) => importTargets(file)
        .filter((target) => isInside(target, featuresRoot))
        .map((target) => `${relative(rendererRoot, file)} -> ${relative(rendererRoot, target)}`));

    expect(violations).toEqual([]);
  });

  it("keeps shared renderer modules from using menu UI bridge modules", () => {
    const violations = sourceFiles(sharedRoot)
      .flatMap((file) => importTargets(file)
        .filter((target) => relative(rendererRoot, target).replaceAll("\\", "/") === "components/VaultPanel.tsx")
        .map((target) => `${relative(rendererRoot, file)} -> ${relative(rendererRoot, target)}`));

    expect(violations).toEqual([]);
  });
});

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      return sourceFiles(fullPath);
    }

    return /\.(ts|tsx)$/.test(entry) ? [fullPath] : [];
  });
}

function importTargets(file: string): string[] {
  const source = readFileSync(file, "utf8");
  const imports = [...source.matchAll(/\bimport\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((specifier) => specifier.startsWith("."));

  return imports
    .map((specifier) => resolveImport(file, specifier))
    .filter((target): target is string => Boolean(target));
}

function resolveImport(file: string, specifier: string): string | null {
  const base = resolve(dirname(file), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx")
  ];

  return candidates.find((candidate) => {
    try {
      return statSync(candidate).isFile();
    } catch {
      return false;
    }
  }) ?? null;
}

function featureName(file: string): string {
  const relativePath = relative(featuresRoot, file);
  return relativePath.split(sep)[0] ?? "";
}

function isInside(path: string, dir: string): boolean {
  const relativePath = normalize(relative(dir, path));
  return Boolean(relativePath) && !relativePath.startsWith("..") && !isAbsolute(relativePath);
}
