import type {
  AccountItemSummary,
  AccountMaterialSummary,
  AccountSummary
} from "@d2-tools/core/account/summary";
import type { ActivityHistorySummary } from "@d2-tools/core/activities/history";
import {
  defaultLibraryEquipmentFilter,
  defaultLibraryPerkFilter,
  type LibraryEquipmentFilter,
  type LibraryPerkFilter
} from "@d2-tools/app/library";
import type { ShellStatusItem } from "../shell/types.js";

export type FixtureShellStatusState = Pick<ShellStatusItem, "value" | "tone"> &
  Partial<Pick<ShellStatusItem, "actionLabel" | "kind" | "onAction" | "priority">>;

export type FixtureShellStatusInput = {
  bungie: FixtureShellStatusState;
  account: FixtureShellStatusState;
  library: FixtureShellStatusState;
  ai: FixtureShellStatusState;
  appVersion: Partial<FixtureShellStatusState> & {
    version: string;
    suffix?: string;
  };
};

export function createFixtureShellStatus(input: FixtureShellStatusInput): ShellStatusItem[] {
  const appVersion = input.appVersion.version;
  const appVersionSuffix = input.appVersion.suffix ?? "";

  return [
    { key: "bungie", label: "Bungie", ...input.bungie },
    { key: "account", label: "账号", ...input.account },
    { key: "library", label: "资料库", ...input.library },
    { key: "ai", label: "AI", ...input.ai },
    {
      key: "app-version",
      label: "应用版本",
      value: input.appVersion.value ?? `${appVersion}${appVersionSuffix}`,
      tone: input.appVersion.tone ?? "ready",
      kind: input.appVersion.kind ?? "update",
      priority: input.appVersion.priority ?? "quiet",
      actionLabel: input.appVersion.actionLabel,
      onAction: input.appVersion.onAction
    }
  ];
}

export type FixtureAccountItem = AccountItemSummary & {
  source_kind?: "vault" | "postmaster" | "inventory" | "equipped";
  source_character_id?: string;
};

export type FixtureAccountItemInput = {
  instanceId: string;
  hash: number;
  name: string;
  bucketName: string;
  groupKey: AccountItemSummary["group_key"];
  frameName: string;
  sourceKind: NonNullable<FixtureAccountItem["source_kind"]>;
  sourceCharacterId: string;
  icon?: string;
  itemType?: string;
  tier?: string;
  power?: number;
  classType?: number;
  armorStats?: AccountItemSummary["armor_stats"];
  socketPlugs: AccountItemSummary["socket_plugs"];
};

export function createFixtureAccountItem(input: FixtureAccountItemInput): FixtureAccountItem {
  const isWeapon = input.groupKey === "weapons";

  return {
    hash: input.hash,
    instance_id: input.instanceId,
    name: input.name,
    icon: input.icon,
    item_type: input.itemType ?? (isWeapon ? "武器" : input.bucketName),
    tier: input.tier ?? "传说",
    power: input.power,
    class_type: input.classType,
    bucket_name: input.bucketName,
    group_key: input.groupKey,
    weapon_frame: isWeapon ? { key: input.frameName, name: input.frameName } : undefined,
    armor_stats: input.armorStats,
    socket_plugs: input.socketPlugs,
    source_kind: input.sourceKind,
    source_character_id: input.sourceCharacterId
  };
}

export type FixtureAccountSummaryInput = Omit<AccountSummary, "membership_type" | "materials"> & {
  membership_type?: number;
  materials?: {
    item_count?: number;
    items?: AccountMaterialSummary[];
  };
};

export function createFixtureAccountSummary(input: FixtureAccountSummaryInput): AccountSummary {
  return {
    ...input,
    membership_type: input.membership_type ?? 3,
    materials: {
      item_count: input.materials?.item_count ?? 0,
      items: input.materials?.items ?? []
    }
  };
}

export type FixtureActivitySummaryInput = {
  latestPeriod?: string;
  pve?: Partial<ActivityHistorySummary["recent"]["pve"]>;
  pvp?: Partial<ActivityHistorySummary["recent"]["pvp"]>;
  other?: Partial<ActivityHistorySummary["recent"]["other"]>;
  review?: Partial<ActivityHistorySummary["review"]>;
  raidEntries?: ActivityHistorySummary["raids"]["entries"];
  recentItems?: ActivityHistorySummary["recent_items"];
};

export function createFixtureActivitySummary(
  input: FixtureActivitySummaryInput = {}
): ActivityHistorySummary {
  const pve = { total: input.pve?.total ?? 0, completed: input.pve?.completed ?? 0 };
  const pvp = { total: input.pvp?.total ?? 0, completed: input.pvp?.completed ?? 0 };
  const other = { total: input.other?.total ?? 0, completed: input.other?.completed ?? 0 };
  const total = pve.total + pvp.total + other.total;
  const completedCount = pve.completed + pvp.completed + other.completed;

  return {
    recent: {
      total,
      latest_period: input.latestPeriod,
      pve,
      pvp,
      other
    },
    review: {
      total_activities: input.review?.total_activities ?? total,
      completed_count: input.review?.completed_count ?? completedCount,
      completion_rate: input.review?.completion_rate ?? (total > 0 ? Math.round((completedCount / total) * 100) : 0),
      latest_period: input.review?.latest_period ?? input.latestPeriod,
      groups: input.review?.groups ?? [],
      recent_10: input.review?.recent_10 ?? [],
      completions_in_a_row: input.review?.completions_in_a_row ?? 0
    },
    raids: { entries: input.raidEntries ?? [] },
    recent_items: input.recentItems ?? []
  };
}

export function createFixtureLibraryFilters(): {
  equipment: LibraryEquipmentFilter;
  perks: LibraryPerkFilter;
} {
  return {
    equipment: { ...defaultLibraryEquipmentFilter, frame: [...defaultLibraryEquipmentFilter.frame] },
    perks: { ...defaultLibraryPerkFilter }
  };
}
