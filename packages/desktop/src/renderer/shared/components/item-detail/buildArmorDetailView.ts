import {
  armorStatLabel,
  buildArmorDetailViewModel,
  type ArmorAbility,
  type ArmorDetailObjectContext,
  type ArmorDetailSources,
  type ArmorDetailViewModel,
  type ArmorInstalledMod
} from "@d2-tools/app/items";
import type { AccountItemPlugSummary } from "@d2-tools/core/account/summary";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import type { VaultTags } from "@d2-tools/core/vault/tags";
import type { SameNameItemSummary, SelectedItemDetail } from "../../hooks/useItemDetail";

export type BuildDesktopArmorDetailInput = {
  selectedItem: SelectedItemDetail;
  sameNameItems?: SameNameItemSummary[];
  localTargetRules?: LocalTargetRules;
  vaultTags?: VaultTags;
  context?: Partial<ArmorDetailObjectContext>;
  sources?: ArmorDetailSources;
  versions?: Array<{ hash: number; name: string; tier?: string; release?: { description: string } }>;
};

export function buildArmorDetailView(input: BuildDesktopArmorDetailInput): ArmorDetailViewModel | null {
  const item = input.selectedItem;
  if (item.group_key !== "armor") return null;

  const selectedPlugs = item.sockets?.length
    ? item.sockets.flatMap((socket) => socket.selected_plug ? [{ ...socket.selected_plug, socket_index: socket.socket_index }] : [])
    : (item.socket_plugs ?? []).map((plug) => ({ ...plug, socket_index: undefined }));
  const abilities = [
    ...(item.intrinsic_traits ?? []).map((trait) => toIntrinsicAbility(item, trait)),
    ...selectedPlugs.flatMap((plug) => toSpecialSocketAbility(plug))
  ];

  return buildArmorDetailViewModel({
    item,
    context: {
      kind: input.context?.kind ?? inferObjectKind(item),
      entry: input.context?.entry ?? inferEntry(item),
      ...input.context
    },
    versions: input.versions?.length
      ? input.versions.map((version) => ({
          hash: version.hash,
          label: version.name,
          season_label: version.release?.description ?? (version.hash === item.hash ? item.release?.description : undefined) ?? version.tier,
          is_current: version.hash === item.hash
        }))
      : [{ hash: item.hash, label: item.name, season_label: item.release?.description, is_current: true }],
    sources: input.sources,
    abilities: uniqueAbilities(abilities),
    upgrades: {
      energy: inferObjectKind(item) === "definition" ? undefined : item.armor_energy,
      installed_mods: selectedPlugs.flatMap((plug) => toInstalledMod(plug)),
      special_sockets: abilities.filter((ability) => ability.kind === "artifice" || ability.kind === "special_socket"),
      masterwork: {
        level: inferObjectKind(item) === "definition" ? undefined : item.armor_energy?.capacity,
        complete: inferObjectKind(item) !== "definition" && item.armor_energy?.capacity === 10,
        stat_bonus_separable: false
      }
    },
    recommendations: buildArmorRecommendations(item, input.localTargetRules),
    same_hash_instances: (input.sameNameItems ?? []).map((instance) => {
      const itemKey = instance.instance_id ?? `hash:${instance.hash}`;
      const localEntry = input.vaultTags?.items[itemKey];
      return {
        ...instance,
        equipped: instance.instance?.is_equipped,
        local_tag: localEntry?.tag === "none" ? undefined : localEntry?.tag,
        note: localEntry?.note
      };
    })
  });
}

function inferObjectKind(item: SelectedItemDetail): ArmorDetailObjectContext["kind"] {
  if (item.instance_id) return "account_instance";
  if (item.armor_stats || item.socket_plugs?.length) return "vendor_offer";
  return "definition";
}

function inferEntry(item: SelectedItemDetail): ArmorDetailObjectContext["entry"] {
  const kind = inferObjectKind(item);
  if (kind === "vendor_offer") return "vendor";
  if (item.is_vault_item || item.source_kind === "vault") return "vault";
  if (kind === "account_instance") return "account";
  return "library";
}

function toIntrinsicAbility(
  item: SelectedItemDetail,
  trait: NonNullable<SelectedItemDetail["intrinsic_traits"]>[number]
): ArmorAbility {
  const text = `${trait.name} ${trait.description}`.toLocaleLowerCase();
  const kind = text.includes("诡计") || text.includes("artifice")
    ? "artifice"
    : text.includes("套装") || text.includes("set bonus")
      ? "set_bonus"
      : text.includes("插槽") || text.includes("socket")
        ? "special_socket"
        : /异域|exotic/i.test(item.tier ?? "")
          ? "exotic_intrinsic"
          : "intrinsic";
  return {
    id: `trait:${trait.hash}`,
    hash: trait.hash,
    name: trait.name,
    description: trait.description,
    icon: trait.icon,
    kind,
    kind_label: kind === "artifice" ? "诡计护甲" : kind === "set_bonus" ? "套装效果" : kind === "special_socket" ? "特殊插槽" : kind === "exotic_intrinsic" ? "异域固有" : "护甲固有"
  };
}

function toSpecialSocketAbility(plug: AccountItemPlugSummary): ArmorAbility[] {
  const text = plugText(plug);
  const artifice = text.includes("诡计") || text.includes("artifice");
  const special = artifice || text.includes("特殊插槽") || text.includes("special socket");
  if (!special) return [];
  return [{
    id: `socket:${plug.hash}`,
    hash: plug.hash,
    name: plug.name,
    description: plug.description ?? "",
    icon: plug.icon,
    kind: artifice ? "artifice" : "special_socket",
    kind_label: artifice ? "诡计护甲" : "特殊插槽"
  }];
}

function toInstalledMod(plug: AccountItemPlugSummary & { socket_index?: number }): ArmorInstalledMod[] {
  const category = plug.category_identifier?.toLocaleLowerCase() ?? "";
  const itemType = plug.item_type?.toLocaleLowerCase() ?? "";
  const text = plugText(plug);
  const isArmorMod = category.includes("armor.mod")
    || category.includes("mods.armor")
    || itemType.includes("护甲模组")
    || itemType.includes("armor mod");
  const excluded = category.includes("shader")
    || category.includes("ornament")
    || text.includes("着色器")
    || text.includes("装饰")
    || text.includes("装备阶级升级")
    || text.includes("empty enhancement tier");
  if (!isArmorMod || excluded) return [];
  return [{
    hash: plug.hash,
    name: plug.name,
    description: plug.description ?? "",
    icon: plug.icon,
    socket_index: plug.socket_index
  }];
}

function buildArmorRecommendations(
  item: SelectedItemDetail,
  rules: LocalTargetRules | undefined
): Partial<ArmorDetailViewModel["recommendations"]> {
  const targets = (rules?.armor ?? []).map((rule) => {
    const conditions = rule.conditions.map((condition) => ({
      stat: condition.stat,
      label: armorStatLabel(condition.stat),
      minimum: condition.min,
      current: item.armor_stats?.[condition.stat],
      matched: item.armor_stats ? item.armor_stats[condition.stat] >= condition.min : undefined
    }));
    const match = !item.armor_stats
      ? "unavailable" as const
      : conditions.every((condition) => condition.matched)
        ? "matched" as const
        : "missed" as const;
    return {
      id: rule.id,
      title: rule.name,
      source_label: "本地目标",
      reason: match === "unavailable"
        ? "选择当前商人 Offer 或账号实例后比较属性目标。"
        : match === "matched"
          ? "当前实际属性满足这组最低值。"
          : "当前实际属性仍有目标缺口。",
      conditions,
      match
    };
  });
  const suggestedMods = !item.armor_stats ? [] : [...new Set(targets.flatMap((target) => (
    target.conditions
      .filter((condition) => condition.current !== undefined && condition.current < condition.minimum)
      .map((condition) => `${condition.label}模组（差 ${condition.minimum - (condition.current ?? 0)}）`)
  )))];
  return { targets, suggested_mods: suggestedMods };
}

function uniqueAbilities(abilities: ArmorAbility[]): ArmorAbility[] {
  return [...new Map(abilities.map((ability) => [ability.id, ability])).values()];
}

function plugText(plug: Pick<AccountItemPlugSummary, "name" | "description" | "item_type" | "category_identifier">): string {
  return `${plug.name} ${plug.description ?? ""} ${plug.item_type ?? ""} ${plug.category_identifier ?? ""}`.toLocaleLowerCase();
}
