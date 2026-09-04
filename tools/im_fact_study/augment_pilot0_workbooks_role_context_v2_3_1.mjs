#!/usr/bin/env node

/**
 * Upgrade Pilot 0 v2.3 workbooks to v2.3.1.
 *
 * This revision keeps every evidence and annotation value unchanged. It makes
 * strtalker and user_type explicit read-only context, and adds deterministic
 * sample-level speaker/role summaries derived only from the visible rows.
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const artifactToolModule = process.env.CLASSIN_ARTIFACT_TOOL_MODULE ?? "@oai/artifact-tool";
const { FileBlob, SpreadsheetFile } = await import(artifactToolModule);

const [, , inputA, inputB, outputDir] = process.argv;
if (!inputA || !inputB || !outputDir) {
  throw new Error(
    "Usage: augment_pilot0_workbooks_role_context_v2_3_1.mjs <v2.3-A.xlsx> <v2.3-B.xlsx> <output-dir>",
  );
}

await fs.mkdir(outputDir, { recursive: true });

const colors = {
  ink: "#182C3A",
  navy: "#1F4E6D",
  role: "#355F4B",
  blue: "#DCEEF7",
  pale: "#F4F8FA",
  gray: "#E9EEF1",
  green: "#E6F4EA",
  gold: "#FFF0C2",
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

function styleReadOnly(range, fill = colors.blue) {
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

function setWidths(sheet, widths) {
  for (const [column, width] of Object.entries(widths)) {
    sheet.getRange(`${column}:${column}`).format.columnWidth = width;
  }
}

function value(sheet, address) {
  return sheet.getRange(address).values?.[0]?.[0];
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function addSet(map, key, item) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(item);
}

function buildRoleContext(codingSheet) {
  const samples = new Map();
  for (let row = 8; row <= 677; row += 1) {
    const sampleId = String(value(codingSheet, `A${row}`) ?? "");
    if (!sampleId) continue;
    if (!samples.has(sampleId)) {
      samples.set(sampleId, {
        talkers: new Map(),
        roleMessages: new Map(),
        roleSpeakers: new Map(),
        uidRoles: new Map(),
        msgdataNameMissing: 0,
        msgdataNameDifferent: 0,
      });
    }
    const item = samples.get(sampleId);
    const sourceuid = String(value(codingSheet, `I${row}`) ?? "").trim();
    const strtalker = String(value(codingSheet, `J${row}`) ?? "").trim();
    const msgdataTalker = String(value(codingSheet, `K${row}`) ?? "").trim();
    const userType = String(value(codingSheet, `L${row}`) ?? "").trim();
    const speakerKey = sourceuid || strtalker || "<未知发言人>";
    const talkerKey = `${strtalker || "<显示名缺失>"}\u0000${speakerKey}`;
    increment(item.talkers, talkerKey);
    if (userType) {
      increment(item.roleMessages, userType);
      addSet(item.roleSpeakers, userType, speakerKey);
      addSet(item.uidRoles, speakerKey, userType);
    }
    if (!msgdataTalker) item.msgdataNameMissing += 1;
    else if (strtalker && strtalker !== msgdataTalker) item.msgdataNameDifferent += 1;
  }

  const result = new Map();
  for (const [sampleId, item] of samples) {
    const sortedTalkers = [...item.talkers.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"));
    const talkerParts = sortedTalkers.slice(0, 8).map(([key, count]) => {
        const [name, uid] = key.split("\u0000");
        return `${name} [${uid}] ×${count}条`;
      });
    if (sortedTalkers.length > 8) talkerParts.push(`另${sortedTalkers.length - 8}位发言人，详见03`);
    const talkerSummary = talkerParts.join("\n");
    const roleSummary = [...item.roleMessages.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
      .map(([role, count]) => `${role}：${item.roleSpeakers.get(role)?.size ?? 0}人/${count}条`)
      .join("；");
    const multiRole = [...item.uidRoles.entries()]
      .filter(([, roles]) => roles.size > 1)
      .map(([uid, roles]) => `${uid}：${[...roles].sort().join("/")}`);
    const notices = [];
    notices.push(multiRole.length ? `同一sourceuid角色多值 ${multiRole.join("；")}` : "未观察到同一sourceuid角色多值");
    if (item.msgdataNameMissing) notices.push(`msgdata.strTalker缺失${item.msgdataNameMissing}条，以strtalker为主`);
    if (item.msgdataNameDifferent) notices.push(`两个显示名字段不一致${item.msgdataNameDifferent}条`);
    if (!item.msgdataNameMissing && !item.msgdataNameDifferent) notices.push("显示名校验一致");
    result.set(sampleId, { talkerSummary, roleSummary, notice: notices.join("；") });
  }
  return result;
}

function updateInstructions(workbook, annotator) {
  const sheet = workbook.worksheets.getItem("00_使用与溯源说明");
  sheet.getRange("A1").values = [[`ClassIn IM Pilot 0 角色上下文增强 v2.3.1 · 标注员 ${annotator}`]];
  sheet.getRange("A2").values = [[
    "v2.3.1 在不改原始证据的前提下，将 strtalker 作为发言人识别上下文、user_type 作为当前消息角色上下文。当前仍为方法与可用性审阅版。",
  ]];
  sheet.getRange("A33").values = [["v2.3.1 填写路径"]];
  sheet.getRange("A37:L37").merge(true);
  sheet.getRange("A37").values = [[
    "角色口径：strtalker 用来区分谁在说话，不单独推断角色；user_type 是原表当前消息角色，按消息/样本使用，不固化为用户全局永久身份。",
  ]];
  sheet.getRange("A37:L37").format = { fill: colors.green, wrapText: true, font: { bold: true, color: colors.ink } };

  const examples = workbook.worksheets.getItem("00A_填写示例");
  examples.getRange("A1").values = [[`开放编码规范示例 v2.3.1 · 标注员 ${annotator} · 全部为虚构消息`]];
  examples.getRange("A2").values = [[
    "示例不属于研究样本。正式阅读时，先把 strtalker/sourceuid 作为发言人线索，把 user_type 作为当前消息的原表角色上下文。",
  ]];

  const oneSided = workbook.worksheets.getItem("08_单方可见汇总");
  oneSided.getRange("A1").values = [[`窗口内单方可见样本汇总 v2.3.1 · 标注员 ${annotator}`]];
}

function updateCodingSheet(workbook, annotator) {
  const sheet = workbook.worksheets.getItem("03_逐条开放编码");
  sheet.getRange("A1").values = [[`消息、事项与角色上下文编码 v2.3.1 · 标注员 ${annotator}`]];
  sheet.getRange("A2").values = [[
    "先读完同一 sample_id。J=strtalker 发言人显示名；L=user_type 当前消息角色；K 仅用作显示名校验。这三列均是原表只读上下文。",
  ]];
  sheet.getRange("J7:L7").values = [[
    "strtalker【原表只读｜主要发言人显示名】\n用于区分谁在说话；不单独推断老师/学生",
    "msgdata.strTalker【原表只读｜校验字段】\n与strtalker核对；缺失时以strtalker为主",
    "user_type【原表只读｜当前消息角色】\n班主任/教师/学生/旁听生/其他；按消息和样本使用",
  ]];
  styleHeader(sheet.getRange("J7:L7"), colors.role);
  sheet.getRange("J7:L7").format.rowHeight = 124;
  setWidths(sheet, { J: 24, K: 26, L: 27 });
  return buildRoleContext(sheet);
}

function updateSampleMap(workbook, context) {
  const sheet = workbook.worksheets.getItem("01_样本与会话映射");
  sheet.getRange("A1").values = [["Pilot 0 样本、会话与角色上下文映射 v2.3.1"]];
  sheet.getRange("A2").values = [[
    "M:O 只从当前样本可见消息机械汇总。strtalker 识别发言人；user_type 表达当前消息角色；不从名字猜身份。",
  ]];
  sheet.getRange("M6:O6").values = [[
    "可见发言人结构【只读】\nstrtalker [sourceuid] ×可见消息数",
    "可见角色构成【只读】\nuser_type：发言人数/消息数",
    "角色/显示名提示【只读】\n多值与校验缺口",
  ]];
  styleHeader(sheet.getRange("M6:O6"), colors.role);
  const rows = [];
  for (let row = 7; row <= 30; row += 1) {
    const sampleId = String(value(sheet, `A${row}`) ?? "");
    const item = context.get(sampleId) ?? { talkerSummary: "无法生成", roleSummary: "无法生成", notice: "无法生成" };
    rows.push([item.talkerSummary, item.roleSummary, item.notice]);
  }
  sheet.getRange("M7:O30").values = rows;
  styleReadOnly(sheet.getRange("M7:O30"));
  sheet.getRange("M6:O30").format.rowHeight = 76;
  setWidths(sheet, { M: 54, N: 40, O: 48 });
}

function updateSampleSummary(workbook, annotator, context) {
  const sheet = workbook.worksheets.getItem("05_样本总结");
  sheet.getRange("A1").values = [[`样本总结 v2.3.1 · 标注员 ${annotator}`]];
  sheet.getRange("A2").values = [[
    "N:P 已将同一 sample_id 的 strtalker/sourceuid 和 user_type 汇总为只读背景，不需要切换到其他表手工找角色。",
  ]];
  const band = sheet.getRange("N6:P6");
  band.merge();
  band.values = [["原表角色上下文｜只读｜不从名字猜身份"]];
  styleHeader(band, colors.role);
  sheet.getRange("N7:P7").values = [[
    "可见发言人结构【只读】\nstrtalker [sourceuid] ×消息数",
    "可见角色构成【只读】\nuser_type：发言人数/消息数",
    "角色/显示名提示【只读】",
  ]];
  styleHeader(sheet.getRange("N7:P7"), colors.role);
  const rows = [];
  for (let row = 8; row <= 31; row += 1) {
    const sampleId = String(value(sheet, `A${row}`) ?? "");
    const item = context.get(sampleId) ?? { talkerSummary: "无法生成", roleSummary: "无法生成", notice: "无法生成" };
    rows.push([item.talkerSummary, item.roleSummary, item.notice]);
  }
  sheet.getRange("N8:P31").values = rows;
  styleReadOnly(sheet.getRange("N8:P31"), colors.green);
  sheet.getRange("N7:P31").format.rowHeight = 76;
  setWidths(sheet, { N: 54, O: 40, P: 48 });
}

function updateFieldGuide(workbook) {
  const sheet = workbook.worksheets.getItem("00B_字段速查");
  sheet.getRange("A1").values = [["v2.3.1 字段选项、角色上下文与正反例速查"]];
  sheet.getRange("A2").values = [[
    "strtalker 和 user_type 均是原表只读背景：strtalker 回答‘谁在说话’，user_type 回答‘当前消息中以什么系统角色发言’。",
  ]];
  const extra = [
    ["原表上下文", "strtalker", "原表显示名", "区分当前是哪个发言人；应与sourceuid联合使用", "同一样本中识别两个不同发言人", "仅凭名字/称呼猜老师或学生", "只读"],
    ["原表上下文", "user_type", "班主任/教师/学生/旁听生/其他", "作为当前消息的原表角色背景", "某条原表user_type=班主任，则按班主任观察", "把当前角色固化成该sourceuid的全局永久身份", "只读"],
    ["原表上下文", "identity", "1/2/3/192/NULL", "只作为user_type的原始编码校验", "identity=1与user_type=学生核对", "要求标注员背数字编码", "只读/索引表"],
    ["原表上下文", "msgdata.strTalker", "解析显示名", "仅用来与strtalker核对", "两字段一致时作为校验", "缺失时反过来覆盖完整的strtalker", "只读/校验"],
    ["样本上下文", "同一sourceuid角色多值", "未观察到/列出多值", "提醒user_type可能与会话、班级或时点相关", "同一sourceuid在样本内同时出现教师/班主任", "自动判定数据错误或选一个角色覆盖", "只读提示"],
  ];
  sheet.getRange("A51:G55").values = extra;
  styleReadOnly(sheet.getRange("A51:G55"), colors.green);
  sheet.getRange("A51:G55").format.rowHeight = 62;
}

async function augment(inputPath, annotator) {
  const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));
  updateInstructions(workbook, annotator);
  const context = updateCodingSheet(workbook, annotator);
  updateSampleMap(workbook, context);
  updateSampleSummary(workbook, annotator, context);
  updateFieldGuide(workbook);

  const outputPath = path.join(
    outputDir,
    `ClassIn_IM_Pilot0_可溯源开放编码_v2.3.1_标注员${annotator}_角色上下文增强受限版.xlsx`,
  );
  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(outputPath);

  if (annotator === "A") {
    const previewDir = path.join(outputDir, "previews-v2.3.1");
    await fs.mkdir(previewDir, { recursive: true });
    const previews = [
      ["00_使用与溯源说明", "A1:L37", "01-instructions.png"],
      ["01_样本与会话映射", "A1:O18", "02-sample-role-context.png"],
      ["03_逐条开放编码", "H1:P13", "03-message-role-context.png"],
      ["05_样本总结", "A1:P18", "04-summary-role-context.png"],
      ["00B_字段速查", "A45:G55", "05-role-field-guide.png"],
    ];
    for (const [sheetName, range, fileName] of previews) {
      const image = await workbook.render({ sheetName, range, scale: 1.2, format: "png" });
      await fs.writeFile(path.join(previewDir, fileName), new Uint8Array(await image.arrayBuffer()));
    }
  }

  const coding = workbook.worksheets.getItem("03_逐条开放编码");
  let strtalkerNonblank = 0;
  let userTypeNonblank = 0;
  let msgdataTalkerNonblank = 0;
  for (let row = 8; row <= 677; row += 1) {
    if (String(value(coding, `J${row}`) ?? "").trim()) strtalkerNonblank += 1;
    if (String(value(coding, `L${row}`) ?? "").trim()) userTypeNonblank += 1;
    if (String(value(coding, `K${row}`) ?? "").trim()) msgdataTalkerNonblank += 1;
  }
  return { annotator, inputPath, outputPath, strtalkerNonblank, userTypeNonblank, msgdataTalkerNonblank };
}

const results = [await augment(inputA, "A"), await augment(inputB, "B")];
const manifest = {
  status: "TRACEABLE_OPEN_CODING_V2_3_1_ROLE_CONTEXT_GENERATED_PENDING_QA",
  source_version: "v2.3",
  version: "v2.3.1",
  review_state: "METHOD_AND_USABILITY_REVIEW_BEFORE_REAL_IM_CONTEXT_ANNOTATION",
  role_context_policy: {
    strtalker: "primary visible-speaker display name; not role truth",
    user_type: "raw current-message role context; not global permanent identity",
    msgdata_strTalker: "validation-only; strtalker remains primary when missing",
  },
  raw_evidence_policy: "message-row values unchanged; only explanatory headers and deterministic sample summaries added",
  builder_script_sha256: await sha256(process.argv[1]),
  outputs: await Promise.all(results.map(async (item) => ({
    annotator: item.annotator,
    input_path: item.inputPath,
    input_sha256: await sha256(item.inputPath),
    output_path: item.outputPath,
    output_sha256: await sha256(item.outputPath),
    pilot_visible_rows: 670,
    strtalker_nonblank: item.strtalkerNonblank,
    user_type_nonblank: item.userTypeNonblank,
    msgdata_strTalker_nonblank: item.msgdataTalkerNonblank,
  }))),
};
const manifestPath = path.join(outputDir, "pilot0_role_context_manifest_v2_3_1.json");
await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ ...manifest, manifestPath }, null, 2)}\n`);
