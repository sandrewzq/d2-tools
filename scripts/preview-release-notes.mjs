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
