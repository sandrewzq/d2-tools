import { describe, expect, it } from "vitest";
import { fetchCharacterActivityHistory } from "../src/bungie/activityHistory.js";

describe("Bungie activity history adapter", () => {
  it("fetches character activity history from the Bungie stats endpoint", async () => {
    const requested: string[] = [];
    const fetchImpl = async (url: URL | RequestInfo) => {
      requested.push(String(url));
      return new Response(JSON.stringify({
        ErrorCode: 1,
        Response: { activities: [] }
      }), { status: 200 });
    };

    await fetchCharacterActivityHistory({
      apiKey: "api",
      membershipType: 3,
      membershipId: "membership-1",
      characterId: "character-1",
      count: 12,
      fetchImpl: fetchImpl as typeof fetch
    });

    expect(requested[0]).toContain("/Destiny2/3/Account/membership-1/Character/character-1/Stats/Activities/");
    expect(requested[0]).toContain("count=12");
  });

  it("passes an explicit activity mode filter when loading PVE or PVP history", async () => {
    const requested: string[] = [];
    const fetchImpl = async (url: URL | RequestInfo) => {
      requested.push(String(url));
      return new Response(JSON.stringify({
        ErrorCode: 1,
        Response: { activities: [] }
      }), { status: 200 });
    };

    await fetchCharacterActivityHistory({
      apiKey: "api",
      membershipType: 3,
      membershipId: "membership-1",
      characterId: "character-1",
      count: 12,
      mode: 5,
      fetchImpl: fetchImpl as typeof fetch
    });

    expect(requested[0]).toContain("count=12");
    expect(requested[0]).toContain("mode=5");
  });
});
