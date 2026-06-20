# Phase 1.3 Perk Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a lightweight perk/socket summary for item search results.

**Architecture:** Extend manifest definition caching to include `DestinyPlugSetDefinition` and `DestinySandboxPerkDefinition`. Parse perk choices in core from `DestinyInventoryItemDefinition.sockets.socketEntries`, direct `reusablePlugItems`, and plug sets referenced by `reusablePlugSetHash` or `randomizedPlugSetHash`. Keep GUI display compact: only show the first few perk names per result.

**Tech Stack:** Node.js 22, TypeScript, Electron IPC, React, Vitest, Bungie Manifest JSON paths.

---

## Tasks

### Task 1: Cache Additional Definition Components

- [ ] Extend definition component names.
- [ ] Update tests for `DestinyPlugSetDefinition` and `DestinySandboxPerkDefinition`.
- [ ] Run focused tests and commit.

### Task 2: Parse Perk Summaries

- [ ] Add failing tests for direct reusable plugs and plug-set-backed plugs.
- [ ] Implement `packages/core/src/items/perks.ts`.
- [ ] Extend item search results with optional perk groups.
- [ ] Run focused tests and commit.

### Task 3: GUI Display

- [ ] Initialize item, plug set, and sandbox perk definitions together.
- [ ] Include perk groups in `items:search`.
- [ ] Render compact perk names in search results.
- [ ] Run verification and package.
