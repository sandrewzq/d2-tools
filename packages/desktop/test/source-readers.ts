import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function readRendererApiContracts(desktopRoot: string): string {
  const apiRoot = join(desktopRoot, "src", "renderer", "api");
  return readdirSync(apiRoot)
    .filter((file) => /(?:Api|Types)\.ts$/.test(file))
    .sort()
    .map((file) => readFileSync(join(apiRoot, file), "utf8"))
    .join("\n");
}

export function readItemDetailSources(desktopRoot: string): string {
  const itemDetailRoot = join(desktopRoot, "src", "renderer", "shared", "components", "item-detail");
  return [
    join(desktopRoot, "src", "renderer", "shared", "components", "ItemDetailModal.tsx"),
    ...readdirSync(itemDetailRoot)
      .filter((file) => /\.tsx?$/.test(file))
      .sort()
      .map((file) => join(itemDetailRoot, file))
  ].map((file) => readFileSync(file, "utf8")).join("\n");
}
