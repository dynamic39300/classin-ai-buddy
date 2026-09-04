#!/usr/bin/env node

/**
 * Upgrade Pilot 0 v2.2 workbooks to v2.3.
 *
 * v2.3 keeps raw evidence unchanged, merges message-level coding and
 * event-level summaries into one worksheet, replaces binary time handling
 * with four-valued timeliness handling, and exposes decision examples next
 * to the table headers.
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const artifactToolModule = process.env.CLASSIN_ARTIFACT_TOOL_MODULE ?? "@oai/artifact-tool";
const { FileBlob, SpreadsheetFile } = await import(artifactToolModule);

const [, , inputA, inputB, outputDir] = process.argv;
if (!inputA || !inputB || !outputDir) {
  throw new Error(
    "Usage: augment_pilot0_workbooks_unified_v2_3.mjs <v2.2-A.xlsx> <v2.2-B.xlsx> <output-dir>",
  );
}

await fs.mkdir(outputDir, { recursive: true });

const colors = {
  ink: "#182C3A",
  navy: "#1F4E6D",
  blue: "#DCEEF7",
  pale: "#F4F8FA",
  gold: "#FFF0C2",
  gray: "#E9EEF1",
  green: "#E6F4EA",
  greenStrong: "#2F6F4E",
  orange: "#FCE8D5",
  orangeStrong: "#C65D12",
  redPale: "#FBE9E7",
  white: "#FFFFFF",
  border: "#C7D1D7",
};

async function sha256(filePath) {
  return crypto.createHash("sha256").update(await fs.readFile(filePath)).digest("hex");
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

function mergedLabel(sheet, address, value, fill, fontColor = colors.ink) {
  const range = sheet.getRange(address);
  range.merge();
  range.values = [[value]];
  range.format = {
    fill,
    font: { bold: true, color: fontColor },
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
  range.dataValidation = { rule: { type: "list", values } };
}

function isOneSided(sampleId) {
  return String(sampleId ?? "").startsWith("P0-DIR1-");
}

function setWidths(sheet, widths) {
  for (const [column, width] of Object.entries(widths)) {
    sheet.getRange(`${column}:${column}`).format.columnWidth = width;
  }
}

function updateInstructions(workbook, annotator) {
  const sheet = workbook.worksheets.getItem("00_使用与溯源说明");
  sheet.getRange("A1").values = [[`ClassIn IM Pilot 0 合并简化标注 v2.3 · 标注员 ${annotator}`]];
  sheet.getRange("A2").values = [[
    "v2.3 将逐条消息编码和事项总结放在同一张表；取消人工跨表抄写 ID。当前为方法与可用性审阅版，等真实 IM 现场和上下文充分时再正式填写。",
  ]];
  sheet.getRange("A9").values = [["可见原表行"]];
  sheet.getRange("B9").formulas = [["=COUNTA('03_逐条开放编码'!A8:A677)"]];
  sheet.getRange("B10").formulas = [[
    '=COUNTIF(\'03_逐条开放编码\'!G8:G677,"核心-需标注")&" / "&COUNTIF(\'03_逐条开放编码\'!G8:G677,"单方核心-简化")',
  ]];
  mergedLabel(sheet, "A33:L33", "v2.3 填写路径", colors.navy, colors.white);
  sheet.getRange("A34:L37").merge(true);
  sheet.getRange("A34:A37").values = [
    ["先看 00B_字段速查；03 的表头也直接显示下拉值、正例和反例。"],
    ["标准轨：只在 03 填消息字段；一个事项首次出现的消息行再填右侧4个事项字段；完成后填 05_样本总结。"],
    ["单方轨：填 03 橙色简化消息字段，再填 08_单方可见汇总；不做正常事项闭环。"],
    ["事件数量由 03 实际使用的 E1/E2…决定，不再预置5个事件；ID、rn、sourceuid 等由后续脚本自动整理。"],
  ];
  sheet.getRange("A34:L37").format = { fill: colors.gold, wrapText: true };
}

function updateExamples(workbook, annotator) {
  const sheet = workbook.worksheets.getItem("00A_填写示例");
  sheet.getRange("A1").values = [[`开放编码规范示例 v2.3 · 标注员 ${annotator} · 全部为虚构消息`]];
  sheet.getRange("A2").values = [[
    "本页只示范填写逻辑。正式填写先看 00B_字段速查，再进入 03_逐条开放编码（消息与事项已合并）；示例不属于研究样本。",
  ]];
  sheet.getRange("H6").values = [["时效要求"]];
  sheet.getRange("H7:H13").values = [
    ["明确时限"], ["明确时限"], ["无"], ["无"], ["明确时限"], ["无"], ["无"],
  ];
  sheet.getRange("A14:O14").values = [[
    "8", "请尽快提交作业。", "发送者要求对方尽快提交作业", "请求提交作业", "表达紧迫性",
    "否", "是", "模糊时效", "否", "否", "未看到", "低", "无具体截止点", "E3",
    "‘尽快’有时效要求但没有明确截止时间，应选‘模糊时效’",
  ]];
  styleBody(sheet.getRange("A14:O14"));
  sheet.getRange("A14:O14").format.fill = colors.green;
  sheet.getRange("A14:O14").format.rowHeight = 62;

  mergedLabel(sheet, "A47:S47", "消息与事项合并填写示例", colors.greenStrong, colors.white);
  sheet.getRange("A48:S48").values = [[
    "消息", "事实概括", "开放码1", "提问", "行动请求", "时效要求", "提交", "回应前文", "结果证据",
    "上下文依赖", "推断警报", "event_id", "标注备注", "事项中性名称", "对方被期待提供什么",
    "事项可见状态", "事项关键缺口/备注", "是否填写事项字段", "原因",
  ]];
  styleHeader(sheet.getRange("A48:S48"), colors.greenStrong);
  sheet.getRange("A49:S52").values = [
    ["明天几点开始？", "发送者询问第二天开始时间", "询问开始时间", "是", "否", "明确时限", "否", "否", "未看到", "低", "无", "E1", null, "确认课程开始时间", "提供明确开始时间", "未看到", null, "填", "E1 首次出现，在本行填写事项字段"],
    ["明天19:00开始。", "发送者告知开始时间", "告知开始时间", "否", "否", "明确时限", "否", "是", "未看到", "低", "无", "E1", null, null, null, null, null, "不填", "仍属于 E1，事项字段只填一次"],
    ["收到。", "发送者确认收到信息", "确认收到", "否", "否", "无", "否", "是", "未看到", "中", "无", "E1", null, null, null, null, null, "不填", "仍属于 E1；收到不自动等于事项完成"],
    ["请尽快提交作业。", "发送者要求尽快提交作业", "请求提交作业", "否", "是", "模糊时效", "否", "否", "未看到", "低", "无具体截止点", "E2", null, "收集作业提交", "提交作业材料", "未看到", "缺少提交结果", "填", "新事项 E2 首次出现"],
  ];
  styleBody(sheet.getRange("A49:S52"));
  sheet.getRange("A49:S52").format.fill = colors.green;
  sheet.getRange("A49:S52").format.rowHeight = 58;
  setWidths(sheet, { P: 24, Q: 28, R: 18, S: 34 });
}

function updateSampleMap(workbook) {
  const sheet = workbook.worksheets.getItem("01_样本与会话映射");
  sheet.getRange("A2").values = [[
    "v2.3 标准轨使用 03_逐条开放编码（消息与事项已合并）+ 05_样本总结；DIR1 单方边界轨使用 03 + 08。当前用于表格与方法审阅。",
  ]];
  sheet.getRange("A34:L35").merge(true);
  sheet.getRange("A34:A35").values = [
    ["P0-DIR1-01/02｜单方可见边界轨：使用 03 橙色简化消息字段 + 08，不填写事项首行字段。"],
    ["P0-DIR2 与群聊样本｜标准轨：使用 03；每个实际事项只在首次出现行填写一次右侧事项字段，之后填 05。"],
  ];
  sheet.getRange("A34:L35").format = { fill: colors.pale, wrapText: true };
}

function updateSourceIndex(workbook) {
  const sheet = workbook.worksheets.getItem("02_原表字段索引");
  sheet.getRange("A2").values = [[
    "原表字段和值保持不变。本页只读；正式编码在 03_逐条开放编码（消息与事项已合并），字段判断可查 00B_字段速查。",
  ]];
}

function updateUnifiedCoding(workbook, annotator) {
  const sheet = workbook.worksheets.getItem("03_逐条开放编码");
  sheet.getRange("A1").values = [[`消息与事项合并编码 v2.3 · 标注员 ${annotator}`]];
  sheet.getRange("A2").values = [[
    "先读完同一 sample_id，再逐条标。标准轨：每条核心消息填 O:AC；每个事项只在首次出现的消息行填 AD:AG。DIR1 不填 AD:AG。",
  ]];
  mergedLabel(
    sheet,
    "A5:AG5",
    "当前为方法审阅版｜黄色=标准消息字段；绿色=事项首次出现行只填一次；橙色=单方简化；灰色=只读。事件数量由实际使用的 E1/E2…决定。",
    colors.blue,
  );
  for (const address of ["A6:N6", "O6:Q6", "R6:S6", "T6:X6", "Z6:AA6"]) {
    try { sheet.getRange(address).unmerge(); } catch {}
  }
  sheet.getRange("A6:AG6").clear({ applyTo: "contents" });
  mergedLabel(sheet, "A6:N6", "原表证据｜只读", colors.gray);
  mergedLabel(sheet, "O6:AC6", "消息层｜每条核心消息填写；字段内含选择例", colors.gold);
  mergedLabel(sheet, "AD6:AG6", "事项层｜仅该事项首次出现的消息行填写一次", colors.green);

  const headers = [
    "可理解程度【下拉】\n清楚=可直接判断｜部分清楚=缺对象/指代｜无法理解=载荷缺失",
    "事实性概括【自由】\n好:发送者询问上课时间\n坏:用户需要AI帮助",
    "开放码1【自由】\n好:询问上课时间\n坏:课程相关/需要AI提醒",
    "开放码2【选填】\n仅第二个可区分动作\n坏:重复开放码1",
    "开放码3【选填】\n仅第三个可区分动作\n通常留空",
    "明确提问【下拉】\n是=索取答案‘几点?’｜否=陈述/呼叫‘在吗?’｜无法判断=内容缺失",
    "行动请求【下拉】\n是=‘请发文件’｜否=‘文件发了吗?’主要问状态｜无法判断=缺内容",
    "时效要求【下拉】\n明确时限=今晚8点前｜模糊时效=尽快｜无=未提时效｜无法判断=缺内容",
    "提交/分享物【下拉】\n是=本条已附图/声明已发｜否=请对方发｜无法判断=载荷缺失",
    "本条是否回应前文【下拉】\n是=回答/确认｜否=新问题｜不适用=无前文事项｜无法判断=前文缺失",
    "结果证据【下拉】\n完成｜受阻｜仅有进展｜未看到｜无法判断；‘收到’不自动完成",
    "上下文依赖【下拉】\n低=单条稳定｜中=看邻近消息｜高=依赖窗口外｜无法判断=不可理解",
    "推断警报【自由】\n好:无/附件不可见\n坏:对方故意不回",
    "local_event_id【自由填短值】\nE1/E2…=按实际事项顺序编号，不设上限｜NONE=无事项｜UNKNOWN=疑似但无法切分",
    "标注备注【选填】\n写另一种合理解释或仲裁点；不要写产品建议",
    "事项中性名称【事项首行】\n好:确认课程开始时间\n坏:需要AI提醒",
    "对方被期待提供什么【事项首行】\n好:提供开始时间\n坏:改善体验",
    "事项可见状态【事项首行·下拉】\n完成｜受阻｜仅有进展｜未看到｜无法判断",
    "事项关键缺口/备注【事项首行·选填】\n如:缺少窗口外回复/附件内容",
  ];
  sheet.getRange("O7:AG7").values = [headers];
  styleHeader(sheet.getRange("A7:N7"));
  styleHeader(sheet.getRange("O7:AC7"), colors.navy);
  styleHeader(sheet.getRange("AD7:AG7"), colors.greenStrong);
  sheet.getRange("A7:AG7").format.rowHeight = 124;

  listValidation(sheet.getRange("V8:V677"), ["明确时限", "模糊时效", "无", "无法判断"]);
  listValidation(sheet.getRange("AF8:AF677"), ["完成", "未完成或受阻", "仅有进展", "未看到", "无法判断"]);

  for (let row = 8; row <= 677; row += 1) {
    const sampleId = sheet.getRange(`A${row}`).values?.[0]?.[0];
    const scope = String(sheet.getRange(`G${row}`).values?.[0]?.[0] ?? "");
    const context = scope.includes("上下文");
    const oneSided = isOneSided(sampleId);
    if (context) {
      sheet.getRange(`O${row}:AG${row}`).format.fill = colors.gray;
      continue;
    }
    if (oneSided) {
      sheet.getRange(`O${row}:AC${row}`).format.fill = colors.orange;
      sheet.getRange(`AD${row}:AG${row}`).format.fill = colors.gray;
    } else {
      sheet.getRange(`O${row}:AC${row}`).format.fill = colors.gold;
      sheet.getRange(`AD${row}:AG${row}`).format.fill = colors.green;
    }
  }
  styleBody(sheet.getRange("AD8:AG677"));
  setWidths(sheet, {
    O: 23, P: 35, Q: 27, R: 25, S: 23, T: 27, U: 29, V: 31, W: 29,
    X: 31, Y: 30, Z: 29, AA: 27, AB: 28, AC: 30, AD: 32, AE: 34, AF: 25, AG: 34,
  });
  try {
    sheet.freezePanes.freezeRows(7);
    sheet.freezePanes.freezeColumns(2);
  } catch {}
}

function replaceEventSheetAndRenumber(workbook, annotator) {
  workbook.worksheets.getItem("04_事项汇总").delete();

  const summary = workbook.worksheets.getItem("05_样本总结");
  summary.getRange("A1").values = [[`样本总结 v2.3 · 标注员 ${annotator}`]];
  summary.getRange("A2").values = [[
    "完成 03 的消息与事项合并编码后填写。本页不再要求重复抄写事件 ID、rn、sourceuid 或昵称。",
  ]];
  summary.getRange("A5").values = [[
    "标准轨填写本页；DIR1 不填，转到 08_单方可见汇总。表头内含下拉值提示，完整例子见 00B。",
  ]];
  summary.getRange("C7:M7").values = [[
    "理解充分性【下拉】\n充分/部分/不足/无法判断",
    "观察到明确事项【下拉】\n是/否/无法判断",
    "自由主题1【自由】\n来自本样本，不预设主题",
    "自由主题2【选填】",
    "自由主题3【选填】",
    "直接可见事实【必填】\n只写当前片段能证明什么",
    "待验证解释【选填】\n必须明确写成假设",
    "需要补充什么【必填】\n如角色/窗口外消息/附件",
    "整体置信度【下拉】\n高/中/低/无法判断",
    "净室异常【下拉】\n通常选无",
    "备注【选填】",
  ]];
  styleHeader(summary.getRange("A7:M7"));
  summary.getRange("A7:M7").format.rowHeight = 92;
  for (let row = 8; row <= 31; row += 1) {
    if (isOneSided(summary.getRange(`A${row}`).values?.[0]?.[0])) {
      summary.getRange(`M${row}`).values = [["只读·转08"]];
    }
  }

  const questions = workbook.worksheets.getItem("06_字段问题");
  const preservation = workbook.worksheets.getItem("07_样本保全");
  const oneSided = workbook.worksheets.getItem("08_单方可见汇总");
  oneSided.getRange("A1").values = [[`窗口内单方可见样本汇总 v2.3 · 标注员 ${annotator}`]];
  oneSided.getRange("A2").values = [[
    "本页只处理 P0-DIR1-01/02。先填 03 橙色简化消息字段，再填本页；不填写 03 右侧绿色事项字段。",
  ]];
  oneSided.getRange("E7:M7").values = [[
    "发送者主要行为【自由】\n只写窗口内可见动作",
    "是否重复跟进【下拉】\n是/否/无法判断",
    "是否出现明确问题或请求【下拉】\n是/否/无法判断",
    "窗口内是否观察到对方发言【下拉】\n按窗口事实",
    "对方实际是否回应【下拉】\n无完整证据选无法判断",
    "可见结果【下拉】\n完成/受阻/进展/未看到/无法判断",
    "缺失信息【自由】\n如另一方向消息",
    "置信度【下拉】\n高/中/低/无法判断",
    "备注【选填】",
  ]];
  styleHeader(oneSided.getRange("A7:M7"));
  oneSided.getRange("A7:M7").format.rowHeight = 92;
}

function addFieldGuide(workbook) {
  const sheet = workbook.worksheets.add("00B_字段速查");
  sheet.showGridLines = false;
  const title = sheet.getRange("A1:G1");
  title.merge();
  title.values = [["v2.3 字段选项与正反例速查"]];
  title.format = { fill: colors.ink, font: { bold: true, color: colors.white, size: 18 } };
  title.format.rowHeight = 32;
  const note = sheet.getRange("A2:G3");
  note.merge();
  note.values = [[
    "本页覆盖主要人工填写字段。‘否’表示有足够证据确认不符合；‘无法判断’表示证据不足。表头中也保留了精简提示。",
  ]];
  note.format = { fill: colors.blue, wrapText: true, font: { color: colors.ink } };
  sheet.getRange("A5:G5").values = [["工作表/层级", "字段", "输入方式/选项", "什么时候选", "Good case", "不选/Bad case", "要求"]];
  styleHeader(sheet.getRange("A5:G5"));

  const rows = [
    ["03 消息层", "可理解程度", "清楚", "不猜测即可说明本条在做什么", "‘明天几点开始？’", "对象和载荷都缺失时不要选", "必填"],
    ["03 消息层", "可理解程度", "部分清楚", "能看出大体动作，但对象/指代缺失", "‘这个还是不行’且有少量前文", "完全无法解析时不要选", "必填"],
    ["03 消息层", "可理解程度", "无法理解", "纯符号、载荷缺失或严重截断", "只剩不可解析占位符", "短但行为清楚的‘收到’不选", "必填"],
    ["03 消息层", "事实性概括", "自由文本", "中性描述发送者直接做了什么", "发送者询问第二天开始时间", "学生需要AI提醒（身份和产品推断）", "必填"],
    ["03 消息层", "开放码1", "自由文本", "用‘动作+对象’概括主要沟通行为", "询问上课时间", "课程相关（过宽）/需要AI提醒（产品结论）", "必填"],
    ["03 消息层", "开放码2/3", "自由文本", "确有第二/第三个可区分动作时", "告知开始时间 + 请求提前进入", "为了填满而重复开放码1", "选填"],
    ["03 消息层", "明确提问", "是", "明确向对方索取事实、解释或答案", "几点开始？", "在吗？通常只是呼叫", "必填"],
    ["03 消息层", "明确提问", "否", "陈述、告知、表达或注意力呼叫", "我已经提交了。", "内容缺失时不要强选否", "必填"],
    ["03 消息层", "明确提问", "无法判断", "正文或关键载荷缺失", "只见无法解析的消息载荷", "可明确判断为陈述时不要选", "必填"],
    ["03 消息层", "行动请求", "是", "要求对方执行一个动作", "请把文件发给我。", "文件发了吗？主要询问状态", "必填"],
    ["03 消息层", "行动请求", "否", "没有要求对方采取行动", "文件收到了。", "隐含动作但证据不足时用无法判断", "必填"],
    ["03 消息层", "行动请求", "无法判断", "无法确认是否在要求动作", "残缺文本‘能不能……’", "明确请求时不要选", "必填"],
    ["03 消息层", "时效要求", "明确时限", "出现可执行的日期、时点、时段或截止边界", "今晚8点前提交。", "请尽快提交（没有具体边界）", "必填"],
    ["03 消息层", "时效要求", "模糊时效", "明确要求加快，但没有具体截止点", "请尽快提交。", "有明确‘今晚8点前’时应选明确时限", "必填"],
    ["03 消息层", "时效要求", "无", "未表达时间或紧迫性", "请把作业发给我。", "出现‘尽快/抓紧/早点’时不要选", "必填"],
    ["03 消息层", "时效要求", "无法判断", "正文/附件缺失，无法判断是否含时效", "不可解析的通知附件", "只是没写时间时应选无", "必填"],
    ["03 消息层", "提交/分享物", "是", "本条实际提交、附带或声明已分享内容", "这是作业图片。[图片]", "请把作业图片发来（只是请求）", "必填"],
    ["03 消息层", "提交/分享物", "否", "没有实际提交或分享", "请发文件。", "附件占位存在但内容未知时不要忽略载荷", "必填"],
    ["03 消息层", "提交/分享物", "无法判断", "载荷丢失，无法确认是否实际分享", "消息类型显示附件但内容缺失", "可见附件时不要选", "必填"],
    ["03 消息层", "本条是否回应前文", "是", "当前消息回答、确认、拒绝、纠正或补充前文", "问‘几点？’后的‘19点。’", "原问题行本身不是回应", "必填"],
    ["03 消息层", "本条是否回应前文", "否", "当前消息发起新问题/事项", "明天几点开始？", "因为后文有人回答就把本条改成是", "必填"],
    ["03 消息层", "本条是否回应前文", "不适用", "明确没有需要回应的前文事项", "独立通知的第一句", "前文缺失而非确定不存在时不要选", "必填"],
    ["03 消息层", "本条是否回应前文", "无法判断", "关键前文在窗口外或缺失", "核心片段第一句明显承接外部内容", "可见明确回答时不要选", "必填"],
    ["03 消息层", "结果证据", "完成", "目标结果明确出现", "我已经提交了。", "收到（通常只证明回应）", "标准轨必填"],
    ["03 消息层", "结果证据", "未完成或受阻", "明确失败、拒绝、权限问题或仍未完成", "上传失败了。", "只是暂未看到结果时不要选", "标准轨必填"],
    ["03 消息层", "结果证据", "仅有进展", "正在处理或提交了中间材料", "正在上传。", "已经提交完成应选完成", "标准轨必填"],
    ["03 消息层", "结果证据", "未看到", "能识别事项，但当前片段没出现结果", "提出请求后没有结果消息", "连事项都无法识别时选无法判断", "标准轨必填"],
    ["03 消息层", "结果证据", "无法判断", "上下文不足，连结果类型都无法识别", "附件与前后文均缺失", "清楚地没看到结果时选未看到", "标准轨必填"],
    ["03 消息层", "上下文依赖", "低", "单看本条即可稳定判断", "明天几点开始？", "需要前后文才能理解的‘收到’", "必填"],
    ["03 消息层", "上下文依赖", "中", "需要邻近几条可见消息", "收到。", "必须依赖窗口外信息时不要选", "必填"],
    ["03 消息层", "上下文依赖", "高", "关键对象、目的或结果依赖窗口外/缺失内容", "这个还是不行。", "本条已完整清楚时不要选", "必填"],
    ["03 消息层", "上下文依赖", "无法判断", "消息本身不可理解", "不可解析载荷", "短但可理解不等于无法判断", "必填"],
    ["03 消息层", "推断警报", "自由文本", "指出判断可能猜过头的地方；无则写无", "附件内容不可见", "对方故意不回（无直接证据）", "必填"],
    ["03 消息层", "local_event_id", "E1 / E2 / E3…", "当前消息属于实际观察到的某一事项；按实际数量顺序编号，不设上限", "三条围绕开课时间的消息都用E1", "每句话都新建一个事件，或为了‘填满’预设5个事件", "标准轨必填"],
    ["03 消息层", "local_event_id", "NONE", "问候、纯表达或无明确事项", "今天这道题太难了（无求助）", "存在明确请求时不要选", "标准轨必填"],
    ["03 消息层", "local_event_id", "UNKNOWN", "疑似有关联事项但无法切分", "收到（看不到它回应什么）", "明确无事项时应选NONE", "标准轨必填"],
    ["03 事项层", "事项中性名称", "自由文本", "同一事件首次出现的消息行填写一次", "确认课程开始时间", "课程管理需求/需要AI提醒", "事项首行必填"],
    ["03 事项层", "对方被期待提供什么", "自由文本", "写该事项期待对方提供的答案、动作或材料", "提供明确开始时间", "改善沟通体验（过于抽象）", "事项首行必填"],
    ["03 事项层", "事项可见状态", "完成/受阻/仅有进展/未看到/无法判断", "按完整可见事项链判断", "对方已提交作业=完成", "只因有人回复就选完成", "事项首行必填"],
    ["03 事项层", "事项关键缺口/备注", "自由文本", "记录影响事项判断的窗口或载荷缺口", "缺少窗口外回复", "需要增加AI催办", "选填"],
    ["05 样本层", "理解充分性", "充分/部分/不足/无法判断", "评价整个样本可见内容是否足够理解", "多数事项链可追踪=充分", "把单条消息的清楚程度直接照搬", "必填"],
    ["05 样本层", "观察到明确事项", "是/否/无法判断", "样本内是否至少有一个可切分事项", "出现请求并有明确对象=是", "只有情绪表达时不要选是", "必填"],
    ["05 样本层", "整体置信度", "高/中/低/无法判断", "评价样本总结判断的证据把握", "可见链完整=高", "关键上下文缺失仍选高", "必填"],
    ["08 单方轨", "窗口内是否观察到对方发言", "是/否/无法判断", "只记录当前窗口结构", "DIR1当前通常为否", "把否解释成对方真实没回复", "必填"],
    ["08 单方轨", "对方实际是否回应", "是/否/无法判断", "只有直接证据时判断真实回应", "当前证据不足=无法判断", "因为窗口只见一人就选否", "必填"],
  ];
  sheet.getRange(`A6:G${5 + rows.length}`).values = rows;
  styleBody(sheet.getRange(`A6:G${5 + rows.length}`));
  for (let row = 6; row <= 5 + rows.length; row += 1) {
    const group = String(sheet.getRange(`A${row}`).values?.[0]?.[0] ?? "");
    sheet.getRange(`A${row}:G${row}`).format.fill = group.includes("事项层")
      ? colors.green
      : group.includes("单方")
        ? colors.orange
        : group.includes("样本层")
          ? colors.blue
          : colors.pale;
  }
  setWidths(sheet, { A: 18, B: 24, C: 25, D: 40, E: 36, F: 42, G: 18 });
  try { sheet.freezePanes.freezeRows(5); } catch {}
}

function orderSheets(workbook) {
  const ordered = [
    "00_使用与溯源说明", "00A_填写示例", "00B_字段速查", "01_样本与会话映射",
    "02_原表字段索引", "03_逐条开放编码", "05_样本总结", "06_字段问题",
    "07_样本保全", "08_单方可见汇总",
  ];
  ordered.forEach((name, index) => { workbook.worksheets.getItem(name).index = index; });
}

async function augment(inputPath, annotator) {
  const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));
  updateInstructions(workbook, annotator);
  updateExamples(workbook, annotator);
  updateSampleMap(workbook);
  updateSourceIndex(workbook);
  updateUnifiedCoding(workbook, annotator);
  replaceEventSheetAndRenumber(workbook, annotator);
  addFieldGuide(workbook);
  orderSheets(workbook);

  const outputPath = path.join(
    outputDir,
    `ClassIn_IM_Pilot0_可溯源开放编码_v2.3_标注员${annotator}_合并简化受限版.xlsx`,
  );
  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(outputPath);

  if (annotator === "A") {
    const previewDir = path.join(outputDir, "previews-v2.3");
    await fs.mkdir(previewDir, { recursive: true });
    const previews = [
      ["00_使用与溯源说明", "A1:L37", "01-instructions.png"],
      ["00B_字段速查", "A1:G28", "02-field-guide-a.png"],
      ["00B_字段速查", "A29:G50", "03-field-guide-b.png"],
      ["00A_填写示例", "A1:O14", "04-examples.png"],
      ["00A_填写示例", "A47:S52", "05-unified-example.png"],
      ["03_逐条开放编码", "N65:AG80", "06-unified-standard.png"],
      ["05_样本总结", "A1:M18", "07-sample-summary.png"],
      ["08_单方可见汇总", "A1:M16", "08-one-sided-summary.png"],
    ];
    for (const [sheetName, range, fileName] of previews) {
      const image = await workbook.render({ sheetName, range, scale: 1, format: "png" });
      await fs.writeFile(path.join(previewDir, fileName), new Uint8Array(await image.arrayBuffer()));
    }
  }
  return { annotator, inputPath, outputPath };
}

const results = [await augment(inputA, "A"), await augment(inputB, "B")];
const manifest = {
  status: "TRACEABLE_OPEN_CODING_V2_3_UNIFIED_GENERATED_PENDING_QA",
  source_version: "v2.2",
  version: "v2.3",
  review_state: "METHOD_AND_USABILITY_REVIEW_BEFORE_REAL_IM_CONTEXT_ANNOTATION",
  unified_sheet: "03_逐条开放编码（消息与事项已合并）",
  removed_manual_sheet: "04_事项汇总",
  timeliness_values: ["明确时限", "模糊时效", "无", "无法判断"],
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
const manifestPath = path.join(outputDir, "pilot0_unified_manifest_v2_3.json");
await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ ...manifest, manifestPath }, null, 2)}\n`);
