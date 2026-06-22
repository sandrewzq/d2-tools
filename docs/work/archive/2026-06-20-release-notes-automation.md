# Release Notes Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate GitHub Release body generation from `CHANGELOG.md`, enforce changelog updates before release, mark `v0.0.x` as prerelease, provide local preview, and publish `latest.yml` for future auto-updater support.

**Architecture:** Three small Node ESM scripts (`extract-changelog`, `generate-release-notes`, `preview-release-notes`) live under `scripts/`. CI validates the changelog section exists, generates the full body, and attaches it to the GitHub Release. The fixed usage footer is embedded in `generate-release-notes.mjs`.

**Tech Stack:** Node.js 22, native ESM, Vitest for script unit tests, GitHub Actions, softprops/action-gh-release.

---

## File Map

| File | Responsibility |
|------|----------------|
| `scripts/extract-changelog.mjs` | Parse `CHANGELOG.md` and extract the section for a given version. Export pure functions for testing. |
| `scripts/extract-changelog.test.mjs` | Vitest tests for changelog parsing. |
| `scripts/generate-release-notes.mjs` | Combine extracted changelog section with the fixed usage footer. Used by CI and preview. |
| `scripts/preview-release-notes.mjs` | CLI wrapper that prints the final release body to stdout for local verification. |
| `package.json` | Add `release:preview` script. |
| `.github/workflows/release.yml` | Validate changelog, generate body, upload `latest.yml`, mark prerelease. |
| `docs/development.md` | Document the release process. |

---

## Task 1: Create `scripts/extract-changelog.mjs` with tests

**Files:**
- Create: `scripts/extract-changelog.mjs`
- Create: `scripts/extract-changelog.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `scripts/extract-changelog.test.mjs`:

```js
import { describe, it, expect } from 'vitest';
import { extractChangelogSection } from './extract-changelog.mjs';

describe('extractChangelogSection', () => {
  it('returns trimmed section content for matching version', () => {
    const content = `## 0.0.4 - 2026-06-20\n\n### Added\n- Feature A\n\n## 0.0.3 - 2026-06-19\n\n### Fixed\n- Bug B`;
    const result = extractChangelogSection(content, '0.0.4');
    expect(result).toBe('### Added\n- Feature A');
  });

  it('returns null when version section is not found', () => {
    const content = `## 0.0.4\n\n- Feature`;
    const result = extractChangelogSection(content, '0.0.99');
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npx vitest run scripts/extract-changelog.test.mjs
```

Expected: FAIL with "extractChangelogSection is not exported" or similar.

- [ ] **Step 3: Implement `scripts/extract-changelog.mjs`**

```js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function extractChangelogSection(content, version) {
  const lines = content.split('\n');
  const headingPrefix = `## ${version}`;
  let start = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(headingPrefix)) {
      start = i;
      break;
    }
  }

  if (start === -1) {
    return null;
  }

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) {
      end = i;
      break;
    }
  }

  return lines.slice(start + 1, end).join('\n').trim();
}

export function readChangelogFile(rootDir) {
  const filePath = path.join(rootDir, 'CHANGELOG.md');
  if (!fs.existsSync(filePath)) {
    throw new Error('CHANGELOG.md not found');
  }
  return fs.readFileSync(filePath, 'utf-8');
}

export function extractChangelogForVersion(rootDir, version) {
  const content = readChangelogFile(rootDir);
  const section = extractChangelogSection(content, version);
  if (section === null) {
    throw new Error(`CHANGELOG.md missing section for version ${version}`);
  }
  return section;
}

function main() {
  const args = process.argv.slice(2);
  const versionIndex = args.indexOf('--version');
  const outputIndex = args.indexOf('--output');

  if (versionIndex === -1 || !args[versionIndex + 1]) {
    console.error('Usage: node extract-changelog.mjs --version <version> [--output <file>]');
    process.exit(1);
  }

  const version = args[versionIndex + 1];
  const rootDir = path.resolve(__dirname, '..');

  try {
    const section = extractChangelogForVersion(rootDir, version);
    const output = args[outputIndex + 1];
    if (output) {
      fs.writeFileSync(output, section);
    } else {
      console.log(section);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

const isMain = import.meta.url.startsWith('file:') && process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:
```bash
npx vitest run scripts/extract-changelog.test.mjs
```

Expected: 2 passing.

- [ ] **Step 5: Verify CLI works against real CHANGELOG**

Run:
```bash
node scripts/extract-changelog.mjs --version 0.0.4
```

Expected: Prints the `0.0.4` section from `CHANGELOG.md`.

Run:
```bash
node scripts/extract-changelog.mjs --version 0.0.99
```

Expected: Exit code 1 with message "CHANGELOG.md missing section for version 0.0.99".

- [ ] **Step 6: Commit**

```bash
git add scripts/extract-changelog.mjs scripts/extract-changelog.test.mjs
git commit -m "feat(scripts): add changelog extraction utility with tests"
```

---

## Task 2: Create `scripts/generate-release-notes.mjs`

**Files:**
- Create: `scripts/generate-release-notes.mjs`

- [ ] **Step 1: Write the failing test (manual CLI expectation)**

There is no separate test file for this task; behavior is covered by the CLI verification in Step 4.

- [ ] **Step 2: Implement `scripts/generate-release-notes.mjs`**

```js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractChangelogForVersion } from './extract-changelog.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const FOOTER = `---

Windows x64 绿色包，7z 格式。

使用方式：
1. 下载 d2-tools-win-x64-*.7z。
2. 用 7-Zip、Bandizip、WinRAR 等工具解压到任意目录。
3. 双击 d2-tools.exe。

覆盖升级不会删除 %APPDATA%\\d2-tools 里的本地配置、token 和缓存。
从旧版 d2-service 升级时，首次启动会复制 %APPDATA%\\d2-service 到 %APPDATA%\\d2-tools。`;

export function buildReleaseNotes(changelogSection) {
  return `${changelogSection}\n\n${FOOTER}`;
}

export function generateReleaseNotes(rootDir, version) {
  const section = extractChangelogForVersion(rootDir, version);
  return buildReleaseNotes(section);
}

function main() {
  const args = process.argv.slice(2);
  const versionIndex = args.indexOf('--version');
  const outputIndex = args.indexOf('--output');

  if (versionIndex === -1 || !args[versionIndex + 1]) {
    console.error('Usage: node generate-release-notes.mjs --version <version> --output <file>');
    process.exit(1);
  }

  if (outputIndex === -1 || !args[outputIndex + 1]) {
    console.error('--output is required');
    process.exit(1);
  }

  const version = args[versionIndex + 1];

  try {
    const notes = generateReleaseNotes(rootDir, version);
    fs.writeFileSync(args[outputIndex + 1], notes);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

const isMain = import.meta.url.startsWith('file:') && process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
```

- [ ] **Step 3: Run CLI to verify output file**

Run:
```bash
node scripts/generate-release-notes.mjs --version 0.0.4 --output /tmp/release-notes-0.0.4.md
```

Expected: File created, contains CHANGELOG section followed by the usage footer.

Run:
```bash
node scripts/generate-release-notes.mjs --version 0.0.99 --output /tmp/release-notes-0.0.99.md
```

Expected: Exit code 1, no output file created.

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-release-notes.mjs
git commit -m "feat(scripts): add release notes generator"
```

---

## Task 3: Create `scripts/preview-release-notes.mjs` and add npm script

**Files:**
- Create: `scripts/preview-release-notes.mjs`
- Modify: `package.json`

- [ ] **Step 1: Implement `scripts/preview-release-notes.mjs`**

```js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateReleaseNotes } from './generate-release-notes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function main() {
  const args = process.argv.slice(2);
  const versionIndex = args.indexOf('--version');

  if (versionIndex === -1 || !args[versionIndex + 1]) {
    console.error('Usage: pnpm release:preview --version <version>');
    process.exit(1);
  }

  const version = args[versionIndex + 1];
  const rootDir = path.resolve(__dirname, '..');

  try {
    const notes = generateReleaseNotes(rootDir, version);
    console.log(notes);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

main();
```

- [ ] **Step 2: Modify `package.json`**

Add to `scripts`:

```json
"release:preview": "node scripts/preview-release-notes.mjs"
```

- [ ] **Step 3: Verify the preview command**

Run:
```bash
pnpm release:preview --version 0.0.4
```

Expected: Prints the full release body to the terminal.

Run:
```bash
pnpm release:preview --version 0.0.99
```

Expected: Exit code 1 with missing section message.

- [ ] **Step 4: Commit**

```bash
git add scripts/preview-release-notes.mjs package.json
git commit -m "feat(scripts): add release notes preview command"
```

---

## Task 4: Update `.github/workflows/release.yml`

**Files:**
- Modify: `.github/workflows/release.yml`

- [ ] **Step 1: Collect latest.yml in build-windows job**

In the `Collect release asset` step, also copy `latest.yml`:

```powershell
New-Item -ItemType Directory -Force -Path release-artifacts | Out-Null
$package = Get-ChildItem packages/desktop/release/d2-tools-win-x64-*.7z | Select-Object -First 1
$latestYml = Get-ChildItem packages/desktop/release/latest.yml | Select-Object -First 1
if (-not $package) {
  throw "Windows 7z artifact was not created"
}
if (-not $latestYml) {
  throw "latest.yml was not created"
}
Copy-Item $package.FullName release-artifacts/
Copy-Item $latestYml.FullName release-artifacts/
```

- [ ] **Step 2: Update upload artifact path**

Change the upload artifact path to:

```yaml
path: release-artifacts/*
```

- [ ] **Step 3: Add checkout and body generation to publish-github job**

Add to `publish-github` job before the release step:

```yaml
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Validate changelog section
        shell: pwsh
        run: |
          $version = "${{ github.ref_name }}".Substring(1)
          node scripts/extract-changelog.mjs --version $version

      - name: Generate release notes
        shell: pwsh
        run: |
          $version = "${{ github.ref_name }}".Substring(1)
          node scripts/generate-release-notes.mjs --version $version --output release-notes.md

Note: `github.ref_name` is `v0.0.5`; PowerShell strips the leading `v` to get `0.0.5`.

- [ ] **Step 4: Update release action**

Replace the existing `softprops/action-gh-release` step with:

```yaml
      - name: Create or update GitHub release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ github.ref_name }}
          name: d2-tools ${{ github.ref_name }}
          body_path: release-notes.md
          files: |
            release-artifacts/d2-tools-win-x64-*.7z
            release-artifacts/latest.yml
          fail_on_unmatched_files: true
          prerelease: true
```

- [ ] **Step 5: Validate workflow YAML syntax**

Run:
```bash
npx action-validator .github/workflows/release.yml
```

If `action-validator` is not installed, visually inspect indentation.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci(release): auto-generate release notes from changelog and publish latest.yml"
```

---

## Task 5: Update `docs/development.md`

**Files:**
- Modify: `docs/development.md`

- [ ] **Step 1: Read the current file to find the right insertion point**

Run:
```bash
cat docs/development.md
```

- [ ] **Step 2: Append or insert a release process section**

Add a new section, for example:

```markdown
## 发布流程

1. 更新所有 `package.json` 版本号（root、core、desktop、http 保持一致）
2. 更新 `CHANGELOG.md`，新增 `## x.y.z - YYYY-MM-DD` 章节
3. 本地预览 Release Body：
   ```bash
   pnpm release:preview --version x.y.z
   ```
4. 提交改动：
   ```bash
   git add .
   git commit -m "release: prepare vX.Y.Z"
   ```
5. 打 tag 并推送：
   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```
6. CI 自动构建、校验 CHANGELOG、生成 Release Body 并发布 GitHub Release

注意：
- 如果 `CHANGELOG.md` 没有对应版本章节，CI 会失败
- `v0.0.x` 版本会自动标记为 Pre-release
```

- [ ] **Step 3: Commit**

```bash
git add docs/development.md
git commit -m "docs(development): document release process"
```

---

## Task 6: Full verification

- [ ] **Step 1: Run all tests**

Run:
```bash
pnpm test
```

Expected: All existing tests pass, plus the new `scripts/extract-changelog.test.mjs` passes.

- [ ] **Step 2: Typecheck**

Run:
```bash
pnpm typecheck
```

Expected: Passes.

- [ ] **Step 3: Preview final body for current version**

Run:
```bash
pnpm release:preview --version 0.0.4
```

Expected: Output matches CHANGELOG `0.0.4` section + usage footer.

- [ ] **Step 4: Check git status**

Run:
```bash
git status
```

Expected: Clean working tree, all changes committed.

- [ ] **Step 5: Optional manual test on a fork**

If desired, push a test tag to a fork or personal branch mirror and confirm:
- Release is created
- Release body contains CHANGELOG content
- Release is marked Pre-release
- Assets include 7z and latest.yml

---

## Self-Review Checklist

1. **Spec coverage:**
   - Auto-extract CHANGELOG section → Task 1 + Task 2
   - CI fails if CHANGELOG missing → Task 4 Step 3
   - Prerelease marking → Task 4 Step 4
   - Local preview → Task 3
   - latest.yml upload → Task 4 Step 1 + Step 4
   - docs update → Task 5

2. **Placeholder scan:** No TBD/TODO, all code blocks contain concrete code.

3. **Type consistency:** `extractChangelogForVersion(rootDir, version)` is used consistently. Version string passed is numeric (e.g., `0.0.4`) after stripping the `v` prefix in CI.
