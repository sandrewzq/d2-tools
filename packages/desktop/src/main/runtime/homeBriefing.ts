import { buildDailyLiveDataFromBungie } from "@d2-tools/core/daily/liveData";
import { buildDailySummary } from "@d2-tools/core/daily/summary";
import type { D2Config } from "@d2-tools/core/config/schema";
import type { DefinitionComponentData, DefinitionRecord } from "@d2-tools/core/manifest/definitions";
import { buildWeeklyLiveDataFromBungie } from "@d2-tools/core/weekly/liveData";
import { buildWeeklySummary } from "@d2-tools/core/weekly/summary";
import {
  type BungieHomeSnapshot,
  type BungiePublicSale,
  type BungieVendorsResponse
} from "@d2-tools/services/bungie/session";
import { loadConfig } from "@d2-tools/services/config/store";
import type { HomeBriefing } from "../../contracts/daily.js";
import { loadFreshOAuthToken, type FreshOAuthToken } from "../ipc/authSession.js";
import { getDefinitions } from "./gameDataRuntime.js";
import { getSharedBungieSession } from "./bungieSession.js";
import { measureRuntime } from "./runtimeMetrics.js";

const briefingTtlMs = 30_000;

let tokenRequest: {
  contextKey: string;
  promise: Promise<FreshOAuthToken | null>;
} | null = null;
let briefingRequest: { contextKey: string; promise: Promise<HomeBriefing> } | null = null;
let cachedBriefing: {
  contextKey: string;
  value: HomeBriefing;
  freshUntil: number;
} | null = null;

export async function getHomeBriefing(): Promise<HomeBriefing> {
  const config = loadConfig();
  const token = await loadTokenOnce(config);
  const contextKey = [
    config.data.data_dir,
    config.bungie.api_key,
    token?.access_token ?? "public"
  ].join("\u0000");
  const now = Date.now();
  if (cachedBriefing?.contextKey === contextKey && now < cachedBriefing.freshUntil) {
    return cachedBriefing.value;
  }
  if (briefingRequest?.contextKey === contextKey) {
    return briefingRequest.promise;
  }

  const promise = measureRuntime(
    "home.briefing",
    () => buildHomeBriefing(config, token),
    { measurePayload: true }
  ).then((value) => {
    cachedBriefing = {
      contextKey,
      value,
      freshUntil: Date.now() + briefingTtlMs
    };
    return value;
  });
  briefingRequest = { contextKey, promise };
  void promise.then(
    () => clearBriefingRequest(promise),
    () => clearBriefingRequest(promise)
  );
  return promise;
}

async function buildHomeBriefing(
  config: D2Config,
  token: FreshOAuthToken | null
): Promise<HomeBriefing> {
  const bungieSession = getSharedBungieSession(config.bungie.api_key);
  const snapshot = await bungieSession.getHomeSnapshot({
    accessToken: token?.access_token
  });
  const definitions = await loadHomeDefinitions(snapshot);
  const activeActivityHashes = collectProfileActivityHashes(snapshot);
  const dailyLiveData = buildDailyLiveDataFromBungie({
    milestones: snapshot.milestones,
    publicVendors: snapshot.publicVendors,
    characterVendors: snapshot.characterVendors,
    activeLostSectorActivityHashes: activeActivityHashes,
    definitions
  });
  const weeklyLiveData = buildWeeklyLiveDataFromBungie({
    milestones: snapshot.milestones,
    profile: snapshot.profile,
    definitions
  });
  const now = new Date();

  return {
    fetched_at: snapshot.fetchedAt,
    daily: buildDailySummary(now, dailyLiveData),
    weekly: buildWeeklySummary(now, weeklyLiveData)
  };
}

async function loadHomeDefinitions(snapshot: BungieHomeSnapshot): Promise<{
  activities: DefinitionComponentData;
  milestones: DefinitionComponentData;
  vendors: DefinitionComponentData;
  items: DefinitionComponentData;
  modifiers: DefinitionComponentData;
  destinations: DefinitionComponentData;
  places: DefinitionComponentData;
  objectives: DefinitionComponentData;
}> {
  const milestoneHashes = Object.keys(snapshot.milestones ?? {}).map(Number);
  const milestoneActivityHashes = Object.values(snapshot.milestones ?? {}).flatMap((milestone) =>
    (milestone.activities ?? []).flatMap((activity) => numberValue(activity.activityHash))
  );
  const milestoneItemHashes = Object.values(snapshot.milestones ?? {}).flatMap((milestone) =>
    (milestone.availableQuests ?? []).flatMap((quest) => numberValue(quest.questItemHash))
  );
  const profileActivityHashes = collectProfileActivityHashes(snapshot);
  const objectiveHashes = Object.values(snapshot.profile?.characterActivities?.data ?? {}).flatMap((component) =>
    (component.availableActivities ?? []).flatMap((activity) =>
      (activity.challenges ?? []).flatMap((challenge) => numberValue(challenge.objective?.objectiveHash))
    )
  );
  const profileRewardHashes = Object.values(snapshot.profile?.characterActivities?.data ?? {}).flatMap((component) =>
    (component.availableActivities ?? []).flatMap((activity) =>
      (activity.visibleRewards ?? []).flatMap((reward) =>
        (reward.rewardItems ?? []).flatMap((item) => numberValue(item.itemQuantity?.itemHash))
      )
    )
  );
  const vendorResponses = [snapshot.publicVendors, ...snapshot.characterVendors]
    .filter((response): response is BungieVendorsResponse => Boolean(response));
  const vendorHashes = vendorResponses.flatMap(collectVendorHashes);
  const saleItemHashes = vendorResponses.flatMap(collectVendorSales).flatMap((sale) => [
    ...numberValue(sale.itemHash),
    ...(sale.costs ?? []).flatMap((cost) => numberValue(cost.itemHash))
  ]);

  const [activities, milestones, vendors, items, objectives] = await Promise.all([
    getDefinitions("DestinyActivityDefinition", [...milestoneActivityHashes, ...profileActivityHashes]),
    getDefinitions("DestinyMilestoneDefinition", milestoneHashes),
    getDefinitions("DestinyVendorDefinition", vendorHashes, { projection: "display-summary" }),
    getDefinitions("DestinyInventoryItemDefinition", [
      ...milestoneItemHashes,
      ...profileRewardHashes,
      ...saleItemHashes
    ], { projection: "display-summary" }),
    getDefinitions("DestinyObjectiveDefinition", objectiveHashes)
  ]);

  const activityRecords = Object.values(activities) as DefinitionRecord[];
  const modifierHashes = activityRecords.flatMap((activity) =>
    ((activity.modifiers as Array<{ activityModifierHash?: number }> | undefined) ?? [])
      .flatMap((modifier) => numberValue(modifier.activityModifierHash))
  );
  const destinationHashes = [
    ...activityRecords.flatMap((activity) => numberValue(activity.destinationHash)),
    ...collectVendorDestinationHashes(vendorResponses, vendors)
  ];
  const placeHashes = activityRecords.flatMap((activity) => numberValue(activity.placeHash));
  const activityRewardHashes = activityRecords.flatMap((activity) =>
    ((activity.rewards as Array<{ rewardItems?: Array<{ itemHash?: number }> }> | undefined) ?? [])
      .flatMap((reward) => (reward.rewardItems ?? []).flatMap((item) => numberValue(item.itemHash)))
  );
  const [modifiers, destinations, places, activityRewardItems] = await Promise.all([
    getDefinitions("DestinyActivityModifierDefinition", modifierHashes),
    getDefinitions("DestinyDestinationDefinition", destinationHashes),
    getDefinitions("DestinyPlaceDefinition", placeHashes),
    getDefinitions(
      "DestinyInventoryItemDefinition",
      activityRewardHashes,
      { projection: "display-summary" }
    )
  ]);

  return {
    activities,
    milestones,
    vendors,
    items: { ...items, ...activityRewardItems },
    modifiers,
    destinations,
    places,
    objectives
  };
}

function collectProfileActivityHashes(snapshot: BungieHomeSnapshot): number[] {
  return Object.values(snapshot.profile?.characterActivities?.data ?? {}).flatMap((component) =>
    (component.availableActivities ?? []).flatMap((activity) => numberValue(activity.activityHash))
  );
}

function collectVendorHashes(response: BungieVendorsResponse): number[] {
  return Object.entries(response.vendors?.data ?? {}).flatMap(([key, vendor]) =>
    numberValue(vendor.vendorHash ?? Number(key))
  );
}

function collectVendorSales(response: BungieVendorsResponse): BungiePublicSale[] {
  return Object.values(response.sales?.data ?? {}).flatMap((sales) => {
    if (!sales) return [];
    return Object.entries(sales).flatMap(([key, value]) => {
      if (key === "saleItems") {
        return Object.values(sales.saleItems ?? {}).filter(isPublicSale);
      }
      if (isPublicSale(value)) return [value];
      return value ? Object.values(value).filter(isPublicSale) : [];
    });
  });
}

function collectVendorDestinationHashes(
  responses: BungieVendorsResponse[],
  vendorDefinitions: DefinitionComponentData
): number[] {
  return responses.flatMap((response) =>
    Object.entries(response.vendors?.data ?? {}).flatMap(([key, vendor]) => {
      const vendorHash = vendor.vendorHash ?? Number(key);
      const definition = vendorDefinitions[String(vendorHash)] as (DefinitionRecord & {
        locations?: Array<{ destinationHash?: number }>;
      }) | undefined;
      if (vendor.vendorLocationIndex === undefined) return [];
      return numberValue(definition?.locations?.[vendor.vendorLocationIndex]?.destinationHash);
    })
  );
}

function isPublicSale(value: unknown): value is BungiePublicSale {
  return typeof value === "object"
    && value !== null
    && typeof (value as BungiePublicSale).itemHash === "number";
}

function numberValue(value: unknown): number[] {
  return typeof value === "number" && Number.isFinite(value) ? [value] : [];
}

function loadTokenOnce(config: Parameters<typeof loadFreshOAuthToken>[0]): Promise<FreshOAuthToken | null> {
  const contextKey = `${config.data.data_dir}\u0000${config.bungie.client_id}`;
  if (tokenRequest?.contextKey === contextKey) {
    return tokenRequest.promise;
  }
  const promise = loadFreshOAuthToken(config).catch(() => null);
  tokenRequest = { contextKey, promise };
  void promise.then(
    () => clearTokenRequest(promise),
    () => clearTokenRequest(promise)
  );
  return promise;
}

function clearBriefingRequest(promise: Promise<HomeBriefing>): void {
  if (briefingRequest?.promise === promise) {
    briefingRequest = null;
  }
}

function clearTokenRequest(promise: Promise<FreshOAuthToken | null>): void {
  if (tokenRequest?.promise === promise) {
    tokenRequest = null;
  }
}
