import type { CharacterActivityHistoryResponse } from "@d2-tools/core/activities/history";
import { fetchBungieJson } from "./client.js";

export type FetchCharacterActivityHistoryOptions = {
  apiKey: string;
  accessToken?: string;
  membershipType: number;
  membershipId: string;
  characterId: string;
  count?: number;
  mode?: number;
};

export function fetchCharacterActivityHistory(
  options: FetchCharacterActivityHistoryOptions
): Promise<CharacterActivityHistoryResponse> {
  const query = new URLSearchParams({ count: String(options.count ?? 20) });
  if (options.mode !== undefined) query.set("mode", String(options.mode));
  return fetchBungieJson<CharacterActivityHistoryResponse>(
    `/Destiny2/${options.membershipType}/Account/${options.membershipId}/Character/${options.characterId}/Stats/Activities/?${query.toString()}`,
    {
      apiKey: options.apiKey,
      accessToken: options.accessToken
    }
  );
}
