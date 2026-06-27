import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { LoadoutTemplate } from "@d2-tools/core/loadouts/templates";

export type LoadoutTemplateLookup = {
  instanceIds: Set<string>;
  bucketHashKeys: Set<string>;
  hashKeys: Set<number>;
};

export function buildLoadoutTemplateLookup(template: LoadoutTemplate): LoadoutTemplateLookup {
  return {
    instanceIds: new Set(template.items.map((item) => item.instance_id).filter((item): item is string => Boolean(item))),
    bucketHashKeys: new Set(template.items.map((item) => `${item.bucket_name ?? ""}:${item.hash}`)),
    hashKeys: new Set(template.items.map((item) => item.hash))
  };
}

export function matchesLoadoutTemplateItem(
  item: Pick<AccountItemSummary, "hash" | "instance_id" | "bucket_name">,
  lookup?: LoadoutTemplateLookup | null
): boolean {
  if (!lookup) {
    return false;
  }
  if (item.instance_id && lookup.instanceIds.has(item.instance_id)) {
    return true;
  }

  return lookup.bucketHashKeys.has(`${item.bucket_name ?? ""}:${item.hash}`)
    || lookup.hashKeys.has(item.hash);
}
