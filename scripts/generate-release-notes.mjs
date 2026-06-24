import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractChangelogForVersion } from './extract-changelog.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const FOOTER = `---

Windows x64 NSIS 安装器。

使用方式：
1. 下载 GitHub Release 中的 Windows .exe 安装器。
2. 运行安装器完成安装或覆盖升级。
3. 已安装旧版可在应用内手动检查自动更新。

自动更新使用 Tauri updater 和同一 Release 中的 \`latest.json\`。覆盖升级不应删除应用数据目录中的本地配置、token 和缓存。`;

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
