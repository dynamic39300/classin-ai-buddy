---
title: AgentIn 市场静态复刻实现追踪
status: IMPLEMENTATION_REVIEW_READY
version: v0.4
date: 2026-09-03
---

# AgentIn 市场静态复刻实现追踪

## 1. 追踪矩阵

| Requirement / Spec | Ticket | Implementation | Verification | 状态 |
|---|---|---|---|---|
| 独立 AgentIn Capability，仅 `ideal-full` 可见 | AGIN-04 | `capability-registry.ts`、`ideal-workbuddy-experience.ts`、`AiAgentWorkSurface.tsx` | Profile module + E2E boundary | PASS |
| 固定市场 View Interface | AGIN-02 | `src/features/agentin-market/agentin-market.ts` | 5 Module tests + typecheck | PASS |
| 可追溯头像资产 | AGIN-03 | `tools/agentin/extract-reference-avatars.mjs` + 41 PNG | repeat extraction `--check` + SHA-256 manifest | PASS |
| 默认市场页面与完整分区 | AGIN-05 | `AgentInMarketWorkspace.tsx` + CSS Module | 4 Integration tests + 5 Visual baselines | PASS |
| 搜索、固定推荐轮换和诚实反馈 | AGIN-06 | `AgentInMarketWorkspace.tsx` | Integration + E2E | PASS |
| 响应式、a11y、无横向溢出 | AGIN-07 | `tests/e2e/agentin-market.spec.ts` + Visual spec | 4 E2E / Axe / geometry + 5 Visual | PASS |
| 全量工程与 Spec Review | AGIN-08 | 本文第 4—7 节 | 598 tests + build + scoped lint | PASS_WITH_BASELINE_EXCEPTION |
| `ideal-full` 隐藏 Tools / Schedules 入口但保留能力 | AGIN-09 / D-117 | Experience Profile 的 `navigationCapabilityIds` + 三类导航投影 | Profile tests + WorkBuddy E2E + AgentIn E2E | PASS |
| 技能市场与 AgentIn 互换导航位置 | AGIN-10 / D-118 | `ideal-workbuddy-experience.ts` + `AgentSecondaryNav.tsx` | Profile test + DOM order E2E + Visual | PASS |

## 2. 线上事实与 Demo 适配

| 线上证据 | Demo 实施 | 原因 |
|---|---|---|
| 班级详情 AI 应用加号入口 | TeacherIn 二级导航 AgentIn | 用户本次明确的接入要求 |
| 独立窗口及最大化页面 | 现有 ClassIn Stage / Work Surface | 不复制第二套操作系统窗口 Shell |
| 截图账号为 wangxinlei / 学生 | 沿用 ClassIn 教师宿主身份，不重复 Footer | TeacherIn 只进入教师端，避免身份冲突 |
| 全屏最多五列 | 按 Work Surface 宽度响应式降列 | 保证 1440×900 无横向溢出 |
| 页面控件对应线上功能 | 未知操作只给非完成性本地反馈 | 不制造详情、收藏、授权或添加假闭环 |

## 3. 执行日志

| 时间 | Ticket | 记录 |
|---|---|---|
| 2026-09-03 | AGIN-01 | 用户批准 Ticket Breakdown，进入 Implementation；创建追踪矩阵并确认 Write Set。 |
| 2026-09-03 | AGIN-02 | 建立单一 `getAgentInMarketView` Interface；固定证据、推荐、搜索和兼容分区隐藏在 Module 内。5 tests 与 typecheck 通过。 |
| 2026-09-03 | AGIN-03 | 从三张原始全屏截图确定性裁切 41 个 80×80 头像；重复生成校验通过，Manifest 记录坐标与 SHA-256。 |
| 2026-09-03 | AGIN-04 | Registry 增加 AgentIn 并置于 Skills 前；只加入 `ideal-full` allowlist；MVP 与 Standalone 登录后直达均 fail closed。 |
| 2026-09-03 | AGIN-05 | 完成 Topbar、AgentIn 内部导航、收藏、推荐、五类目录及不支持添加分区；使用既有 ClassIn Shell，不复制线上独立窗口。 |
| 2026-09-03 | AGIN-06 | 搜索消费 Module View、推荐固定轮换；分类/排序/卡片等未知操作只返回可关闭的 `not_connected` 反馈。 |
| 2026-09-03 | AGIN-07 | 1440×900 与 1024×640 浏览器旅程、Axe、键盘 Focus、无横向溢出和五张 Visual baseline 通过。 |
| 2026-09-03 | AGIN-08 | Standards/Spec 自审、598 个全量测试和生产构建通过；`npm run check` 的全仓 lint 被并行数据分析脚本 39 个既有错误阻断，未越界修改。 |
| 2026-09-03 | AGIN-09 | 将能力可用范围与导航发布范围分离；`ideal-full` 隐藏工具连接、定时任务入口，但两条直达路由及全部实现保持可用，MVP 与 Standalone 不变。 |
| 2026-09-03 | AGIN-10 | `ideal-full` 导航调整为技能市场、AgentIn、我的文件；导航投影改为遵循 Profile 声明顺序，不改全局 Registry 或能力路由。 |

## 4. 验收证据

| Gate | 命令 / 证据 | 结果 |
|---|---|---|
| Avatar 可追溯性 | `node tools/agentin/extract-reference-avatars.mjs --check` | PASS，41 个确定性裁切与 Manifest 校验一致 |
| AgentIn Module / UI / Profile | `npx vitest run ...agentin... capability-workspace.test.ts workbuddy-experience-profile.test.ts` | PASS，4 files / 25 tests |
| TypeScript | `npm run typecheck` | PASS |
| 实现范围 Lint | `npx eslint` 覆盖 AgentIn、Registry、Profile、Surface、脚本及新增 Playwright tests | PASS，0 errors |
| 全量 Vitest | `npm run test` | PASS，96 files / 598 tests |
| 生产构建 | `npm run build` | PASS；只有既有 chunk-size warning |
| E2E / a11y | `npx playwright test tests/e2e/agentin-market.spec.ts --project=chromium` | PASS，4/4；Axe serious/critical = 0 |
| Visual | `npx playwright test tests/visual/agentin-market.visual.spec.ts --project=chromium` | PASS，5/5 |
| D-117 导航发布 | Profile module tests；WorkBuddy / Capability / AgentIn E2E；MVP boundary E2E | PASS：入口隐藏、两条直达路由可用、MVP 入口保持、Standalone Profile 不变 |
| D-117 视觉回归 | AgentIn、WorkBuddy Shell、Capability、M4 Run、Quiz 受影响 Visual specs | PASS；相应基线仅更新二级导航发布差异 |
| 全仓 Check | `npm run check` | BASELINE_BLOCKED：typecheck PASS，lint 在 8 个并行 `tools/im_fact_study` / `tools/im_semantic_topic_v1` 脚本产生 39 个非本 Ticket 错误后停止 |

视觉基线：

- `tests/visual/agentin-market.visual.spec.ts-snapshots/agentin-market-1440x900-chromium-darwin.png`；
- `tests/visual/agentin-market.visual.spec.ts-snapshots/agentin-market-1024x640-chromium-darwin.png`；
- `tests/visual/agentin-market.visual.spec.ts-snapshots/agentin-market-middle-1440x900-chromium-darwin.png`；
- `tests/visual/agentin-market.visual.spec.ts-snapshots/agentin-market-bottom-1440x900-chromium-darwin.png`；
- `tests/visual/agentin-market.visual.spec.ts-snapshots/agentin-market-search-result-1440x900-chromium-darwin.png`。

## 5. Standards Review

- Module：页面只消费 `getAgentInMarketView`；Fixture、查询、推荐和兼容分区隐藏在 Feature Module；未提前建立 Adapter；
- 依赖与宿主：沿用现有 `:section` Route、Topbar 和二级导航，没有复制第二套 ClassIn Shell；
- 数据与真值：所有卡片携带 `notion-agentin-20260903`，头像可回溯到固定证据图；不存在远端加载、收藏写入或添加成功假状态；
- UI：主要使用现有语义 Token，业务滚动锁定在市场主体；1440 与 1024 无页面横向溢出；
- a11y：页面只有 Topbar 一个 `h1`；卡片具备“查看智能体”文本名称，不兼容状态通过 description 暴露；键盘焦点与 Axe Gate 通过。

## 6. Spec Review

- 入口：教师 `ideal-full` 的 AgentIn 位于 Skills 前；MVP、Standalone、学生端不可见；
- 页面：内部导航、七项收藏、四项推荐、学段、搜索、五个学科、双排序、可添加及不支持添加区齐全；
- 交互：搜索、清空、空态和固定推荐轮换可用；未知操作只显示 `not_connected` 反馈；
- 适配差异：只保留已批准的宿主 Topbar、教师身份、窗口控制省略和响应式列数变化；
- 非范围：未生成 Agent 详情、DIY、授权、添加到班级、真实收藏或市场后端。
- D-117：Tools 与 Schedules 仍属于 `ideal-full.visibleCapabilityIds`，仅从 `navigationCapabilityIds` 移除；因此不构成功能删除或路由下线。

## 7. 剩余风险与 Review 路线

- 全仓 Lint 基线尚未闭合；待并行数据分析流程整理其 8 个脚本后重跑 `npm run check`；
- 页面文案来自当前 Notion 截图的固定转录，若线上市场内容更新，必须先更新证据而不是静默改 Fixture；
- 用户验收路径：`/select-role` → 老师视角 → TeacherIn → AgentIn；也可直达 `/teacher/ai-agent/agentin`；
- 建议优先 Review：1440 默认页、向下滚动后的不支持添加区、搜索 `NOBOOK`、1024 紧凑布局及 MVP/学生端无入口。
