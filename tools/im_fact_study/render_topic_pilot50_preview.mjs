#!/usr/bin/env node
/** Render a few Topic Pilot workbook ranges for visual QA. */

import fs from "node:fs/promises";
import path from "node:path";

const artifactToolModule = process.env.CLASSIN_ARTIFACT_TOOL_MODULE ?? "@oai/artifact-tool";
const { FileBlob, SpreadsheetFile } = await import(artifactToolModule);

const [, , inputPath, outputDir] = process.argv;
if (!inputPath || !outputDir) {
  throw new Error("Usage: render_topic_pilot50_preview.mjs <input.xlsx> <output-dir>");
}

await fs.mkdir(outputDir, { recursive: true });
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));
const previews = [
  ["00_使用说明", "A1:J14", "00-usage.png"],
  ["03_Topic人工标注", "A1:J20", "03-topics.png"],
  ["04_问题与校准", "A1:G12", "04-calibration.png"],
];
for (const [sheetName, range, fileName] of previews) {
  const rendered = await workbook.render({ sheetName, range, scale: 1, format: "png" });
  await fs.writeFile(path.join(outputDir, fileName), new Uint8Array(await rendered.arrayBuffer()));
}
console.log(JSON.stringify({ inputPath, outputDir, previews }, null, 2));
