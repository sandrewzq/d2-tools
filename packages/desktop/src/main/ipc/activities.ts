import { ipcMain } from "electron";
import {
  type BungieActivityHistoryEntry,
  fetchCharacterActivityHistory,
  summarizeActivityHistory
} from "@d2-tools/core/activities/history";
import { ACTIVITY_HISTORY_SUMMARY_MODES } from "@d2-tools/core/activities/modes";
import { loadConfig } from "@d2-tools/services/config/store";
import { startBackgroundTask } from "../backgroundTasks.js";
import { getDefinitions } from "../runtime/gameDataRuntime.js";
import { loadFreshOAuthToken } from "./authSession.js";

type ActivitySummaryInput = {
  membership_type: number;
  membership_id: string;
  character_ids: string[];
};

export function registerActivitiesIpcHandlers(): void {
  ipcMain.handle("activities:summary", async (_event, input: ActivitySummaryInput) => {
    const result = loadActivitySummary(input);
    startBackgroundTask({
      type: "account-activity",
      title: "读取最近活动",
      message: "正在同步角色最近活动。",
      run: async () => {
        await result;
      }
    });

    return result;
  });
}

async function loadActivitySummary(input: ActivitySummaryInput) {
  const config = loadConfig();
  const token = await loadFreshOAuthToken(config);
  const histories = await Promise.all(input.character_ids.flatMap((characterId) =>
    ACTIVITY_HISTORY_SUMMARY_MODES.map((mode) =>
      fetchCharacterActivityHistory({
        config,
        accessToken: token.access_token,
        membershipType: input.membership_type,
        membershipId: input.membership_id,
        characterId,
        count: 20,
        mode,
      })
    )
  ));
  const activities = dedupeActivityHistory(
    histories.flatMap((history) => history.activities ?? [])
  );
  const activityDefinitions = await getDefinitions(
    "DestinyActivityDefinition",
    activities.flatMap((activity) => {
      const details = activity.activityDetails;
      return [details?.referenceId, details?.directorActivityHash]
        .filter((hash): hash is number => typeof hash === "number");
    })
  );

  return summarizeActivityHistory(
    activities,
    activityDefinitions
  );
}

function dedupeActivityHistory(activities: BungieActivityHistoryEntry[]): BungieActivityHistoryEntry[] {
  const deduped = new Map<string, BungieActivityHistoryEntry>();
  for (const activity of activities) {
    const details = activity.activityDetails;
    const referenceId = details?.referenceId ?? details?.directorActivityHash ?? "unknown";
    const instanceId = details?.instanceId ?? "no-instance";
    deduped.set(`${activity.period}:${referenceId}:${instanceId}`, activity);
  }

  return [...deduped.values()];
}
