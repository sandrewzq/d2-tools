# Next Ten GUI Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the next ten GUI-first d2-service capabilities inspired by DIM, 小日向 Bot, Light.gg, and d2-skill without changing the product into a CLI.

**Architecture:** Put deterministic data handling in `packages/core` first, expose it through Electron IPC, then add lightweight GUI surfaces where the existing layout already has room. Write operations remain plan-first and user-confirmed.

**Tech Stack:** Node.js 22, TypeScript, Electron, React, Vitest, Bungie Manifest JSON cache, local JSON stores under the configured data directory.

---

### Task 1: Perk Search

**Files:**
- Create: `packages/core/src/items/perkSearch.ts`
- Test: `packages/core/test/perk.search.test.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `packages/core/package.json`

- [ ] Add tests for searching `DestinySandboxPerkDefinition` by Chinese name and description.
- [ ] Implement `searchPerkDefinitions`.
- [ ] Export the module from core.

### Task 2: Manifest Source Summary

**Files:**
- Create: `packages/core/src/items/source.ts`
- Test: `packages/core/test/item.source.test.ts`
- Modify: `packages/core/src/items/detail.ts`
- Modify: `packages/core/src/items/search.ts`

- [ ] Add tests for `sourceData.sourceString`, `collectibleHash`, and missing-source fallback.
- [ ] Add `source` to item search/detail results.

### Task 3: Local Alias Store

**Files:**
- Create: `packages/core/src/items/aliases.ts`
- Test: `packages/core/test/item.aliases.test.ts`
- Modify: `packages/core/src/items/search.ts`
- Modify: `packages/core/src/items/perkSearch.ts`

- [ ] Add tests for saving aliases and query expansion.
- [ ] Search aliases before matching definitions.

### Task 4: Recent And Favorite Items

**Files:**
- Create: `packages/core/src/library/history.ts`
- Test: `packages/core/test/library.history.test.ts`

- [ ] Add tests for recent item ordering, de-duplication, and favorites.
- [ ] Store records in `library-history.json`.

### Task 5: Local Loadout Templates

**Files:**
- Create: `packages/core/src/loadouts/templates.ts`
- Test: `packages/core/test/loadout.templates.test.ts`

- [ ] Add tests for creating a template from equipped items.
- [ ] Add tests for list/delete behavior.

### Task 6: Write Action Plans

**Files:**
- Create: `packages/core/src/actions/plan.ts`
- Test: `packages/core/test/action.plan.test.ts`

- [ ] Add tests for single-item lock/equip/transfer plans.
- [ ] Add tests for batch transfer plans.
- [ ] Plans must describe the action and not execute Bungie calls.

### Task 7: Recent Activity Summary

**Files:**
- Create: `packages/core/src/activities/recent.ts`
- Test: `packages/core/test/activity.recent.test.ts`

- [ ] Add tests for grouping recent PvE/PvP activities.
- [ ] Keep this as a pure summarizer first.

### Task 8: Raid And Dungeon Summary

**Files:**
- Create: `packages/core/src/activities/raidSummary.ts`
- Test: `packages/core/test/activity.raid.test.ts`

- [ ] Add tests for completion counts and last-completed time.
- [ ] Keep the source as Bungie activity history; deeper Raid Report parity is later.

### Task 9: Token-Safe Diagnostics Export

**Files:**
- Create: `packages/core/src/diagnostics/export.ts`
- Test: `packages/core/test/diagnostics.export.test.ts`

- [ ] Add tests proving API key, client secret, AI key, and token-like fields are redacted.
- [ ] Include app/config/manifest/action-log state.

### Task 10: Desktop IPC And Lightweight UI

**Files:**
- Modify: `packages/desktop/src/main/ipc.ts`
- Modify: `packages/desktop/src/preload/preload.cts`
- Modify: `packages/desktop/src/renderer/api/client.ts`
- Modify: `packages/desktop/src/renderer/pages/HomePage.tsx`
- Test: existing desktop wiring tests plus focused new tests when practical.

- [ ] Add IPC endpoints for perk search, aliases, history/favorites, loadout templates, action plans, and diagnostics export.
- [ ] Add lightweight GUI controls in existing pages instead of creating a new navigation system.
- [ ] Keep all writes local except existing Bungie write operations.
