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
