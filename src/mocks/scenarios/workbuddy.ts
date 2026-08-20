import type { WorkBuddyRunViewModel } from '@contracts/workbuddy/workspace';

export const WORKBUDDY_HISTORY: readonly WorkBuddyRunViewModel[] = [
  {
    fixtureVersion: 'workbuddy-m3-v1', id: 'run-courseware', title: '生成函数单调性课件', relativeTime: '2 小时', runState: { status: 'running', allowedCommands: ['supplement', 'stop'], recovery: 'stop-or-wait' }, pinned: true,
    goal: '为高一（3）班生成函数单调性课件，兼顾概念理解、例题迁移和课堂练习。',
    contextLabels: ['高一（3）班', '高中数学', '函数的性质'],
    steps: [
      { title: '教学信息已补齐', summary: '确认班级、课程、单元和已有教学资料，已冻结本次 Context Snapshot。', time: '10:02', state: 'completed' },
      { title: '已生成任务计划', summary: '内容分析 → 教学结构 → 课件生成 → 质量检查 → 教师复查。', time: '10:03', state: 'completed' },
      { title: '正在生成课件初稿', summary: '已完成 12/18 页，正在补充例题解析与分层练习。', time: '现在', state: 'running' },
    ],
    artifact: { title: '函数单调性课件', version: '初稿 · v1', progress: '12 / 18 页', eyebrow: '第二章 · 函数的性质', heading: '函数的单调性', summary: '从图像变化理解“在区间上递增或递减”', truthLabel: '结构预览为本地固定数据，不代表 AI 已真实生成文件。' },
  },
  {
    fixtureVersion: 'workbuddy-m3-v1', id: 'run-lesson-package', title: '函数单元课程方案包', relativeTime: '5 小时', runState: { status: 'waiting', allowedCommands: ['confirm', 'revise'], recovery: 'confirm-or-revise' },
    goal: '从函数单元课程目标出发，生成课件、作业、测验和录播脚本组成的课程方案包。',
    contextLabels: ['高一（3）班', '高中数学', '函数单元'],
    steps: [
      { title: '课程目标已解析', summary: '识别知识目标、能力目标和单元课时边界。', time: '08:41', state: 'completed' },
      { title: '课程包结构已规划', summary: '拟生成课件、作业、测验和录播脚本四类课程对象。', time: '08:43', state: 'completed' },
      { title: '等待确认生成范围', summary: '请教师确认四类课程对象及预计课时，再继续生成。', time: '待确认', state: 'waiting' },
    ],
    artifact: { title: '函数单元课程方案包', version: '方案 · v1', progress: '4 类课程对象', eyebrow: '函数单元 · 6 课时', heading: '课程对象组合方案', summary: '课件、作业、测验与录播脚本将共享同一课程目标。', truthLabel: '方案结构为本地固定数据，确认操作不会写入 ClassIn。' },
  },
  {
    fixtureVersion: 'workbuddy-m3-v1', id: 'run-homework-review', title: '分析三班作业共性问题', relativeTime: '昨天', runState: { status: 'completed', allowedCommands: ['review-artifact'], recovery: null },
    goal: '分析高一（3）班函数作业，归纳共性问题并形成下一课教学建议。', contextLabels: ['高一（3）班', '函数作业 #4', '42 份提交'],
    steps: [{ title: '作业分析已完成', summary: '已归纳三个高频错误并生成分层教学建议。', time: '昨天', state: 'completed' }],
    artifact: { title: '三班作业诊断报告', version: '完成 · v1', progress: '42 / 42 份', eyebrow: '班级学情', heading: '函数作业共性问题', summary: '定义域判断与单调区间表达是本次主要失分点。', truthLabel: '诊断内容为本地固定示例，不代表真实学生数据。' },
  },
  {
    fixtureVersion: 'workbuddy-m3-v1', id: 'run-quiz', title: '设计二次函数随堂测验', relativeTime: '昨天', runState: { status: 'completed', allowedCommands: ['review-artifact'], recovery: null },
    goal: '设计一份 10 分钟的二次函数随堂测验，并附答案与评分说明。', contextLabels: ['高一（3）班', '二次函数', '10 分钟'],
    steps: [{ title: '测验与答案已生成', summary: '完成 5 道题及逐题评分说明。', time: '昨天', state: 'completed' }],
    artifact: { title: '二次函数随堂测验', version: '完成 · v1', progress: '5 道题', eyebrow: '课堂测验', heading: '二次函数即时检测', summary: '覆盖图像、顶点、开口方向与参数判断。', truthLabel: '测验为本地固定示例，尚未发布到班级。' },
  },
  {
    fixtureVersion: 'workbuddy-m3-v1', id: 'run-parent-note', title: '整理本周学情沟通要点', relativeTime: '2 天', runState: { status: 'failed', allowedCommands: ['retry', 'revise'], recovery: 'retry-or-revise' },
    goal: '整理本周班级学情，生成可由教师复查的家校沟通要点。', contextLabels: ['高一（3）班', '本周学情', '家校沟通'],
    steps: [{ title: '读取学情摘要失败', summary: '模拟数据源暂不可用，可重试或返回修改上下文。', time: '2 天', state: 'failed' }],
    artifact: { title: '本周学情沟通要点', version: '未完成', progress: '0 / 1 份', eyebrow: '可恢复失败', heading: '等待重新生成', summary: '当前没有可供复查的正式产物。', truthLabel: '失败状态为本地模拟，重试不会访问真实业务数据。' },
  },
  {
    fixtureVersion: 'workbuddy-m3-v1', id: 'run-video', title: '制作导数概念微课脚本', relativeTime: '3 天', runState: { status: 'completed', allowedCommands: ['review-artifact'], recovery: null },
    goal: '制作一份 5 分钟导数概念微课脚本。', contextLabels: ['高中数学', '导数', '5 分钟'],
    steps: [{ title: '微课脚本已完成', summary: '旁白、画面与时间轴已经生成。', time: '3 天', state: 'completed' }],
    artifact: { title: '导数概念微课脚本', version: '完成 · v1', progress: '5 分钟', eyebrow: '录播脚本', heading: '从平均变化率到瞬时变化率', summary: '用运动情境引出导数概念。', truthLabel: '脚本为本地固定示例，尚未生成真实视频。' },
  },
  {
    fixtureVersion: 'workbuddy-m3-v1', id: 'run-rubric', title: '生成探究任务评价量规', relativeTime: '5 天', runState: { status: 'completed', allowedCommands: ['review-artifact'], recovery: null },
    goal: '为函数探究任务生成四级评价量规。', contextLabels: ['高一（3）班', '探究任务', '过程评价'],
    steps: [{ title: '评价量规已完成', summary: '形成四个维度与四级表现描述。', time: '5 天', state: 'completed' }],
    artifact: { title: '函数探究任务评价量规', version: '完成 · v1', progress: '4 个维度', eyebrow: '评价工具', heading: '探究任务四级量规', summary: '覆盖问题理解、推理过程、表达与协作。', truthLabel: '量规为本地固定示例，尚未关联真实任务。' },
  },
  {
    fixtureVersion: 'workbuddy-m3-v1', id: 'run-review-plan', title: '规划期中复习任务清单', relativeTime: '1 周', runState: { status: 'completed', allowedCommands: ['review-artifact'], recovery: null },
    goal: '根据期中范围规划两周复习任务清单。', contextLabels: ['高一（3）班', '期中复习', '2 周'],
    steps: [{ title: '复习计划已完成', summary: '按知识模块和课时生成两周任务清单。', time: '1 周', state: 'completed' }],
    artifact: { title: '期中复习任务清单', version: '完成 · v1', progress: '10 项任务', eyebrow: '复习计划', heading: '两周期中复习安排', summary: '从集合、函数到指数与对数分阶段复习。', truthLabel: '计划为本地固定示例，尚未写入课程表。' },
  },
];
