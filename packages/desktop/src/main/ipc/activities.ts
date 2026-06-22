import { ipcMain } from "electron";
import {
  fetchCharacterActivityHistory,
  summarizeActivityHistory
} from "@d2-tools/core/activities/history";
import { loadConfig } from "@d2-tools/core/config/store";
import { loadDefinitionComponent } from "@d2-tools/core/manifest/definitions";
import { loadFreshOAuthToken } from "./authSession.js";

export function registerActivitiesIpcHandlers(): void {
  ipcMain.handle("activities:summary", async (_event, input: {
    membership_type: number;
    membership_id: string;
    character_ids: string[];
  }) => {
    const config = loadConfig();
    const token = await loadFreshOAuthToken(config);
    const activityDefinitions = loadDefinitionComponent(
      config.data.data_dir,
      "DestinyActivityDefinition"
    ) ?? {};
    const histories = await Promise.all(input.character_ids.map((characterId) =>
      fetchCharacterActivityHistory({
        config,
        accessToken: token.access_token,
        membershipType: input.membership_type,
        membershipId: input.membership_id,
        characterId,
        count: 20
      })
    ));

    return summarizeActivityHistory(
      histories.flatMap((history) => history.activities ?? []),
      activityDefinitions
    );
  });
}
