import type {
  VendorInventoryItemView,
  VendorOfferContextView
} from "@d2-tools/ui";
import { useRef, useState } from "react";
import { api } from "../../api/client";
import type { ItemSearchResult } from "../../api/types";

export type VendorDefinitionDetailState = {
  item: ItemSearchResult;
  context: VendorOfferContextView;
  isBusy: boolean;
  error: string;
} | null;

export function useVendorDefinitionDetail() {
  const [state, setState] = useState<VendorDefinitionDetailState>(null);
  const requestSequenceRef = useRef(0);

  async function open(item: VendorInventoryItemView, context: VendorOfferContextView) {
    if (item.itemHash === undefined) return;
    const requestSequence = ++requestSequenceRef.current;
    setState({
      item: {
        hash: item.itemHash,
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
      isBusy: true,
      error: ""
    });

    try {
      const detail = await api.getItemDetail(item.itemHash);
      if (requestSequence !== requestSequenceRef.current) return;
      setState({ item: detail, context, isBusy: false, error: "" });
    } catch (error) {
      if (requestSequence !== requestSequenceRef.current) return;
      setState((current) => current ? {
        ...current,
        isBusy: false,
        error: error instanceof Error ? error.message : "资料库定义读取失败"
      } : null);
    }
  }

  function close() {
    requestSequenceRef.current += 1;
    setState(null);
  }

  return { state, open, close };
}
