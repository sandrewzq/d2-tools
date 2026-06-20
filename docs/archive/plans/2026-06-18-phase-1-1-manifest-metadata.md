# Phase 1.1 Manifest Metadata Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the Windows GUI initialize Bungie Manifest metadata and persist the result under the local user data directory.

**Architecture:** Add a small Bungie API client in `packages/core` and keep network, cache, and manifest status logic out of the renderer. Electron exposes typed IPC methods for initializing and reading manifest status, while the React home page provides the first usable "initialize data library" button.

**Tech Stack:** Node.js 22, TypeScript, Electron IPC, React, Vitest, Bungie.Net API.

---

## Scope

This phase downloads and caches Manifest metadata only. It does not download the large SQLite/JSON definition databases, build item indexes, or implement item search yet.

## File Structure

- Create `packages/core/src/bungie/client.ts`: generic Bungie API JSON client with API key header and API response validation.
- Create `packages/core/src/manifest/metadata.ts`: Manifest metadata types and language path selection.
- Create `packages/core/src/manifest/cache.ts`: local cache file paths, load/save/status, and initialization.
- Modify `packages/core/src/index.ts`: export Bungie and Manifest APIs.
- Modify `packages/desktop/src/main/ipc.ts`: add `manifest:status` and `manifest:initialize`.
- Modify `packages/desktop/src/preload/preload.ts`: expose manifest IPC to renderer.
- Modify `packages/desktop/src/renderer/api/client.ts`: add manifest types.
- Modify `packages/desktop/src/renderer/App.tsx` and `HomePage.tsx`: refresh state after initialization.

## Tasks

### Task 1: Bungie API Client

- [ ] Write `packages/core/test/bungie.client.test.ts` covering API key header, success response unwrapping, Bungie error handling, and HTTP error handling.
- [ ] Run the test and confirm it fails because `fetchBungieJson` does not exist.
- [ ] Implement `packages/core/src/bungie/client.ts`.
- [ ] Run the Bungie client test and confirm it passes.
- [ ] Commit `feat: add Bungie API client`.

### Task 2: Manifest Metadata Cache

- [ ] Write `packages/core/test/manifest.metadata.test.ts` covering language path selection, metadata persistence, status loading, and initialization through an injected fetcher.
- [ ] Run the test and confirm it fails because manifest helpers do not exist.
- [ ] Implement `packages/core/src/manifest/metadata.ts` and `packages/core/src/manifest/cache.ts`.
- [ ] Export the new helpers from `packages/core/src/index.ts`.
- [ ] Run the manifest metadata test and confirm it passes.
- [ ] Commit `feat: cache manifest metadata`.

### Task 3: GUI Initialization Flow

- [ ] Add `manifest:status` and `manifest:initialize` IPC handlers.
- [ ] Expose `getManifestStatus` and `initializeManifest` from preload.
- [ ] Add renderer API types for the manifest status.
- [ ] Wire the Home page "初始化" action to call `initializeManifest`, show loading/errors, and refresh startup state.
- [ ] Run desktop typecheck and build.
- [ ] Commit `feat: initialize manifest metadata from GUI`.

### Task 4: Final Verification

- [ ] Run `npx pnpm@9.15.0 test`.
- [ ] Run `npx pnpm@9.15.0 typecheck`.
- [ ] Run `npx pnpm@9.15.0 --filter @d2-tools/desktop build`.
- [ ] Check `git status --short`.
