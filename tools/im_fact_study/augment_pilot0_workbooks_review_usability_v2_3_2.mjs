#!/usr/bin/env node

/**
 * Upgrade Pilot 0 v2.3.1 workbooks to v2.3.2.
 *
 * This revision keeps all visible source evidence and existing annotation
 * values unchanged. It expands the example-sheet headers with decision help,
 * moves sample-level inputs into the first core row of each sample on sheet 03,
 * and turns sheet 05 into a formula-driven read-only review mirror.
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const artifactToolModule = process.env.CLASSIN_ARTIFACT_TOOL_MODULE ?? "@oai/artifact-tool";
const { FileBlob, SpreadsheetFile } = await import(artifactToolModule);

const [, , inputA, inputB, outputDir] = process.argv;
if (!inputA || !inputB || !outputDir) {
  throw new Error(
    "Usage: augment_pilot0_workbooks_review_usability_v2_3_2.mjs <v2.3.1-A.xlsx> <v2.3.1-B.xlsx> <output-dir>",
  );
}

await fs.mkdir(outputDir, { recursive: true });

const colors = {
  ink: "#182C3A",
  navy: "#1F4E6D",
  blue: "#DCEEF7",
  gray: "#E9EEF1",
  green: "#E6F4EA",
  greenStrong: "#2F6F4E",
  purple: "#EEE7F6",
  purpleStrong: "#6B4F8A",
  white: "#FFFFFF",
  border: "#C7D1D7",
};

async function sha256(filePath) {
  return crypto.createHash("sha256").update(await fs.readFile(filePath)).digest("hex");
}

function value(sheet, address) {
  return sheet.getRange(address).values?.[0]?.[0];
}

function styleHeader(range, fill = colors.navy) {
  range.format = {
    fill,
    font: { bold: true, color: colors.white, size: 9 },
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

function styleBody(range, fill) {
  range.format = {
    fill,
    font: { color: colors.ink, size: 9 },
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

function mergedLabel(sheet, address, label, fill, fontColor = colors.white) {
  const range = sheet.getRange(address);
  try { range.unmerge(); } catch {}
  range.merge();
  range.values = [[label]];
  range.format = {
    fill,
    font: { bold: true, color: fontColor, size: 10 },
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

function listValidation(range, values) {
  range.dataValidation = {
    rule: { type: "list", values },
    prompt: { title: "按可见证据选择", message: values.join(" / "), show: true },
    errorAlert: { title: "请使用规定取值", message: values.join(" / "), style: "stop", show: true },
    ignoreBlanks: true,
    inCellDropDown: true,
  };
}

function setWidths(sheet, widths) {
  for (const [column, width] of Object.entries(widths)) {
    sheet.getRange(`${column}:${column}`).format.columnWidth = width;
  }
}

function standardSummaryRows(codingSheet) {
  const firstRows = new Map();
  for (let row = 8; row <= 677; row += 1) {
    const sampleId = String(value(codingSheet, `A${row}`) ?? "");
    const scope = String(value(codingSheet, `G${row}`) ?? "");
    if (sampleId && scope === "核心-需标注" && !firstRows.has(sampleId)) firstRows.set(sampleId, row);
  }
  return firstRows;
}

function updateInstructions(workbook, annotator) {
  const sheet = workbook.worksheets.getItem("00_使用与溯源说明");
  sheet.getRange("A1").values = [[`ClassIn IM Pilot 0 一体化审阅 v2.3.2 · 标注员 ${annotator}`]];
  sheet.getRange("A2").values = [[
    "v2.3.2 将消息层、事项层和样本层集中到 03；05 只做自动镜像。00A 的填写标题直接给出取值、Good case 与 Bad case。",
  ]];
  sheet.getRange("A33").values = [["v2.3.2 填写路径"]];
  sheet.getRange("A34:L37").clear({ applyTo: "contents" });
  sheet.getRange("A34:A37").values = [
    ["先看 00A 示例表头；所有下拉取值、Good case 和 Bad case 已贴在标题中。"],
    ["标准轨只填 03：每条黄色核心消息填消息层；事项首次出现行填绿色事项层；每个样本唯一紫色行填样本层。"],
    ["05 是 03 样本层的自动镜像，只用于集中复核，不再填写、不再人工对应 sample_id。"],
    ["DIR1 单方轨仍填 03 橙色消息字段 + 08；不填绿色事项层和紫色样本层。"],
  ];
  sheet.getRange("A34:L37").format = { fill: colors.purple, wrapText: true, font: { color: colors.ink } };
}

function updateExamples(workbook, annotator) {
  const sheet = workbook.worksheets.getItem("00A_填写示例");
  sheet.getRange("A1").values = [[`开放编码规范示例 v2.3.2 · 标注员 ${annotator} · 全部为虚构消息`]];
  sheet.getRange("A2").values = [[
    "每个填写标题均带取值或推荐写法，并列 Good case / Bad case。示例只用于理解规则，不属于研究样本。",
  ]];

  const messageHeaders = [
    "例【只读编号】",
    "虚构消息【只读证据】",
    "事实性概括【自由】\nGood:发送者询问开始时间\nBad:学生需要AI提醒",
    "开放码1【自由】\nGood:询问开始时间\nBad:课程相关/AI需求",
    "开放码2【选填】\nGood:确有第二动作\nBad:重复开放码1",
    "明确提问【是/否/无法判断】\nGood:‘几点?’=是\nBad:‘在吗?’直接算是",
    "行动请求【是/否/无法判断】\nGood:‘请发文件’=是\nBad:‘文件发了吗?’直接算是",
    "时效要求【明确时限/模糊时效/未见时效】\nGood:8点前=明确；尽快=模糊；未出现时间=未见\nBad:尽快=未见时效",
    "提交/分享物【是/否/无法判断】\nGood:本条附图=是\nBad:请发图=是",
    "本条回应前文【是/否/无法判断】\nGood:回答/确认=是；新事项/独立首句=否\nBad:因后文有回答把问题行写是",
    "本条提供的结果证据【完成/受阻/仅有进展/未看到/无法判断】\nGood:请求清楚但无结果=未看到\nBad:一律填无法判断",
    "上下文依赖【低/中/高/无法判断】\nGood:‘收到’需邻近消息=中\nBad:短消息都填无法判断",
    "证据边界/推断警报【自由；无则写无】\n推荐:附件未核验/前文缺失/角色未确认\nBad:对方故意不回",
    "local_event_id【E1/E2…/NONE/UNKNOWN】\nGood:同一事项沿用E1\nBad:每句话建新事件",
    "关键理由【自由】\nGood:指出可见证据\nBad:写产品建议",
  ];
  sheet.getRange("A6:O6").values = [messageHeaders];
  styleHeader(sheet.getRange("A6:O6"));
  sheet.getRange("A6:O6").format.rowHeight = 190;
  sheet.getRange("H7:H14").values = [
    ["明确时限"], ["明确时限"], ["未见时效"], ["未见时效"],
    ["明确时限"], ["未见时效"], ["未见时效"], ["模糊时效"],
  ];

  const eventHeaders = [
    "事件ID【E1/E2…】\nGood:同一事项同ID\nBad:预设5个",
    "事项中性名称【自由】\nGood:确认开始时间\nBad:需要AI提醒",
    "涉及消息【示例定位】\nGood:例1–3\nBad:无证据范围",
    "发起者【示例定位】\nGood:例1发送者\nBad:猜真实身份",
    "对方被期待提供什么【自由】\nGood:提供开始时间\nBad:改善体验",
    "可见推进过程【自由】\nGood:按消息链概括\nBad:补写窗口外过程",
    "可见结果【完成/受阻/仅有进展/未看到/无法判断】\nGood:按整条事项链\nBad:有人回复就完成",
    "观察到的摩擦【自由】\nGood:附件未核验\nBad:用户不配合",
    "缺失上下文【自由】\nGood:缺窗口外回复\nBad:编造缺失内容",
    "置信度【高/中/低/无法判断】\nGood:链完整=高\nBad:关键前文缺失仍高",
  ];
  sheet.getRange("A17:J17").values = [eventHeaders];
  styleHeader(sheet.getRange("A17:J17"), colors.greenStrong);
  sheet.getRange("A17:J17").format.rowHeight = 160;

  sheet.getRange("A35").values = [[
    "完成一个 sample_id 后，直接在 03 的唯一紫色样本总结行填写；05 会自动镜像，不再切表补写。",
  ]];

  const oneSidedHeaders = [
    "虚构可见消息【只读】",
    "直接事实【自由】\nGood:记录发送者动作\nBad:猜对方态度",
    "窗口内对方发言【是/否/无法判断】\nGood:只按窗口结构\nBad:等同真实回复",
    "对方实际是否回应【是/否/无法判断】\nGood:证据不足=无法判断\nBad:窗口单方=否",
    "可见结果【完成/受阻/仅有进展/未看到/无法判断】\nGood:按可见证据\nBad:自动推断结果",
    "填写去向【只读】",
  ];
  sheet.getRange("A39:F39").values = [oneSidedHeaders];
  styleHeader(sheet.getRange("A39:F39"), colors.purpleStrong);
  sheet.getRange("A39:F39").format.rowHeight = 150;

  const combinedHeaders = [
    "消息【只读】",
    "事实概括【自由】\nGood:中性动作\nBad:需求推断",
    "开放码1【自由】\nGood:动作+对象\nBad:宽泛主题",
    "提问【是/否/无法判断】\nGood:索取答案=是\nBad:呼叫=是",
    "行动请求【是/否/无法判断】\nGood:请提交=是\nBad:问状态=是",
    "时效【明确时限/模糊时效/未见时效】\nGood:尽快=模糊；未出现时间=未见\nBad:尽快=未见时效",
    "提交【是/否/无法判断】\nGood:本条附图=是\nBad:请发图=是",
    "回应前文【是/否/无法判断】\nGood:回答=是；独立首句=否\nBad:问题行因后文有回答写是",
    "结果证据【完成/受阻/仅有进展/未看到/无法判断】\nGood:无结果=未看到\nBad:全填无法判断",
    "上下文依赖【低/中/高/无法判断】\nGood:需邻近=中\nBad:短=无法判断",
    "证据边界/推断警报【自由】\nGood:无/附件未核验\nBad:对方故意不回",
    "event_id【E1/E2…/NONE/UNKNOWN】\nGood:同事项同ID\nBad:每句新ID",
    "标注备注【选填】\nGood:合理替代解释\nBad:产品建议",
    "事项中性名称【事项首行】\nGood:确认开始时间\nBad:需要AI",
    "对方期待【事项首行】\nGood:提供时间\nBad:改善体验",
    "事项状态【完成/受阻/仅有进展/未看到/无法判断】\nGood:按完整链\nBad:回复=完成",
    "事项缺口【选填】\nGood:缺窗口外回复\nBad:需要AI催办",
    "是否填写事项字段【填/不填】\nGood:首次出现=填\nBad:每行都填",
    "原因【自由】\nGood:指出首次/沿用\nBad:无证据判断",
  ];
  sheet.getRange("A48:S48").values = [combinedHeaders];
  styleHeader(sheet.getRange("A48:S48"), colors.greenStrong);
  sheet.getRange("A48:S48").format.rowHeight = 185;
  sheet.getRange("F49:F52").values = [["明确时限"], ["明确时限"], ["未见时效"], ["模糊时效"]];
  setWidths(sheet, { C: 33, D: 28, E: 26, F: 27, G: 28, H: 34, I: 28, J: 34, K: 43, L: 31, M: 40, N: 31, O: 38 });
}

function updateCoding(workbook, annotator, previousSummaryValues) {
  const sheet = workbook.worksheets.getItem("03_逐条开放编码");
  const summaryRows = standardSummaryRows(sheet);
  sheet.getRange("A1").values = [[`消息、事项、样本与角色上下文一体化编码 v2.3.2 · 标注员 ${annotator}`]];
  sheet.getRange("A2").values = [[
    "只填本页：黄色=每条核心消息；绿色=事项首次出现行；紫色=每个 sample_id 唯一样本总结行。05 自动镜像，不填写。",
  ]];
  try { sheet.getRange("A5:AG5").unmerge(); } catch {}
  mergedLabel(
    sheet,
    "A5:AR5",
    "方法审阅版｜灰色只读；黄色消息层；绿色事项层；紫色样本层。先读完同一 sample_id，再按层级填写。",
    colors.blue,
    colors.ink,
  );
  mergedLabel(sheet, "AH6:AR6", "样本层｜仅每个 sample_id 的唯一紫色核心行填写一次；05 自动镜像", colors.purpleStrong);

  sheet.getRange("Y7").values = [[
    "本条提供的结果证据【下拉】\n完成=直接见目标达成｜受阻=明确失败/拒绝/权限障碍｜仅有进展=中间步骤｜未看到=事项清楚但本条无结果｜无法判断=连事项/结果类型都不清楚\nGood:请求后无结果=未看到｜Bad:一律无法判断",
  ]];
  sheet.getRange("V7").values = [[
    "时效要求【明确时限/模糊时效/未见时效】\n明确=具体日期/时点/时段/截止边界｜模糊=尽快/抓紧/早点｜未见=当前可见内容没有时效表达\n消息载荷缺失改由‘可理解程度’和‘证据边界’记录，不再设‘无法判断’",
  ]];
  sheet.getRange("X7").values = [[
    "本条是否回应前文【是/否/无法判断】\n是=明确回答/确认/拒绝/纠正/补充前文｜否=新事项、独立通知或没有可回应前文的首句｜无法判断=明显承接但关键前文缺失\n原‘不适用’并入‘否’",
  ]];
  sheet.getRange("AA7").values = [[
    "证据边界/推断警报【自由；无则写无】\n推荐:附件未核验/关键前文缺失/角色关系未确认/窗口外结果不可见\nGood:附件未核验｜Bad:对方故意不回",
  ]];
  sheet.getRange("AF7").values = [[
    "事项可见状态【事项首行·下拉】\n完成｜受阻｜仅有进展｜未看到｜无法判断；按完整可见事项链，不因有人回复就完成",
  ]];

  const summaryHeaders = [
    "理解充分性【充分/部分/不足/无法判断】\nGood:多数链可追踪=充分\nBad:照搬单条清楚程度",
    "观察到明确事项【是/否/无法判断】\nGood:至少一个可切分事项=是\nBad:纯情绪表达=是",
    "自由主题1【自由】\nGood:来自样本可见沟通\nBad:预设产品主题",
    "自由主题2【选填】\nGood:确有第二主题\nBad:为了填满",
    "自由主题3【选填】\nGood:确有第三主题\nBad:重复主题1",
    "直接可见事实【必填】\nGood:只写片段能证明什么\nBad:写用户真实动机",
    "待验证解释【选填】\nGood:明确写‘可能…待验证’\nBad:把假设写成事实",
    "需要补充什么【必填】\nGood:窗口外消息/附件/角色定义\nBad:笼统写更多数据",
    "整体置信度【高/中/低/无法判断】\nGood:链完整=高\nBad:关键缺口仍高",
    "净室异常【无/误看第一次材料/看到另一标注结果/外部反查身份/其他】\nGood:未污染=无\nBad:发生污染仍写无",
    "备注【选填】\nGood:记录仲裁点\nBad:写产品建议",
  ];
  sheet.getRange("AH7:AR7").values = [summaryHeaders];
  styleHeader(sheet.getRange("AH7:AR7"), colors.purpleStrong);
  styleHeader(sheet.getRange("Y7"));
  styleHeader(sheet.getRange("V7"));
  styleHeader(sheet.getRange("X7"));
  styleHeader(sheet.getRange("AA7"));
  styleHeader(sheet.getRange("AF7"), colors.greenStrong);
  sheet.getRange("A7:AR7").format.rowHeight = 195;

  styleBody(sheet.getRange("AH8:AR677"), colors.gray);
  for (const [sampleId, row] of summaryRows) {
    const prior = previousSummaryValues.get(sampleId) ?? Array(11).fill(null);
    sheet.getRange(`AH${row}:AR${row}`).values = [prior];
    styleBody(sheet.getRange(`AH${row}:AR${row}`), colors.purple);
    listValidation(sheet.getRange(`AH${row}`), ["充分", "部分", "不足", "无法判断"]);
    listValidation(sheet.getRange(`AI${row}`), ["是", "否", "无法判断"]);
    listValidation(sheet.getRange(`AP${row}`), ["高", "中", "低", "无法判断"]);
    listValidation(sheet.getRange(`AQ${row}`), ["无", "误看第一次分析材料", "看到另一标注者结果", "外部反查身份", "其他"]);
  }
  listValidation(sheet.getRange("Y8:Y677"), ["完成", "受阻", "仅有进展", "未看到", "无法判断"]);
  listValidation(sheet.getRange("V8:V677"), ["明确时限", "模糊时效", "未见时效"]);
  listValidation(sheet.getRange("X8:X677"), ["是", "否", "无法判断"]);
  listValidation(sheet.getRange("AF8:AF677"), ["完成", "受阻", "仅有进展", "未看到", "无法判断"]);
  setWidths(sheet, {
    Y: 46, AA: 45, AF: 32,
    AH: 34, AI: 34, AJ: 30, AK: 28, AL: 28, AM: 44, AN: 42, AO: 42, AP: 32, AQ: 44, AR: 36,
  });
  return summaryRows;
}

function captureSummaryValues(workbook) {
  const sheet = workbook.worksheets.getItem("05_样本总结");
  const values = new Map();
  for (let row = 8; row <= 31; row += 1) {
    const sampleId = String(value(sheet, `A${row}`) ?? "");
    if (!sampleId) continue;
    values.set(sampleId, sheet.getRange(`C${row}:M${row}`).values?.[0] ?? Array(11).fill(null));
  }
  return values;
}

function mirrorFormula(column, row) {
  const ref = `'03_逐条开放编码'!${column}${row}`;
  return `=IF(${ref}="","",${ref})`;
}

function updateSummaryMirror(workbook, annotator, summaryRows) {
  const sheet = workbook.worksheets.getItem("05_样本总结");
  sheet.getRange("A1").values = [[`样本总结自动镜像 v2.3.2 · 标注员 ${annotator} · 本页只读`]];
  sheet.getRange("A2").values = [[
    "本页自动汇总 03 中每个 sample_id 的唯一紫色样本总结行。请只在 03 填写；这里不再人工关联 ID、不再录入。",
  ]];
  sheet.getRange("A3").values = [[
    "标准轨自动镜像；DIR1 仍转到 08。若本页为空，先检查 03 对应紫色行是否已填写。",
  ]];
  const headers = [
    "理解充分性【自动镜像03】", "观察到明确事项【自动镜像03】", "自由主题1【自动镜像03】",
    "自由主题2【自动镜像03】", "自由主题3【自动镜像03】", "直接可见事实【自动镜像03】",
    "待验证解释【自动镜像03】", "需要补充什么【自动镜像03】", "整体置信度【自动镜像03】",
    "净室异常【自动镜像03】", "备注【自动镜像03】",
  ];
  sheet.getRange("C7:M7").values = [headers];
  styleHeader(sheet.getRange("C7:M7"), colors.purpleStrong);
  sheet.getRange("C7:M7").format.rowHeight = 88;
  const importedValidations = sheet.dataValidations.items;
  importedValidations.splice(0, importedValidations.length);
  styleBody(sheet.getRange("C8:M31"), colors.gray);

  const sourceColumns = ["AH", "AI", "AJ", "AK", "AL", "AM", "AN", "AO", "AP", "AQ", "AR"];
  for (let row = 8; row <= 31; row += 1) {
    const sampleId = String(value(sheet, `A${row}`) ?? "");
    const sourceRow = summaryRows.get(sampleId);
    if (!sourceRow) continue;
    sheet.getRange(`C${row}:M${row}`).formulas = [[...sourceColumns.map((column) => mirrorFormula(column, sourceRow))]];
  }
}

function updateOtherSheets(workbook, annotator) {
  const sampleMap = workbook.worksheets.getItem("01_样本与会话映射");
  sampleMap.getRange("A1").values = [["Pilot 0 样本、会话与角色上下文映射 v2.3.2"]];
  sampleMap.getRange("A2").values = [[
    "标准轨所有人工填写集中在 03；05 自动镜像 03 的样本层。M:O 仍是当前样本可见发言人与角色的机械汇总。",
  ]];
  sampleMap.getRange("A34").values = [[
    "P0-DIR1-01/02｜单方可见边界轨：使用 03 橙色简化消息字段 + 08；不填写绿色事项层或紫色样本层。",
  ]];
  sampleMap.getRange("A35").values = [[
    "P0-DIR2 与群聊样本｜标准轨：只填 03；每个事项填一次绿色字段，每个样本填一次紫色字段；05 自动镜像。",
  ]];

  const guide = workbook.worksheets.getItem("00B_字段速查");
  guide.getRange("A1").values = [["v2.3.2 字段选项、正反例与一体化填写速查"]];
  guide.getRange("A2").values = [[
    "‘未看到’=事项可识别但片段没有结果；‘无法判断’=连事项或结果类型都无法识别。推断警报记录证据边界，不判断用户好坏。",
  ]];
  guide.getRange("C30").values = [["受阻"]];
  guide.getRange("D30:F30").values = [[
    "明确失败、拒绝、权限问题或其他可见障碍",
    "上传失败/被明确拒绝/没有权限",
    "只是暂未看到结果时不要选",
  ]];
  guide.getRange("B38").values = [["证据边界/推断警报"]];
  guide.getRange("D38:F38").values = [[
    "记录判断可能越过可见证据的地方；无则写无",
    "附件未核验/关键前文缺失/角色关系未确认",
    "对方故意不回（把猜测写成事实）",
  ]];
  guide.getRange("A46:A48").values = [["03 样本层（紫色首行）"], ["03 样本层（紫色首行）"], ["03 样本层（紫色首行）"]];
  guide.getRange("C25:G28").values = [
    ["是", "当前消息明确回答、确认、拒绝、纠正或补充前文", "问‘几点？’后的‘19点。’", "原问题行本身不是回应", "必填"],
    ["否", "当前消息发起新问题或新事项，没有回应可见前文", "明天几点开始？", "因为后文有人回答就把本条改成是", "必填"],
    ["否", "当前是独立通知、首句，或没有可回应的前文；原‘不适用’情形并入否", "独立通知的第一句", "继续使用‘不适用’造成无收益的分歧", "必填"],
    ["无法判断", "消息明显承接其他内容，但关键前文在窗口外或缺失", "核心片段第一句写‘还是不行’但看不到对象", "可见明确回答或明确独立发起时不要选", "必填"],
  ];
  guide.getRange("C18:G21").values = [
    ["明确时限", "出现可执行的日期、时点、时段或截止边界", "今晚8点前提交。", "请尽快提交（没有具体边界）", "必填"],
    ["模糊时效", "明确要求加快，但没有具体截止点", "请尽快提交。", "有明确‘今晚8点前’时不要选", "必填"],
    ["未见时效", "当前可见内容没有出现具体或模糊时效表达", "请把作业发给我。", "出现‘尽快/抓紧/早点’时不要选", "必填"],
    ["未见时效", "载荷缺失时也只记录‘当前未见’，同时在可理解程度与证据边界标记缺失", "不可解析附件：时效=未见；可理解程度=无法理解", "另选‘无法判断’造成与可理解程度重复", "必填"],
  ];
  guide.getRange("A56:G58").values = [
    ["03 消息层", "结果证据：未看到 vs 无法判断", "未看到/无法判断", "事项清楚但无结果选未看到；连事项/结果类型都不清楚才选无法判断", "请求清楚、窗口内没有结果=未看到", "为了省事大部分都选无法判断", "必填口径"],
    ["03 消息层", "证据边界/推断警报推荐写法", "自由文本", "写无/附件未核验/关键前文缺失/角色关系未确认/窗口外结果不可见", "附件占位存在但内容不可见=附件未核验", "对方偷懒/故意不回", "必填；无则写无"],
    ["05 自动镜像", "样本总结", "只读公式", "只在03唯一紫色行填写；05自动展示", "完成03紫色行后到05集中复核", "在03和05重复填写或人工对ID", "不填写05"],
  ];
  styleBody(guide.getRange("A56:G58"), colors.purple);
  guide.getRange("A56:G58").format.rowHeight = 70;

  const oneSided = workbook.worksheets.getItem("08_单方可见汇总");
  oneSided.getRange("A1").values = [[`窗口内单方可见样本汇总 v2.3.2 · 标注员 ${annotator}`]];
}

async function augment(inputPath, annotator) {
  const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));
  const previousSummaryValues = captureSummaryValues(workbook);
  updateInstructions(workbook, annotator);
  updateExamples(workbook, annotator);
  const summaryRows = updateCoding(workbook, annotator, previousSummaryValues);
  updateSummaryMirror(workbook, annotator, summaryRows);
  updateOtherSheets(workbook, annotator);

  const outputPath = path.join(
    outputDir,
    `ClassIn_IM_Pilot0_可溯源开放编码_v2.3.2_标注员${annotator}_一体化审阅受限版.xlsx`,
  );
  await (await SpreadsheetFile.exportXlsx(workbook)).save(outputPath);

  if (annotator === "A") {
    const previewDir = path.join(outputDir, "previews-v2.3.2");
    await fs.mkdir(previewDir, { recursive: true });
    const previews = [
      ["00A_填写示例", "A1:O18", "01-example-headers.png"],
      ["00A_填写示例", "A47:S52", "02-combined-example.png"],
      ["03_逐条开放编码", "T1:AR13", "03-result-inference-sample-layer.png"],
      ["05_样本总结", "A1:P18", "04-summary-auto-mirror.png"],
      ["00B_字段速查", "A26:G58", "05-field-guide.png"],
    ];
    for (const [sheetName, range, fileName] of previews) {
      const image = await workbook.render({ sheetName, range, scale: 1.2, format: "png" });
      await fs.writeFile(path.join(previewDir, fileName), new Uint8Array(await image.arrayBuffer()));
    }
  }
  return { annotator, inputPath, outputPath, summaryRowCount: summaryRows.size };
}

const results = [await augment(inputA, "A"), await augment(inputB, "B")];
const manifest = {
  status: "TRACEABLE_OPEN_CODING_V2_3_2_USABILITY_REVIEW_GENERATED_PENDING_QA",
  source_version: "v2.3.1",
  version: "v2.3.2",
  review_state: "METHOD_AND_USABILITY_REVIEW_BEFORE_REAL_IM_CONTEXT_ANNOTATION",
  changes: {
    examples: "all main example-table headers include allowed values or recommended phrases plus Good/Bad cases",
    sample_summary: "entered once in sheet 03 first core row per standard sample; sheet 05 is a read-only formula mirror",
    inference_warning: "renamed as evidence-boundary/inference alert with recommended evidence-limited phrases",
    prior_response: "yes/no/undeterminable; the former not-applicable value is merged into no because row position and event structure already carry that distinction",
    timeliness: "explicit/vague/not-seen; the former undeterminable value is removed because payload loss is already captured by comprehensibility and evidence-boundary fields",
    result_evidence: "completed/blocked/progress/not-seen/undeterminable; not-seen is distinct from undeterminable",
  },
  preservation_policy: "03 A:AG row values and all source evidence remain unchanged; new sample inputs are appended at AH:AR",
  builder_script_sha256: await sha256(process.argv[1]),
  outputs: await Promise.all(results.map(async (item) => ({
    annotator: item.annotator,
    input_path: item.inputPath,
    input_sha256: await sha256(item.inputPath),
    output_path: item.outputPath,
    output_sha256: await sha256(item.outputPath),
    standard_sample_summary_rows: item.summaryRowCount,
  }))),
};
const manifestPath = path.join(outputDir, "pilot0_usability_manifest_v2_3_2.json");
await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ ...manifest, manifestPath }, null, 2)}\n`);
