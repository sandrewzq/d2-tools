# Documentation Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the public and internal documentation for `d2-tools` into a smaller, clearer, archive-aware structure with fewer formal documents and less duplicated content.

**Architecture:** Keep one top-level project entry point in `README.md`, collapse user-facing and project-facing docs into a reduced set under `docs/`, and move historical design and phase-planning materials into `docs/archive/`. Rewrite content rather than patching line-by-line so the final set reads consistently and uses the same terminology, links, and product boundaries everywhere.

**Tech Stack:** Markdown, PowerShell file moves, repository-local docs under `README.md`, `CHANGELOG.md`, and `docs/`

---

### Task 1: Create the Target Documentation Layout

**Files:**
- Create: `docs/archive/README.md`
- Create: `docs/archive/design/`
- Create: `docs/archive/plans/`
- Move: `docs/design/d2-tools-design.md`
- Move: `docs/superpowers/plans/*`

- [ ] Create the archive directories and move historical design and plan material into them.
- [ ] Keep `docs/superpowers/specs/` in place so the active design record still has a stable home.
- [ ] Confirm the archive layout exists and the moved files are no longer in the old top-level design/plan locations.

### Task 2: Replace the Formal Documentation Set

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Create: `docs/user-guide.md`
- Create: `docs/bungie-setup.md`
- Create: `docs/faq.md`
- Create: `docs/security.md`
- Create: `docs/project-status.md`
- Create: `docs/roadmap.md`
- Create: `docs/development.md`
- Delete after merge: `docs/USER_GUIDE.md`
- Delete after merge: `docs/BUNGIE_SETUP.md`
- Delete after merge: `docs/TROUBLESHOOTING.md`
- Delete after merge: `docs/FEATURES.md`
- Delete after merge: `docs/REQUIREMENTS.md`
- Delete after merge: `docs/ROADMAP.md`
- Delete after merge: `docs/SECURITY.md`
- Delete after merge: `docs/ARCHITECTURE.md`
- Delete after merge: `docs/DEVELOPMENT.md`

- [ ] Rewrite `README.md` as the single entry page with download, quick start, documentation navigation, and reference directions.
- [ ] Rewrite the user-facing docs so installation, Bungie setup, usage, troubleshooting, and security each have one clear home.
- [ ] Rewrite the project-facing docs so current status, roadmap, and development guidance do not duplicate each other.
- [ ] Update all formal docs to use `d2-tools` naming and add `D2Checkpoint` to the reference section.

### Task 3: Remove Duplicated Paths and Update Links

**Files:**
- Modify: all formal docs created in Task 2

- [ ] Replace references to removed filenames with the new doc paths.
- [ ] Make sure no formal doc still points readers to deleted `docs/USER_GUIDE.md`, `docs/FEATURES.md`, or similar old paths.
- [ ] Make sure archive content is not presented as the current main entry path.

### Task 4: Verify Structure and Consistency

**Files:**
- Check: repository docs layout

- [ ] Run a repository-wide search for outdated public doc paths and stale `d2-service` naming in formal docs.
- [ ] Run a repository-wide search for `D2Checkpoint` to confirm it was added to the intended reference material.
- [ ] Run a basic repo health check with `git status --short` and a focused docs path listing to confirm the new layout matches the approved design.
