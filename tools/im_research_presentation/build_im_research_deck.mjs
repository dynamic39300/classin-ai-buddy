import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const PptxGenJS = require('pptxgenjs');

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'ClassIn AI IM Research';
pptx.company = 'ClassIn';
pptx.subject = 'ClassIn IM 真实会话语义调研管理层汇报';
pptx.title = '人们在 ClassIn IM 里，究竟在聊什么？';
pptx.lang = 'zh-CN';
pptx.theme = {
  headFontFace: 'Arial Unicode MS',
  bodyFontFace: 'Arial Unicode MS',
  lang: 'zh-CN',
};
pptx.defineSlideMaster({
  title: 'CLASSIN_RESEARCH',
  background: { color: 'F6F3EC' },
  objects: [],
      slideNumber: { x: 12.22, y: 7.08, w: 0.52, h: 0.16, fontFace: 'Arial', fontSize: 8, color: '7B8C92', align: 'right', margin: 0 },
});

const W = 13.333;
const H = 7.5;
const F = 'Arial Unicode MS';
const A = 'Arial';
const C = {
  bg: 'F6F3EC',
  paper: 'FFFDF8',
  white: 'FFFFFF',
  navy: '0B2D3B',
  navy2: '163E4A',
  ink: '17252C',
  muted: '65757C',
  faint: 'D9E1DF',
  teal: '147A72',
  teal2: '3C9B8F',
  tealSoft: 'DCEFEA',
  blue: '426E9B',
  blueSoft: 'E3EBF3',
  orange: 'E58B44',
  orangeSoft: 'F8E8D8',
  red: 'C85A55',
  redSoft: 'F6E3E0',
  purple: '7A62A6',
  purpleSoft: 'ECE7F5',
  lime: '7E9D42',
  limeSoft: 'E8EEDB',
  graySoft: 'ECF0EF',
};

const S = pptx.ShapeType;

function addText(slide, text, x, y, w, h, opts = {}) {
  const base = {
    x, y, w, h,
    fontFace: F,
    fontSize: 14,
    color: C.ink,
    margin: 0,
    breakLine: false,
    valign: 'mid',
    fit: 'shrink',
    ...opts,
  };
  slide.addText(text, base);
}

function addRich(slide, runs, x, y, w, h, opts = {}) {
  slide.addText(runs, {
    x, y, w, h,
    fontFace: F,
    fontSize: 14,
    color: C.ink,
    margin: 0,
    valign: 'mid',
    fit: 'shrink',
    ...opts,
  });
}

function addRect(slide, x, y, w, h, fill, line = fill, radius = true, opts = {}) {
  slide.addShape(radius ? S.roundRect : S.rect, {
    x, y, w, h,
    rectRadius: radius ? 0.08 : undefined,
    fill: { color: fill },
    line: { color: line, width: opts.lineWidth ?? 0.8, transparency: opts.lineTransparency ?? 0 },
    shadow: opts.shadow ? { type: 'outer', color: 'A8B4B4', blur: 1.5, angle: 45, distance: 1, opacity: 0.12 } : undefined,
  });
}

function addLine(slide, x, y, w, h, color = C.faint, width = 1, dash = 'solid', endArrowType) {
  slide.addShape(S.line, {
    x, y, w, h,
    line: { color, width, dashType: dash, beginArrowType: 'none', endArrowType },
  });
}

function addPill(slide, text, x, y, w, fill = C.tealSoft, color = C.teal, fontSize = 10.5) {
  addRect(slide, x, y, w, 0.3, fill, fill, true);
  addText(slide, text, x, y + 0.005, w, 0.29, { fontSize, color, bold: true, align: 'center' });
}

function addHeader(slide, kicker, title, subtitle = '') {
  addText(slide, kicker.toUpperCase(), 0.55, 0.28, 4.6, 0.22, { fontFace: A, fontSize: 9.5, bold: true, color: C.teal, charSpacing: 1.4 });
  addText(slide, title, 0.55, 0.56, 12.1, 0.54, { fontSize: 25.5, bold: true, color: C.navy, valign: 'top' });
  if (subtitle) addText(slide, subtitle, 0.57, 1.12, 11.9, 0.34, { fontSize: 11.5, color: C.muted, valign: 'top' });
}

function addFooter(slide, section = 'ClassIn IM 真实会话调研') {
  addLine(slide, 0.55, 7.06, 12.15, 0, 'D7DEDC', 0.7);
  addText(slide, `${section}  ·  固定样本内事实，不直接外推为全平台发生率`, 0.55, 7.1, 8.6, 0.18, { fontSize: 8.2, color: '78878D', valign: 'top' });
}

function addSectionChip(slide, n, label, x = 11.6, y = 0.3, color = C.teal) {
  addRect(slide, x, y, 1.12, 0.32, color, color, true);
  addText(slide, `${String(n).padStart(2, '0')}  ${label}`, x, y, 1.12, 0.31, { fontSize: 9.2, color: C.white, bold: true, align: 'center' });
}

function addStatCard(slide, x, y, w, h, value, label, note, accent = C.teal) {
  addRect(slide, x, y, w, h, C.paper, 'D7DFDD', true, { shadow: true });
  slide.addShape(S.rect, { x, y, w: 0.07, h, fill: { color: accent }, line: { color: accent, transparency: 100 } });
  addText(slide, value, x + 0.22, y + 0.17, w - 0.35, 0.44, { fontFace: A, fontSize: 25, bold: true, color: accent, valign: 'top' });
  addText(slide, label, x + 0.22, y + 0.64, w - 0.35, 0.27, { fontSize: 12.4, bold: true, color: C.ink, valign: 'top' });
  if (note) addText(slide, note, x + 0.22, y + 0.98, w - 0.35, h - 1.08, { fontSize: 9.7, color: C.muted, valign: 'top', breakLine: false, paraSpaceAfterPt: 3 });
}

function addPerson(slide, x, y, r, char, label, fill, labelSide = 'below') {
  slide.addShape(S.ellipse, { x, y, w: r, h: r, fill: { color: fill }, line: { color: fill } });
  addText(slide, char, x, y, r, r, { fontSize: r * 18, color: C.white, bold: true, align: 'center' });
  if (labelSide === 'below') addText(slide, label, x - 0.35, y + r + 0.08, r + 0.7, 0.25, { fontSize: 10.2, color: C.ink, bold: true, align: 'center' });
}

function addChatBubble(slide, role, text, x, y, w, h, side = 'left', color = C.teal) {
  const fill = side === 'left' ? C.white : C.tealSoft;
  const line = side === 'left' ? 'D7DFDD' : color;
  addRect(slide, x, y, w, h, fill, line, true);
  addText(slide, role, x + 0.15, y + 0.09, w - 0.3, 0.2, { fontSize: 9.4, color, bold: true, valign: 'top' });
  addText(slide, text, x + 0.15, y + 0.3, w - 0.3, h - 0.38, { fontSize: 11.2, color: C.ink, valign: 'top' });
}

function addBulletList(slide, items, x, y, w, h, opts = {}) {
  const fontSize = opts.fontSize ?? 12.5;
  const color = opts.color ?? C.ink;
  const gap = h / items.length;
  items.forEach((item, i) => {
    slide.addShape(S.ellipse, { x, y: y + i * gap + 0.12, w: 0.08, h: 0.08, fill: { color: opts.bulletColor ?? C.teal }, line: { color: opts.bulletColor ?? C.teal } });
    addText(slide, item, x + 0.17, y + i * gap, w - 0.17, gap, { fontSize, color, valign: 'top', bold: opts.bold ?? false });
  });
}

function addBar(slide, label, value, maxValue, x, y, w, color, valueSuffix = '%') {
  addText(slide, label, x, y, 2.25, 0.26, { fontSize: 11.1, color: C.ink, bold: true, valign: 'mid' });
  addRect(slide, x + 2.35, y + 0.05, w - 3.05, 0.15, 'E3E8E6', 'E3E8E6', true);
  const bw = (w - 3.05) * value / maxValue;
  addRect(slide, x + 2.35, y + 0.05, Math.max(bw, 0.07), 0.15, color, color, true);
  addText(slide, `${value}${valueSuffix}`, x + w - 0.62, y - 0.005, 0.62, 0.25, { fontFace: A, fontSize: 10.7, color, bold: true, align: 'right' });
}

function baseSlide(sectionNo, sectionLabel, kicker, title, subtitle = '') {
  const slide = pptx.addSlide('CLASSIN_RESEARCH');
  addHeader(slide, kicker, title, subtitle);
  addSectionChip(slide, sectionNo, sectionLabel);
  addFooter(slide);
  return slide;
}

// 1. Cover
{
  const slide = pptx.addSlide();
  slide.background = { color: C.navy };
  addText(slide, 'CLASSIN · IM RESEARCH', 0.65, 0.48, 4.2, 0.26, { fontFace: A, fontSize: 11, bold: true, color: '88C7BC', charSpacing: 1.4 });
  addText(slide, '人们在 ClassIn IM 里，\n究竟在聊什么？', 0.65, 1.24, 7.3, 1.55, { fontSize: 31, bold: true, color: C.white, valign: 'top', breakLine: false, breakLineOnOverflow: false });
  addText(slide, '从 1000 个真实会话窗口出发，理解教学、运营与关系现场，\n以及 IM 与 AI Agent 真正值得介入的位置', 0.69, 3.02, 6.65, 0.92, { fontSize: 15.2, color: 'DCE9E7', valign: 'top', breakLine: false });

  addChatBubble(slide, '教师', '今晚能调到 7 点半吗？', 8.1, 1.18, 3.4, 0.86, 'left', C.orange);
  addChatBubble(slide, '学生', '第五题我改完了，再帮我看看。', 8.8, 2.26, 3.55, 0.9, 'right', C.teal2);
  addChatBubble(slide, '教学管理者', '课时已核对，下一步提交财务。', 7.75, 3.41, 3.72, 0.92, 'left', C.blue);
  addChatBubble(slide, '学生', '给我一个作文开头的启发就好。', 8.55, 4.58, 3.66, 0.9, 'right', C.purple);

  addPill(slide, '固定 1000 个会话窗口', 0.67, 5.5, 2.25, '254B57', 'DCE9E7', 10.2);
  addPill(slide, '100,000 条消息', 3.02, 5.5, 1.75, '254B57', 'DCE9E7', 10.2);
  addPill(slide, '面向管理层与产品专家', 4.88, 5.5, 2.25, '254B57', 'DCE9E7', 10.2);
  addText(slide, '2026.09 · 管理层汇报版', 0.68, 6.68, 3.2, 0.25, { fontFace: A, fontSize: 10.3, color: '9FB6BB' });
  addText(slide, '研究边界：脱敏固定样本，结论用于理解主要结构，不直接外推全平台发生率', 7.1, 6.68, 5.45, 0.25, { fontSize: 8.5, color: '9FB6BB', align: 'right' });
  slide.addNotes('开场不要先讲技术方法。先抛出问题：真实的教学 IM 里，人们究竟在完成什么？本报告不是功能方案，而是从真实沟通现场建立产品判断。');
}

// 2. Executive summary
{
  const slide = baseSlide(1, '结论', 'Executive summary', '先说结论：IM 已经是教学服务发生的现场');
  addStatCard(slide, 0.6, 1.62, 3.02, 2.15, '39.2%', '课程运营覆盖最广', '但学习、技术、社交和娱乐同样稳定存在，IM 远不只是通知工具。', C.teal);
  addStatCard(slide, 3.82, 1.62, 3.02, 2.15, '851', '会话同时包含多个主题', '平均每个窗口 3.18 个 Topic；“一个会话 = 一个任务”并不符合真实现场。', C.blue);
  addStatCard(slide, 7.04, 1.62, 3.02, 2.15, '角色', '决定同一主题的真实含义', '教师—学生的作业是反馈闭环；学生—学生更像同伴互助；家长侧则是监督与计划。', C.orange);
  addStatCard(slide, 10.26, 1.62, 2.48, 2.15, '转化', '比“多一个 AI 入口”更重要', '机会在于把聊天中的意图、约束和判断，转成可执行、可追踪的业务结果。', C.purple);

  addRect(slide, 0.6, 4.12, 12.14, 1.85, C.navy, C.navy, true);
  addText(slide, '一句话判断', 0.88, 4.42, 1.25, 0.28, { fontSize: 11, color: '8FD1C5', bold: true });
  addText(slide, '不要只让 AI 帮用户“说话”——\n要让聊天成为课程、作业、反馈与服务真正发生的入口。', 2.25, 4.35, 9.85, 0.88, { fontSize: 21.5, color: C.white, bold: true, valign: 'top' });
  addText(slide, '这也是 IM 基础能力、业务对象和 Agent 能力需要共同设计的原因。', 2.27, 5.36, 9.1, 0.28, { fontSize: 11.2, color: 'C8DBD8' });
  slide.addNotes('四个结论依次讲：覆盖面、多主题、角色差异、产品转化。最后用一句话收口，建立后续全场的主线。');
}

// 3. Method in one slide
{
  const slide = baseSlide(2, '方法', 'Method in brief', '我们如何确保：看到的是会话，而不是关键词', '方法只保留管理层需要理解的三个事实。');
  const nodes = [
    ['819,700', '8 月脱敏消息'],
    ['8,197', '完整会话窗口'],
    ['1,000', '分层抽取窗口'],
    ['100,000', '实际分析消息'],
  ];
  nodes.forEach((n, i) => {
    const x = 0.75 + i * 3.12;
    addRect(slide, x, 1.7, 2.35, 1.12, i === 2 ? C.teal : C.paper, i === 2 ? C.teal : 'D6DFDD', true, { shadow: true });
    addText(slide, n[0], x, 1.88, 2.35, 0.4, { fontFace: A, fontSize: 24, bold: true, color: i === 2 ? C.white : C.navy, align: 'center' });
    addText(slide, n[1], x, 2.34, 2.35, 0.24, { fontSize: 10.5, color: i === 2 ? 'D6ECE8' : C.muted, align: 'center' });
    if (i < nodes.length - 1) addLine(slide, x + 2.44, 2.25, 0.55, 0, C.teal2, 1.6, 'solid', 'triangle');
  });

  addRect(slide, 0.75, 3.35, 5.85, 2.25, C.paper, 'D6DFDD', true);
  addText(slide, '抽样：保留群聊／1v1 原始结构', 1.02, 3.65, 5.2, 0.32, { fontSize: 16.2, bold: true, color: C.navy });
  addBulletList(slide, [
    '按会话形态比例分层：780 个群聊、220 个 1v1',
    '每个窗口保留完整 100 条消息，不因内容“有趣”而换样',
    '固定规则、可复算、可回到原始消息核验',
  ], 1.03, 4.05, 5.15, 1.25, { fontSize: 11.2 });

  addRect(slide, 6.85, 3.35, 5.73, 2.25, C.paper, 'D6DFDD', true);
  addText(slide, '分析：完整上下文语义理解', 7.12, 3.65, 5.16, 0.32, { fontSize: 16.2, bold: true, color: C.navy });
  addBulletList(slide, [
    '不是逐句贴标签，也不是关键词命中计数',
    '一个窗口允许识别多个 Topic；普通 Topic 至少覆盖 5% 消息',
    '分类、证据和角色关系均经过人工校准与质量检查',
  ], 7.13, 4.05, 5.0, 1.25, { fontSize: 11.2, bulletColor: C.blue });

  addText(slide, '适用边界：这 1000 个窗口适合识别主要结构和高频现场，但不能直接写成全平台用户发生率。', 0.78, 6.05, 11.7, 0.34, { fontSize: 10.6, color: C.red, bold: true });
  slide.addNotes('两三句话讲完：样本来自 81.97 万消息，按群聊与 1v1 比例抽取 1000 个完整窗口；模型按上下文识别多个主题，并经过人工校准。强调不是关键词统计。');
}

// 4. Scene model
{
  const slide = baseSlide(3, '全景', 'Scene map', '真实聊天可以归纳为三类活动', '这比按功能点罗列，更接近用户为什么会在 IM 中开口。');
  const cols = [
    { x: 0.62, color: C.teal, soft: C.tealSoft, no: '01', title: '教学服务履约', sub: '让课程与任务真正发生', items: ['排课／调课', '到课／请假', '材料送达', '作业提交与订正', '技术排障／课酬核对'] },
    { x: 4.48, color: C.blue, soft: C.blueSoft, no: '02', title: '教学判断与内容', sub: '形成专业判断与教学成果', items: ['学情／课后反馈', '教师教学评价', '教学方法与课堂设计', '课程与课件内容', '学习计划与测评'] },
    { x: 8.34, color: C.purple, soft: C.purpleSoft, no: '03', title: '关系与共同体', sub: '维持联络、信任与归属', items: ['学生同伴交流', '兴趣／游戏／校园生活', '家庭沟通', '教师内部协作', '私人表达与情绪'] },
  ];
  cols.forEach((c) => {
    addRect(slide, c.x, 1.64, 3.55, 4.42, C.paper, 'D7DEDC', true, { shadow: true });
    slide.addShape(S.ellipse, { x: c.x + 0.24, y: 1.91, w: 0.56, h: 0.56, fill: { color: c.color }, line: { color: c.color } });
    addText(slide, c.no, c.x + 0.24, 1.91, 0.56, 0.56, { fontFace: A, fontSize: 12, bold: true, color: C.white, align: 'center' });
    addText(slide, c.title, c.x + 0.95, 1.84, 2.25, 0.36, { fontSize: 17.5, bold: true, color: C.navy });
    addText(slide, c.sub, c.x + 0.95, 2.22, 2.2, 0.28, { fontSize: 10.3, color: c.color, bold: true });
    addRect(slide, c.x + 0.24, 2.78, 3.05, 2.74, c.soft, c.soft, true);
    c.items.forEach((item, i) => {
      addText(slide, item, c.x + 0.5, 2.99 + i * 0.48, 2.62, 0.28, { fontSize: 12, color: C.ink, bold: i === 0 });
      if (i < c.items.length - 1) addLine(slide, c.x + 0.5, 3.36 + i * 0.48, 2.4, 0, 'C9D8D4', 0.6);
    });
  });
  addRect(slide, 0.63, 6.28, 11.25, 0.48, C.navy, C.navy, true);
  addText(slide, '同一个会话经常跨越三层：例如“请假”同时涉及课程履约、机构规则和师生／家长关系。', 0.9, 6.29, 10.7, 0.46, { fontSize: 12.3, color: C.white, bold: true, align: 'center' });
  slide.addNotes('这页是整体场景地图。强调同一会话不只落在一个盒子里，后续产品需要理解跨层关系。');
}

// 5. Topic panorama
{
  const slide = baseSlide(3, '全景', 'Topic panorama', '课程运营覆盖最广，但 IM 远不只承载教学任务', '覆盖率指：1000 个窗口中，至少出现一次该一级主题的窗口比例。');
  const data = [
    ['课程运营与服务', 39.2, C.teal],
    ['数字平台与技术', 34.9, C.blue],
    ['学习与学业内容', 32.1, C.orange],
    ['人际关系与社交', 26.0, C.purple],
    ['教学设计、实施与改进', 23.5, C.lime],
    ['娱乐与创作', 23.3, C.red],
    ['日常生活、健康与出行', 12.6, '8B9B9B'],
  ];
  addRect(slide, 0.62, 1.65, 8.25, 4.95, C.paper, 'D7DEDC', true);
  data.forEach((d, i) => addBar(slide, d[0], d[1], 42, 0.95, 1.98 + i * 0.61, 7.55, d[2]));

  addRect(slide, 9.1, 1.65, 3.62, 4.95, C.navy, C.navy, true);
  addText(slide, '三个值得注意的差异', 9.42, 1.98, 2.95, 0.34, { fontSize: 16, color: C.white, bold: true });
  addText(slide, '01', 9.42, 2.62, 0.42, 0.25, { fontFace: A, fontSize: 10, color: '8FD1C5', bold: true });
  addText(slide, '技术问题出现得广，\n但单次讨论通常更短。', 9.9, 2.52, 2.35, 0.62, { fontSize: 12.4, color: C.white, bold: true, valign: 'top' });
  addText(slide, '02', 9.42, 3.55, 0.42, 0.25, { fontFace: A, fontSize: 10, color: '8FD1C5', bold: true });
  addText(slide, '学习讨论覆盖略低，\n出现时往往占用更多消息。', 9.9, 3.45, 2.35, 0.68, { fontSize: 12.4, color: C.white, bold: true, valign: 'top' });
  addText(slide, '03', 9.42, 4.5, 0.42, 0.25, { fontFace: A, fontSize: 10, color: '8FD1C5', bold: true });
  addText(slide, '社交、娱乐和生活稳定存在，\n不能简单当作“无效噪音”。', 9.9, 4.4, 2.35, 0.75, { fontSize: 12.4, color: C.white, bold: true, valign: 'top' });
  addText(slide, '注：同一窗口可有多个主题，因此各项覆盖率之和会超过 100%。', 9.42, 5.85, 2.86, 0.38, { fontSize: 8.6, color: 'BED0D1', valign: 'top' });
  slide.addNotes('不要把柱状图讲成优先级。它只说明出现的广度。高频不等于痛点强，也不等于应该做 AI。');
}

// 6. Multi-topic
{
  const slide = baseSlide(3, '全景', 'Multi-topic reality', '一个会话，平均不是一个主题，而是 3.18 个', '真实沟通会在排课、作业、资料、技术和关系之间不断切换。');
  addRect(slide, 0.65, 1.62, 7.3, 4.95, C.paper, 'D7DEDC', true);
  addText(slide, '一个 100 条消息窗口', 0.98, 1.9, 2.3, 0.28, { fontSize: 13.5, bold: true, color: C.navy });
  const topicColors = [C.teal, C.orange, C.blue, C.purple];
  const msgs = [
    ['教师', '今晚能调整一下上课时间吗？', 0],
    ['学生', '7 点半有语文，下午可以。', 0],
    ['教师', '今天的练习发在群文件里。', 1],
    ['学生', '我听不到声音，又掉出去了。', 2],
    ['教师', '先检查麦克风，我开临时教室。', 2],
    ['学生', '明天想和同学一起写作业。', 3],
  ];
  msgs.forEach((m, i) => {
    const x = i % 2 === 0 ? 1.0 : 2.55;
    const y = 2.35 + i * 0.57;
    addChatBubble(slide, m[0], m[1], x, y, 4.75, 0.5, i % 2 === 0 ? 'left' : 'right', topicColors[m[2]]);
  });
  const tags = [['课程协调', C.teal], ['教材／作业', C.orange], ['技术排障', C.blue], ['同伴安排', C.purple]];
  tags.forEach((t, i) => addPill(slide, t[0], 0.98 + i * 1.55, 5.95, 1.35, t[1] === C.teal ? C.tealSoft : t[1] === C.orange ? C.orangeSoft : t[1] === C.blue ? C.blueSoft : C.purpleSoft, t[1], 9.6));

  addStatCard(slide, 8.25, 1.62, 2.0, 1.7, '968', '窗口有正式 Topic', '其余窗口也可能包含上下文、短候选或碎片表达。', C.teal);
  addStatCard(slide, 10.48, 1.62, 2.0, 1.7, '851', '窗口有 2+ Topic', '因此不能把一个会话压成单一场景标签。', C.blue);
  addStatCard(slide, 8.25, 3.57, 2.0, 1.7, '3', '中位 Topic 数', '平均 3.18；75 分位为 4。', C.orange);
  addStatCard(slide, 10.48, 3.57, 2.0, 1.7, '10', '单窗最高 Topic 数', '多主题是现场常态，不是异常。', C.purple);
  addRect(slide, 8.25, 5.57, 4.23, 0.98, C.navy, C.navy, true);
  addText(slide, '产品含义：理解“话题转场”和“任务承接”，\n比给整段会话贴一个总标签更重要。', 8.55, 5.72, 3.65, 0.58, { fontSize: 12.1, color: C.white, bold: true, valign: 'top' });
  slide.addNotes('这页纠正一个常见误解：会话不是单一意图。后续 Agent 不能只给会话一个总分类，而要识别当前正在推进哪个事项。');
}

// 7. Role structure
{
  const slide = baseSlide(4, '角色', 'Role composition', '只有结合角色关系，主题才有业务含义', '群聊是场景类型，1v1 是双方关系；两者需要分别看。');
  addRect(slide, 0.62, 1.58, 5.98, 4.75, C.paper, 'D7DEDC', true);
  addText(slide, '群聊 · 780 个窗口', 0.92, 1.88, 2.6, 0.36, { fontSize: 17, bold: true, color: C.navy });
  addPill(slide, '95.0%', 4.95, 1.88, 1.05, C.tealSoft, C.teal, 11);
  const groupData = [
    ['师生班级群', 741, 95.0, C.teal],
    ['教师管理协作群', 32, 4.1, C.blue],
    ['学生群', 7, 0.9, C.purple],
  ];
  groupData.forEach((d, i) => addBar(slide, `${d[0]}  ${d[1]}`, d[2], 100, 0.95, 2.62 + i * 0.75, 5.25, d[3]));
  addText(slide, '群聊数据主要由师生班级群构成，不能把它概括为所有群的一般规律。', 0.95, 5.32, 5.05, 0.54, { fontSize: 10.5, color: C.muted, valign: 'top' });

  addRect(slide, 6.83, 1.58, 5.88, 4.75, C.paper, 'D7DEDC', true);
  addText(slide, '1v1 · 220 个窗口', 7.13, 1.88, 2.6, 0.36, { fontSize: 17, bold: true, color: C.navy });
  addPill(slide, '60.0%', 11.03, 1.88, 1.05, C.purpleSoft, C.purple, 11);
  const oneData = [
    ['学生—学生', 132, 60.0, C.purple],
    ['教师/管理者—教师', 44, 20.0, C.blue],
    ['教师—学生', 37, 16.8, C.teal],
    ['家长相关', 7, 3.2, C.orange],
  ];
  oneData.forEach((d, i) => addBar(slide, `${d[0]}  ${d[1]}`, d[2], 60, 7.15, 2.55 + i * 0.62, 5.0, d[3]));
  addText(slide, '不拆角色，“1v1 主题排名”会把教师薪酬、学生游戏、师生作业混在一起。', 7.15, 5.32, 4.95, 0.54, { fontSize: 10.5, color: C.muted, valign: 'top' });

  addRect(slide, 2.7, 6.48, 7.9, 0.38, C.navy, C.navy, true);
  addText(slide, '同一个 Topic，在不同角色关系中，代表的是不同任务、责任和产品需求。', 2.9, 6.49, 7.5, 0.36, { fontSize: 11.8, color: C.white, bold: true, align: 'center' });
  slide.addNotes('先解释两组分母不同。群聊以师生班级群为主；1v1 以学生—学生为主。角色拆分是后续案例理解的基础。');
}

// 8. Case: scheduling
{
  const slide = baseSlide(5, '案例', 'Case 01 · scheduling', '课程调整：一句“改时间”，背后是多方约束协商', '师生班级群｜S1000-0424｜42/100 条消息共同支持该主题');
  addRect(slide, 0.62, 1.58, 7.1, 4.95, C.paper, 'D7DEDC', true);
  addChatBubble(slide, '数学老师', '今儿下午正常上课吧？', 0.95, 1.92, 3.95, 0.63, 'left', C.teal);
  addChatBubble(slide, '学生', '7 点半有语文，下午能连吗？', 2.35, 2.69, 4.35, 0.66, 'right', C.blue);
  addChatBubble(slide, '数学老师', '我下午满课。', 0.95, 3.49, 3.25, 0.61, 'left', C.teal);
  addChatBubble(slide, '学生', '今天数学能调到晚上吗？', 2.35, 4.24, 4.35, 0.63, 'right', C.blue);
  addChatBubble(slide, '数学老师', '今晚也有课，调不了。', 0.95, 5.01, 3.75, 0.61, 'left', C.teal);
  addChatBubble(slide, '学生', '那今天请假。', 2.35, 5.76, 3.25, 0.52, 'right', C.blue);

  addStatCard(slide, 7.98, 1.58, 2.03, 1.72, '230', '涉及课程变更', '固定样本中覆盖窗口数。', C.teal);
  addStatCard(slide, 10.24, 1.58, 2.03, 1.72, '23.0%', '全样本覆盖率', '是覆盖最广的具体 Topic。', C.orange);
  addText(slide, '真正的业务问题', 8.0, 3.72, 3.25, 0.34, { fontSize: 16, bold: true, color: C.navy });
  const steps = [
    ['1', '发现冲突', '学生其他课程 × 教师满课'],
    ['2', '尝试替代', '下午、晚上等候选时段'],
    ['3', '形成结果', '无法协调 → 请假／改课'],
  ];
  steps.forEach((s, i) => {
    const y = 4.18 + i * 0.66;
    slide.addShape(S.ellipse, { x: 8.0, y, w: 0.38, h: 0.38, fill: { color: i === 2 ? C.orange : C.teal }, line: { color: i === 2 ? C.orange : C.teal } });
    addText(slide, s[0], 8.0, y, 0.38, 0.38, { fontFace: A, fontSize: 10, color: C.white, bold: true, align: 'center' });
    addText(slide, s[1], 8.53, y - 0.02, 1.15, 0.24, { fontSize: 11.5, bold: true, color: C.ink });
    addText(slide, s[2], 9.63, y - 0.02, 2.35, 0.3, { fontSize: 10.2, color: C.muted });
  });
  addRect(slide, 7.98, 6.23, 4.29, 0.49, C.tealSoft, C.tealSoft, true);
  addText(slide, '机会：把自然语言时间约束转成可比较的调课方案，再由有权限者确认。', 8.2, 6.24, 3.87, 0.46, { fontSize: 10.7, color: C.teal, bold: true, align: 'center' });
  slide.addNotes('强调这不是关键词“改课”的命中，而是一段完整协商。Agent 价值不是生成一句话，而是理解时间约束、查正式课表、提出方案并保留确认。');
}

// 9. Case: homework loop
{
  const slide = baseSlide(5, '案例', 'Case 02 · homework', '作业沟通的价值，不在“提醒一次”，而在反馈闭环', '师生班级群与教师—学生 1v1 中都稳定出现');
  addStatCard(slide, 0.65, 1.62, 2.05, 1.68, '147', '覆盖窗口', '作业布置、完成与订正。', C.orange);
  addStatCard(slide, 0.65, 3.55, 2.05, 1.68, '14.7%', '样本内覆盖率', '不是单纯的一句“交作业”。', C.teal);
  addRect(slide, 0.65, 5.52, 2.05, 1.03, C.navy, C.navy, true);
  addText(slide, '典型链路\n提交 → 反馈 → 订正 → 确认', 0.86, 5.69, 1.63, 0.62, { fontSize: 11.5, color: C.white, bold: true, align: 'center', valign: 'top' });

  const flow = [
    { x: 3.15, no: '01', title: '提交', quote: '“邱老师，交作业啦”', color: C.teal },
    { x: 5.45, no: '02', title: '具体反馈', quote: '“第五题有部分没翻译出来……”', color: C.blue },
    { x: 7.75, no: '03', title: '订正／补漏', quote: '“现在让他订正”\n“21 题没发哦”', color: C.orange },
    { x: 10.05, no: '04', title: '再次确认', quote: '“一会再拍照给您”\n“收到订正”', color: C.purple },
  ];
  flow.forEach((f, i) => {
    addRect(slide, f.x, 2.0, 1.9, 3.55, C.paper, 'D7DEDC', true, { shadow: true });
    slide.addShape(S.ellipse, { x: f.x + 0.64, y: 2.28, w: 0.62, h: 0.62, fill: { color: f.color }, line: { color: f.color } });
    addText(slide, f.no, f.x + 0.64, 2.28, 0.62, 0.62, { fontFace: A, fontSize: 11, bold: true, color: C.white, align: 'center' });
    addText(slide, f.title, f.x + 0.2, 3.08, 1.5, 0.35, { fontSize: 15, bold: true, color: C.navy, align: 'center' });
    addText(slide, f.quote, f.x + 0.2, 3.72, 1.5, 1.05, { fontSize: 10.2, color: C.ink, align: 'center', valign: 'top' });
    if (i < flow.length - 1) addLine(slide, f.x + 1.94, 3.78, 0.3, 0, '90A6A4', 1.5, 'solid', 'triangle');
  });
  addRect(slide, 3.15, 5.9, 8.8, 0.7, C.orangeSoft, C.orangeSoft, true);
  addText(slide, '产品判断：正式作业对象和状态由业务系统负责；AI 更适合整理反馈、生成说明和提示下一步，而不是猜测“是否完成”。', 3.46, 5.95, 8.18, 0.58, { fontSize: 11.1, color: '914F20', bold: true, align: 'center' });
  slide.addNotes('作业案例最能说明“基础 IM + 业务对象 + AI”必须协作。讲清楚：模型不能只凭“收到”就把作业标成完成。');
}

// 10. Case: teacher management
{
  const slide = baseSlide(5, '案例', 'Case 03 · teacher operations', '教师管理沟通，本质上是一条人工工作流', '教师/管理者—教师 1v1｜44 个窗口');
  addRect(slide, 0.62, 1.6, 5.3, 4.95, C.paper, 'D7DEDC', true);
  addText(slide, '真实消息节选', 0.94, 1.9, 2.1, 0.3, { fontSize: 14.5, bold: true, color: C.navy });
  addChatBubble(slide, '教师部', '7 月 16 日—31 日总课时 42 节，请核对。', 0.94, 2.46, 4.34, 0.71, 'left', C.blue);
  addChatBubble(slide, '教师', 'right', 2.67, 3.32, 2.25, 0.53, 'right', C.teal);
  addChatBubble(slide, '教师部', '核对完成后，我将提交审核并发给财务。', 0.94, 4.0, 4.34, 0.75, 'left', C.blue);
  addChatBubble(slide, '教师部', '财务周六休假，需要提前核对发放工资。', 0.94, 4.93, 4.34, 0.75, 'left', C.blue);

  addText(slide, '角色内高频事项', 6.25, 1.9, 2.4, 0.3, { fontSize: 14.5, bold: true, color: C.navy });
  addBar(slide, '课程改期', 54.5, 60, 6.25, 2.48, 5.65, C.teal);
  addBar(slide, '课酬／薪资', 40.9, 60, 6.25, 3.15, 5.65, C.orange);
  addBar(slide, '到课／缺勤', 34.1, 60, 6.25, 3.82, 5.65, C.blue);
  addBar(slide, '教材资料', 29.5, 60, 6.25, 4.49, 5.65, C.purple);
  addBar(slide, '可用时段／排班', 22.7, 60, 6.25, 5.16, 5.65, C.lime);

  addRect(slide, 6.25, 5.86, 5.65, 0.76, C.navy, C.navy, true);
  addText(slide, '聊天中已经出现流程状态：统计 → 核对 → 审核 → 财务发放。\n真正机会是承接状态，而不是再生成一段管理话术。', 6.55, 5.97, 5.05, 0.53, { fontSize: 10.8, color: C.white, bold: true, align: 'center', valign: 'top' });
  slide.addNotes('这页把“教师内部聊天”重新解释为运营流程。提醒：44 个窗口可观察主要方向，但不用于精确估计所有机构发生率。');
}

// 11. Case: student duality
{
  const slide = baseSlide(5, '案例', 'Case 04 · student', '学生侧同时存在学习协作与同伴生活', '如果只保留“教学相关”，就会误解学生为什么愿意持续使用 IM。');
  addRect(slide, 0.62, 1.58, 5.85, 4.92, C.paper, 'D7DEDC', true, { shadow: true });
  addPill(slide, '同伴娱乐协调', 0.95, 1.9, 1.38, C.purpleSoft, C.purple, 10);
  addText(slide, '“有游戏陪吗？”', 0.95, 2.43, 4.6, 0.45, { fontSize: 20, bold: true, color: C.navy });
  addChatBubble(slide, '同学 A', '有游戏陪吗？', 0.95, 3.08, 3.15, 0.57, 'left', C.purple);
  addChatBubble(slide, '同学 B', '什么游戏？只能明天玩。', 2.0, 3.82, 3.55, 0.65, 'right', C.purple);
  addChatBubble(slide, '同学 A', '和平，王者也行。可以。', 0.95, 4.67, 3.65, 0.62, 'left', C.purple);
  addText(slide, '先提出需求，再选择内容、确认时间并建立连接。\n它不是教学任务，却是真实的使用目的。', 0.96, 5.55, 4.8, 0.62, { fontSize: 11, color: C.muted, valign: 'top' });

  addRect(slide, 6.85, 1.58, 5.85, 4.92, C.paper, 'D7DEDC', true, { shadow: true });
  addPill(slide, '同伴学习求助', 7.18, 1.9, 1.38, C.orangeSoft, C.orange, 10);
  addText(slide, '“我只想要个启发而已”', 7.18, 2.43, 4.65, 0.45, { fontSize: 20, bold: true, color: C.navy });
  addChatBubble(slide, '学生 A', '作文完全不知道怎么写。', 7.18, 3.08, 3.65, 0.57, 'left', C.orange);
  addChatBubble(slide, '学生 B', '万能的豆包。', 8.62, 3.82, 2.8, 0.57, 'right', C.orange);
  addChatBubble(slide, '学生 A', '爸妈会检查。给我个开头，我只想要启发。', 7.18, 4.55, 4.35, 0.74, 'left', C.orange);
  addText(slide, '真实需求不是“代写答案”，而是获得启发、保留自主性，\n同时处理家长检查与 AI 使用边界。', 7.18, 5.55, 4.88, 0.62, { fontSize: 11, color: C.muted, valign: 'top' });

  addText(slide, '学生—学生 1v1：游戏 20.5% · 见面安排 16.7% · 校园生活 15.2% · 作业 13.6% · 同伴关系 12.9%', 0.72, 6.7, 11.85, 0.25, { fontSize: 10.2, color: C.purple, bold: true, align: 'center' });
  slide.addNotes('这页不要把学生娱乐价值化或道德化。核心是：学习和生活共存，社交关系本身构成产品黏性与安全治理需求。');
}

// 12. Same topic, different need
{
  const slide = baseSlide(5, '案例', 'Role × topic', '同样叫“作业”，在三种关系里是三件不同的事', '主题名称只是入口；角色、责任和后续动作决定产品需求。');
  const cards = [
    { x: 0.62, color: C.teal, soft: C.tealSoft, pair: '教师 — 学生', title: '反馈闭环', quote: '“21 题没发哦”\n“对比订正完善”', need: '需要定位缺漏、反馈、订正与再次确认。', product: '作业状态 + 教师反馈 + 订正入口' },
    { x: 4.52, color: C.purple, soft: C.purpleSoft, pair: '学生 — 学生', title: '同伴互助', quote: '“给我个开头呗”\n“我只想要个启发”', need: '需要启发、讨论与协作，而不一定是标准答案。', product: '轻量讨论 + 引用上下文 + 安全的 AI 辅助' },
    { x: 8.42, color: C.orange, soft: C.orangeSoft, pair: '学生 — 家长', title: '监督与计划', quote: '“今天做了什么作业？”\n“单词要背哟”', need: '需要了解进度、安排家庭学习并确认提交。', product: '家长可见进度 + 提醒 + 权限边界' },
  ];
  cards.forEach((c) => {
    addRect(slide, c.x, 1.65, 3.55, 4.85, C.paper, 'D7DEDC', true, { shadow: true });
    addPill(slide, c.pair, c.x + 0.28, 1.95, 1.65, c.soft, c.color, 10.3);
    addText(slide, c.title, c.x + 0.28, 2.47, 2.75, 0.42, { fontSize: 20, bold: true, color: C.navy });
    addRect(slide, c.x + 0.28, 3.05, 2.98, 1.03, c.soft, c.soft, true);
    addText(slide, c.quote, c.x + 0.48, 3.19, 2.58, 0.72, { fontSize: 11.5, color: C.ink, bold: true, align: 'center', valign: 'top' });
    addText(slide, '真实需要', c.x + 0.28, 4.38, 0.75, 0.22, { fontSize: 9.6, color: c.color, bold: true });
    addText(slide, c.need, c.x + 0.28, 4.65, 2.98, 0.62, { fontSize: 11.1, color: C.ink, valign: 'top' });
    addText(slide, '产品承接', c.x + 0.28, 5.45, 0.75, 0.22, { fontSize: 9.6, color: c.color, bold: true });
    addText(slide, c.product, c.x + 0.28, 5.72, 2.98, 0.54, { fontSize: 10.8, color: C.muted, bold: true, valign: 'top' });
  });
  slide.addNotes('这页帮助产品专家理解：分类不能直接等于功能。必须把 Topic 与角色、责任、当前目标组合起来。');
}

// 13. Core transformation model
{
  const slide = baseSlide(6, '判断', 'Product judgment', '最值得做的，不是让 AI 多说一句，而是完成五种转化', 'IM 是意图、约束、承诺和人类判断刚刚产生的地方。');
  const blocks = [
    { x: 0.58, no: '01', top: '意图', bottom: '业务动作', ex: '请假 → 变更申请', color: C.teal, soft: C.tealSoft },
    { x: 3.12, no: '02', top: '多方约束', bottom: '执行方案', ex: '时间冲突 → 调课候选', color: C.blue, soft: C.blueSoft },
    { x: 5.66, no: '03', top: '人类判断', bottom: '可审阅成果', ex: '课堂表现 → 学情草稿', color: C.orange, soft: C.orangeSoft },
    { x: 8.2, no: '04', top: '异常信号', bottom: '处理事项', ex: '听不到 → 技术工单', color: C.red, soft: C.redSoft },
    { x: 10.74, no: '05', top: '短暂表达', bottom: '任务上下文', ex: '聊天证据 → ContextSnapshot', color: C.purple, soft: C.purpleSoft },
  ];
  blocks.forEach((b, i) => {
    addRect(slide, b.x, 1.74, 2.05, 4.35, C.paper, 'D7DEDC', true, { shadow: true });
    addRect(slide, b.x, 1.74, 2.05, 0.64, b.color, b.color, true);
    addText(slide, b.no, b.x + 0.2, 1.88, 0.42, 0.25, { fontFace: A, fontSize: 10, color: C.white, bold: true });
    addText(slide, b.top, b.x + 0.2, 2.72, 1.65, 0.35, { fontSize: 16.5, color: C.navy, bold: true, align: 'center' });
    addLine(slide, b.x + 0.48, 3.32, 1.1, 0, b.color, 2, 'solid', 'triangle');
    addText(slide, b.bottom, b.x + 0.2, 3.62, 1.65, 0.45, { fontSize: 16.5, color: b.color, bold: true, align: 'center' });
    addRect(slide, b.x + 0.18, 4.48, 1.69, 0.95, b.soft, b.soft, true);
    addText(slide, b.ex, b.x + 0.34, 4.61, 1.37, 0.68, { fontSize: 10.1, color: C.ink, bold: true, align: 'center', valign: 'top' });
    if (i < blocks.length - 1) addText(slide, '+', b.x + 2.14, 3.56, 0.28, 0.3, { fontFace: A, fontSize: 18, color: '9DAAAE', bold: true, align: 'center' });
  });
  addRect(slide, 1.35, 6.34, 10.63, 0.48, C.navy, C.navy, true);
  addText(slide, '核心原则：业务系统拥有正式事实；AI 理解和提案；用户确认；执行结果可追溯。', 1.65, 6.35, 10.03, 0.45, { fontSize: 12.1, color: C.white, bold: true, align: 'center' });
  slide.addNotes('这是全场最重要的产品判断。逐一举例，强调 AI 不是事实源，也不是自动执行者。');
}

// 14. Capability stack
{
  const slide = baseSlide(6, '判断', 'Capability stack', 'IM、业务对象、Agent 与治理，需要一起设计', '如果只做“聊天框 + AI”，高频问题仍然无法闭环。');
  const layers = [
    { y: 5.25, h: 0.82, color: C.navy, title: '01  基础 IM 交互', desc: '清楚表达、引用、回应和组织：投票／回复／附件／成员治理' },
    { y: 4.22, h: 0.82, color: C.teal, title: '02  教育业务对象', desc: '课程／课堂／作业／材料／到课／报告的正式状态与权限' },
    { y: 3.19, h: 0.82, color: C.blue, title: '03  Agent 辅助', desc: '理解多轮上下文、提取约束、生成草稿、检索和提出候选方案' },
    { y: 2.16, h: 0.82, color: C.orange, title: '04  治理与执行', desc: '人工审批、领域校验、通知范围、执行回执与可追溯证据' },
  ];
  layers.forEach((l, i) => {
    const x = 0.78 + i * 0.26;
    const w = 7.05 - i * 0.52;
    addRect(slide, x, l.y, w, l.h, l.color, l.color, true, { shadow: true });
    addText(slide, l.title, x + 0.28, l.y + 0.16, 2.35, 0.3, { fontSize: 14.2, bold: true, color: C.white });
    addText(slide, l.desc, x + 2.45, l.y + 0.15, w - 2.72, 0.43, { fontSize: 10.2, color: 'F2F7F6', valign: 'top' });
  });
  addText(slide, '从下往上提供能力，从上往下施加约束', 1.25, 6.36, 5.9, 0.28, { fontSize: 10.5, color: C.muted, align: 'center' });

  addRect(slide, 8.35, 1.72, 4.3, 4.88, C.paper, 'D7DEDC', true);
  addText(slide, 'Agent 应该出现在哪里？', 8.68, 2.02, 3.6, 0.36, { fontSize: 17, bold: true, color: C.navy });
  const rules = [
    ['轻', '不要求用户先理解 Agent／Skill／模型'],
    ['结果式', '默认给出可检查的方案、草稿或动作'],
    ['业务节点', '出现在意图即将变成课程、作业或报告时'],
    ['可外化', '结果可以回到原会话，并分享给授权对象'],
  ];
  rules.forEach((r, i) => {
    const y = 2.73 + i * 0.76;
    addPill(slide, r[0], 8.68, y, 0.78, [C.tealSoft, C.blueSoft, C.orangeSoft, C.purpleSoft][i], [C.teal, C.blue, C.orange, C.purple][i], 10.5);
    addText(slide, r[1], 9.65, y - 0.02, 2.55, 0.42, { fontSize: 10.6, color: C.ink, bold: true, valign: 'top' });
  });
  addText(slide, 'TeacherIn 不应成为悬浮在业务之外的通用问答。', 8.68, 5.94, 3.48, 0.38, { fontSize: 11, color: C.red, bold: true, align: 'center' });
  slide.addNotes('从底层 IM 到上层治理讲。突出 Agent 的位置：理解和生成，但正式事实、权限和执行必须回到 ClassIn 业务对象。');
}

// 15. Evidence maturity matrix
{
  const slide = baseSlide(7, '取舍', 'Evidence maturity', '哪些方向更成熟，哪些还只是启发', '这是“证据成熟度 × 风险”的初步分层，不是最终路线图。');
  const x0 = 1.15, y0 = 1.72, mw = 10.95, mh = 4.7;
  addRect(slide, x0, y0, mw / 2, mh / 2, C.tealSoft, C.white, false);
  addRect(slide, x0 + mw / 2, y0, mw / 2, mh / 2, C.orangeSoft, C.white, false);
  addRect(slide, x0, y0 + mh / 2, mw / 2, mh / 2, C.graySoft, C.white, false);
  addRect(slide, x0 + mw / 2, y0 + mh / 2, mw / 2, mh / 2, C.redSoft, C.white, false);
  addLine(slide, x0 + mw / 2, y0, 0, mh, 'FFFFFF', 2.2);
  addLine(slide, x0, y0 + mh / 2, mw, 0, 'FFFFFF', 2.2);
  addText(slide, '证据较强', 0.1, 2.55, 0.88, 0.35, { fontSize: 10.5, color: C.teal, bold: true, rotate: 270, align: 'center' });
  addText(slide, '证据较弱', 0.1, 5.1, 0.88, 0.35, { fontSize: 10.5, color: C.muted, bold: true, rotate: 270, align: 'center' });
  addText(slide, '较低风险／容易核验', 2.6, 6.55, 3.2, 0.28, { fontSize: 10.5, color: C.teal, bold: true, align: 'center' });
  addText(slide, '较高风险／专业判断', 8.0, 6.55, 3.2, 0.28, { fontSize: 10.5, color: C.red, bold: true, align: 'center' });

  addText(slide, '优先进入问题地图', 1.5, 1.95, 2.1, 0.3, { fontSize: 13.5, bold: true, color: C.teal });
  ['排课／调课', '到课与请假', '资料分享', '作业闭环', '技术故障'].forEach((t, i) => addPill(slide, t, 1.5 + (i % 3) * 1.55, 2.48 + Math.floor(i / 3) * 0.55, 1.35, C.paper, C.teal, 9.3));
  addText(slide, '真实需求成立，但必须人审', 6.98, 1.95, 2.7, 0.3, { fontSize: 13.5, bold: true, color: '9A5420' });
  ['课后／学情反馈', '教师教学评价', '机构规则与入职'].forEach((t, i) => addPill(slide, t, 6.98 + (i % 2) * 1.82, 2.48 + Math.floor(i / 2) * 0.55, 1.62, C.paper, C.orange, 9.1));

  addText(slide, '产品探索池', 1.5, 4.31, 1.6, 0.3, { fontSize: 13.5, bold: true, color: C.muted });
  ['群内投票', '回复／表情', '自由专题群', '课程内容生成'].forEach((t, i) => addPill(slide, t, 1.5 + (i % 2) * 1.8, 4.85 + Math.floor(i / 2) * 0.55, 1.6, C.paper, C.muted, 9.4));
  addText(slide, '独立高风险研究', 6.98, 4.31, 2.0, 0.3, { fontSize: 13.5, bold: true, color: C.red });
  ['课堂视觉判断', '自动电话外呼', '长期个人画像'].forEach((t, i) => addPill(slide, t, 6.98 + (i % 2) * 1.82, 4.85 + Math.floor(i / 2) * 0.55, 1.62, C.paper, C.red, 9.2));
  addText(slide, '共同研究的调整：课程内容生成是 TeacherIn 的独立价值链，但本次 IM 数据对其优先级支持弱于调课、资料、作业、到课与技术排障。', 1.4, 6.12, 10.4, 0.28, { fontSize: 9.4, color: C.navy, bold: true, align: 'center' });
  slide.addNotes('这页体现我们没有照搬研究者笔记。明确指出数据支持强弱。不要把左上角叫“立项清单”，它只是下一阶段优先研究池。');
}

// 16. Human context
{
  const slide = baseSlide(8, 'Context', 'Human input', '真实聊天是宝贵的 Context，但不等于客观事实', '“真实发生过的表达”与“表达内容客观正确”是两件事。');
  addText(slide, '三类一手输入', 0.66, 1.62, 2.2, 0.3, { fontSize: 14.5, bold: true, color: C.navy });
  addPerson(slide, 0.82, 2.15, 0.72, '师', '教师评价学生', C.teal);
  addPerson(slide, 2.42, 2.15, 0.72, '管', '管理者反馈教师', C.blue);
  addPerson(slide, 4.02, 2.15, 0.72, '学', '学生自我表达', C.purple);
  addLine(slide, 1.18, 3.18, 3.2, 0.75, 'A8B8B6', 1.3, 'dash');
  addLine(slide, 2.78, 3.18, 1.6, 0.75, 'A8B8B6', 1.3, 'dash');
  addLine(slide, 4.38, 3.18, 0, 0.75, 'A8B8B6', 1.3, 'dash');
  addRect(slide, 2.35, 4.0, 4.05, 1.1, C.navy, C.navy, true);
  addText(slide, 'Context Claim', 2.64, 4.18, 1.55, 0.32, { fontFace: A, fontSize: 17, bold: true, color: C.white });
  addText(slide, '谁在何时、针对谁、表达了什么，\n原始证据与适用范围在哪里', 4.14, 4.15, 1.9, 0.58, { fontSize: 10.2, color: 'DCE9E7', valign: 'top' });
  addLine(slide, 6.58, 4.55, 0.55, 0, C.teal, 1.8, 'solid', 'triangle');
  addRect(slide, 7.28, 3.72, 2.22, 1.68, C.tealSoft, C.teal, true);
  addText(slide, 'ContextSnapshot', 7.48, 3.95, 1.82, 0.3, { fontFace: A, fontSize: 13.5, bold: true, color: C.teal, align: 'center' });
  addText(slide, '只装入当前任务需要、\n当前权限允许的上下文', 7.48, 4.42, 1.82, 0.55, { fontSize: 9.8, color: C.ink, align: 'center', valign: 'top' });
  addLine(slide, 9.65, 4.55, 0.55, 0, C.orange, 1.8, 'solid', 'triangle');
  addRect(slide, 10.34, 3.72, 2.25, 1.68, C.orangeSoft, C.orange, true);
  addText(slide, '草稿／建议／动作', 10.54, 3.95, 1.85, 0.3, { fontSize: 13.5, bold: true, color: '9A5420', align: 'center' });
  addText(slide, '人审 + 领域校验\n再发布或写回', 10.54, 4.42, 1.85, 0.55, { fontSize: 9.8, color: C.ink, align: 'center', valign: 'top' });

  const tiers = [
    ['可观察事实', '到课、文件已发、可用时间', C.teal],
    ['主观专业判断', '注意力、掌握情况、教学评价', C.orange],
    ['推断性特征', '情绪、动机、性格与长期画像', C.red],
  ];
  tiers.forEach((t, i) => {
    addRect(slide, 0.8 + i * 4.04, 5.82, 3.66, 0.8, C.paper, t[2], true);
    addText(slide, t[0], 1.02 + i * 4.04, 5.98, 1.2, 0.25, { fontSize: 10.2, bold: true, color: t[2] });
    addText(slide, t[1], 2.17 + i * 4.04, 5.93, 2.02, 0.34, { fontSize: 9.4, color: C.ink });
  });
  addText(slide, '越靠近“推断性特征”，越需要最小化使用、明确授权、可申诉和有限保留。', 2.0, 6.7, 9.25, 0.24, { fontSize: 9.5, color: C.red, bold: true, align: 'center' });
  slide.addNotes('这一页管理风险预期。学生情绪和教师评价很有价值，但不能无条件沉淀成永久画像。解释 Context Claim 与 ContextSnapshot 的区别。');
}

// 17. Next steps
{
  const slide = pptx.addSlide();
  slide.background = { color: C.navy };
  addText(slide, 'NEXT STEP', 0.68, 0.48, 2.2, 0.25, { fontFace: A, fontSize: 10.5, bold: true, color: '8FD1C5', charSpacing: 1.4 });
  addText(slide, '下一步：从“聊了什么”走向“值得解决什么”', 0.68, 1.0, 10.8, 0.64, { fontSize: 27.5, bold: true, color: C.white, valign: 'top' });
  addText(slide, 'Topic、分类和角色研究已经完成；接下来不再重做标签，而是建立问题与需求地图。', 0.7, 1.72, 10.7, 0.35, { fontSize: 12.5, color: 'C7D9D7' });

  const steps = [
    { x: 0.7, n: '01', title: '回到代表性 Case', body: '从高覆盖 Topic 和关键角色组合中，选取完整会话现场。', color: C.teal2 },
    { x: 3.75, n: '02', title: '识别真实摩擦', body: '区分信息缺口、协作成本、规则问题、体验问题和不值得产品化的内容。', color: C.blue },
    { x: 6.8, n: '03', title: '选择承接层', body: '判断应该由基础 IM、业务工作流、AI 辅助或人工服务解决。', color: C.orange },
    { x: 9.85, n: '04', title: '验证纵向闭环', body: '围绕 3–5 个场景做原型，测效率、准确性、采用意愿与真实结果。', color: C.purple },
  ];
  steps.forEach((s, i) => {
    addRect(slide, s.x, 2.48, 2.55, 2.72, '163E4A', '315763', true);
    slide.addShape(S.ellipse, { x: s.x + 0.22, y: 2.73, w: 0.52, h: 0.52, fill: { color: s.color }, line: { color: s.color } });
    addText(slide, s.n, s.x + 0.22, 2.73, 0.52, 0.52, { fontFace: A, fontSize: 10.5, color: C.white, bold: true, align: 'center' });
    addText(slide, s.title, s.x + 0.23, 3.53, 2.05, 0.38, { fontSize: 15, color: C.white, bold: true });
    addText(slide, s.body, s.x + 0.23, 4.12, 2.05, 0.76, { fontSize: 10.5, color: 'C7D9D7', valign: 'top' });
    if (i < steps.length - 1) addLine(slide, s.x + 2.62, 3.83, 0.3, 0, '6B8B91', 1.3, 'solid', 'triangle');
  });

  addText(slide, '建议优先进入问题地图的场景池', 0.7, 5.68, 2.45, 0.26, { fontSize: 10.8, color: '8FD1C5', bold: true });
  addPill(slide, '排课／调课', 3.08, 5.62, 1.28, '254B57', C.white, 9.6);
  addPill(slide, '到课／请假', 4.47, 5.62, 1.28, '254B57', C.white, 9.6);
  addPill(slide, '资料分享', 5.86, 5.62, 1.15, '254B57', C.white, 9.6);
  addPill(slide, '作业闭环', 7.12, 5.62, 1.15, '254B57', C.white, 9.6);
  addPill(slide, '技术排障', 8.38, 5.62, 1.15, '254B57', C.white, 9.6);
  addPill(slide, '学情反馈（高治理）', 9.64, 5.62, 1.75, '254B57', C.white, 9.2);

  addText(slide, '最终目标：让 IM 不只是消息流，而成为 ClassIn 教学服务与 AI Agent 协同的业务入口。', 0.7, 6.53, 11.7, 0.38, { fontSize: 15.5, color: C.white, bold: true, align: 'center' });
  addText(slide, 'ClassIn IM 真实会话调研 · 2026.09', 0.7, 7.08, 3.2, 0.18, { fontFace: A, fontSize: 8.5, color: '8CA6AB' });
  slide.addNotes('结束时回到研究目标：我们已经知道人们聊什么，下一步要判断哪些摩擦值得解决、由哪一层承接。强调候选场景池不是已批准路线图。');
}

const outDir = path.resolve('docs/08-reports/2026-im-conversation-research');
await mkdir(outDir, { recursive: true });
const outFile = path.join(outDir, 'ClassIn_IM真实会话调研_管理层汇报_20260903.pptx');
await pptx.writeFile({ fileName: outFile, compression: true });
console.log(outFile);
