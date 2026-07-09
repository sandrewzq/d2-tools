import { fetchBungieJson } from "../bungie/client.js";
import type { D2Config } from "../config/schema.js";
import type { DefinitionComponentData, DefinitionRecord } from "../manifest/definitions.js";
import type { WeeklyLiveData, WeeklyPriorityKind, WeeklySummaryItem } from "./summary.js";

type PublicMilestone = {
  displayProperties?: {
    name?: string;
    description?: string;
  };
  activities?: Array<{
    activityHash?: number;
  }>;
  availableQuests?: Array<{
    questItemHash?: number;
  }>;
};

export type BuildWeeklyLiveDataInput = {
  milestones?: Record<string, PublicMilestone>;
  definitions?: {
    activities?: DefinitionComponentData | null;
    milestones?: DefinitionComponentData | null;
    items?: DefinitionComponentData | null;
  };
};

export type FetchWeeklyLiveDataOptions = {
  config: D2Config;
  definitions?: BuildWeeklyLiveDataInput["definitions"];
  fetchJson?: <T>(path: string) => Promise<T>;
};

export async function fetchWeeklyLiveData(options: FetchWeeklyLiveDataOptions): Promise<WeeklyLiveData> {
  const fetchJson = options.fetchJson ?? ((path) => fetchBungieJson(path, {
    apiKey: options.config.bungie.api_key
  }));
  const milestones = await fetchJson<Record<string, PublicMilestone>>("/Destiny2/Milestones/")
    .catch(() => undefined);

  return buildWeeklyLiveDataFromBungie({
    milestones,
    definitions: options.definitions
  });
}

export function buildWeeklyLiveDataFromBungie(input: BuildWeeklyLiveDataInput): WeeklyLiveData {
  const items: WeeklySummaryItem[] = [];
  const publicClues: WeeklySummaryItem[] = [];
  const definitions = input.definitions ?? {};

  for (const [hash, milestone] of Object.entries(input.milestones ?? {})) {
    const milestoneDefinition = definitionRecord(definitions.milestones, Number(hash));
    const milestoneName = readableName(milestone) ?? milestoneDefinition?.displayProperties?.name?.trim();
    const milestoneDescription = milestone.displayProperties?.description
      ?? milestoneDefinition?.displayProperties?.description;
    const activityNames = (milestone.activities ?? [])
      .map((activity) => definitionName(definitions.activities, activity.activityHash))
      .filter(Boolean) as string[];
    const questNames = (milestone.availableQuests ?? [])
      .map((quest) => definitionName(definitions.items, quest.questItemHash))
      .filter(Boolean) as string[];
    const names = [...activityNames, ...questNames].slice(0, 6);

    if (!milestoneName && !names.length) {
      continue;
    }

    const candidateText = [milestoneName, names.join(" "), milestoneDescription].filter(Boolean).join(" ");
    const weeklyActivityKind = inferWeeklyActivityKind(candidateText);
    const item: WeeklySummaryItem = {
      title: milestoneName ? `Bungie 公共里程碑：${milestoneName}` : `Bungie 公共活动：${names[0]}`,
      subtitle: names.length ? `非完整掉落地图；${names.slice(0, 3).join(" / ")}` : "Bungie 公共里程碑",
      description: milestoneDescription,
      source: "Bungie",
      weeklyActivityKind
    };

    if (weeklyActivityKind && weeklyActivityKind !== "public_clue") {
      items.push(item);
    } else {
      publicClues.push({ ...item, weeklyActivityKind: "public_clue" });
    }
  }

  return {
    items: uniqueByTitle(items).slice(0, 12),
    public_clues: uniqueByTitle(publicClues).slice(0, 4)
  };
}

function inferWeeklyActivityKind(value: string): WeeklyPriorityKind | "public_clue" | undefined {
  if (/试炼|Trials|铁旗|Iron Banner/i.test(value)) return undefined;
  if (/日落|Nightfall/i.test(value)) return "nightfall";
  if (/加成|双倍|声望|奖励加成|Bonus|reputation/i.test(value)) return "weekly_bonus";
  if (/特殊活动|限时活动|曙光|英灵日|守护者游戏|至日|Event|Festival|Solstice|Guardian Games/i.test(value)) return "special_event";
  if (/守望者尖塔|预言|二象性|贪婪之握|异端深渊|破碎王座|战争领主的废墟|鬼魅深渊|Spire of the Watcher|Prophecy|Duality|Grasp of Avarice|Pit of Heresy|Shattered Throne|Warlord'?s Ruin|Ghosts of the Deep/i.test(value)) {
    return "rotating_dungeon";
  }
  if (/国王的陨落|克洛塔的末日|深岩墓室|玻璃拱顶|救赎花园|最后一愿|门徒誓约|梦魇根源|救赎边缘|King'?s Fall|Crota'?s End|Deep Stone Crypt|Vault of Glass|Garden of Salvation|Last Wish|Vow of the Disciple|Root of Nightmares|Salvation'?s Edge/i.test(value)) {
    return "rotating_raid";
  }
  return "public_clue";
}

function definitionRecord(definitions: DefinitionComponentData | null | undefined, hash: number | undefined): DefinitionRecord | undefined {
  if (hash === undefined) return undefined;
  return definitions?.[String(hash)];
}

function definitionName(definitions: DefinitionComponentData | null | undefined, hash: number | undefined): string | undefined {
  return definitionRecord(definitions, hash)?.displayProperties?.name?.trim();
}

function readableName(milestone: PublicMilestone): string | undefined {
  return milestone.displayProperties?.name?.trim();
}

function uniqueByTitle(items: WeeklySummaryItem[]): WeeklySummaryItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.title)) return false;
    seen.add(item.title);
    return true;
  });
}
