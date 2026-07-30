import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractChangelogForVersion } from './extract-changelog.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const FOOTER = `---

Windows x64 安装器（NSIS）。

使用方式：
1. 下载 d2-tools-setup-<version>.exe。
2. 双击安装器，按向导选择安装位置并完成安装。
3. 从开始菜单或安装目录启动 d2-tools。

自动更新相关发布资产：
- latest.yml
- d2-tools-setup-<version>.exe.blockmap

覆盖升级不会删除 %APPDATA%\\d2-tools 里的本地配置、token 和缓存。`;

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
