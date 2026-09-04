#!/usr/bin/env node

/**
 * Build independent Pilot 0 open-coding workbooks from restricted redacted data.
 *
 * This script intentionally contains no teaching-topic taxonomy and does not
 * import any previous review workbook. Outputs remain restricted research data.
 */

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const [, , inputPath, outputDir] = process.argv;
if (!inputPath || !outputDir) {
  throw new Error(
    "Usage: build_pilot0_open_coding_workbooks_v1.mjs <restricted-redacted-json> <output-dir>",
  );
}

const raw = await fs.readFile(inputPath, "utf8");
const dataset = JSON.parse(raw);
if (dataset.classification !== "RESTRICTED_RESEARCH_DATA_DO_NOT_COMMIT") {
  throw new Error("Unexpected data classification");
}
if (
  dataset.quality?.sample_count !== 24 ||
  dataset.quality?.core_rows !== 480 ||
  dataset.quality?.needs_review_samples !== 0
) {
  throw new Error("Pilot 0 quality preconditions are not satisfied");
}

await fs.mkdir(outputDir, { recursive: true });

async function sha256(filePath) {
  const bytes = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

const palette = {
  ink: "#172B3A",
  blue: "#255F85",
  blueLight: "#E7F1F8",
  bluePale: "#F4F8FB",
  cyan: "#DDF3F5",
  amber: "#FFF1C9",
  amberStrong: "#F4B942",
  gray: "#EEF2F4",
  grayDark: "#5D6A73",
  white: "#FFFFFF",
  border: "#CBD5DB",
  green: "#E7F5EC",
};

const samples = [...dataset.samples].sort((a, b) =>
  a.sample_id.localeCompare(b.sample_id),
);
const messages = [...dataset.messages].sort(
  (a, b) => a.sample_id.localeCompare(b.sample_id) || a.rn - b.rn,
);
const qualityBySample = new Map(
  dataset.quality.sample_checks.map((item) => [item.sample_id, item]),
);

function setColumnWidths(sheet, widths) {
  for (const [column, width] of Object.entries(widths)) {
    sheet.getRange(`${column}:${column}`).format.columnWidth = width;
  }
}

function styleTitle(sheet, title, subtitle, lastColumn) {
  const titleRange = sheet.getRange(`A1:${lastColumn}1`);
  titleRange.merge();
  titleRange.values = [[title]];
  titleRange.format = {
    fill: palette.ink,
    font: { bold: true, color: palette.white, size: 18 },
    verticalAlignment: "center",
  };
  titleRange.format.rowHeight = 32;

  const subtitleRange = sheet.getRange(`A2:${lastColumn}3`);
  subtitleRange.merge();
  subtitleRange.values = [[subtitle]];
  subtitleRange.format = {
    fill: palette.blueLight,
    font: { color: palette.ink, size: 10 },
    wrapText: true,
    verticalAlignment: "center",
  };
  subtitleRange.format.rowHeight = 28;
  sheet.showGridLines = false;
}

function styleHeader(range) {
  range.format = {
    fill: palette.blue,
    font: { bold: true, color: palette.white },
    wrapText: true,
    verticalAlignment: "center",
    horizontalAlignment: "center",
    borders: {
      top: { style: "thin", color: palette.border },
      bottom: { style: "thin", color: palette.border },
      left: { style: "thin", color: palette.border },
      right: { style: "thin", color: palette.border },
    },
  };
  range.format.rowHeight = 34;
}

function styleBody(range) {
  range.format = {
    font: { color: palette.ink, size: 10 },
    wrapText: true,
    verticalAlignment: "top",
    borders: {
      top: { style: "thin", color: palette.border },
      bottom: { style: "thin", color: palette.border },
      left: { style: "thin", color: palette.border },
      right: { style: "thin", color: palette.border },
    },
  };
}

function setListValidation(range, values) {
  range.dataValidation = { rule: { type: "list", values } };
}

function writeInstructionSheet(workbook, annotator) {
  const sheet = workbook.worksheets.add("00_净室说明");
  styleTitle(
    sheet,
    `ClassIn IM Pilot 0 开放编码 · 标注员 ${annotator}`,
    "只描述当前脱敏片段中直接可见的事实。没有预设教学主题，不判断产品机会，不读取上一轮报告、旧样本表或另一位标注者的结果。",
    "L",
  );

  sheet.getRange("A5:B10").values = [
    ["数据级别", "受限研究数据：不得转发、上传公共服务或复制真实内容到仓库"],
    ["标注员", annotator],
    ["样本数", null],
    ["可见消息行", null],
    ["核心需标注行", null],
    ["净室声明", "开始前请在 B14 填写：已确认"],
  ];
  sheet.getRange("B7").formulas = [["=COUNTA('01_样本清单'!A7:A30)"]];
  sheet.getRange("B8").formulas = [["=COUNTA('02_逐条开放编码'!A8:A677)"]];
  sheet.getRange("B9").formulas = [["=COUNTIF('02_逐条开放编码'!C8:C677,\"核心-需标注\")"]];
  styleBody(sheet.getRange("A5:B10"));
  sheet.getRange("A5:A10").format = {
    fill: palette.gray,
    font: { bold: true, color: palette.ink },
    wrapText: true,
  };

  sheet.getRange("A12:L12").merge();
  sheet.getRange("A12").values = [["标注前声明"]];
  sheet.getRange("A12:L12").format = {
    fill: palette.blue,
    font: { bold: true, color: palette.white },
  };
  sheet.getRange("A13:L13").merge();
  sheet.getRange("A13").values = [[
    "我没有阅读 Round 0、旧人工复核表、产品方案、竞品材料或另一位标注者的结果；不会搜索身份、复制受限正文或因 Case 没有明显价值而跳过。",
  ]];
  sheet.getRange("A13:L13").format = {
    fill: palette.bluePale,
    wrapText: true,
    font: { color: palette.ink },
  };
  sheet.getRange("A14").values = [["确认"]];
  sheet.getRange("B14:D14").merge();
  sheet.getRange("B14:D14").format = {
    fill: palette.amber,
    font: { bold: true, color: palette.ink },
  };
  setListValidation(sheet.getRange("B14:D14"), ["已确认", "未确认"]);

  sheet.getRange("A17:L17").merge();
  sheet.getRange("A17").values = [["操作顺序"]];
  sheet.getRange("A17:L17").format = {
    fill: palette.blue,
    font: { bold: true, color: palette.white },
  };
  const steps = [
    ["1", "先读 01_样本清单，只理解结构，不猜群用途或关系。"],
    ["2", "在 02_逐条开放编码 中阅读上下文行，只标黄色的核心行。"],
    ["3", "用自己的中性短语填写事实性概括和 1–3 个原始开放码。"],
    ["4", "完成一整个样本后，再去 03_事项汇总 切分连续事项。"],
    ["5", "最后填写 04_样本总结；疑问记入 05_字段问题。"],
    ["6", "不要统一主题叫法，也不要查看另一位标注者的结果。"],
  ];
  sheet.getRange("A18:B23").values = steps;
  styleBody(sheet.getRange("A18:B23"));
  sheet.getRange("A18:A23").format = {
    fill: palette.cyan,
    font: { bold: true, color: palette.ink },
    horizontalAlignment: "center",
  };

  sheet.getRange("A26:L26").merge();
  sheet.getRange("A26").values = [["三条判断纪律"]];
  sheet.getRange("A26:L26").format = {
    fill: palette.blue,
    font: { bold: true, color: palette.white },
  };
  sheet.getRange("A27:L29").merge(true);
  sheet.getRange("A27:A29").values = [
    ["事实不等于解释：‘发送者询问时间’是事实；‘学生需要智能提醒’是解释和方案。"],
    ["回应不等于解决：只有片段中出现明确结果证据，才能记录完成或受阻。"],
    ["未知是有效结果：身份、群用途、上下文或结果不足时，直接写无法判断。"],
  ];
  sheet.getRange("A27:L29").format = {
    fill: palette.amber,
    font: { color: palette.ink },
    wrapText: true,
  };

  setColumnWidths(sheet, { A: 16, B: 52, C: 12, D: 12, E: 12, F: 12, G: 12, H: 12, I: 12, J: 12, K: 12, L: 12 });
}

function writeSampleSheet(workbook) {
  const sheet = workbook.worksheets.add("01_样本清单");
  styleTitle(
    sheet,
    "Pilot 0 内容盲样本清单",
    "样本仅按渠道、窗口内观察角色、发送者数、时间跨度和数据质量等结构特征选择。这里没有主题、需求或产品价值标签。",
    "K",
  );
  const headers = [
    "sample_id",
    "声明渠道",
    "窗口内观察角色",
    "观察发送者数",
    "群规模档（仅结构）",
    "100行时间跨度",
    "核心 rn",
    "可见上下文 rn",
    "结构标记",
    "样本状态",
    "估计资格",
  ];
  sheet.getRange("A6:K6").values = [headers];
  styleHeader(sheet.getRange("A6:K6"));
  const rows = samples.map((sample) => [
    sample.sample_id,
    sample.channel,
    sample.observed_role_composition,
    sample.observed_sender_count_bucket,
    sample.user_num_bucket,
    sample.window_time_span_bucket,
    `${sample.core_rn_start}-${sample.core_rn_end}`,
    `${sample.context_rn_start}-${sample.context_rn_end}`,
    Array.isArray(sample.structural_flags)
      ? sample.structural_flags.join(" | ")
      : String(sample.structural_flags ?? ""),
    sample.selection_status,
    sample.estimation_eligibility,
  ]);
  sheet.getRange(`A7:K${6 + rows.length}`).values = rows;
  styleBody(sheet.getRange(`A7:K${6 + rows.length}`));
  sheet.getRange(`A7:A${6 + rows.length}`).format = {
    fill: palette.blueLight,
    font: { bold: true, color: palette.ink },
  };
  setColumnWidths(sheet, { A: 16, B: 20, C: 26, D: 14, E: 18, F: 16, G: 12, H: 16, I: 26, J: 14, K: 14 });
}

function writeMessageCodingSheet(workbook, annotator) {
  const sheet = workbook.worksheets.add("02_逐条开放编码");
  styleTitle(
    sheet,
    `逐条开放编码 · 标注员 ${annotator}`,
    "灰色行为只读上下文；黄色行为核心消息。主题字段全部自由填写，不使用任何预设教学主题菜单。正文已经自动脱敏但仍可能含上下文敏感信息。",
    "W",
  );
  const headers = [
    "sample_id",
    "rn",
    "范围",
    "时间",
    "发送者化名",
    "导出角色",
    "回复引用",
    "脱敏正文",
    "可理解程度",
    "事实性概括",
    "原始开放码1",
    "原始开放码2",
    "原始开放码3",
    "明确提问",
    "明确行动请求",
    "明确时间要求",
    "提交/分享物",
    "出现回应",
    "结果证据",
    "上下文依赖",
    "推断警报",
    "local_event_id",
    "标注备注",
  ];
  sheet.getRange("A7:W7").values = [headers];
  styleHeader(sheet.getRange("A7:W7"));
  const rows = messages.map((message) => [
    message.sample_id,
    message.rn,
    message.row_scope === "core" ? "核心-需标注" : "上下文-只读",
    message.timestamp,
    message.sender,
    message.exported_role,
    message.reply_reference,
    message.redacted_text,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
  ]);
  const endRow = 7 + rows.length;
  sheet.getRange(`A8:W${endRow}`).values = rows;
  styleBody(sheet.getRange(`A8:W${endRow}`));

  for (let index = 0; index < messages.length; index += 1) {
    const excelRow = index + 8;
    const isCore = messages[index].row_scope === "core";
    sheet.getRange(`A${excelRow}:H${excelRow}`).format.fill = isCore
      ? palette.bluePale
      : palette.gray;
    sheet.getRange(`I${excelRow}:W${excelRow}`).format.fill = isCore
      ? palette.amber
      : palette.gray;
    sheet.getRange(`A${excelRow}:W${excelRow}`).format.rowHeight = isCore ? 68 : 46;
    if (!isCore) {
      sheet.getRange(`I${excelRow}`).values = [["只读"]];
    }
  }

  setListValidation(sheet.getRange(`I8:I${endRow}`), ["清楚", "部分清楚", "无法理解", "只读"]);
  for (const column of ["N", "O", "P", "Q"]) {
    setListValidation(sheet.getRange(`${column}8:${column}${endRow}`), ["是", "否", "无法判断"]);
  }
  setListValidation(sheet.getRange(`R8:R${endRow}`), ["是", "否", "不适用", "无法判断"]);
  setListValidation(sheet.getRange(`S8:S${endRow}`), ["完成", "未完成或受阻", "仅有进展", "未看到", "无法判断"]);
  setListValidation(sheet.getRange(`T8:T${endRow}`), ["低", "中", "高", "无法判断"]);

  setColumnWidths(sheet, {
    A: 16, B: 7, C: 14, D: 19, E: 12, F: 14, G: 18, H: 62,
    I: 14, J: 34, K: 18, L: 18, M: 18, N: 12, O: 14, P: 14,
    Q: 14, R: 12, S: 16, T: 14, U: 28, V: 16, W: 28,
  });
}

function writeEventSheet(workbook, annotator) {
  const sheet = workbook.worksheets.add("03_事项汇总");
  styleTitle(
    sheet,
    `样本内事项汇总 · 标注员 ${annotator}`,
    "每个样本预留5行。只有围绕同一对象、期望结果和连续回应的消息才合并为一个事项；没有事项或无法切分也要明确记录。",
    "L",
  );
  const headers = [
    "sample_id",
    "local_event_id",
    "事项中性名称",
    "涉及 rn",
    "发起者化名",
    "对方被期待提供什么",
    "可见推进过程",
    "可见结果",
    "观察到的摩擦",
    "缺失上下文",
    "置信度",
    "备注",
  ];
  sheet.getRange("A7:L7").values = [headers];
  styleHeader(sheet.getRange("A7:L7"));
  const rows = [];
  for (const sample of samples) {
    for (let slot = 1; slot <= 5; slot += 1) {
      rows.push([sample.sample_id, `E${slot}`, null, null, null, null, null, null, null, null, null, null]);
    }
  }
  const endRow = 7 + rows.length;
  sheet.getRange(`A8:L${endRow}`).values = rows;
  styleBody(sheet.getRange(`A8:L${endRow}`));
  sheet.getRange(`A8:B${endRow}`).format.fill = palette.blueLight;
  sheet.getRange(`C8:L${endRow}`).format.fill = palette.amber;
  setListValidation(sheet.getRange(`H8:H${endRow}`), ["完成", "未完成或受阻", "仅有进展", "未看到", "无法判断", "不适用"]);
  setListValidation(sheet.getRange(`K8:K${endRow}`), ["高", "中", "低", "无法判断"]);
  setColumnWidths(sheet, { A: 16, B: 14, C: 24, D: 14, E: 14, F: 32, G: 38, H: 16, I: 30, J: 28, K: 12, L: 24 });
}

function writeSampleSummarySheet(workbook, annotator) {
  const sheet = workbook.worksheets.add("04_样本总结");
  styleTitle(
    sheet,
    `样本总结 · 标注员 ${annotator}`,
    "先完成逐条开放编码和事项切分，再总结每个样本。自由主题短语保留原始措辞，不在本轮统一名称。",
    "L",
  );
  const headers = [
    "sample_id",
    "理解充分性",
    "观察到明确事项",
    "自由主题短语1",
    "自由主题短语2",
    "自由主题短语3",
    "直接可见事实",
    "待验证解释",
    "需要补充什么",
    "整体置信度",
    "净室异常",
    "备注",
  ];
  sheet.getRange("A7:L7").values = [headers];
  styleHeader(sheet.getRange("A7:L7"));
  const rows = samples.map((sample) => [sample.sample_id, null, null, null, null, null, null, null, null, null, "无", null]);
  sheet.getRange("A8:L31").values = rows;
  styleBody(sheet.getRange("A8:L31"));
  sheet.getRange("A8:A31").format.fill = palette.blueLight;
  sheet.getRange("B8:L31").format.fill = palette.amber;
  setListValidation(sheet.getRange("B8:B31"), ["充分", "部分", "不足", "无法判断"]);
  setListValidation(sheet.getRange("C8:C31"), ["是", "否", "无法判断"]);
  setListValidation(sheet.getRange("J8:J31"), ["高", "中", "低", "无法判断"]);
  setListValidation(sheet.getRange("K8:K31"), ["无", "误看旧材料", "看到另一标注者结果", "复制外部内容", "其他"]);
  setColumnWidths(sheet, { A: 16, B: 14, C: 16, D: 20, E: 20, F: 20, G: 40, H: 36, I: 32, J: 14, K: 20, L: 28 });
}

function writeFieldQuestionSheet(workbook, annotator) {
  const sheet = workbook.worksheets.add("05_字段问题");
  styleTitle(
    sheet,
    `字段语义与数据疑问 · 标注员 ${annotator}`,
    "这些问题来自原始字段与取值结构，不来自上一轮分析。观察到新疑问时在下方追加，不自行补全字段业务含义。",
    "G",
  );
  const headers = ["问题ID", "涉及字段", "待确认问题", "当前状态", "标注中观察", "是否影响判断", "备注"];
  sheet.getRange("A7:G7").values = [headers];
  styleHeader(sheet.getRange("A7:G7"));
  const questions = [
    ["Q01", "clusterid / rn", "8,197个窗口是全部符合条件会话还是再次抽样；rn是否为按时间正序前100行？"],
    ["Q02", "id / msgid / replymsgid", "三个消息标识如何关联，replymsgid引用哪个字段及何种作用域？"],
    ["Q03", "msgcmd", "50724904代表什么类型；是否排除了图片、文件、表情和系统事件？"],
    ["Q04", "clustertype", "0表示绑定班级的群还是师生教学用途群；是否可能承载教务/管理沟通？"],
    ["Q05", "user_num", "成员数在哪个时点计算，是否包含退群或历史成员？"],
    ["Q06", "targetuids", "单聊/群聊中的语义、逗号列表含义及快照时点是什么？"],
    ["Q07", "msgbucketid / timetag", "字段契约、单位和技术用途是什么？"],
    ["Q08", "msgdata / concent", "哪个是正文主来源，差异和非JSON场景的规则是什么？"],
  ].map((row) => [...row, "待确认", null, null, null]);
  sheet.getRange("A8:G15").values = questions;
  styleBody(sheet.getRange("A8:G35"));
  sheet.getRange("A8:D15").format.fill = palette.bluePale;
  sheet.getRange("E8:G35").format.fill = palette.amber;
  setListValidation(sheet.getRange("F8:F35"), ["是", "否", "不确定", "不适用"]);
  setColumnWidths(sheet, { A: 12, B: 24, C: 58, D: 14, E: 40, F: 16, G: 28 });
}

function writePreservationSheet(workbook) {
  const sheet = workbook.worksheets.add("06_样本保全");
  styleTitle(
    sheet,
    "样本保全与版本检查",
    "该表用于证明样本没有因内容无价值、难标或不符合预期而被静默删除或替换。",
    "J",
  );
  const headers = [
    "sample_id",
    "预期可见行",
    "实际可见行",
    "核心行",
    "上下文行",
    "提取状态",
    "选择版本",
    "源文件SHA-256",
    "损失原因",
    "替补对象",
  ];
  sheet.getRange("A7:J7").values = [headers];
  styleHeader(sheet.getRange("A7:J7"));
  const rows = samples.map((sample) => {
    const quality = qualityBySample.get(sample.sample_id);
    return [
      sample.sample_id,
      quality.expected_rows,
      quality.extracted_rows,
      quality.core_rows,
      quality.context_only_rows,
      quality.status,
      dataset.selection_method_version,
      dataset.source_sha256,
      sample.loss_reason ?? "",
      sample.replacement_for ?? "",
    ];
  });
  sheet.getRange("A8:J31").values = rows;
  styleBody(sheet.getRange("A8:J31"));
  sheet.getRange("A8:J31").format.fill = palette.green;

  sheet.getRange("A34:E34").values = [["汇总", "样本数", "实际可见行", "核心行", "非ready样本"]];
  styleHeader(sheet.getRange("A34:E34"));
  sheet.getRange("A35:E35").values = [["公式核验", null, null, null, null]];
  sheet.getRange("B35:E35").formulas = [[
    "=COUNTA(A8:A31)",
    "=SUM(C8:C31)",
    "=SUM(D8:D31)",
    "=COUNTIF(F8:F31,\"<>ready\")",
  ]];
  styleBody(sheet.getRange("A35:E35"));
  setColumnWidths(sheet, { A: 16, B: 14, C: 14, D: 12, E: 14, F: 14, G: 14, H: 66, I: 20, J: 16 });
}

async function buildWorkbook(annotator) {
  const workbook = Workbook.create();
  writeInstructionSheet(workbook, annotator);
  writeSampleSheet(workbook);
  writeMessageCodingSheet(workbook, annotator);
  writeEventSheet(workbook, annotator);
  writeSampleSummarySheet(workbook, annotator);
  writeFieldQuestionSheet(workbook, annotator);
  writePreservationSheet(workbook);

  const fileName = `ClassIn_IM_Pilot0_开放编码_标注员${annotator}_受限脱敏版.xlsx`;
  const outputPath = path.join(outputDir, fileName);
  const xlsx = await SpreadsheetFile.exportXlsx(workbook);
  await xlsx.save(outputPath);

  const previewDir = path.join(outputDir, "previews-clean-room");
  await fs.mkdir(previewDir, { recursive: true });
  if (annotator === "A") {
    const previews = [
      ["00_净室说明", "A1:L30", "01-instructions.png"],
      ["01_样本清单", "A1:K31", "02-samples.png"],
      ["02_逐条开放编码", "A1:W22", "03-message-coding.png"],
      ["03_事项汇总", "A1:L24", "04-events.png"],
      ["04_样本总结", "A1:L20", "05-sample-summary.png"],
      ["05_字段问题", "A1:G18", "06-field-questions.png"],
      ["06_样本保全", "A1:J35", "07-preservation.png"],
    ];
    for (const [sheetName, range, previewName] of previews) {
      const preview = await workbook.render({ sheetName, range, scale: 1, format: "png" });
      await fs.writeFile(
        path.join(previewDir, previewName),
        new Uint8Array(await preview.arrayBuffer()),
      );
    }
  }
  // The artifact runtime may emit an inspect sidecar while rendering. It can
  // contain workbook inspection material, so remove this non-deliverable file.
  try {
    await fs.unlink(`${outputPath}.inspect.ndjson`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return { annotator, outputPath };
}

const results = [];
for (const annotator of ["A", "B"]) {
  results.push(await buildWorkbook(annotator));
}

const manifest = {
  status: "CLEAN_ROOM_OPEN_CODING_READY_FOR_VISUAL_QA",
  evidence_chain: "original_xlsx -> current_run_mechanical_derivation -> independent_open_coding",
  dataset_id: dataset.dataset_id,
  source_sha256: dataset.source_sha256,
  restricted_redacted_input_sha256: await sha256(inputPath),
  selection_method_version: dataset.selection_method_version,
  extraction_method_version: dataset.extraction_method_version,
  handbook_version: "v0.2",
  sample_count: dataset.quality.sample_count,
  message_rows: dataset.quality.message_rows,
  core_rows: dataset.quality.core_rows,
  builder_script_sha256: await sha256(process.argv[1]),
  outputs: await Promise.all(
    results.map(async ({ annotator, outputPath }) => ({
      annotator,
      outputPath,
      sha256: await sha256(outputPath),
    })),
  ),
};
await fs.writeFile(
  path.join(outputDir, "pilot0_open_coding_workbook_manifest_v1.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
