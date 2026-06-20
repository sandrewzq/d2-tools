# Vault Daily AI Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build ten GUI-first features for vault organization, daily summary, AI output structure, and action log usability.

**Architecture:** Keep all Destiny logic in `packages/core`, expose it through existing Electron IPC, and render it in the existing React GUI. Do not add CLI as a product path. HTTP/MCP remain future interfaces and should not drive this batch.

**Tech Stack:** TypeScript, React, Electron IPC, Vitest, existing Bungie/Manifest/account models.

---

### Task 1: Vault Duplicate Analysis Core

**Files:**
- Create: `packages/core/src/analysis/duplicates.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/vault.duplicates.test.ts`

- [x] Add tests for grouping same-name items, comparing roll text, and producing keep/review/junk recommendations.
- [x] Implement `analyzeDuplicateItems(items, tags)` using item hash/name, existing group keys, lock state, score, tag, and socket plug names.
- [x] Export the new analysis module from core.
- [x] Run `npx pnpm@9.15.0 --filter @d2-tools/core test -- vault.duplicates.test.ts`.

### Task 2: Vault Search Syntax

**Files:**
- Modify: `packages/desktop/src/renderer/components/VaultPanel.tsx`
- Test: `packages/desktop/src/vault-panel.test.ts`

- [x] Add tests for `tag:keep`, `locked:true`, `locked:false`, `score>=75`, `score<=34`, `type:weapon`, and mixed free text.
- [x] Implement a tiny parser inside `VaultPanel.tsx` or a local helper file if the component becomes too large.
- [x] Keep existing plain text search behavior working.
- [x] Run `npx pnpm@9.15.0 --filter @d2-tools/desktop test -- vault-panel.test.ts`.

### Task 3: Duplicate Groups In Vault UI

**Files:**
- Modify: `packages/desktop/src/renderer/components/VaultPanel.tsx`
- Modify: `packages/desktop/src/renderer/styles.css`
- Test: `packages/desktop/src/vault-panel.test.ts`

- [x] Add a duplicate summary section showing count, top duplicate groups, and suggested cleanup counts.
- [x] Add a view toggle for normal list vs duplicate groups.
- [x] In duplicate view, show same-name items together with score, tag, lock, and key roll text.
- [x] Keep item detail click behavior unchanged.

### Task 4: Same Roll Compare In Item Modal

**Files:**
- Modify: `packages/desktop/src/renderer/pages/HomePage.tsx`
- Modify: `packages/desktop/src/renderer/styles.css`
- Test: `packages/desktop/src/item-score-modal.test.ts`

- [x] When selected item has duplicates in the current vault/account item list, show a compact "同名对比" block.
- [x] Display score, tag, lock state, and top perk names for each same-name item.
- [x] Highlight current selected item.
- [x] Do not add any destructive action.

### Task 5: Batch Tag Actions

**Files:**
- Modify: `packages/desktop/src/renderer/components/VaultPanel.tsx`
- Modify: `packages/desktop/src/renderer/pages/HomePage.tsx`
- Modify: `packages/core/src/vault/tags.ts`
- Test: `packages/core/test/vault.tags.test.ts`
- Test: `packages/desktop/src/vault-panel.test.ts`

- [x] Add core helper to save tags for multiple item keys.
- [x] Add IPC/preload/client wiring only if existing per-item callback is not enough.
- [x] Add buttons to tag current filtered results as review/junk/none, capped with confirmation.
- [x] Never overwrite notes.

### Task 6: Wishlist MVP

**Files:**
- Create: `packages/core/src/analysis/wishlist.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `packages/desktop/src/renderer/components/VaultPanel.tsx`
- Modify: `packages/desktop/src/renderer/pages/HomePage.tsx`
- Test: `packages/core/test/wishlist.test.ts`

- [x] Define local wishlist rules using simple perk-name includes, not external community data.
- [x] Mark weapon rolls as "疑似好 roll" when matching useful PvE/PvP perk keywords.
- [x] Surface matches in vault cards and item modal.
- [x] Make copy clear that this is a local heuristic, not a final god-roll verdict.

### Task 7: Daily/Weekly Panel Skeleton

**Files:**
- Create: `packages/core/src/daily/summary.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `packages/desktop/src/main/ipc.ts`
- Modify: `packages/desktop/src/preload/preload.cts`
- Modify: `packages/desktop/src/renderer/api/client.ts`
- Modify: `packages/desktop/src/renderer/pages/HomePage.tsx`
- Test: `packages/core/test/daily.summary.test.ts`

- [x] Build deterministic daily summary from current date and known Destiny reset timing.
- [x] Include data-source status for rotations/vendors/lost-sector as "待接入" when not implemented.
- [x] Render a homepage panel with daily reset, weekly reset, and next recommended actions.
- [x] Avoid fake vendor/lost-sector data.

### Task 8: Copyable Daily Text

**Files:**
- Create: `packages/desktop/src/renderer/utils/dailyShare.ts`
- Modify: `packages/desktop/src/renderer/pages/HomePage.tsx`
- Test: `packages/desktop/src/daily-share-text.test.ts`

- [x] Format daily summary into concise QQ/WeChat text.
- [x] Include date, reset info, available data, missing data, and recommendation.
- [x] Add copy-to-clipboard style behavior consistent with existing share text.

### Task 9: AI Output Sections

**Files:**
- Modify: `packages/core/src/ai/chat.ts`
- Modify: `packages/desktop/src/renderer/components/AiAnalysisPanel.tsx`
- Modify: `packages/desktop/src/renderer/pages/HomePage.tsx`
- Test: `packages/core/test/ai.chat.test.ts`
- Test: `packages/desktop/src/ai-analysis-wiring.test.ts`

- [x] Add deterministic section extraction for AI text: facts, analysis, suggestions, action reminders.
- [x] Update prompts to ask for those section headings.
- [x] Render sections in GUI; fallback to raw text if headings are missing.
- [x] Keep AI output as advice only.

### Task 10: Action Log Filters And Copy Diagnostics

**Files:**
- Modify: `packages/core/src/actions/log.ts`
- Modify: `packages/desktop/src/renderer/pages/HomePage.tsx`
- Modify: `packages/desktop/src/renderer/styles.css`
- Test: `packages/core/test/action.log.test.ts`
- Test: `packages/desktop/src/item-write-actions-wiring.test.ts`

- [x] Add filter helpers for ok/failed/action type.
- [x] Add settings page filter controls.
- [x] Add a copyable diagnostic text for failed write actions, with token/secret-safe wording.
- [x] Preserve existing action log file format compatibility.

### Final Verification

- [x] Run `npx pnpm@9.15.0 typecheck`.
- [x] Run `npx pnpm@9.15.0 test`.
- [x] Do not commit or push unless the user explicitly asks.

