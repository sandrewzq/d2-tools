import type { DefinitionComponentData, DefinitionRecord } from "../manifest/definitions.js";
import { classifyBucket } from "./classification.js";

export type WeaponFrameSummary = {
  key: string;
  name: string;
};

export type WeaponFrameOptions = {
  plugSetDefinitions?: DefinitionComponentData;
};

export function summarizeWeaponFrame(
  item: DefinitionRecord,
  itemDefinitions: DefinitionComponentData,
  options: WeaponFrameOptions = {}
): WeaponFrameSummary | undefined {
  if (classifyBucket(item.inventory?.bucketTypeHash)?.group !== "weapons") {
    return undefined;
  }

  const hashes = [...new Set((item.sockets?.socketEntries ?? []).flatMap((entry) => [
    ...hashesFromReusablePlugItems(entry.reusablePlugItems),
    ...hashesFromPlugSet(options.plugSetDefinitions, entry.reusablePlugSetHash),
    ...hashesFromPlugSet(options.plugSetDefinitions, entry.randomizedPlugSetHash),
    ...(typeof entry.singleInitialItemHash === "number" ? [entry.singleInitialItemHash] : [])
  ]))];

  for (const hash of hashes) {
    const definition = itemDefinitions[String(hash)];
    const name = definition?.displayProperties?.name?.trim();
    if (!name || !isFrameLikePlug(definition, name)) {
      continue;
    }

    return {
      key: normalizeFrameKey(name),
      name
    };
  }

  return undefined;
}

export function summarizeSelectedWeaponFrame(
  plugs: Array<{ name: string; item_type?: string }>
): WeaponFrameSummary | undefined {
  for (const plug of plugs) {
    if (!isFrameLikePlug({ itemTypeDisplayName: plug.item_type }, plug.name)) continue;
    return { key: normalizeFrameKey(plug.name), name: plug.name };
  }
  return undefined;
}

function hashesFromReusablePlugItems(
  reusablePlugItems: Array<{ plugItemHash?: number }> | undefined
): number[] {
  return (reusablePlugItems ?? [])
    .map((item) => item.plugItemHash)
    .filter((hash): hash is number => typeof hash === "number");
}

function hashesFromPlugSet(
  plugSetDefinitions: DefinitionComponentData | undefined,
  plugSetHash: number | undefined
): number[] {
  if (!plugSetDefinitions || typeof plugSetHash !== "number") {
    return [];
  }

  return hashesFromReusablePlugItems(plugSetDefinitions[String(plugSetHash)]?.reusablePlugItems);
}

function isFrameLikePlug(definition: DefinitionRecord | undefined, name: string): boolean {
  const lowerName = name.toLocaleLowerCase();
  const lowerType = definition?.itemTypeDisplayName?.toLocaleLowerCase() ?? "";
  return lowerName.includes("frame")
    || name.includes("框架")
    || lowerType.includes("intrinsic")
    || lowerType.includes("内在");
}

function normalizeFrameKey(name: string): string {
  const trimmed = name.trim().toLocaleLowerCase();
  if (/^[\u4e00-\u9fa5]+$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || trimmed;
}
