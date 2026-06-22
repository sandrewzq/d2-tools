import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

function toRepoPath(path) {
  return path.split(sep).join("/");
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

function readGitNameStatus(root) {
  try {
    const output = execFileSync("git", ["diff", "--name-status"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split(/\t+/));
  } catch {
    return [];
  }
}

function collectIndexedWorkFiles(workReadme) {
  const indexed = new Set();
  const pattern = /`((?:archive|backlog|references)\/[^`]+\.md)`/g;
  for (const match of workReadme.matchAll(pattern)) {
    indexed.add(match[1]);
  }
  return indexed;
}

export function collectDocPolicyErrors(root, gitNameStatus = readGitNameStatus(root)) {
  const errors = [];
  const fail = (message) => errors.push(message);

  const requiredDocs = [
    "docs/todo.md",
    "docs/bug-list.md",
    "docs/development.md",
    "docs/work/README.md"
  ];

  for (const doc of requiredDocs) {
    if (!existsSync(join(root, doc))) {
      fail(`Required documentation file is missing: ${doc}`);
    }
  }

  if (existsSync(join(root, "docs", "superpowers"))) {
    fail("docs/superpowers/ must not be recreated. Use docs/work/backlog, docs/work/archive, or docs/work/references.");
  }

  const docsRoot = join(root, "docs");
  const docsRootFiles = existsSync(docsRoot)
    ? readdirSync(docsRoot, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name)
    : [];

  const allowedDocsRoot = new Set([
    "bug-list.md",
    "bungie-setup.md",
    "development.md",
    "faq.md",
    "project-status.md",
    "roadmap.md",
    "security.md",
    "todo.md",
    "user-guide.md"
  ]);

  for (const file of docsRootFiles) {
    if (!allowedDocsRoot.has(file)) {
      fail(`Unexpected docs root file: docs/${file}. Move work material under docs/work/.`);
    }
    if (/^\d{4}-\d{2}-\d{2}-.+\.md$/.test(file)) {
      fail(`Date-named docs root file is not allowed: docs/${file}. Move it under docs/work/.`);
    }
  }

  const workRoot = join(root, "docs", "work");
  const allowedWorkDirs = new Set(["archive", "backlog", "references"]);
  if (existsSync(workRoot)) {
    for (const entry of readdirSync(workRoot, { withFileTypes: true })) {
      if (entry.isDirectory() && !allowedWorkDirs.has(entry.name)) {
        fail(`Unexpected docs/work directory: docs/work/${entry.name}. Use archive, backlog, or references.`);
      }
    }
  }

  const workReadmePath = join(root, "docs", "work", "README.md");
  const workReadme = existsSync(workReadmePath) ? readFileSync(workReadmePath, "utf8") : "";
  const workFiles = walk(workRoot)
    .map((file) => toRepoPath(relative(workRoot, file)))
    .filter((file) => file !== "README.md" && file.endsWith(".md"));
  const indexedWorkFiles = collectIndexedWorkFiles(workReadme);

  for (const file of workFiles) {
    if (!/^(archive|backlog|references)\//.test(file)) {
      fail(`Work document is outside an allowed category: docs/work/${file}`);
    }
    if (!indexedWorkFiles.has(file)) {
      fail(`docs/work/${file} is not listed in docs/work/README.md`);
    }
  }

  for (const file of indexedWorkFiles) {
    if (!workFiles.includes(file)) {
      fail(`docs/work/README.md lists missing work document: ${file}`);
    }
  }

  const bugListPath = join(root, "docs", "bug-list.md");
  if (existsSync(bugListPath)) {
    const bugList = readFileSync(bugListPath, "utf8");
    const seenBugIds = new Set();
    for (const match of bugList.matchAll(/^###\s+Bug\s+#(\d+):/gm)) {
      const bugId = match[1];
      if (seenBugIds.has(bugId)) {
        fail(`Duplicate bug id in docs/bug-list.md: Bug #${bugId}`);
      }
      seenBugIds.add(bugId);
    }
  }

  for (const parts of gitNameStatus) {
    const status = parts[0];
    const paths = parts.slice(1);
    for (const path of paths) {
      if ((status === "D" || status.startsWith("R")) && (path === "docs/todo.md" || path === "docs/bug-list.md")) {
        fail(`Protected document must not be deleted or moved without an explicit replacement: ${path}`);
      }
    }
  }

  const dateRootDeletedWithoutWorkReplacement = gitNameStatus
    .filter(([status, path]) => status === "D" && /^docs\/\d{4}-\d{2}-\d{2}-.+\.md$/.test(path))
    .filter(([, path]) => {
      const filename = path.split("/").pop();
      return !workFiles.some((file) => file.endsWith(`/${filename}`));
    });

  for (const [, path] of dateRootDeletedWithoutWorkReplacement) {
    fail(`Deleted date-named docs root file without a docs/work replacement: ${path}`);
  }

  return errors;
}

function main() {
  const errors = collectDocPolicyErrors(process.cwd());

  if (errors.length) {
    console.error("Documentation policy check failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("Documentation policy check passed.");
}

const isMain = import.meta.url.startsWith("file:") && process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
