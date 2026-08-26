import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const workspaceRoot = join(repoRoot, "packages");
const packageNames = ["core", "services", "app", "http", "ui"];
const sourcePackageNames = ["core", "services", "app", "http", "ui", "desktop", "web"];
const failures = [];
const packageMeta = new Map();

for (const packageName of packageNames) {
  const packageDir = join(workspaceRoot, packageName);
  const packageJson = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));
  packageMeta.set(packageName, { packageDir, exports: packageJson.exports ?? {} });
}

for (const packageName of sourcePackageNames) {
  const packageDir = join(workspaceRoot, packageName);
  const sourceFiles = collectSourceFiles(join(packageDir, "src"));

  for (const file of sourceFiles) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/@d2-tools\/(core|services|app|http|ui)(?:\/[A-Za-z0-9._-]+)*/g)) {
      const importedPackage = match[1];
      const specifier = match[0];
      const importedMeta = packageMeta.get(importedPackage);
      if (!importedMeta) continue;
      const exportKey = specifier === `@d2-tools/${importedPackage}`
        ? "."
        : `.${specifier.slice(`@d2-tools/${importedPackage}`.length)}`;
      if (!(exportKey in importedMeta.exports)) {
        failures.push(`${relative(file)} imports ${specifier}, but ${importedPackage}/package.json does not export ${exportKey}`);
      }
    }
  }

}

for (const packageName of packageNames) {
  const { packageDir, exports } = packageMeta.get(packageName);
  for (const [exportKey, target] of Object.entries(exports)) {
    if (typeof target === "string") continue;
    for (const field of ["types", "import", "require", "default"]) {
      const relativeTarget = target?.[field];
      if (typeof relativeTarget !== "string") continue;
      if (!existsSync(join(packageDir, relativeTarget))) {
        failures.push(`${packageName} export ${exportKey}.${field} points to missing ${relativeTarget}`);
      }
    }
  }
}

if (failures.length) {
  console.error("Workspace exports 检查失败：");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Workspace exports 检查通过。");

function collectSourceFiles(directory) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectSourceFiles(file));
    else if (/\.(ts|tsx|mjs)$/.test(entry.name)) files.push(file);
  }
  return files;
}

function relative(file) {
  return file.slice(repoRoot.length + 1);
}
