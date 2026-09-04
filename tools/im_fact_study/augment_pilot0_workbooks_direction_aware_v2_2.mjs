#!/usr/bin/env node

/**
 * Upgrade traceable guided v2.1 workbooks to direction-aware v2.2.
 *
 * The script preserves all raw evidence cells. It separates P0-DIR1 samples
 * into a simplified one-sided-visible track, renames the ambiguous response
 * field, and adds a dedicated one-sided summary sheet.
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const artifactToolModule = process.env.CLASSIN_ARTIFACT_TOOL_MODULE ?? "@oai/artifact-tool";
const { FileBlob, SpreadsheetFile } = await import(artifactToolModule);

const [, , inputA, inputB, outputDir] = process.argv;
if (!inputA || !inputB || !outputDir) {
  throw new Error(
    "Usage: augment_pilot0_workbooks_direction_aware_v2_2.mjs <v2.1-A.xlsx> <v2.1-B.xlsx> <output-dir>",
  );
}

await fs.mkdir(outputDir, { recursive: true });

const colors = {
  ink: "#182C3A",
  navy: "#1F4E6D",
  sky: "#E5F1F7",
  pale: "#F4F8FA",
  gold: "#FFF0C2",
  gray: "#E9EEF1",
  green: "#E6F4EA",
  orange: "#FCE8D5",
  orangeStrong: "#C65D12",
  redPale: "#FBE9E7",
  white: "#FFFFFF",
  border: "#C7D1D7",
};

async function sha256(filePath) {
  return crypto.createHash("sha256").update(await fs.readFile(filePath)).digest("hex");
}

function setWidths(sheet, widths) {
  for (const [column, width] of Object.entries(widths)) {
    sheet.getRange(`${column}:${column}`).format.columnWidth = width;
  }
}

function styleHeader(range, fill = colors.navy) {
  range.format = {
    fill,
    font: { bold: true, color: colors.white },
    wrapText: true,
    horizontalAlignment: "center",
    verticalAlignment: "center",
    borders: {
      top: { style: "thin", color: colors.border },
      bottom: { style: "thin", color: colors.border },
      left: { style: "thin", color: colors.border },
      right: { style: "thin", color: colors.border },
    },
  };
}

function styleBody(range) {
  range.format = {
    font: { color: colors.ink, size: 10 },
    wrapText: true,
    verticalAlignment: "top",
    borders: {
      top: { style: "thin", color: colors.border },
      bottom: { style: "thin", color: colors.border },
      left: { style: "thin", color: colors.border },
      right: { style: "thin", color: colors.border },
    },
  };
}

function mergedLabel(sheet, rangeAddress, value, fill, fontColor = colors.ink) {
  const range = sheet.getRange(rangeAddress);
  range.merge();
  range.values = [[value]];
  range.format = {
    fill,
    font: { bold: true, color: fontColor },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
    borders: {
      top: { style: "thin", color: colors.border },
      bottom: { style: "thin", color: colors.border },
      left: { style: "thin", color: colors.border },
      right: { style: "thin", color: colors.border },
    },
  };
}

function listValidation(range, values) {
  range.dataValidation = { rule: { type: "list", values } };
}

function isOneSidedSample(sampleId) {
  return String(sampleId ?? "").startsWith("P0-DIR1-");
}

function updateInstructions(workbook, annotator) {
  const sheet = workbook.worksheets.getItem("00_使用与溯源说明");
  sheet.getRange("A1").values = [[`ClassIn IM Pilot 0 可溯源开放编码 v2.2 · 标注员 ${annotator}`]];
  sheet.getRange("A2").values = [[
    "v2.2 将双方可见对话与窗口内单方可见样本分轨。原表字段仍保持原值；单方可见不等于对方实际没有回复，也不得据此推断原因或产品方案。",
  ]];
  sheet.getRange("A10").values = [["标准/单方核心行"]];
  sheet.getRange("B10").formulas = [[
    '=COUNTIF(\'03_逐条开放编码\'!G8:G677,"核心-需标注")&" / "&COUNTIF(\'03_逐条开放编码\'!G8:G677,"单方核心-简化")',
  ]];
  mergedLabel(sheet, "A33:L33", "v2.2 分轨填写路径", colors.navy, colors.white);
  sheet.getRange("A34:L37").merge(true);
  sheet.getRange("A34:A37").values = [
    ["先看 00A_填写示例；方法试填从 P0-DIR2-01 开始，不再从最前两个单方样本开始。"],
    ["P0-DIR1-01/02：在 03 填橙色简化核心行，再到 08_单方可见汇总；不填 04/05。"],
    ["其余样本：在 03 填黄色核心行，再完成 04_事项汇总 和 05_样本总结。"],
    ["不清楚字段、窗口方向或结果时写 06_字段问题；未知和无法判断都是有效结果。"],
  ];
  sheet.getRange("A34:L37").format = { fill: colors.gold, wrapText: true };
}

function updateSampleMap(workbook) {
  const sheet = workbook.worksheets.getItem("01_样本与会话映射");
  sheet.getRange("A2").values = [[
    "P0-DIR1 为窗口内单方可见边界轨；其他样本为标准完整标注轨。该区分只描述导出窗口结构，不代表真实世界是否有人回复。",
  ]];
  for (let row = 7; row <= 30; row += 1) {
    const sampleId = sheet.getRange(`A${row}`).values?.[0]?.[0];
    if (isOneSidedSample(sampleId)) {
      sheet.getRange(`A${row}:L${row}`).format.fill = colors.orange;
    }
  }
  mergedLabel(sheet, "A33:L33", "标注轨道说明", colors.navy, colors.white);
  sheet.getRange("A34:L35").merge(true);
  sheet.getRange("A34:A35").values = [
    ["P0-DIR1-01/02｜单方可见边界轨：只证明当前100行导出窗口观察到1位发送者，使用 03 + 08。"],
    ["P0-DIR2 与群聊样本｜标准轨：按完整可见片段使用 03 + 04 + 05；仍不得把窗口外信息补成事实。"],
  ];
  sheet.getRange("A34:L35").format = { fill: colors.pale, wrapText: true };
}

function updateSourceIndex(workbook) {
  const sheet = workbook.worksheets.getItem("02_原表字段索引");
  sheet.getRange("A2").values = [[
    "原表字段保持不变。范围列只增加 v2.2 研究轨道说明：P0-DIR1 为单方可见简化轨，其余核心行为标准轨。",
  ]];
  for (let row = 8; row <= 677; row += 1) {
    const sampleId = sheet.getRange(`A${row}`).values?.[0]?.[0];
    if (!isOneSidedSample(sampleId)) continue;
    const currentScope = String(sheet.getRange(`Z${row}`).values?.[0]?.[0] ?? "");
    const core = currentScope.includes("核心");
    sheet.getRange(`Z${row}`).values = [[core ? "单方核心-简化" : "单方上下文-只读"]];
    sheet.getRange(`A${row}:Z${row}`).format.fill = core ? colors.orange : colors.gray;
  }
}

function updateCoding(workbook, annotator) {
  const sheet = workbook.worksheets.getItem("03_逐条开放编码");
  sheet.getRange("A1").values = [[`逐条开放编码 v2.2 · 标注员 ${annotator}`]];
  sheet.getRange("A2").values = [[
    "黄色=标准完整标注；橙色=P0-DIR1 单方可见简化标注；灰色=上下文只读。逐条判断必须先读完同一 sample_id 的可见片段。",
  ]];
  mergedLabel(
    sheet,
    "A5:AC5",
    "黄色标准轨使用 03→04→05；橙色单方轨使用 03→08。‘本条是否回应前文’只判断当前消息的角色，不表示它后来是否获得回答。",
    colors.sky,
  );

  for (const address of ["A6:N6", "O6:Q6", "R6:S6", "T6:AB6"]) {
    sheet.getRange(address).unmerge();
  }
  sheet.getRange("A6:AC6").clear({ applyTo: "contents" });
  mergedLabel(sheet, "A6:N6", "原表字段｜只读", colors.gray);
  mergedLabel(sheet, "O6:Q6", "双轨必填", colors.green);
  mergedLabel(sheet, "R6:S6", "选填：开放码2/3", colors.pale);
  mergedLabel(sheet, "T6:X6", "双轨按本条事实填写", colors.green);
  sheet.getRange("Y6").values = [["标准轨必填；单方轨可空"]];
  sheet.getRange("Y6").format = { fill: colors.orange, font: { bold: true, color: colors.ink }, wrapText: true, horizontalAlignment: "center" };
  mergedLabel(sheet, "Z6:AA6", "双轨必填", colors.green);
  sheet.getRange("AB6").values = [["标准轨必填；单方轨可选"]];
  sheet.getRange("AB6").format = { fill: colors.orange, font: { bold: true, color: colors.ink }, wrapText: true, horizontalAlignment: "center" };
  sheet.getRange("AC6").values = [["选填"]];
  sheet.getRange("AC6").format = { fill: colors.pale, font: { bold: true, color: colors.ink }, horizontalAlignment: "center" };
  sheet.getRange("X7").values = [["本条是否回应前文"]];
  sheet.getRange("X:X").format.columnWidth = 20;

  for (let row = 8; row <= 677; row += 1) {
    const sampleId = sheet.getRange(`A${row}`).values?.[0]?.[0];
    if (!isOneSidedSample(sampleId)) continue;
    const currentScope = String(sheet.getRange(`G${row}`).values?.[0]?.[0] ?? "");
    const core = currentScope.includes("核心");
    sheet.getRange(`G${row}`).values = [[core ? "单方核心-简化" : "单方上下文-只读"]];
    sheet.getRange(`A${row}:N${row}`).format.fill = core ? colors.orange : colors.gray;
    sheet.getRange(`O${row}:AC${row}`).format.fill = core ? colors.orange : colors.gray;
  }
}

function updateExamples(workbook, annotator) {
  const sheet = workbook.worksheets.getItem("00A_填写示例");
  sheet.getRange("A1").values = [[`开放编码规范示例 v2.2 · 标注员 ${annotator} · 全部为虚构消息`]];
  sheet.getRange("J6").values = [["本条是否回应前文"]];
  sheet.getRange("O7").values = [["本条是提问，不回应前文；后文是否回答在事项层判断"]];
  sheet.getRange("O8").values = [["本条回应前问，同时包含明确行动要求"]];
  sheet.getRange("A29:D29").values = [[
    "问题后面有人回答，所以问题行写回应=是",
    "混淆本条是否回应前文与后续是否获得回答",
    "问题行=否；回答行=是；事项层记录已获得回应",
    "本条是否回应前文",
  ]];
  styleBody(sheet.getRange("A29:D29"));
  sheet.getRange("A29:D29").format.fill = colors.redPale;

  mergedLabel(sheet, "A38:O38", "单方可见边界示例｜不按正常问答解释", colors.orangeStrong, colors.white);
  sheet.getRange("A39:F39").values = [[
    "虚构可见消息", "直接事实", "窗口内对方发言", "对方实际是否回应", "可见结果", "填写去向",
  ]];
  styleHeader(sheet.getRange("A39:F39"), colors.orangeStrong);
  sheet.getRange("A40:F41").values = [
    ["在吗？", "发送者尝试联系对方", "未观察到", "无法判断", "无法判断", "03简化行 + 08汇总"],
    ["时间确定了吗？", "发送者再次询问时间", "未观察到", "无法判断", "无法判断", "03简化行 + 08汇总"],
  ];
  styleBody(sheet.getRange("A40:F41"));
  sheet.getRange("A40:F41").format.fill = colors.orange;
  const note = sheet.getRange("A43:O44");
  note.merge();
  note.values = [[
    "单方可见只说明当前导出窗口中没有观察到另一位发送者；不能写成‘对方拒绝回复’或‘真实没有回复’，也不进入正常对话的推进/闭环判断。",
  ]];
  note.format = { fill: colors.gold, wrapText: true, font: { bold: true, color: colors.ink } };
}

function updateStandardSummaries(workbook) {
  const events = workbook.worksheets.getItem("04_事项汇总");
  mergedLabel(
    events,
    "A5:M5",
    "仅用于标准轨；P0-DIR1-01/02 不填本页，转到 08_单方可见汇总。其他样本每个最多5个事项。",
    colors.sky,
  );
  for (let row = 8; row <= 127; row += 1) {
    const sampleId = events.getRange(`A${row}`).values?.[0]?.[0];
    if (!isOneSidedSample(sampleId)) continue;
    events.getRange(`D${row}:M${row}`).format.fill = colors.gray;
    events.getRange(`M${row}`).values = [["只读·转08"]];
  }

  const summary = workbook.worksheets.getItem("05_样本总结");
  mergedLabel(
    summary,
    "A5:M5",
    "仅用于标准轨；P0-DIR1-01/02 不填本页，转到 08_单方可见汇总。事实与待验证解释必须分开。",
    colors.sky,
  );
  for (let row = 8; row <= 31; row += 1) {
    const sampleId = summary.getRange(`A${row}`).values?.[0]?.[0];
    if (!isOneSidedSample(sampleId)) continue;
    summary.getRange(`C${row}:M${row}`).format.fill = colors.gray;
    summary.getRange(`M${row}`).values = [["只读·转08"]];
  }
}

function addOneSidedSummary(workbook, annotator) {
  const sheet = workbook.worksheets.add("08_单方可见汇总");
  sheet.showGridLines = false;
  const title = sheet.getRange("A1:M1");
  title.merge();
  title.values = [[`窗口内单方可见样本汇总 · 标注员 ${annotator}`]];
  title.format = { fill: colors.ink, font: { bold: true, color: colors.white, size: 18 } };
  title.format.rowHeight = 32;
  const note = sheet.getRange("A2:M3");
  note.merge();
  note.values = [[
    "本页只处理 P0-DIR1-01/02。‘窗口内未观察到对方发言’是结构事实；‘对方实际没有回复’不是当前数据能够证明的事实。不要填写 04/05，也不要把原因或产品解法写进本页。",
  ]];
  note.format = { fill: colors.sky, font: { color: colors.ink, size: 10 }, wrapText: true };
  mergedLabel(sheet, "A5:M5", "橙色为标注区；先读完整100行回查信息和当前可见片段，再填写。", colors.orange);
  mergedLabel(sheet, "A6:D6", "结构回查｜只读", colors.gray);
  mergedLabel(sheet, "E6:H6", "可见事实｜必填", colors.green);
  mergedLabel(sheet, "I6:J6", "边界判断｜必填", colors.orange);
  mergedLabel(sheet, "K6:L6", "缺口与置信度｜必填", colors.green);
  sheet.getRange("M6").values = [["选填"]];
  sheet.getRange("M6").format = { fill: colors.pale, font: { bold: true, color: colors.ink }, horizontalAlignment: "center" };

  const headers = [
    "sample_id", "clusterid", "原始100行发送者数", "当前可见/核心发送者数",
    "发送者主要行为", "是否重复跟进", "是否出现明确问题或请求", "窗口内是否观察到对方发言",
    "对方实际是否回应", "可见结果", "缺失信息", "置信度", "备注",
  ];
  sheet.getRange("A7:M7").values = [headers];
  styleHeader(sheet.getRange("A7:M7"));

  const mapping = workbook.worksheets.getItem("01_样本与会话映射").getRange("A7:B30").values;
  const clusterBySample = new Map(mapping.map((row) => [String(row[0] ?? ""), row[1]]));
  const rows = ["P0-DIR1-01", "P0-DIR1-02"].map((sampleId) => [
    sampleId, clusterBySample.get(sampleId), "1", "1 / 1", null, null, null, null, null, null, null, null, null,
  ]);
  sheet.getRange("A8:M9").values = rows;
  styleBody(sheet.getRange("A8:M9"));
  sheet.getRange("A8:D9").format.fill = colors.gray;
  sheet.getRange("E8:M9").format.fill = colors.orange;
  sheet.getRange("A8:M9").format.rowHeight = 72;

  listValidation(sheet.getRange("F8:F9"), ["是", "否", "无法判断"]);
  listValidation(sheet.getRange("G8:G9"), ["是", "否", "无法判断"]);
  listValidation(sheet.getRange("H8:H9"), ["是", "否", "无法判断"]);
  listValidation(sheet.getRange("I8:I9"), ["是", "否", "无法判断"]);
  listValidation(sheet.getRange("J8:J9"), ["完成", "未完成或受阻", "仅有进展", "未看到", "无法判断"]);
  listValidation(sheet.getRange("L8:L9"), ["高", "中", "低", "无法判断"]);

  mergedLabel(sheet, "A12:M12", "判读纪律", colors.navy, colors.white);
  sheet.getRange("A13:M16").merge(true);
  sheet.getRange("A13:A16").values = [
    ["可以写：发送者在当前窗口询问、请求、补充、重复跟进了什么。"],
    ["可以写：当前窗口未观察到另一位发送者；当前结果无法判断。"],
    ["不能写：对方故意不回、拒绝沟通、真实无人回应，除非有直接证据。"],
    ["不能写：需要某项 IM/AI 功能；产品解释留到事实研究通过 Gate 之后。"],
  ];
  sheet.getRange("A13:M16").format = { fill: colors.gold, wrapText: true };
  setWidths(sheet, {
    A: 16, B: 20, C: 18, D: 22, E: 36, F: 16, G: 22, H: 22, I: 20, J: 18, K: 32, L: 14, M: 28,
  });
}

async function removeSidecar(outputPath) {
  try {
    await fs.unlink(`${outputPath}.inspect.ndjson`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function augment(inputPath, annotator) {
  const input = await FileBlob.load(inputPath);
  const workbook = await SpreadsheetFile.importXlsx(input);
  updateInstructions(workbook, annotator);
  updateSampleMap(workbook);
  updateSourceIndex(workbook);
  updateCoding(workbook, annotator);
  updateExamples(workbook, annotator);
  updateStandardSummaries(workbook);
  addOneSidedSummary(workbook, annotator);

  const outputPath = path.join(
    outputDir,
    `ClassIn_IM_Pilot0_可溯源开放编码_v2.2_标注员${annotator}_分轨受限版.xlsx`,
  );
  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(outputPath);

  if (annotator === "A") {
    const previewDir = path.join(outputDir, "previews-v2.2");
    await fs.mkdir(previewDir, { recursive: true });
    const previews = [
      ["00_使用与溯源说明", "A1:L37", "01-instructions.png"],
      ["00A_填写示例", "A1:O44", "02-examples.png"],
      ["01_样本与会话映射", "A1:L35", "03-sample-tracks.png"],
      ["03_逐条开放编码", "A1:AC18", "04-one-sided-coding.png"],
      ["04_事项汇总", "A1:M18", "05-standard-events.png"],
      ["05_样本总结", "A1:M18", "06-standard-summary.png"],
      ["08_单方可见汇总", "A1:M16", "07-one-sided-summary.png"],
    ];
    for (const [sheetName, range, fileName] of previews) {
      const preview = await workbook.render({ sheetName, range, scale: 1, format: "png" });
      await fs.writeFile(path.join(previewDir, fileName), new Uint8Array(await preview.arrayBuffer()));
    }
  }
  await removeSidecar(outputPath);
  return { annotator, inputPath, outputPath };
}

const results = [await augment(inputA, "A"), await augment(inputB, "B")];
const manifest = {
  status: "TRACEABLE_OPEN_CODING_V2_2_DIRECTION_AWARE_GENERATED_PENDING_QA",
  source_guidance_version: "v2.1",
  direction_aware_version: "v2.2",
  one_sided_samples: ["P0-DIR1-01", "P0-DIR1-02"],
  normal_trial_start: "P0-DIR2-01",
  raw_evidence_policy: "unchanged",
  builder_script_sha256: await sha256(process.argv[1]),
  outputs: await Promise.all(results.map(async (item) => ({
    annotator: item.annotator,
    input_path: item.inputPath,
    input_sha256: await sha256(item.inputPath),
    output_path: item.outputPath,
    output_sha256: await sha256(item.outputPath),
  }))),
};
const manifestPath = path.join(outputDir, "pilot0_direction_aware_manifest_v2_2.json");
await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ ...manifest, manifestPath }, null, 2)}\n`);
