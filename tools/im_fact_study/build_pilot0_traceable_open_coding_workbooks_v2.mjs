#!/usr/bin/env node

/**
 * Build independent Pilot 0 open-coding workbooks with exact source-XLSX values.
 *
 * "Traceable/real" means values already present in the supplied source workbook.
 * The builder does not enrich, reverse-identify, or consult prior analysis files.
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const [, , inputPath, outputDir] = process.argv;
if (!inputPath || !outputDir) {
  throw new Error(
    "Usage: build_pilot0_traceable_open_coding_workbooks_v2.mjs <traceable-json> <output-dir>",
  );
}

const dataset = JSON.parse(await fs.readFile(inputPath, "utf8"));
if (dataset.classification !== "RESTRICTED_TRACEABLE_RESEARCH_DATA_DO_NOT_COMMIT") {
  throw new Error("Unexpected data classification");
}
if (
  dataset.quality?.sample_count !== 24 ||
  dataset.quality?.message_rows !== 670 ||
  dataset.quality?.core_rows !== 480 ||
  dataset.quality?.needs_review_samples !== 0
) {
  throw new Error("Traceable Pilot 0 quality preconditions are not satisfied");
}

await fs.mkdir(outputDir, { recursive: true });

async function sha256(filePath) {
  return crypto
    .createHash("sha256")
    .update(await fs.readFile(filePath))
    .digest("hex");
}

const colors = {
  ink: "#182C3A",
  navy: "#1F4E6D",
  sky: "#E5F1F7",
  pale: "#F4F8FA",
  gold: "#FFF0C2",
  gray: "#E9EEF1",
  green: "#E6F4EA",
  white: "#FFFFFF",
  border: "#C7D1D7",
};

const samples = [...dataset.samples].sort((a, b) =>
  a.sample_id.localeCompare(b.sample_id),
);
const messages = [...dataset.messages].sort(
  (a, b) => a.sample_id.localeCompare(b.sample_id) || a.rn - b.rn,
);
const messagesBySample = new Map();
for (const message of messages) {
  if (!messagesBySample.has(message.sample_id)) messagesBySample.set(message.sample_id, []);
  messagesBySample.get(message.sample_id).push(message);
}
const qualityBySample = new Map(
  dataset.quality.sample_checks.map((item) => [item.sample_id, item]),
);

function setWidths(sheet, widths) {
  for (const [column, width] of Object.entries(widths)) {
    sheet.getRange(`${column}:${column}`).format.columnWidth = width;
  }
}

function title(sheet, text, note, lastColumn) {
  sheet.showGridLines = false;
  const titleRange = sheet.getRange(`A1:${lastColumn}1`);
  titleRange.merge();
  titleRange.values = [[text]];
  titleRange.format = {
    fill: colors.ink,
    font: { bold: true, color: colors.white, size: 18 },
    verticalAlignment: "center",
  };
  titleRange.format.rowHeight = 32;
  const noteRange = sheet.getRange(`A2:${lastColumn}3`);
  noteRange.merge();
  noteRange.values = [[note]];
  noteRange.format = {
    fill: colors.sky,
    font: { color: colors.ink, size: 10 },
    wrapText: true,
    verticalAlignment: "center",
  };
  noteRange.format.rowHeight = 28;
}

function header(range) {
  range.format = {
    fill: colors.navy,
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
  range.format.rowHeight = 36;
}

function body(range) {
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

function listValidation(range, values) {
  range.dataValidation = { rule: { type: "list", values } };
}

function sourceValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" || typeof value === "boolean") return value;
  return String(value);
}

function clusterFor(sampleId) {
  return messagesBySample.get(sampleId)?.[0]?.clusterid ?? null;
}

function writeInstructions(workbook, annotator) {
  const sheet = workbook.worksheets.add("00_使用与溯源说明");
  title(
    sheet,
    `ClassIn IM Pilot 0 可溯源开放编码 v2 · 标注员 ${annotator}`,
    "本工作簿的标识、昵称和正文均取自原始 Excel 已有字段。‘真实’只表示原表字段原值，不代表外部真人身份；禁止外部反查或补充原表之外的信息。",
    "L",
  );
  sheet.getRange("A5:B11").values = [
    ["唯一原始证据源", dataset.source.file_name],
    ["原表 SHA-256", dataset.source.sha256],
    ["标注员", annotator],
    ["样本数", null],
    ["可见原表行", null],
    ["核心需标注行", null],
    ["净室确认", "开始前在 B15 选择‘已确认’"],
  ];
  sheet.getRange("B8").formulas = [["=COUNTA('01_样本与会话映射'!A7:A30)"]];
  sheet.getRange("B9").formulas = [["=COUNTA('03_逐条开放编码'!A8:A677)"]];
  sheet.getRange("B10").formulas = [["=COUNTIF('03_逐条开放编码'!G8:G677,\"核心-需标注\")"]];
  body(sheet.getRange("A5:B11"));
  sheet.getRange("A5:A11").format = {
    fill: colors.gray,
    font: { bold: true, color: colors.ink },
    wrapText: true,
  };

  sheet.getRange("A13:L13").merge();
  sheet.getRange("A13").values = [["标注前确认"]];
  sheet.getRange("A13:L13").format = {
    fill: colors.navy,
    font: { bold: true, color: colors.white },
  };
  sheet.getRange("A14:L14").merge();
  sheet.getRange("A14").values = [[
    "我只使用本工作簿和原始 Excel 进行回查；不读取第一次分析材料、不查看另一位标注者结果、不反查外部身份、不因 Case 不符合预期而跳过。",
  ]];
  sheet.getRange("A14:L14").format = { fill: colors.pale, wrapText: true };
  sheet.getRange("A15").values = [["确认"]];
  sheet.getRange("B15:D15").merge();
  sheet.getRange("B15:D15").format.fill = colors.gold;
  listValidation(sheet.getRange("B15:D15"), ["已确认", "未确认"]);

  sheet.getRange("A18:L18").merge();
  sheet.getRange("A18").values = [["溯源方法"]];
  sheet.getRange("A18:L18").format = {
    fill: colors.navy,
    font: { bold: true, color: colors.white },
  };
  const steps = [
    ["1", "优先使用 source_excel_row 在原始 Excel 中定位同一行。"],
    ["2", "id 是本文件观察到的全局唯一行键；msgid 不是全局唯一。"],
    ["3", "消息引用应联合 clusterid、msgid、replymsgid 理解，不做跨会话全局匹配。"],
    ["4", "02_原表字段索引保留完整常用字段；03_逐条开放编码保留高频回查键。"],
    ["5", "原表 `concent` 与 `msgdata.content` 都保留；canonical_content 只用于统一阅读。"],
    ["6", "字段意义不清时写入 06_字段问题，不自行沿用第一次分析解释。"],
  ];
  sheet.getRange("A19:B24").values = steps;
  body(sheet.getRange("A19:B24"));
  sheet.getRange("A19:A24").format = {
    fill: colors.sky,
    font: { bold: true, color: colors.ink },
    horizontalAlignment: "center",
  };

  sheet.getRange("A27:L27").merge();
  sheet.getRange("A27").values = [["开放编码纪律"]];
  sheet.getRange("A27:L27").format = {
    fill: colors.navy,
    font: { bold: true, color: colors.white },
  };
  sheet.getRange("A28:L30").merge(true);
  sheet.getRange("A28:A30").values = [
    ["只描述当前片段直接表达的事实；不把称呼、昵称或 user ID 猜成外部真人身份。"],
    ["主题名称由 Case 自由产生，不使用任何预设教学主题、需求列表或产品 Feature。"],
    ["回应不等于解决；身份、群用途、上下文和结果证据不足时，未知是正式有效结果。"],
  ];
  sheet.getRange("A28:L30").format = { fill: colors.gold, wrapText: true };
  setWidths(sheet, { A: 18, B: 62, C: 12, D: 12, E: 12, F: 12, G: 12, H: 12, I: 12, J: 12, K: 12, L: 12 });
}

function writeSampleMap(workbook) {
  const sheet = workbook.worksheets.add("01_样本与会话映射");
  title(
    sheet,
    "Pilot 0 样本与原表会话映射",
    "clusterid 为原始 Excel 中的原值，用于快速回查。样本仍是内容盲结构选择，不代表主题发生率或产品优先级。",
    "L",
  );
  const headers = [
    "sample_id", "原表clusterid", "声明渠道", "窗口观察角色", "发送者数档",
    "群规模档", "时间跨度", "核心rn", "上下文rn", "结构标记", "样本状态", "估计资格",
  ];
  sheet.getRange("A6:L6").values = [headers];
  header(sheet.getRange("A6:L6"));
  const rows = samples.map((sample) => [
    sample.sample_id,
    sourceValue(clusterFor(sample.sample_id)),
    sample.channel,
    sample.observed_role_composition,
    sample.observed_sender_count_bucket,
    sample.user_num_bucket,
    sample.window_time_span_bucket,
    `${sample.core_rn_start}-${sample.core_rn_end}`,
    `${sample.context_rn_start}-${sample.context_rn_end}`,
    Array.isArray(sample.structural_flags) ? sample.structural_flags.join(" | ") : String(sample.structural_flags ?? ""),
    sample.selection_status,
    sample.estimation_eligibility,
  ]);
  sheet.getRange("A7:L30").values = rows;
  body(sheet.getRange("A7:L30"));
  sheet.getRange("A7:B30").format.fill = colors.sky;
  setWidths(sheet, { A: 16, B: 20, C: 20, D: 26, E: 14, F: 18, G: 14, H: 12, I: 14, J: 28, K: 14, L: 20 });
}

function writeSourceIndex(workbook) {
  const sheet = workbook.worksheets.add("02_原表字段索引");
  title(
    sheet,
    "原始 Excel 字段索引",
    "以下值逐行来自原始 Excel。source_excel_row 可直接定位原表；该页只做溯源，不填写标签。msgdata JSON 未整段复制，但其 content/strTalker 已单列。",
    "Z",
  );
  const headers = [
    "sample_id", "原表Excel行", "clusterid", "clustertype", "id", "msgbucketid", "msgid", "msgcmd",
    "replymsgid", "sourceuid", "targetuids", "identity", "user_type", "user_num", "timetag", "timeformat",
    "dt", "from_unixtime", "rn", "strtalker", "msgdata.strTalker", "concent", "msgdata.content",
    "canonical_content", "content_source", "范围",
  ];
  sheet.getRange("A7:Z7").values = [headers];
  header(sheet.getRange("A7:Z7"));
  const rows = messages.map((m) => [
    m.sample_id, m.source_excel_row, sourceValue(m.clusterid), sourceValue(m.clustertype), sourceValue(m.id),
    sourceValue(m.msgbucketid), sourceValue(m.msgid), sourceValue(m.msgcmd), sourceValue(m.replymsgid),
    sourceValue(m.sourceuid), sourceValue(m.targetuids), sourceValue(m.identity), sourceValue(m.user_type),
    sourceValue(m.user_num), sourceValue(m.timetag), sourceValue(m.timeformat), sourceValue(m.dt),
    sourceValue(m.from_unixtime), sourceValue(m.rn), sourceValue(m.strtalker), sourceValue(m.msgdata_strtalker),
    sourceValue(m.concent), sourceValue(m.msgdata_content), sourceValue(m.canonical_content), m.content_source,
    m.row_scope === "core" ? "核心-需标注" : "上下文-只读",
  ]);
  sheet.getRange("A8:Z677").values = rows;
  body(sheet.getRange("A8:Z677"));
  for (let i = 0; i < messages.length; i += 1) {
    const row = i + 8;
    sheet.getRange(`A${row}:Z${row}`).format.fill = messages[i].row_scope === "core" ? colors.pale : colors.gray;
    sheet.getRange(`A${row}:Z${row}`).format.rowHeight = messages[i].row_scope === "core" ? 58 : 42;
  }
  setWidths(sheet, {
    A: 16, B: 14, C: 20, D: 12, E: 20, F: 15, G: 16, H: 14, I: 16, J: 18,
    K: 24, L: 14, M: 14, N: 18, O: 22, P: 16, Q: 12, R: 20, S: 8, T: 18,
    U: 18, V: 44, W: 44, X: 56, Y: 20, Z: 14,
  });
}

function writeCoding(workbook, annotator) {
  const sheet = workbook.worksheets.add("03_逐条开放编码");
  title(
    sheet,
    `逐条开放编码 · 标注员 ${annotator}`,
    "左侧保留原表回查键、sourceuid、昵称和正文。灰色行为上下文，只标黄色核心行；开放码全部自由填写。",
    "AB",
  );
  const headers = [
    "sample_id", "原表Excel行", "clusterid", "id", "msgid", "rn", "范围", "原表时间",
    "sourceuid", "strtalker", "msgdata.strTalker", "user_type", "replymsgid", "原表正文",
    "可理解程度", "事实性概括", "开放码1", "开放码2", "开放码3", "明确提问", "明确行动请求",
    "明确时间要求", "提交/分享物", "出现回应", "结果证据", "上下文依赖", "推断警报",
    "local_event_id", "标注备注",
  ];
  sheet.getRange("A7:AC7").values = [headers];
  header(sheet.getRange("A7:AC7"));
  const rows = messages.map((m) => [
    m.sample_id, m.source_excel_row, sourceValue(m.clusterid), sourceValue(m.id), sourceValue(m.msgid), m.rn,
    m.row_scope === "core" ? "核心-需标注" : "上下文-只读", sourceValue(m.from_unixtime),
    sourceValue(m.sourceuid), sourceValue(m.strtalker), sourceValue(m.msgdata_strtalker), sourceValue(m.user_type),
    sourceValue(m.replymsgid), sourceValue(m.canonical_content),
    null, null, null, null, null, null, null, null, null, null, null, null, null, null, null,
  ]);
  sheet.getRange("A8:AC677").values = rows;
  body(sheet.getRange("A8:AC677"));
  for (let i = 0; i < messages.length; i += 1) {
    const row = i + 8;
    const core = messages[i].row_scope === "core";
    sheet.getRange(`A${row}:N${row}`).format.fill = core ? colors.pale : colors.gray;
    sheet.getRange(`O${row}:AC${row}`).format.fill = core ? colors.gold : colors.gray;
    sheet.getRange(`A${row}:AC${row}`).format.rowHeight = core ? 68 : 46;
    if (!core) sheet.getRange(`O${row}`).values = [["只读"]];
  }
  listValidation(sheet.getRange("O8:O677"), ["清楚", "部分清楚", "无法理解", "只读"]);
  for (const column of ["T", "U", "V", "W"]) {
    listValidation(sheet.getRange(`${column}8:${column}677`), ["是", "否", "无法判断"]);
  }
  listValidation(sheet.getRange("X8:X677"), ["是", "否", "不适用", "无法判断"]);
  listValidation(sheet.getRange("Y8:Y677"), ["完成", "未完成或受阻", "仅有进展", "未看到", "无法判断"]);
  listValidation(sheet.getRange("Z8:Z677"), ["低", "中", "高", "无法判断"]);
  setWidths(sheet, {
    A: 16, B: 13, C: 19, D: 19, E: 16, F: 7, G: 14, H: 20, I: 18, J: 16,
    K: 18, L: 14, M: 16, N: 58, O: 14, P: 32, Q: 18, R: 18, S: 18, T: 12,
    U: 14, V: 14, W: 14, X: 12, Y: 16, Z: 14, AA: 28, AB: 16, AC: 28,
  });
}

function writeEvents(workbook, annotator) {
  const sheet = workbook.worksheets.add("04_事项汇总");
  title(
    sheet,
    `样本内事项汇总 · 标注员 ${annotator}`,
    "每个样本预留5行。sample_id 与 clusterid 均可回查；事项名称必须中性、自由产生。",
    "M",
  );
  const headers = [
    "sample_id", "clusterid", "local_event_id", "事项中性名称", "涉及rn", "发起者sourceuid/昵称",
    "对方被期待提供什么", "可见推进过程", "可见结果", "观察到的摩擦", "缺失上下文", "置信度", "备注",
  ];
  sheet.getRange("A7:M7").values = [headers];
  header(sheet.getRange("A7:M7"));
  const rows = [];
  for (const sample of samples) {
    for (let slot = 1; slot <= 5; slot += 1) {
      rows.push([sample.sample_id, sourceValue(clusterFor(sample.sample_id)), `E${slot}`, null, null, null, null, null, null, null, null, null, null]);
    }
  }
  sheet.getRange("A8:M127").values = rows;
  body(sheet.getRange("A8:M127"));
  sheet.getRange("A8:C127").format.fill = colors.sky;
  sheet.getRange("D8:M127").format.fill = colors.gold;
  listValidation(sheet.getRange("I8:I127"), ["完成", "未完成或受阻", "仅有进展", "未看到", "无法判断", "不适用"]);
  listValidation(sheet.getRange("L8:L127"), ["高", "中", "低", "无法判断"]);
  setWidths(sheet, { A: 16, B: 20, C: 14, D: 24, E: 14, F: 24, G: 32, H: 38, I: 16, J: 30, K: 28, L: 12, M: 24 });
}

function writeSampleSummary(workbook, annotator) {
  const sheet = workbook.worksheets.add("05_样本总结");
  title(
    sheet,
    `样本总结 · 标注员 ${annotator}`,
    "完成逐条开放编码和事项切分后填写。自由主题短语保留原始措辞，不在首轮统一名称。",
    "M",
  );
  const headers = [
    "sample_id", "clusterid", "理解充分性", "观察到明确事项", "自由主题1", "自由主题2", "自由主题3",
    "直接可见事实", "待验证解释", "需要补充什么", "整体置信度", "净室异常", "备注",
  ];
  sheet.getRange("A7:M7").values = [headers];
  header(sheet.getRange("A7:M7"));
  const rows = samples.map((s) => [s.sample_id, sourceValue(clusterFor(s.sample_id)), null, null, null, null, null, null, null, null, null, "无", null]);
  sheet.getRange("A8:M31").values = rows;
  body(sheet.getRange("A8:M31"));
  sheet.getRange("A8:B31").format.fill = colors.sky;
  sheet.getRange("C8:M31").format.fill = colors.gold;
  listValidation(sheet.getRange("C8:C31"), ["充分", "部分", "不足", "无法判断"]);
  listValidation(sheet.getRange("D8:D31"), ["是", "否", "无法判断"]);
  listValidation(sheet.getRange("K8:K31"), ["高", "中", "低", "无法判断"]);
  listValidation(sheet.getRange("L8:L31"), ["无", "误看第一次分析材料", "看到另一标注者结果", "外部反查身份", "其他"]);
  setWidths(sheet, { A: 16, B: 20, C: 14, D: 16, E: 20, F: 20, G: 20, H: 40, I: 36, J: 32, K: 14, L: 24, M: 28 });
}

function writeQuestions(workbook, annotator) {
  const sheet = workbook.worksheets.add("06_字段问题");
  title(
    sheet,
    `字段语义与溯源疑问 · 标注员 ${annotator}`,
    "原表值可以直接回查，但字段的业务含义仍可能未知。观察到疑问时追加，不从第一次分析补全解释。",
    "G",
  );
  const headers = ["问题ID", "涉及字段", "待确认问题", "当前状态", "标注中观察", "是否影响判断", "备注"];
  sheet.getRange("A7:G7").values = [headers];
  header(sheet.getRange("A7:G7"));
  const questions = [
    ["Q01", "clusterid / rn", "8,197个窗口是全部符合条件会话还是再次抽样；rn是否为按时间正序前100行？"],
    ["Q02", "id / msgid / replymsgid", "三个标识如何关联，replymsgid引用哪个字段及何种作用域？"],
    ["Q03", "msgcmd", "50724904代表什么类型；是否排除了图片、文件、表情和系统事件？"],
    ["Q04", "clustertype", "0表示绑定班级的群还是教学用途群；是否可能承载教务/管理沟通？"],
    ["Q05", "user_num", "成员数在哪个时点计算，是否包含退群或历史成员？"],
    ["Q06", "targetuids", "单聊/群聊中的语义、逗号列表含义及快照时点是什么？"],
    ["Q07", "msgbucketid / timetag", "字段契约、单位和技术用途是什么？"],
    ["Q08", "msgdata / concent", "哪个是正文主来源，差异和非JSON场景的规则是什么？"],
  ].map((row) => [...row, "待确认", null, null, null]);
  sheet.getRange("A8:G15").values = questions;
  body(sheet.getRange("A8:G35"));
  sheet.getRange("A8:D15").format.fill = colors.pale;
  sheet.getRange("E8:G35").format.fill = colors.gold;
  listValidation(sheet.getRange("F8:F35"), ["是", "否", "不确定", "不适用"]);
  setWidths(sheet, { A: 12, B: 24, C: 58, D: 14, E: 40, F: 16, G: 28 });
}

function writePreservation(workbook) {
  const sheet = workbook.worksheets.add("07_样本保全");
  title(
    sheet,
    "样本保全与原表定位检查",
    "每个样本记录原表行号范围、clusterid 和提取完整性，证明没有因内容难标或不符合预期而静默换样。",
    "M",
  );
  const headers = [
    "sample_id", "clusterid", "原表最小行", "原表最大行", "预期可见行", "实际可见行", "核心行",
    "上下文行", "提取状态", "选择版本", "原表SHA-256", "损失原因", "替补对象",
  ];
  sheet.getRange("A7:M7").values = [headers];
  header(sheet.getRange("A7:M7"));
  const rows = samples.map((sample) => {
    const q = qualityBySample.get(sample.sample_id);
    return [
      sample.sample_id, sourceValue(clusterFor(sample.sample_id)), q.source_excel_row_min, q.source_excel_row_max,
      q.expected_rows, q.extracted_rows, q.core_rows, q.context_only_rows, q.status,
      dataset.selection_method_version, dataset.source.sha256, sample.loss_reason ?? "", sample.replacement_for ?? "",
    ];
  });
  sheet.getRange("A8:M31").values = rows;
  body(sheet.getRange("A8:M31"));
  sheet.getRange("A8:M31").format.fill = colors.green;
  sheet.getRange("A34:E34").values = [["汇总", "样本数", "实际可见行", "核心行", "非ready样本"]];
  header(sheet.getRange("A34:E34"));
  sheet.getRange("A35:E35").values = [["公式核验", null, null, null, null]];
  sheet.getRange("B35:E35").formulas = [["=COUNTA(A8:A31)", "=SUM(F8:F31)", "=SUM(G8:G31)", "=COUNTIF(I8:I31,\"<>ready\")"]];
  body(sheet.getRange("A35:E35"));
  setWidths(sheet, { A: 16, B: 20, C: 14, D: 14, E: 14, F: 14, G: 12, H: 14, I: 14, J: 14, K: 66, L: 20, M: 16 });
}

async function removeInspectSidecar(outputPath) {
  try {
    await fs.unlink(`${outputPath}.inspect.ndjson`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function build(annotator) {
  const workbook = Workbook.create();
  writeInstructions(workbook, annotator);
  writeSampleMap(workbook);
  writeSourceIndex(workbook);
  writeCoding(workbook, annotator);
  writeEvents(workbook, annotator);
  writeSampleSummary(workbook, annotator);
  writeQuestions(workbook, annotator);
  writePreservation(workbook);

  const fileName = `ClassIn_IM_Pilot0_可溯源开放编码_v2_标注员${annotator}_受限版.xlsx`;
  const outputPath = path.join(outputDir, fileName);
  const xlsx = await SpreadsheetFile.exportXlsx(workbook);
  await xlsx.save(outputPath);

  if (annotator === "A") {
    const previewDir = path.join(outputDir, "previews-v2");
    await fs.mkdir(previewDir, { recursive: true });
    const previews = [
      ["00_使用与溯源说明", "A1:L30", "01-instructions.png"],
      ["01_样本与会话映射", "A1:L30", "02-sample-map.png"],
      ["02_原表字段索引", "A1:Z18", "03-source-index.png"],
      ["03_逐条开放编码", "A1:AC20", "04-open-coding.png"],
      ["04_事项汇总", "A1:M22", "05-events.png"],
      ["05_样本总结", "A1:M20", "06-sample-summary.png"],
      ["06_字段问题", "A1:G18", "07-questions.png"],
      ["07_样本保全", "A1:M35", "08-preservation.png"],
    ];
    for (const [sheetName, range, name] of previews) {
      const preview = await workbook.render({ sheetName, range, scale: 1, format: "png" });
      await fs.writeFile(
        path.join(previewDir, name),
        new Uint8Array(await preview.arrayBuffer()),
      );
    }
  }
  await removeInspectSidecar(outputPath);
  return { annotator, outputPath };
}

const outputs = [];
for (const annotator of ["A", "B"]) outputs.push(await build(annotator));

const manifest = {
  status: "TRACEABLE_OPEN_CODING_V2_GENERATED_PENDING_QA",
  meaning_of_real_values: dataset.meaning_of_real_values,
  evidence_chain: "original_xlsx -> current_run_content_blind_selection -> exact_source_value_extraction -> independent_open_coding",
  source_sha256: dataset.source.sha256,
  traceable_input_sha256: await sha256(inputPath),
  selection_method_version: dataset.selection_method_version,
  extraction_method_version: dataset.extraction_method_version,
  handbook_version: "v0.3-traceable-source-values",
  sample_count: dataset.quality.sample_count,
  message_rows: dataset.quality.message_rows,
  core_rows: dataset.quality.core_rows,
  builder_script_sha256: await sha256(process.argv[1]),
  outputs: await Promise.all(
    outputs.map(async ({ annotator, outputPath }) => ({
      annotator,
      outputPath,
      sha256: await sha256(outputPath),
    })),
  ),
};
const manifestPath = path.join(outputDir, "pilot0_traceable_open_coding_manifest_v2.json");
await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ ...manifest, manifestPath }, null, 2)}\n`);
