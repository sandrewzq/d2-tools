import type { BungieJsonFetcher } from "../bungie/transport.js";
import type { DefinitionComponentData, DefinitionRecord } from "../manifest/definitions.js";
import type { BungieOAuthToken } from "../oauth/login.js";
import type { WeeklyActivityReward, WeeklyLiveData, WeeklyPriorityKind, WeeklySummaryItem } from "./summary.js";

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

type DestinyProfileActivitiesResponse = {
  characterActivities?: {
    data?: Record<string, {
      availableActivities?: DestinyAvailableActivity[];
    }>;
  };
};

type UserMembershipData = {
  destinyMemberships?: DestinyMembership[];
  primaryMembershipId?: string;
};

type DestinyMembership = {
  membershipId: string;
  membershipType: number;
};

type DestinyAvailableActivity = {
  activityHash?: number;
  challenges?: Array<{
    objective?: {
      objectiveHash?: number;
    };
  }>;
  visibleRewards?: Array<{
    rewardItems?: Array<{
      itemQuantity?: {
        itemHash?: number;
      };
    }>;
  }>;
};

export type BuildWeeklyLiveDataInput = {
  milestones?: Record<string, PublicMilestone>;
  profile?: DestinyProfileActivitiesResponse;
  definitions?: {
    activities?: DefinitionComponentData | null;
    milestones?: DefinitionComponentData | null;
    items?: DefinitionComponentData | null;
    objectives?: DefinitionComponentData | null;
  };
};

export type FetchWeeklyLiveDataOptions = {
  token?: BungieOAuthToken | null;
  definitions?: BuildWeeklyLiveDataInput["definitions"];
  fetchJson: BungieJsonFetcher;
};

export async function fetchWeeklyLiveData(options: FetchWeeklyLiveDataOptions): Promise<WeeklyLiveData> {
  const { fetchJson } = options;
  const milestones = await fetchJson<Record<string, PublicMilestone>>("/Destiny2/Milestones/")
    .catch(() => undefined);
  const profile = options.token?.access_token
    ? await fetchProfileActivities({
      accessToken: options.token.access_token,
      fetchJson
    }).catch(() => undefined)
    : undefined;

  return buildWeeklyLiveDataFromBungie({
    milestones,
    profile,
    definitions: options.definitions
  });
}

async function fetchProfileActivities(input: {
  accessToken: string;
  fetchJson: <T>(path: string, accessToken?: string) => Promise<T>;
}): Promise<DestinyProfileActivitiesResponse> {
  const memberships = await input.fetchJson<UserMembershipData>(
    "/User/GetMembershipsForCurrentUser/",
    input.accessToken
  );
  const membership = selectDestinyMembership(memberships);
  return input.fetchJson<DestinyProfileActivitiesResponse>(
    `/Destiny2/${membership.membershipType}/Profile/${membership.membershipId}/?components=200,204`,
    input.accessToken
  );
}

function selectDestinyMembership(data: UserMembershipData): DestinyMembership {
  const memberships = data.destinyMemberships ?? [];
  const selected = memberships.find((membership) => membership.membershipId === data.primaryMembershipId)
    ?? memberships[0];
  if (!selected) {
    throw new Error("当前 Bungie 账号没有 Destiny 档案");
  }

  return selected;
}

export function buildWeeklyLiveDataFromBungie(input: BuildWeeklyLiveDataInput): WeeklyLiveData {
  const items: WeeklySummaryItem[] = [];
  const publicClues: WeeklySummaryItem[] = [];
  const definitions = input.definitions ?? {};

  items.push(...mapProfileActivities(input.profile, definitions));

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

    if (weeklyActivityKind && weeklyActivityKind !== "public_clue" && !isPublicMilestoneOnlyClue(weeklyActivityKind)) {
      items.push(item);
    } else {
      publicClues.push({ ...item, weeklyActivityKind: "public_clue" });
    }
  }

  return {
    items: uniqueByKindAndTitle(items).slice(0, 12),
    public_clues: uniqueByTitle(publicClues).slice(0, 4)
  };
}

function mapProfileActivities(
  profile: DestinyProfileActivitiesResponse | undefined,
  definitions: NonNullable<BuildWeeklyLiveDataInput["definitions"]>
): WeeklySummaryItem[] {
  const items: WeeklySummaryItem[] = [];
  const seenActivities = new Set<number>();

  for (const component of Object.values(profile?.characterActivities?.data ?? {})) {
    for (const activity of component.availableActivities ?? []) {
      const activityHash = activity.activityHash;
      if (activityHash === undefined || seenActivities.has(activityHash)) {
        continue;
      }
      seenActivities.add(activityHash);

      const activityDefinition = definitionRecord(definitions.activities, activityHash);
      const challengeObjectives = (activity.challenges ?? [])
        .map((challenge) => challenge.objective?.objectiveHash)
        .filter((hash): hash is number => hash !== undefined);
      const objectiveTexts = challengeObjectives.map((hash) => objectiveText(definitions.objectives, hash));
      const activityName = activityDisplayName(activityDefinition);
      if (!activityName) {
        continue;
      }

      if (objectiveTexts.some(isGrandmasterVanguardAlertObjective)) {
        items.push({
          title: activityName,
          subtitle: "先锋行动 · 宗师先锋警戒",
          description: rewardDescription(activity, definitions.items),
          source: "Bungie CharacterActivities",
          weeklyActivityKind: "nightfall",
          related_hashes: [activityHash, ...challengeObjectives],
          rewards: activityRewards(activity, definitions.items)
        });
        continue;
      }

      if (isRaidActivity(activityDefinition) && objectiveTexts.some(isWeeklyRaidChallengeObjective)) {
        items.push({
          title: activityName,
          subtitle: "周常突袭挑战",
          description: rewardDescription(activity, definitions.items),
          source: "Bungie CharacterActivities",
          weeklyActivityKind: "rotating_raid",
          related_hashes: [activityHash, ...challengeObjectives],
          rewards: activityRewards(activity, definitions.items)
        });
        continue;
      }

      if (isDungeonActivity(activityDefinition) && objectiveTexts.some(isWeeklyDungeonChallengeObjective)) {
        items.push({
          title: activityName,
          subtitle: "周常地牢挑战",
          description: rewardDescription(activity, definitions.items),
          source: "Bungie CharacterActivities",
          weeklyActivityKind: "rotating_dungeon",
          related_hashes: [activityHash, ...challengeObjectives],
          rewards: activityRewards(activity, definitions.items)
        });
      }
    }
  }

  return items;
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

function isPublicMilestoneOnlyClue(kind: WeeklyPriorityKind): boolean {
  return kind === "rotating_raid" || kind === "rotating_dungeon";
}

function definitionRecord(definitions: DefinitionComponentData | null | undefined, hash: number | undefined): DefinitionRecord | undefined {
  if (hash === undefined) return undefined;
  return definitions?.[String(hash)];
}

function definitionName(definitions: DefinitionComponentData | null | undefined, hash: number | undefined): string | undefined {
  return definitionRecord(definitions, hash)?.displayProperties?.name?.trim();
}

function activityDisplayName(activity: DefinitionRecord | undefined): string | undefined {
  return activity?.originalDisplayProperties?.name?.trim()
    || activity?.displayProperties?.name?.replace(/\s*[:：]\s*(?:普通|标准|大师|专家|高级|宗师|自定义|匹配)$/i, "").trim()
    || undefined;
}

function objectiveText(definitions: DefinitionComponentData | null | undefined, hash: number): string {
  const definition = definitionRecord(definitions, hash);
  return [
    definition?.displayProperties?.name,
    definition?.displayProperties?.description,
    definition?.progressDescription
  ].filter(Boolean).join(" ");
}

function isGrandmasterVanguardAlertObjective(value: string): boolean {
  return /Grandmaster Vanguard Alerts|宗师先锋警戒/i.test(value);
}

function isWeeklyRaidChallengeObjective(value: string): boolean {
  return /Weekly Raid Challenge|周常突袭挑战/i.test(value);
}

function isWeeklyDungeonChallengeObjective(value: string): boolean {
  return /Weekly Dungeon Challenge|周常地牢挑战/i.test(value);
}

function isRaidActivity(activity: DefinitionRecord | undefined): boolean {
  return activity?.activityTypeHash === 2043403989
    || activity?.directActivityModeType === 4
    || activityModeTypes(activity).includes(4);
}

function isDungeonActivity(activity: DefinitionRecord | undefined): boolean {
  return activity?.activityTypeHash === 608898761
    || activityModeTypes(activity).includes(82);
}

function activityModeTypes(activity: DefinitionRecord | undefined): number[] {
  const values = activity?.activityModeTypes;
  return Array.isArray(values) ? values.filter((value): value is number => typeof value === "number") : [];
}

function activityRewards(
  activity: DestinyAvailableActivity,
  definitions: DefinitionComponentData | null | undefined
): WeeklyActivityReward[] {
  const rewardHashes = new Set(
    (activity.visibleRewards ?? [])
      .flatMap((reward) => reward.rewardItems ?? [])
      .map((rewardItem) => rewardItem.itemQuantity?.itemHash)
      .filter((hash): hash is number => hash !== undefined)
  );

  return [...rewardHashes]
    .map((hash) => {
      const definition = definitionRecord(definitions, hash);
      const name = definition?.displayProperties?.name?.trim();
      if (!name) return undefined;
      const reward: WeeklyActivityReward = { hash, name };
      if (definition?.displayProperties?.icon) {
        reward.icon = definition.displayProperties.icon;
      }
      if (typeof definition?.itemTypeDisplayName === "string") {
        reward.item_type = definition.itemTypeDisplayName;
      }
      return reward;
    })
    .filter((reward): reward is WeeklyActivityReward => Boolean(reward));
}

function rewardDescription(
  activity: DestinyAvailableActivity,
  definitions: DefinitionComponentData | null | undefined
): string | undefined {
  const rewards = activityRewards(activity, definitions);
  if (!rewards.length) return undefined;
  return `奖励：${rewards.map((reward) => reward.name).join(" / ")}`;
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

function uniqueByKindAndTitle(items: WeeklySummaryItem[]): WeeklySummaryItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.weeklyActivityKind ?? "unknown"}:${item.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
