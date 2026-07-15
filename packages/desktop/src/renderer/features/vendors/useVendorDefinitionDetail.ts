import type {
  VendorInventoryItemView,
  VendorOfferContextView
} from "@d2-tools/ui";
import {
  buildLibraryVendorLiveEntry,
  mergeLibraryVendorSourcePaths,
  type LiveItemAvailabilityEntry,
  type VaultItemMatchInfo
} from "@d2-tools/app/library";
import { useRef, useState } from "react";
import { api } from "../../api/client";
import type { ItemSearchResult } from "../../api/types";

export type VendorDefinitionDetailState = {
  item: ItemSearchResult;
  context: VendorOfferContextView;
  liveEntry?: LiveItemAvailabilityEntry;
  communityMatch?: VaultItemMatchInfo;
  isBusy: boolean;
  error: string;
} | null;

export function useVendorDefinitionDetail(input: { vendorSourcePaths?: Map<number, string[]> } = {}) {
  const [state, setState] = useState<VendorDefinitionDetailState>(null);
  const requestSequenceRef = useRef(0);

  async function open(item: VendorInventoryItemView, context: VendorOfferContextView) {
    if (item.itemHash === undefined) return;
    const itemHash = item.itemHash;
    const requestSequence = ++requestSequenceRef.current;
    const sourcePaths = input.vendorSourcePaths?.get(itemHash)
      ?? (item.sourcePath ? [item.sourcePath] : [context.vendorName]);
    const fallbackLiveEntry = buildLibraryVendorLiveEntry(sourcePaths, item.characterIds?.[0]);
    setState({
      item: {
        hash: itemHash,
        name: item.name,
        description: item.summary,
        icon: item.iconUrl,
        item_type: item.itemType,
        tier: item.tone === "exotic" ? "异域" : undefined,
        source: {
          status: "ready",
          label: "商人售卖",
          description: context.vendorName
        }
      },
      context,
      liveEntry: fallbackLiveEntry,
      isBusy: true,
      error: ""
    });

    const [detailResult, availabilityResult, communityResult] = await Promise.allSettled([
      api.getItemDetail(itemHash),
      api.getLiveItemAvailability([itemHash]),
      api.matchCommunityVaultItems([{ hash: itemHash, socket_plugs: undefined }])
    ]);
    if (requestSequence !== requestSequenceRef.current) return;

    const liveEntry = availabilityResult.status === "fulfilled"
      ? mergeLibraryVendorSourcePaths(availabilityResult.value, new Map([[itemHash, sourcePaths]]))
        .items[String(itemHash)] ?? fallbackLiveEntry
      : fallbackLiveEntry;
    const communityMatch = communityResult.status === "fulfilled"
      ? communityResult.value.find((candidate) => candidate.hash === itemHash)
      : undefined;

    setState((current) => current ? {
      ...current,
      item: detailResult.status === "fulfilled" ? detailResult.value : current.item,
      liveEntry,
      communityMatch,
      isBusy: false,
      error: detailResult.status === "rejected"
        ? detailResult.reason instanceof Error
          ? detailResult.reason.message
          : "资料库定义读取失败"
        : ""
    } : null);
  }

  function close() {
    requestSequenceRef.current += 1;
    setState(null);
  }

  return { state, open, close };
}
