import type {
  VendorInventoryItemView,
  VendorOfferContextView
} from "@d2-tools/ui";
import type { WeaponRecommendation } from "@d2-tools/core/community-perks";
import type { PersonalWeaponKnowledgeEntry } from "@d2-tools/core/community-perks/personalWeaponKnowledge";
import type { SavePersonalWeaponKnowledgeInput } from "@d2-tools/core/community-perks/personalWeaponKnowledge";
import type { ItemAiAdviceResult, VaultTags } from "../../api/types";
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
  offerItem: VendorInventoryItemView;
  context: VendorOfferContextView;
  liveEntry?: LiveItemAvailabilityEntry;
  communityMatch?: VaultItemMatchInfo;
  recommendations?: WeaponRecommendation | null;
  personalKnowledge: PersonalWeaponKnowledgeEntry[];
  aiResult: ItemAiAdviceResult | null;
  aiError: string;
  isGeneratingAi: boolean;
  isBusy: boolean;
  error: string;
} | null;

export function useVendorDefinitionDetail(input: { vendorSourcePaths?: Map<number, string[]>; vaultTags?: VaultTags } = {}) {
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
        group_key: item.tone === "weapon" ? "weapons" : item.tone === "armor" ? "armor" : "other",
        source: {
          status: "ready",
          label: "商人售卖",
          description: context.vendorName
        }
      },
      offerItem: item,
      context,
      liveEntry: fallbackLiveEntry,
      personalKnowledge: [],
      aiResult: null,
      aiError: "",
      isGeneratingAi: false,
      isBusy: true,
      error: ""
    });

    const [detailResult, availabilityResult, communityResult, recommendationsResult, knowledgeResult] = await Promise.allSettled([
      api.getItemDetail(itemHash),
      api.getLiveItemAvailability([itemHash]),
      api.matchCommunityVaultItems([{ hash: itemHash, socket_plugs: item.socketPlugs }]),
      api.getCommunityPerkRecommendations(itemHash, { item_name: item.name }),
      api.getPersonalWeaponKnowledge(item.name)
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
      recommendations: recommendationsResult.status === "fulfilled" ? recommendationsResult.value : null,
      personalKnowledge: knowledgeResult.status === "fulfilled" ? knowledgeResult.value.entries : [],
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

  async function saveKnowledge(draft: SavePersonalWeaponKnowledgeInput["entry"]): Promise<void> {
    if (!state) return;
    const summary = [
      `武器：${draft.weapon_name || state.item.name}`,
      `模式：${draft.mode.toUpperCase()}`,
      `推荐：${draft.title}`,
      draft.perk_options.length ? `Perk：${draft.perk_options.flatMap((option) => option.names).join(" / ")}` : "",
      draft.masterwork_names.length ? `大师杰作：${draft.masterwork_names.join(" / ")}` : "",
      draft.mod_names.length ? `模组：${draft.mod_names.join(" / ")}` : "",
      draft.reason ? `理由：${draft.reason}` : "",
      draft.external_url ? `外部依据：${draft.external_url}` : "",
      "",
      "确认保存到我的推荐吗？保存后将优先于应用推荐。"
    ].filter(Boolean).join("\n");
    if (!window.confirm(summary)) return;
    try {
      const table = await api.savePersonalWeaponKnowledge({ confirmed: true, entry: draft });
      setState((current) => current ? {
        ...current,
        personalKnowledge: table.entries.filter((entry) => sameWeaponName(entry.weapon_name, current.item.name)),
        aiError: ""
      } : current);
    } catch (error) {
      setState((current) => current ? { ...current, aiError: error instanceof Error ? error.message : "我的推荐保存失败" } : current);
    }
  }

  async function setKnowledgeEnabled(id: string, enabled: boolean): Promise<void> {
    try {
      const table = await api.setPersonalWeaponKnowledgeEnabled(id, enabled);
      setState((current) => current ? {
        ...current,
        personalKnowledge: table.entries.filter((entry) => sameWeaponName(entry.weapon_name, current.item.name))
      } : current);
    } catch (error) {
      setState((current) => current ? { ...current, aiError: error instanceof Error ? error.message : "我的推荐更新失败" } : current);
    }
  }

  async function deleteKnowledge(id: string): Promise<void> {
    if (!window.confirm("确认删除这条我的推荐吗？")) return;
    try {
      const table = await api.deletePersonalWeaponKnowledge(id);
      setState((current) => current ? {
        ...current,
        personalKnowledge: table.entries.filter((entry) => sameWeaponName(entry.weapon_name, current.item.name))
      } : current);
    } catch (error) {
      setState((current) => current ? { ...current, aiError: error instanceof Error ? error.message : "我的推荐删除失败" } : current);
    }
  }

  async function generateAi(userKnowledge = "", allowExternalSearch = false): Promise<void> {
    if (!state) return;
    const current = state;
    setState((value) => value ? { ...value, isGeneratingAi: true, aiError: "" } : value);
    try {
      const result = await api.generateItemAiAdvice({
        item: {
          hash: current.item.hash,
          name: current.item.name,
          icon: current.item.icon,
          item_type: current.item.item_type,
          tier: current.item.tier,
          bucket_name: current.item.bucket_name,
          group_key: current.item.group_key ?? "weapons",
          weapon_frame: current.item.weapon_frame,
          socket_plugs: (current.offerItem.socketPlugs ?? []).map((plug) => ({
            hash: plug.hash,
            name: plug.name,
            icon: plug.iconUrl
          })),
          description: current.item.description
        },
        tags: input.vaultTags ?? { items: {} },
        user_knowledge: userKnowledge.trim() || undefined,
        personal_knowledge: current.personalKnowledge,
        builtin_knowledge: current.recommendations ?? null,
        allow_external_search: allowExternalSearch,
        weapon_context: {
          object_kind: "vendor_offer",
          official_sources: current.liveEntry?.sources.map((source) => source.label) ?? [current.context.vendorName],
          definition_stats: Object.fromEntries((current.item.definition_stats ?? []).map((stat) => [stat.name, stat.value])),
          current_stats: current.context.stats,
          perk_pool: (current.item.perks ?? []).map((group) => ({
            socket_index: group.socket_index,
            names: group.plugs.map((plug) => plug.name)
          })),
          offer: {
            vendor_name: current.context.vendorName,
            cost: current.context.costLabel,
            affordability: current.context.affordabilityLabel,
            refresh: current.context.refreshLabel
          }
        }
      });
      setState((value) => value ? { ...value, aiResult: result, isGeneratingAi: false } : value);
    } catch (error) {
      setState((value) => value ? {
        ...value,
        aiError: error instanceof Error ? error.message : "AI 武器分析失败",
        isGeneratingAi: false
      } : value);
    }
  }

  return { state, open, close, saveKnowledge, setKnowledgeEnabled, deleteKnowledge, generateAi };
}

function sameWeaponName(left: string, right: string): boolean {
  return left.trim().toLocaleLowerCase() === right.trim().toLocaleLowerCase();
}
