import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, join, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const rendererRoot = fileURLToPath(new URL("../src/renderer", import.meta.url));
const featuresRoot = join(rendererRoot, "features");
const pagesRoot = join(rendererRoot, "pages");
const providersRoot = join(pagesRoot, "providers");

describe("desktop menu provider boundaries", () => {
  it("keeps the home feature independent from sibling menu features", () => {
    const homeRoot = join(featuresRoot, "home");
    const siblingMenus = new Set(["account", "library", "loadouts", "settings", "vault", "vendors"]);

    const violations = sourceFiles(homeRoot)
      .flatMap((file) => importTargets(file)
        .filter((target) => isInside(target, featuresRoot))
        .filter((target) => siblingMenus.has(featureName(target)))
        .map((target) => `${relative(rendererRoot, file)} -> ${relative(rendererRoot, target)}`));

    expect(violations).toEqual([]);
  });

  it("keeps desktop product writes out of home page naming", () => {
    expect(existsSync(join(pagesRoot, "useHomePageWriteActions.ts"))).toBe(false);
    expect(existsSync(join(pagesRoot, "useDesktopProductWriteActions.ts"))).toBe(true);
  });

  it("routes pages through menu providers instead of a single prebuilt props object", () => {
    const routesSource = readFileSync(join(pagesRoot, "HomePageRoutes.tsx"), "utf8");

    for (const provider of [
      "HomeMenuProvider",
      "AccountMenuProvider",
      "VaultMenuProvider",
      "LoadoutsMenuProvider",
      "LibraryMenuProvider",
      "VendorsMenuProvider",
      "SettingsMenuProvider"
    ]) {
      expect(routesSource).toContain(provider);
    }

    expect(routesSource).not.toContain("ComponentProps<typeof");
    expect(routesSource).not.toMatch(/\bhome:\s*ComponentProps/);
    expect(routesSource).not.toMatch(/\baccount:\s*ComponentProps/);
    expect(routesSource).not.toMatch(/\bvault:\s*ComponentProps/);
    expect(routesSource).not.toMatch(/\bsettings:\s*ComponentProps/);
  });

  it("keeps menu workspace hooks inside menu providers instead of HomePage.tsx", () => {
    const homePageSource = readFileSync(join(pagesRoot, "HomePage.tsx"), "utf8");

    for (const forbidden of [
      "useAccountWorkspace",
      "useLibraryWorkspace",
      "useLoadoutTemplates",
      "createHomeDashboardWorkspace",
      "createVendorsPageWorkspace"
    ]) {
      expect(homePageSource).not.toContain(forbidden);
    }
  });

  it("keeps menu providers scoped to their own feature or shared renderer layers", () => {
    expect(existsSync(providersRoot)).toBe(true);

    const allowedFeatureByProvider = new Map([
      ["AccountMenuProvider.tsx", "account"],
      ["HomeMenuProvider.tsx", "home"],
      ["LibraryMenuProvider.tsx", "library"],
      ["LoadoutsMenuProvider.tsx", "loadouts"],
      ["SettingsMenuProvider.tsx", "settings"],
      ["VaultMenuProvider.tsx", "vault"],
      ["VendorsMenuProvider.tsx", "vendors"]
    ]);
    const providerFiles = sourceFiles(providersRoot).filter((file) => allowedFeatureByProvider.has(basename(file)));

    expect(providerFiles.map((file) => basename(file)).sort()).toEqual([...allowedFeatureByProvider.keys()].sort());

    const violations = providerFiles.flatMap((file) => {
      const providerName = basename(file);
      const allowedFeature = allowedFeatureByProvider.get(providerName);
      return importTargets(file)
        .filter((target) => isInside(target, featuresRoot))
        .filter((target) => featureName(target) !== allowedFeature)
        .map((target) => `${relative(rendererRoot, file)} -> ${relative(rendererRoot, target)}`);
    });

    expect(violations).toEqual([]);
  });
});

function sourceFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }

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
