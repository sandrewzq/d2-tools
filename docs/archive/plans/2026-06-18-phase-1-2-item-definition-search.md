# Phase 1.2 Item Definition Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Download and cache `DestinyInventoryItemDefinition`, then expose the first local item search flow in the Windows GUI.

**Architecture:** Keep definition download, local cache, and search logic in `packages/core`. Electron exposes small IPC methods for definition initialization and item search. React adds a compact search panel to the home page without building the full database UI yet.

**Tech Stack:** Node.js 22, TypeScript, Electron IPC, React, Vitest, Bungie Manifest JSON paths.

---

## Scope

This phase supports `DestinyInventoryItemDefinition` only. It searches cached local definitions by Chinese/English display name and returns a compact card-ready summary. It does not parse perks, sockets, icons, vendor data, or account inventory.

## Tasks

### Task 1: Definition Download And Cache

- [ ] Add failing tests for selecting a component path from cached Manifest metadata.
- [ ] Add failing tests for downloading a component definition JSON through an injected fetcher.
- [ ] Implement definition cache helpers under `packages/core/src/manifest/definitions.ts`.
- [ ] Run focused tests and commit.

### Task 2: Item Search

- [ ] Add failing tests for searching `DestinyInventoryItemDefinition` by display name.
- [ ] Implement item summary mapping and local search under `packages/core/src/items/search.ts`.
- [ ] Export item search APIs from core.
- [ ] Run focused tests and commit.

### Task 3: GUI Search Flow

- [ ] Add IPC handlers for definition initialization and item search.
- [ ] Expose preload and renderer API methods.
- [ ] Add a compact search panel on the home page.
- [ ] Run desktop typecheck/build and commit.

### Task 4: Verification

- [ ] Run `npx pnpm@9.15.0 test`.
- [ ] Run `npx pnpm@9.15.0 typecheck`.
- [ ] Run `npx pnpm@9.15.0 --filter @d2-tools/desktop build`.
- [ ] Run `npx pnpm@9.15.0 package:win`.
