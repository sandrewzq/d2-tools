import type { InterfaceLocale, LocaleCopy } from "../types.js";

export const directoryCopy: Record<InterfaceLocale, LocaleCopy["directory"]> = {
  "zh-CN": {
    searchLabel: "搜索工具站",
    searchPlaceholder: "搜索站名、用途或说明",
    categoryLabel: "分类",
    categoryAll: "全部",
    categories: {
      vault: "仓库与配装",
      weapons: "武器与 Perk",
      account: "账号与统计",
      activities: "活动与轮换",
      knowledge: "资料与百科",
      dev: "开发参考"
    },
    accessLabels: {
      web: "在线网页",
      desktop: "桌面应用",
      mobile: "移动应用",
      github: "GitHub 项目"
    },
    recommendedBadge: "推荐",
    resultCount: (count) => `共 ${count} 个站点`,
    open: "打开",
    openGithub: "GitHub",
    android: "Android",
    ios: "iOS",
    reset: "清空筛选",
    emptyTitle: "没有匹配的站点",
    emptyBody: "换个关键词，或者把分类切回全部。",
    developerTitle: "开发者与历史",
    developerHint: "这些项目面向开发者，或者已经归档；列在这里便于核对来源，不作为日常工具。",
    boundaryNotice: "这里只收集公开地址和一句话用途，不复制任何站点的内容、图标或数据。第三方工具的能力和稳定性由各自的维护者负责。",
    entryDetails: {}
  },
  "en-US": {
    searchLabel: "Search tools",
    searchPlaceholder: "Search name, purpose or note",
    categoryLabel: "Category",
    categoryAll: "All",
    categories: {
      vault: "Vault & loadouts",
      weapons: "Weapons & perks",
      account: "Account & stats",
      activities: "Activities & rotations",
      knowledge: "Reference & wiki",
      dev: "Developer reference"
    },
    accessLabels: {
      web: "Web app",
      desktop: "Desktop app",
      mobile: "Mobile app",
      github: "GitHub project"
    },
    recommendedBadge: "Recommended",
    resultCount: (count) => `${count} site${count === 1 ? "" : "s"}`,
    open: "Open",
    openGithub: "GitHub",
    android: "Android",
    ios: "iOS",
    reset: "Clear filters",
    emptyTitle: "No matching sites",
    emptyBody: "Try another keyword, or switch the category back to all.",
    developerTitle: "Developer & historical",
    developerHint: "These projects are aimed at developers or already archived. They are listed so the sources stay checkable, not as everyday tools.",
    boundaryNotice: "This page only collects public addresses and a one-line purpose. It does not copy any site's content, icons or data. Each third-party tool's capability and uptime is its maintainer's responsibility.",
    entryDetails: {
      "destinyitemmanager.com": {
        purpose: "Account, vault, and gear management, including loadouts, wishlists, cleanup suggestions, and item transfers.",
        note: "d2-tools calls the Bungie API directly and never reads the account through DIM; this is a product and interaction reference only."
      },
      "d2armorpicker.com": {
        purpose: "Computes armor combinations from stat targets, mods, and exotic constraints.",
        note: "Armor results in d2-tools come from its own account snapshot and rules, not from this service."
      },
      "d2-armor-solver": {
        purpose: "Armor 3.0 six-stat loadout search and reachability calculation.",
        note: "Shows six-stat targets, +5 / +10 mods, feasible combinations, and theoretical limits."
      },
      "destiny2ools.cloud": {
        purpose: "Connects a Bungie account to analyze inventory, weapons, and armor, filtered by PvE / PvP, stats, and perks.",
        note: "Requires account authorization; check its privacy statement and service trustworthiness before use."
      },
      "littlelight": {
        purpose: "Mobile inventory management, quick transfers, loadouts, collections, triumphs, and quest tracking.",
        note: "A mobile app, not a replacement for a desktop tool."
      },
      "d2-armor-calc": {
        purpose: "Armor stat calculation.",
        note: "The online entry point is reachable, but no actively maintained source repository or data update process was confirmed."
      },
      "dim-wish-list-sources": {
        purpose: "Community-maintained and generated weapon wishlist source files used to flag recommended rolls.",
        note: "The repository holds several files; d2-tools does not pin any of them and the link is up to the player. This is a data source repository, not a web tool."
      },
      "d2arsenal.com": {
        purpose: "Weapon database, perk combinations, roll sharing, and some damage falloff calculation.",
        note: "d2-tools uses it only for manual cross-checks during development: it returns 404 for some current sample hashes, with no availability guarantee."
      },
      "roll.report": {
        purpose: "Finds unique perk combinations and roll differences on the same weapon.",
        note: "d2-tools took the identification idea from it and reimplemented it locally; its online API is not called."
      },
      "d2gunlocker.com": {
        purpose: "Browse weapons and armor without signing in, check perks, stats, and catalysts, and compare rolls.",
        note: "Anything touching account actions still has to go back to a Bungie-authorized tool."
      },
      "adasarmory.com": {
        purpose: "Weapon search, perk pools, stats, damage, range, and Crucible TTK data.",
        note: "Part of the TTK and range data is still being filled in."
      },
      "light.gg": {
        purpose: "Weapon database, perk pools, community god roll recommendations, item ratings, and account inventory lookup.",
        note: "The app does not read, scrape, or cache its pages. Community popularity is not expert consensus; treat it as an external entry point players visit themselves."
      },
      "destiny.report": {
        purpose: "Weapon database, reverse perk search, source filters, and seasonal counter-stat hints.",
        note: "Its approach of searching weapons from a perk and grouping results by source is worth referencing."
      },
      "d2gunsmith.com": {
        purpose: "Weapon perk setup, crafting, and stat previews.",
        note: "The online address is reachable, but no matching official source repository was confirmed."
      },
      "destinytracker.com": {
        purpose: "Player profiles, PvP / PvE stats, match history, and leaderboards.",
        note: "Organizes stats by player, mode, season, and leaderboard."
      },
      "destiny2.check-info.org": {
        purpose: "Public player profile lookup, gear and perk search, career stats, team-finding info, and guide entry points.",
        note: "Public lookup does not require the player's own authorization. The old site is archived; this is the new address."
      },
      "bray.tech": {
        purpose: "Collections, maps, milestones, seasonal progress, and activity history lookup.",
        note: "Browses collection progress, destination maps, and the account overview in layers."
      },
      "destinyrecipes.com": {
        purpose: "Seasonal challenges, weekly content, Power leveling, loot keeping, and vault cleanup help.",
        note: "Aggregates scattered daily and weekly tasks into one checklist you can work through."
      },
      "todayindestiny.com": {
        purpose: "Daily and weekly rotations, lost sectors, raids, dungeons, Nightfalls, Trials, and vendor inventory.",
        note: "Presents activity rotations and vendor inventory the way players check them, with clear start and end times."
      },
      "raid.report": {
        purpose: "Raid and dungeon completion records, Solo / Flawless flags, fireteam records, and leaderboards.",
        note: "Shows clear speed, fireteam members, and challenge achievements together."
      },
      "d2checkpoint.com": {
        purpose: "Find and share raid / dungeon checkpoints, and copy the in-game commands needed to join a fireteam.",
        note: "Locates available progress quickly by activity, boss, and checkpoint state."
      },
      "destiny-daily-bot": {
        purpose: "A QQ group bot offering daily and weekly summaries, rotations, vendor inventory, drop sources, and player lookup.",
        note: "Pushes daily information into the chat tool players already use, so no lookup is needed."
      },
      "d2-morgeth-kick": {
        purpose: "A community helper project related to Morgeth.",
        note: "The address is served by the repository's own GitHub Pages configuration."
      },
      "starside.work": {
        purpose: "A Chinese-language reference site covering weapon perks, weapon frames, armor mods, armor sets, exotics, subclasses, ability cooldowns, boss health, DPS, damage mechanics, and raid guides.",
        note: "Its rotation page is a static periodic table and cannot be used to judge the current rotation; the current rotation only follows character activity data after signing in to Bungie. The site states it is unofficial."
      },
      "destinysets.com": {
        purpose: "Tracks armor sets, weapons, catalysts, and collection progress by season, activity, and class.",
        note: "A reference for how to present gear collection catalogs, activity sources, and set completion."
      },
      "destinypedia.com": {
        purpose: "Encyclopedia material on Destiny lore, items, activities, and terminology.",
        note: "Player-facing term explanations, background material, and cross-links."
      },
      "destiny2.tools": {
        purpose: "A third-party tool index collecting community sites by use case such as inventory, stats, progress, reference, and analysis.",
        note: "The freshness of each listed entry has to be checked individually."
      },
      "bungie-companion-apps": {
        purpose: "Bungie's official list of registered third-party companion apps.",
        note: "Registration does not mean Bungie fully vouches for every app's features and privacy."
      },
      "destinytools.net": {
        purpose: "An old-style link directory.",
        note: "Mostly an old-style link directory; some entries may already be expired."
      },
      "bungie-net-api": {
        purpose: "Official REST API documentation covering OAuth, accounts, characters, items, activity history, vendors, and write endpoints.",
        note: "The source of truth for d2-tools' official data and authorization boundary. Real account data, write operations, and API fields follow this document."
      },
      "dim-api": {
        purpose: "Syncs tags, notes, saved loadouts, and other user data that does not belong to the Bungie API.",
        note: "For future cross-device sync it is a more direct backend protocol reference than a UI reference; it cannot read inventory or perform gear actions in place of the Bungie API."
      },
      "bungie-api-ts": {
        purpose: "TypeScript type definitions, API helper functions, and manifest download helpers for the Bungie.net API.",
        note: "Used to cross-check API request parameters, response types, and manifest helpers. It is not a player-facing web tool itself."
      },
      "d2-additional-info": {
        purpose: "Generates supplemental JSON / TypeScript data from the Destiny 2 manifest, such as season, activity, source, catalyst, and mod mappings.",
        note: "A good reference for data generation flows covering what the official manifest does not give directly but the product has to maintain. d2-tools uses it only to supplement official relations, not to replace the manifest."
      },
      "csv-wishlists-parser": {
        purpose: "Parses community wishlist CSVs into a structure DIM can use.",
        note: "If wishlist import or conversion is ever extended, it is a better reference than copying DIM's page implementation."
      },
      "d2-manifest-bot": {
        purpose: "Checks for new Destiny 2 manifest versions through GitHub Actions.",
        note: "Maintainer-facing automation, not part of players' daily tools."
      },
      "d2-skill": {
        purpose: "A Chinese-language Destiny 2 tool project covering OAuth, manifest, item search, perks, AI analysis, and wishlists.",
        note: "A reference for its Bungie sign-in, manifest lifecycle, cross-domain service split, and tool interface design."
      },
      "d2-solo-enabler": {
        purpose: "Limits matchmaking through a local helper so players can test or explore activities solo.",
        note: "A local helper tool, not an account lookup service. Before use, confirm it is compatible with the game rules and the current client version."
      },
      "dim-extension": {
        purpose: "A browser shortcut entry point for DIM.",
        note: "Provides no standalone gear management capability."
      },
      "d2ai-module": {
        purpose: "A data module related to DIM's build process.",
        note: "Not a standalone player tool."
      },
      "dim-custom-symbols": {
        purpose: "DIM's custom font assets.",
        note: "Unrelated to player-facing tool features."
      },
      "dim-bungie-platform": {
        purpose: "Archived code for the old REST endpoint.",
        note: "Only useful for historical compatibility checks; do not treat it as a basis for current implementation."
      },
      "dim-mobile": {
        purpose: "DIM's mobile projects.",
        note: "Both projects are archived and are not used as a basis for current implementation."
      }
    }
  }
};
