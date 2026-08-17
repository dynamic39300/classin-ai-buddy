/* global URL, console, process */

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

const allowed = new Map([
  ["@workbuddy/domain", new Set()],
  ["@workbuddy/contracts", new Set(["zod"])],
  ["@workbuddy/application", new Set(["@workbuddy/domain", "@workbuddy/contracts"])],
  ["@workbuddy/harness", new Set(["@workbuddy/application", "@workbuddy/domain", "@workbuddy/contracts"])],
  ["@workbuddy/fixtures", new Set(["@workbuddy/domain", "@workbuddy/contracts"])],
  ["@workbuddy/mock-classin", new Set(["@workbuddy/application", "@workbuddy/domain", "@workbuddy/contracts", "@workbuddy/fixtures"])],
  ["@workbuddy/ui", new Set(["@workbuddy/contracts", "react"])],
  ["@workbuddy/api", new Set(["@workbuddy/application", "@workbuddy/contracts", "@workbuddy/harness", "@workbuddy/mock-classin", "@workbuddy/fixtures"])],
  ["@workbuddy/workbench", new Set(["@workbuddy/contracts", "@workbuddy/ui", "react", "react-dom", "lucide-react"])],
]);

const manifests = [
  "packages/domain/package.json",
  "packages/contracts/package.json",
  "packages/application/package.json",
  "packages/harness/package.json",
  "packages/fixtures/package.json",
  "packages/adapters/mock-classin/package.json",
  "packages/ui/package.json",
  "apps/api/package.json",
  "apps/workbench/package.json",
];

const violations = [];

for (const relativePath of manifests) {
  const manifest = JSON.parse(await readFile(join(root, relativePath), "utf8"));
  const permitted = allowed.get(manifest.name);
  if (!permitted) {
    violations.push(`No dependency policy for ${manifest.name}`);
    continue;
  }

  for (const dependency of Object.keys(manifest.dependencies ?? {})) {
    if (!permitted.has(dependency)) {
      violations.push(`${manifest.name} must not depend on ${dependency}`);
    }
  }
}

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(path)));
    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) files.push(path);
  }
  return files;
}

for (const directory of ["apps", "packages"]) {
  for (const file of await sourceFiles(join(root, directory))) {
    const source = await readFile(file, "utf8");
    if (/from\s+["']@workbuddy\/[^"']+\/src\//.test(source)) {
      violations.push(`${file} imports another module through a private path`);
    }
  }
}

if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exit(1);
}

console.log(`Architecture check passed for ${manifests.length} modules.`);
