#!/usr/bin/env node

/**
 * Add synthetic examples and required/optional guidance to traceable v2 workbooks.
 * Formal evidence rows are not changed. Inputs must be the current-run v2 workbooks.
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile } from "@oai/artifact-tool";

const [, , inputA, inputB, outputDir] = process.argv;
if (!inputA || !inputB || !outputDir) {
  throw new Error(
    "Usage: augment_pilot0_workbooks_with_guidance_v2_1.mjs <v2-A.xlsx> <v2-B.xlsx> <output-dir>",
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
  redPale: "#FBE9E7",
  white: "#FFFFFF",
  border: "#C7D1D7",
};

async function sha256(filePath) {
  return crypto
    .createHash("sha256")
    .update(await fs.readFile(filePath))
    .digest("hex");
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

function addExampleSheet(workbook, annotator) {
  const sheet = workbook.worksheets.add("00A_填写示例");
  sheet.showGridLines = false;
  const title = sheet.getRange("A1:O1");
  title.merge();
  title.values = [[`开放编码规范示例 · 标注员 ${annotator} · 全部为虚构消息`]];
  title.format = {
    fill: colors.ink,
    font: { bold: true, color: colors.white, size: 18 },
  };
  const note = sheet.getRange("A2:O3");
  note.merge();
  note.values = [[
    "本页只示范填写逻辑，不属于研究样本，也不是主题标准答案。正式标注仍需根据每个 Case 的可见上下文独立判断。建议先读完本页，再进入 03_逐条开放编码。",
  ]];
  note.format = { fill: colors.sky, wrapText: true, font: { color: colors.ink } };

  const headers = [
    "例", "虚构消息", "事实性概括", "开放码1", "开放码2", "明确提问", "行动请求",
    "时间要求", "提交/分享物", "出现回应", "结果证据", "上下文依赖", "推断警报", "事件ID", "关键理由",
  ];
  sheet.getRange("A6:O6").values = [headers];
  styleHeader(sheet.getRange("A6:O6"));
  const examples = [
    [
      "1", "明天几点开始？", "发送者询问第二天的开始时间", "询问开始时间", null,
      "是", "否", "是", "否", "否", "未看到", "低", "无", "E1", "索取明确时间信息，不是行动请求",
    ],
    [
      "2", "明天19:00开始，请提前10分钟进入。", "发送者告知开始时间并请求对方提前进入", "告知开始时间", "请求提前进入",
      "否", "是", "是", "否", "是", "未看到", "低", "无", "E1", "回应前问，同时包含明确行动要求",
    ],
    [
      "3", "收到，我已经进入了。", "发送者确认收到信息并表示已经进入", "确认已进入", null,
      "否", "否", "否", "否", "是", "完成", "中", "无", "E1", "出现目标结果证据，可标完成",
    ],
    [
      "4", "今天这道题太难了。", "发送者表达题目困难，没有提出请求", "表达题目困难", null,
      "否", "否", "否", "否", "否", "未看到", "低", "无", "NONE", "只是表达，不能自动升级为求助或AI需求",
    ],
    [
      "5", "麻烦今晚8点前把第3页拍照发群里。", "发送者要求对方在今晚8点前提交第3页图片", "请求提交图片", "设置提交时限",
      "否", "是", "是", "否", "否", "未看到", "低", "无", "E2", "当前只是请求，尚未实际提交图片",
    ],
    [
      "6", "这是第3页。[图片]", "发送者提交了第3页图片", "提交图片", null,
      "否", "否", "否", "是", "是", "仅有进展", "中", "附件内容未核验", "E2", "提交行为可见，但最终接收/质量结果未必可见",
    ],
    [
      "7", "收到。", "发送者确认收到前文信息", "确认收到", null,
      "否", "否", "否", "否", "是", "未看到", "中", "无", "UNKNOWN", "默认只是回应；除非事项目标就是确认收到",
    ],
  ];
  sheet.getRange("A7:O13").values = examples;
  styleBody(sheet.getRange("A7:O13"));
  sheet.getRange("A7:O13").format.fill = colors.pale;
  sheet.getRange("A7:A13").format = {
    fill: colors.sky,
    font: { bold: true, color: colors.ink },
    horizontalAlignment: "center",
  };
  sheet.getRange("A7:O13").format.rowHeight = 60;

  mergedLabel(sheet, "A16:O16", "事项汇总示例", colors.navy, colors.white);
  sheet.getRange("A17:J17").values = [[
    "事件ID", "事项中性名称", "涉及消息", "发起者", "对方被期待提供什么", "可见推进过程",
    "可见结果", "观察到的摩擦", "缺失上下文", "置信度",
  ]];
  styleHeader(sheet.getRange("A17:J17"));
  sheet.getRange("A18:J19").values = [
    [
      "E1", "确认开始时间并进入", "例1–3", "例1发送者", "告知时间并按要求进入",
      "询问时间 → 告知时间并请求提前进入 → 确认已进入", "完成", "未观察到", "无", "高",
    ],
    [
      "E2", "提交第3页图片", "例5–6", "例5发送者", "在时限内提交图片",
      "请求提交并设置时限 → 提交图片", "仅有进展", "附件内容未核验", "缺接收/质量确认", "中",
    ],
  ];
  styleBody(sheet.getRange("A18:J19"));
  sheet.getRange("A18:J19").format.fill = colors.green;

  mergedLabel(sheet, "A22:O22", "错误示范：以下写法不要使用", "#B94A48", colors.white);
  sheet.getRange("A23:D23").values = [["错误写法", "为什么错", "建议改写", "适用字段"]];
  styleHeader(sheet.getRange("A23:D23"));
  sheet.getRange("A24:D28").values = [
    ["学生需要AI提醒", "身份、需求和产品方案都不是直接事实", "发送者询问时间/请求提醒", "事实概括/开放码"],
    ["收到=任务完成", "回应不自动证明目标结果完成", "确认收到；结果证据=未看到", "结果证据"],
    ["请发图片=已经提交", "请求行动和实际提交是两件事", "行动请求=是；提交/分享物=否", "提交/分享物"],
    ["只有教师发言=管理群", "窗口发言角色不能证明群用途", "群用途无法判断，记录可见发言事实", "推断警报"],
    ["每条消息都建一个事件", "连续消息可能推进同一事项", "按对象、期望结果和回应链合并", "local_event_id"],
  ];
  styleBody(sheet.getRange("A24:D28"));
  sheet.getRange("A24:D28").format.fill = colors.redPale;

  mergedLabel(sheet, "A31:O31", "最小完成标准", colors.navy, colors.white);
  sheet.getRange("A32:O35").merge(true);
  sheet.getRange("A32:A35").values = [
    ["黄色核心行必填：可理解程度、事实概括、开放码1、所有下拉判断、推断警报、事件ID。"],
    ["开放码2/3和备注为选填；没有第二个明确行为时保持空白。"],
    ["灰色上下文行不填写；E2–E5没有实际事项时保持空白。"],
    ["完成一个 sample_id 后，再填事项汇总和样本总结；不要最后凭记忆批量补。"],
  ];
  sheet.getRange("A32:O35").format = { fill: colors.gold, wrapText: true };

  setWidths(sheet, {
    A: 7, B: 34, C: 36, D: 20, E: 20, F: 12, G: 12, H: 12, I: 14, J: 12,
    K: 16, L: 14, M: 24, N: 12, O: 38,
  });
}

function addGuidanceBands(workbook) {
  const coding = workbook.worksheets.getItem("03_逐条开放编码");
  mergedLabel(coding, "A5:AC5", "只填写黄色核心行；灰色上下文与左侧原表字段不得修改。先读完同一 sample_id，再逐条填写。", colors.sky);
  mergedLabel(coding, "A6:N6", "原表字段｜只读", colors.gray);
  mergedLabel(coding, "O6:Q6", "必填", colors.green);
  mergedLabel(coding, "R6:S6", "选填：开放码2/3", colors.pale);
  mergedLabel(coding, "T6:AB6", "必填", colors.green);
  coding.getRange("AC6").values = [["选填"]];
  coding.getRange("AC6").format = {
    fill: colors.pale,
    font: { bold: true, color: colors.ink },
    horizontalAlignment: "center",
    borders: {
      top: { style: "thin", color: colors.border },
      bottom: { style: "thin", color: colors.border },
      left: { style: "thin", color: colors.border },
      right: { style: "thin", color: colors.border },
    },
  };

  const events = workbook.worksheets.getItem("04_事项汇总");
  mergedLabel(events, "A5:M5", "每个样本最多预留5个事项；不存在的 E2–E5 保持空白，不要为了填满而拆分。", colors.sky);
  mergedLabel(events, "A6:C6", "回查键｜只读", colors.gray);
  mergedLabel(events, "D6:L6", "实际存在事项时必填", colors.green);
  events.getRange("M6").values = [["选填"]];
  events.getRange("M6").format = { fill: colors.pale, font: { bold: true, color: colors.ink }, horizontalAlignment: "center" };

  const summary = workbook.worksheets.getItem("05_样本总结");
  mergedLabel(summary, "A5:M5", "完成该 sample_id 的逐条编码和事项汇总后再填本行；事实与解释必须分开。", colors.sky);
  mergedLabel(summary, "A6:B6", "回查键｜只读", colors.gray);
  mergedLabel(summary, "C6:E6", "必填", colors.green);
  mergedLabel(summary, "F6:G6", "选填：主题2/3", colors.pale);
  mergedLabel(summary, "H6:L6", "必填", colors.green);
  summary.getRange("M6").values = [["选填"]];
  summary.getRange("M6").format = { fill: colors.pale, font: { bold: true, color: colors.ink }, horizontalAlignment: "center" };

  const instructions = workbook.worksheets.getItem("00_使用与溯源说明");
  mergedLabel(instructions, "A33:L33", "明天开始时，只需记住这条路径", colors.navy, colors.white);
  instructions.getRange("A34:L37").merge(true);
  instructions.getRange("A34:A37").values = [
    ["先看最后一个标签页 00A_填写示例，理解虚构案例。"],
    ["到 03_逐条开放编码：灰色只读，黄色按 sample_id 逐条标。"],
    ["一个 sample_id 完成后，填写 04_事项汇总 和 05_样本总结。"],
    ["不清楚字段语义时写 06_字段问题，不要自行猜测。"],
  ];
  instructions.getRange("A34:L37").format = { fill: colors.gold, wrapText: true };
}

async function removeSidecar(outputPath) {
  try {
    await fs.unlink(`${outputPath}.inspect.ndjson`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function augment(inputPath, annotator) {
  const bytes = new Uint8Array(await fs.readFile(inputPath));
  const workbook = await SpreadsheetFile.importXlsx(bytes);
  addGuidanceBands(workbook);
  addExampleSheet(workbook, annotator);

  const outputPath = path.join(
    outputDir,
    `ClassIn_IM_Pilot0_可溯源开放编码_v2.1_标注员${annotator}_带示例受限版.xlsx`,
  );
  const xlsx = await SpreadsheetFile.exportXlsx(workbook);
  await xlsx.save(outputPath);

  if (annotator === "A") {
    const previewDir = path.join(outputDir, "previews-v2.1");
    await fs.mkdir(previewDir, { recursive: true });
    const previews = [
      ["00_使用与溯源说明", "A1:L37", "01-instructions.png"],
      ["00A_填写示例", "A1:O35", "02-examples.png"],
      ["03_逐条开放编码", "A1:AC18", "03-coding-guidance.png"],
      ["04_事项汇总", "A1:M18", "04-event-guidance.png"],
      ["05_样本总结", "A1:M18", "05-summary-guidance.png"],
    ];
    for (const [sheetName, range, fileName] of previews) {
      const preview = await workbook.render({ sheetName, range, scale: 1, format: "png" });
      await fs.writeFile(
        path.join(previewDir, fileName),
        new Uint8Array(await preview.arrayBuffer()),
      );
    }
  }
  await removeSidecar(outputPath);
  return { annotator, inputPath, outputPath };
}

const results = [await augment(inputA, "A"), await augment(inputB, "B")];
const manifest = {
  status: "TRACEABLE_OPEN_CODING_V2_1_GUIDED_GENERATED_PENDING_QA",
  evidence_version: "v2.0-unchanged",
  guidance_version: "v2.1",
  examples: "synthetic_only_not_research_samples",
  builder_script_sha256: await sha256(process.argv[1]),
  outputs: await Promise.all(
    results.map(async (item) => ({
      annotator: item.annotator,
      input_path: item.inputPath,
      input_sha256: await sha256(item.inputPath),
      output_path: item.outputPath,
      output_sha256: await sha256(item.outputPath),
    })),
  ),
};
const manifestPath = path.join(outputDir, "pilot0_traceable_open_coding_guided_manifest_v2_1.json");
await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ ...manifest, manifestPath }, null, 2)}\n`);
