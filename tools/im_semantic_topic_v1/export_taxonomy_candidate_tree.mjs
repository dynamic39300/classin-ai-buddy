import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const inputPath = resolve(
  process.argv[2] ??
    "docs/01-research/im-conversation-topic-semantic-analysis/TAXONOMY-V2-CANDIDATE-TREE-20260902.md",
);
const csvPath = resolve(
  process.argv[3] ??
    "docs/01-research/im-conversation-topic-semantic-analysis/TAXONOMY-V2-CANDIDATE-FLAT-20260902.csv",
);
const manifestPath = resolve(
  process.argv[4] ??
    "docs/01-research/im-conversation-topic-semantic-analysis/TAXONOMY-V2-CANDIDATE-MANIFEST-20260902.json",
);

const source = readFileSync(inputPath, "utf8");
const treeMatch = source.match(/```text\n([\s\S]*?)\n```/);
if (!treeMatch) {
  throw new Error(`No text tree block found in ${inputPath}`);
}

const rows = [];
let currentL1 = null;
let currentL2 = null;

for (const rawLine of treeMatch[1].split("\n")) {
  const match = rawLine.match(/(L([123])-(\d{3,}))\s+(.+?)(?:\s+([●◇]))?$/);
  if (!match) continue;

  const [, nodeId, levelText, , rawName, marker] = match;
  const level = Number(levelText);
  const nodeName = rawName.trim();
  const reviewStatus =
    marker === "●"
      ? "human_confirmed_direction"
      : marker === "◇"
        ? "low_or_unvalidated_evidence"
        : "candidate_pending_migration_validation";

  if (level === 1) {
    currentL1 = { id: nodeId, name: nodeName };
    currentL2 = null;
  } else if (level === 2) {
    if (!currentL1) throw new Error(`L2 appeared before L1: ${rawLine}`);
    currentL2 = { id: nodeId, name: nodeName };
  } else if (!currentL1 || !currentL2) {
    throw new Error(`L3 appeared before its parents: ${rawLine}`);
  }

  const pathIds =
    level === 1
      ? [nodeId]
      : level === 2
        ? [currentL1.id, nodeId]
        : [currentL1.id, currentL2.id, nodeId];
  const pathNames =
    level === 1
      ? [nodeName]
      : level === 2
        ? [currentL1.name, nodeName]
        : [currentL1.name, currentL2.name, nodeName];

  rows.push({
    taxonomyVersion: "classin-im-semantic-topic-taxonomy-v2-candidate-20260902",
    level,
    nodeId,
    nodeName,
    pathIds: pathIds.join(" > "),
    pathNames: pathNames.join(" > "),
    reviewStatus,
  });
}

const ids = rows.map((row) => row.nodeId);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
const namesByLevel = new Map();
const duplicateNames = [];
for (const row of rows) {
  const key = `${row.level}:${row.nodeName}`;
  if (namesByLevel.has(key)) duplicateNames.push(key);
  namesByLevel.set(key, true);
}
if (duplicateIds.length || duplicateNames.length) {
  throw new Error(
    `Duplicate taxonomy entries: ids=${duplicateIds.join(",")}; names=${duplicateNames.join(",")}`,
  );
}

const counts = Object.fromEntries(
  [1, 2, 3].map((level) => [
    `l${level}`,
    rows.filter((row) => row.level === level).length,
  ]),
);
if (counts.l1 !== 10 || counts.l2 !== 29 || counts.l3 !== 80) {
  throw new Error(`Unexpected node counts: ${JSON.stringify(counts)}`);
}

const escapeCsv = (value) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
const columns = [
  "taxonomy_version",
  "level",
  "node_id",
  "node_name",
  "path_ids",
  "path_names",
  "review_status",
];
const csv = [
  columns.join(","),
  ...rows.map((row) =>
    [
      row.taxonomyVersion,
      row.level,
      row.nodeId,
      row.nodeName,
      row.pathIds,
      row.pathNames,
      row.reviewStatus,
    ]
      .map(escapeCsv)
      .join(","),
  ),
].join("\n");
writeFileSync(csvPath, `${csv}\n`, "utf8");

const manifest = {
  status: "candidate_pending_human_review",
  taxonomy_version: "classin-im-semantic-topic-taxonomy-v2-candidate-20260902",
  generated_at: new Date().toISOString(),
  source_markdown: inputPath,
  source_sha256: createHash("sha256").update(source).digest("hex"),
  flat_csv: csvPath,
  flat_csv_sha256: createHash("sha256").update(`${csv}\n`).digest("hex"),
  counts,
  migration_executed: false,
  stage_d_read: false,
};
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(JSON.stringify(manifest, null, 2));
