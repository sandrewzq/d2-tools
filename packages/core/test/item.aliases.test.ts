import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expandAliasQuery, loadItemAliases, saveItemAlias } from "../../services/src/items/aliases.js";

describe("item aliases", () => {
  it("saves local aliases and expands search terms", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-tools-aliases-"));

    saveItemAlias(dir, { alias: "ff", target: "喂食狂热", kind: "perk" });
    saveItemAlias(dir, { alias: "小米", target: "米达多功能", kind: "item" });

    const aliases = loadItemAliases(dir);

    expect(aliases.entries).toHaveLength(2);
    expect(expandAliasQuery("ff", aliases)).toEqual(["ff", "喂食狂热"]);
    expect(expandAliasQuery("风险", aliases)).toEqual(["风险"]);
  });
});
