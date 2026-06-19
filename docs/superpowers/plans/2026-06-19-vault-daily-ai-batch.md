# Vault Daily AI Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build ten GUI-first features for vault organization, daily summary, AI output structure, and action log usability.

**Architecture:** Keep all Destiny logic in `packages/core`, expose it through existing Electron IPC, and render it in the existing React GUI. Do not add CLI as a product path. HTTP/MCP remain future interfaces and should not drive this batch.

**Tech Stack:** TypeScript, React, Electron IPC, Vitest, existing Bungie/Manifest/account models.

---

### Task 1: Vault Duplicate Analysis Core

**Files:**
- Create: `packages/core/src/analysis/duplicates.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/vault.duplicates.test.ts`

- [ ] Add tests for grouping same-name items, comparing roll text, and producing keep/review/junk recommendations.
- [ ] Implement `analyzeDuplicateItems(items, tags)` using item hash/name, existing group keys, lock state, score, tag, and socket plug names.
- [ ] Export the new analysis module from core.
- [ ] Run `npx pnpm@9.15.0 --filter @d2-service/core test -- vault.duplicates.test.ts`.

### Task 2: Vault Search Syntax

**Files:**
- Modify: `packages/desktop/src/renderer/components/VaultPanel.tsx`
- Test: `packages/desktop/src/vault-panel.test.ts`

- [ ] Add tests for `tag:keep`, `locked:true`, `locked:false`, `score>=75`, `score<=34`, `type:weapon`, and mixed free text.
- [ ] Implement a tiny parser inside `VaultPanel.tsx` or a local helper file if the component becomes too large.
- [ ] Keep existing plain text search behavior working.
- [ ] Run `npx pnpm@9.15.0 --filter @d2-service/desktop test -- vault-panel.test.ts`.

### Task 3: Duplicate Groups In Vault UI

**Files:**
- Modify: `packages/desktop/src/renderer/components/VaultPanel.tsx`
- Modify: `packages/desktop/src/renderer/styles.css`
- Test: `packages/desktop/src/vault-panel.test.ts`

- [ ] Add a duplicate summary section showing count, top duplicate groups, and suggested cleanup counts.
- [ ] Add a view toggle for normal list vs duplicate groups.
- [ ] In duplicate view, show same-name items together with score, tag, lock, and key roll text.
- [ ] Keep item detail click behavior unchanged.

### Task 4: Same Roll Compare In Item Modal

**Files:**
- Modify: `packages/desktop/src/renderer/pages/HomePage.tsx`
- Modify: `packages/desktop/src/renderer/styles.css`
- Test: `packages/desktop/src/item-score-modal.test.ts`

- [ ] When selected item has duplicates in the current vault/account item list, show a compact "同名对比" block.
- [ ] Display score, tag, lock state, and top perk names for each same-name item.
- [ ] Highlight current selected item.
- [ ] Do not add any destructive action.

### Task 5: Batch Tag Actions

**Files:**
- Modify: `packages/desktop/src/renderer/components/VaultPanel.tsx`
- Modify: `packages/desktop/src/renderer/pages/HomePage.tsx`
- Modify: `packages/core/src/vault/tags.ts`
- Test: `packages/core/test/vault.tags.test.ts`
- Test: `packages/desktop/src/vault-panel.test.ts`

- [ ] Add core helper to save tags for multiple item keys.
- [ ] Add IPC/preload/client wiring only if existing per-item callback is not enough.
- [ ] Add buttons to tag current filtered results as review/junk/none, capped with confirmation.
- [ ] Never overwrite notes.

### Task 6: Wishlist MVP

**Files:**
- Create: `packages/core/src/analysis/wishlist.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `packages/desktop/src/renderer/components/VaultPanel.tsx`
- Modify: `packages/desktop/src/renderer/pages/HomePage.tsx`
- Test: `packages/core/test/wishlist.test.ts`

- [ ] Define local wishlist rules using simple perk-name includes, not external community data.
- [ ] Mark weapon rolls as "疑似好 roll" when matching useful PvE/PvP perk keywords.
- [ ] Surface matches in vault cards and item modal.
- [ ] Make copy clear that this is a local heuristic, not a final god-roll verdict.

### Task 7: Daily/Weekly Panel Skeleton

**Files:**
- Create: `packages/core/src/daily/summary.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `packages/desktop/src/main/ipc.ts`
- Modify: `packages/desktop/src/preload/preload.cts`
- Modify: `packages/desktop/src/renderer/api/client.ts`
- Modify: `packages/desktop/src/renderer/pages/HomePage.tsx`
- Test: `packages/core/test/daily.summary.test.ts`

- [ ] Build deterministic daily summary from current date and known Destiny reset timing.
- [ ] Include data-source status for rotations/vendors/lost-sector as "待接入" when not implemented.
- [ ] Render a homepage panel with daily reset, weekly reset, and next recommended actions.
- [ ] Avoid fake vendor/lost-sector data.

### Task 8: Shareable Daily Text

**Files:**
- Create: `packages/desktop/src/renderer/utils/dailyShare.ts`
- Modify: `packages/desktop/src/renderer/pages/HomePage.tsx`
- Test: `packages/desktop/src/daily-share-text.test.ts`

- [ ] Format daily summary into concise QQ/WeChat text.
- [ ] Include date, reset info, available data, missing data, and recommendation.
- [ ] Add copy-to-clipboard style behavior consistent with existing share text.

### Task 9: AI Output Sections

**Files:**
- Modify: `packages/core/src/ai/chat.ts`
- Modify: `packages/desktop/src/renderer/components/AiAnalysisPanel.tsx`
- Modify: `packages/desktop/src/renderer/pages/HomePage.tsx`
- Test: `packages/core/test/ai.chat.test.ts`
- Test: `packages/desktop/src/ai-analysis-wiring.test.ts`

- [ ] Add deterministic section extraction for AI text: facts, analysis, suggestions, action reminders.
- [ ] Update prompts to ask for those section headings.
- [ ] Render sections in GUI; fallback to raw text if headings are missing.
- [ ] Keep AI output as advice only.

### Task 10: Action Log Filters And Copy Diagnostics

**Files:**
- Modify: `packages/core/src/actions/log.ts`
- Modify: `packages/desktop/src/renderer/pages/HomePage.tsx`
- Modify: `packages/desktop/src/renderer/styles.css`
- Test: `packages/core/test/action.log.test.ts`
- Test: `packages/desktop/src/item-write-actions-wiring.test.ts`

- [ ] Add filter helpers for ok/failed/action type.
- [ ] Add settings page filter controls.
- [ ] Add a copyable diagnostic text for failed write actions, with token/secret-safe wording.
- [ ] Preserve existing action log file format compatibility.

### Final Verification

- [ ] Run `npx pnpm@9.15.0 typecheck`.
- [ ] Run `npx pnpm@9.15.0 test`.
- [ ] Do not commit or push unless the user explicitly asks.
