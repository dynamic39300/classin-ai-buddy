---
title: TeacherIn 内 AgentIn 市场静态复刻 Ticket Breakdown
status: APPROVED_FOR_IMPLEMENTATION
version: v0.1
date: 2026-09-03
source_spec: ./FEATURE-SPEC.md
decision: D-116
---

# TeacherIn 内 AgentIn 市场静态复刻 Tickets

## 1. 执行规则

- 实施顺序：`AGIN-01 → AGIN-02 → AGIN-03 → AGIN-04 → AGIN-05 → AGIN-06 → AGIN-07 → AGIN-08 → AGIN-09 → AGIN-10`；
- 每个 Ticket 只修改自己的 Write Set；发现需要越界时停止实施并回到 Spec；
- 每个 Ticket 先运行自身窄测试，再进入下一 Ticket；
- `AGIN-02` 与 `AGIN-03` 完成后，`AGIN-04` 和 `AGIN-05` 才能装配完整页面；
- 不以整页截图充当页面，不生成未提供的 Agent 详情或添加闭环；
- 所有卡片数据保持 `sourceEvidence = notion-agentin-20260903`；
- 当前文件已通过用户审阅；实施状态必须以验证证据更新，不以聊天中的完成声明代替。

## 2. Ticket 总表

| Ticket | 纵向交付 | 依赖 | 核心验证 | 状态 |
|---|---|---|---|---|
| AGIN-01 | 规格、决策和实现追踪骨架 | D-116、已批准 Spec | 唯一事实源、阶段状态与 Write Set 一致 | PASS |
| AGIN-02 | AgentIn Market Deep Module | 01 | 固定 Fixture、查询、推荐和兼容分区 Module tests | PASS |
| AGIN-03 | 可追溯头像资产 | 01 | 裁切来源、Manifest、校验和、浏览器可加载 | PASS |
| AGIN-04 | Capability Registry、Profile 与路由装配 | 02 | 只在 `ideal-full` 可见；其他 Profile fail closed | PASS |
| AGIN-05 | AgentIn 默认市场页面纵向切片 | 02、03、04 | Topbar、内部导航、推荐、分类、卡片和底部分区完整 | PASS |
| AGIN-06 | 搜索、推荐轮换与未接入反馈 | 05 | 搜索/空状态/固定轮换；不产生假成功 | PASS |
| AGIN-07 | E2E、a11y 与视觉 Gate | 04–06 | 1440×900、1024×640、键盘、Axe、无横向溢出 | PASS |
| AGIN-08 | Standards/Spec Review、回归与交付记录 | 07 | 全量检查、证据对照、实现追踪和剩余风险 | PASS_WITH_BASELINE_EXCEPTION |
| AGIN-09 | 隐藏 Tools / Schedules 导航入口并保留能力 | 08、D-117 | `ideal-full` 导航不可见，直达路由仍可用，其他 Profile 不变 | PASS |
| AGIN-10 | 互换技能市场与 AgentIn 导航顺序 | 09、D-118 | 顺序为技能市场 → AgentIn → 我的文件；功能和路由不变 | PASS |

## 3. AGIN-01 — 规格、决策和实现追踪骨架

### 目标

把已批准的 PRD、Feature Spec、D-116、Ticket 状态和实现证据建立为单一可追溯链路。

### Write Set

```text
docs/00-project/DECISION-LEDGER.md
docs/04-specs/features/agentin-market-replication/README.md
docs/04-specs/features/agentin-market-replication/PRODUCT-REQUIREMENTS.md
docs/04-specs/features/agentin-market-replication/FEATURE-SPEC.md
docs/04-specs/features/agentin-market-replication/TICKET-BREAKDOWN.md
docs/04-specs/features/agentin-market-replication/IMPLEMENTATION-TRACEABILITY.md
```

### Tasks

1. 将 Ticket 审阅结果写回状态；
2. 创建实现追踪表，按 Requirement、Spec、Ticket、代码、测试和证据映射；
3. 记录线上事实与 Demo 适配差异；
4. 确认没有 implementation file 在 Ticket 审阅前产生。

### Done when

- 文档状态没有相互矛盾；
- D-116、PRD、Feature Spec 与 Tickets 可互相定位；
- 实现追踪骨架覆盖 AGIN-02—08；
- 通过文档链接和路径检查。

## 4. AGIN-02 — AgentIn Market Deep Module

### 目标

在 Feature 内建立一个小 Interface，隐藏截图 Fixture、推荐解析、查询和兼容性分区。

### Write Set

```text
src/features/agentin-market/agentin-market.ts
src/features/agentin-market/agentin-market.test.ts
src/features/agentin-market/index.ts
```

### Tasks

1. 定义 `AgentInMarketQuery`、`AgentInCardView`、`AgentInFavoriteView` 和 `AgentInMarketView`；
2. 内部建立固定、不可变 Fixture；
3. 实现 `getAgentInMarketView(query?)`；
4. 固定四个推荐、收藏列表、可添加与不支持添加分区；
5. 实现标题、简介、作者的本地文本匹配；
6. 每条记录携带证据标签和 Avatar Asset 路径。

### Done when

- 页面调用方只需知道单个 View Interface；
- Fixture 不作为可变数组导出；
- 默认顺序、查询、空结果和兼容分区单测通过；
- 无 React、DOM、路由或 Toast 依赖；
- 不出现 Adapter、远端 loading 或 mutation 假状态。

### Narrow verification

```bash
npx vitest run src/features/agentin-market/agentin-market.test.ts
npm run typecheck
```

## 5. AGIN-03 — 可追溯头像资产

### 目标

从已固化的线上截图证据中确定性提取页面需要的头像，不用 AI 重绘、不依赖会过期的 Notion URL。

### Write Set

```text
public/reference/agentin/avatars/*
public/reference/agentin/avatars/MANIFEST.md
tools/agentin/extract-reference-avatars.mjs
```

### Tasks

1. 使用可重复执行的本地脚本从三张全屏证据图裁切头像；
2. 输出稳定、语义化文件名；
3. Manifest 记录源截图、原始尺寸、裁切矩形、输出路径和 SHA-256；
4. 校验所有 Module 记录引用的 Avatar Asset 存在且可读取。

### Done when

- 脚本重复运行产生相同校验和；
- Manifest 可从任一 Avatar 回溯到原截图和裁切区域；
- 不复制整页截图到运行时页面；
- 资产提取脚本的 `--check` 模式通过；
- 不修改或覆盖原始证据图。

### Narrow verification

```bash
node tools/agentin/extract-reference-avatars.mjs --check
```

## 6. AGIN-04 — Capability Registry、Profile 与路由装配

### 目标

让 AgentIn 成为 `ideal-full` TeacherIn 的独立二级能力，并锁定三套 Product Profile 的可见性隔离。

### Write Set

```text
src/features/ai-agent-workspace/capability-registry.ts
src/features/ai-agent-workspace/ideal-workbuddy-experience.ts
src/features/ai-agent-workspace/AiAgentWorkSurface.tsx
src/features/ai-agent-workspace/capability-workspace.test.ts
src/features/ai-agent-workspace/workbuddy-experience-profile.test.ts
```

### Tasks

1. Registry 增加 `agentin`，放在 Skills 前；
2. 仅把 `agentin` 加入 `ideal-full.visibleCapabilityIds`；
3. 在 `AiAgentWorkSurface` 中显式装配 `AgentInMarketWorkspace`；
4. 保持通用 `:section` Route，不新建平行路由树；
5. 锁定 `classin-mvp` 和 `standalone-teacher` 直达时 fail closed；
6. 保持 Skills、Tools、Files、Schedules 和 Run 行为不变。

### Done when

- `/teacher/ai-agent/agentin` 可渲染并可刷新；
- 二级导航顺序以 AgentIn 开始，其余入口相对顺序不变；
- MVP 和 Standalone 导航不存在 AgentIn；
- 非允许 Profile URL 回到各自 `/new`；
- Profile 与 Registry 相关测试通过。

### Narrow verification

```bash
npx vitest run src/features/ai-agent-workspace/capability-workspace.test.ts src/features/ai-agent-workspace/workbuddy-experience-profile.test.ts
npm run typecheck
```

## 7. AGIN-05 — AgentIn 默认市场页面纵向切片

### 目标

完成从二级导航进入、看到完整默认页面、纵向滚动到不支持添加分区的一条可评审切片。

### Write Set

```text
src/features/agentin-market/AgentInMarketWorkspace.tsx
src/features/agentin-market/AgentInMarketWorkspace.module.css
src/features/agentin-market/AgentInMarketWorkspace.test.tsx
src/features/agentin-market/index.ts
```

### Tasks

1. 使用 `usePageHeader` 设置 Topbar“添加智能体”；
2. 渲染 AgentIn 内部导航、收藏列表和置顶标识；
3. 渲染学段、搜索框、猜你喜欢、分类和排序；
4. 渲染全部可添加卡片；
5. 渲染“不支持添加”标题和全部不兼容卡片；
6. 使用确定性头像资产；
7. 建立响应式 Grid、独立纵向滚动和无横向溢出约束；
8. 避免复制学生身份 Footer 和操作系统窗口按钮。

### Done when

- 页面结构、内容、顺序、密度和层级可对应五张证据图；
- Topbar 只有一个 `h1`；
- 1440×900 可看到推荐和市场首屏，并能滚动到尾部分区；
- 1024×640 控件不重叠，内部导航和市场均可达；
- Integration test 覆盖默认页面与不支持添加语义。

### Narrow verification

```bash
npx vitest run src/features/agentin-market/AgentInMarketWorkspace.test.tsx
npm run typecheck
npm run lint
```

## 8. AGIN-06 — 搜索、推荐轮换与未接入反馈

### 目标

让截图中的控件具备一致、诚实的本地 Demo 行为，同时防止未知功能被表达为真实闭环。

### Write Set

```text
src/features/agentin-market/AgentInMarketWorkspace.tsx
src/features/agentin-market/AgentInMarketWorkspace.module.css
src/features/agentin-market/AgentInMarketWorkspace.test.tsx
```

### Tasks

1. 搜索实时消费 `getAgentInMarketView`；
2. 有查询时隐藏推荐，显示两个过滤后分区；
3. 无匹配时显示独立空状态；
4. “换一换”只循环四个固定推荐；
5. 分类/排序切换只改变选中态并提示静态数据未接入；
6. 学段、收起、我创建的、收藏项和卡片点击只产生非完成性 Feedback；
7. Feedback 使用 `aria-live="polite"`，可关闭且不抢焦点。

### Done when

- 搜索、清空、空结果和推荐轮换行为测试通过；
- 任一未接入操作都不出现“已添加”“已收藏”或成功回执；
- 分类和排序不会改变 Fixture 顺序；
- 页面卸载后局部状态清空；
- 键盘和 Focus 行为符合 Spec。

### Narrow verification

```bash
npx vitest run src/features/agentin-market/AgentInMarketWorkspace.test.tsx src/features/agentin-market/agentin-market.test.ts
npm run typecheck
npm run lint
```

## 9. AGIN-07 — E2E、a11y 与视觉 Gate

### 目标

以真实浏览器旅程证明入口、页面、响应式、键盘和视觉复刻满足验收标准。

### Write Set

```text
tests/e2e/agentin-market.spec.ts
tests/visual/agentin-market.visual.spec.ts
tests/visual/agentin-market.visual.spec.ts-snapshots/*
```

### Tasks

1. 从 `/select-role` 进入教师端并打开 TeacherIn → AgentIn；
2. 验证路径、Topbar、内部导航、推荐和两个分区；
3. 验证搜索、空状态和本地反馈；
4. 验证 Tab 顺序、Focus 和 Axe；
5. 在 1440×900 截取顶部、中段、底部分区；
6. 在 1024×640 截取紧凑布局；
7. 检查页面及后代没有横向溢出；
8. 对照五张原始证据图记录已知适配差异。

### Done when

- E2E、a11y 和 Visual tests 通过；
- 无遮挡、横向滚动、不可达按钮或 Footer 溢出；
- 视觉差异仅限 Spec 已声明的宿主 Topbar、教师身份、窗口控制省略和响应式列数；
- 失败不通过固定 sleep 或更新截图掩盖。

### Narrow verification

```bash
npx playwright test tests/e2e/agentin-market.spec.ts
npx playwright test tests/visual/agentin-market.visual.spec.ts
```

## 10. AGIN-08 — Standards/Spec Review、回归与交付记录

### 目标

完成工程规范、Feature Spec、回归、证据与用户验收材料闭环。

### Write Set

```text
docs/04-specs/features/agentin-market-replication/README.md
docs/04-specs/features/agentin-market-replication/TICKET-BREAKDOWN.md
docs/04-specs/features/agentin-market-replication/IMPLEMENTATION-TRACEABILITY.md
```

### Tasks

1. 按 Standards 与 Spec 两个轴审阅实现；
2. 运行全量 `npm run check` 和 `npm run build`；
3. 运行范围内 E2E、a11y 和 Visual；
4. 逐项映射 PRD、Spec、Ticket、代码、测试和截图；
5. 记录未接入功能、已知差异和后续证据需求；
6. 准备浏览器验收路径和用户 Review 清单。

### Done when

- AGIN-01—07 全部 PASS；
- `npm run check`、`npm run build` 和范围浏览器门禁通过；
- Implementation Traceability 无缺口；
- 没有越过 Write Set 或暗示生产接入；
- 页面在运行中的 Demo 可供用户实际验收。

## 11. AGIN-09 — 隐藏 Tools / Schedules 导航入口并保留能力

### 目标

只收缩教师端 `ideal-full` TeacherIn 二级导航，不删除或关闭“工具连接”“定时任务”能力，并保持其他 Product Profile 不变。

### Write Set

```text
docs/00-project/DECISION-LEDGER.md
docs/04-specs/features/agentin-market-replication/*
src/features/ai-agent-workspace/*workbuddy-experience*.ts
src/features/ai-agent-workspace/AgentSecondaryNav.tsx
src/features/ai-agent-workspace/ClassMvpWorkBuddyShell.tsx
src/features/standalone-workbuddy/StandaloneWorkBuddy.tsx
tests/e2e/workbuddy-shell.spec.ts
tests/e2e/agentin-market.spec.ts
tests/visual/workbuddy-shell.visual.spec.ts
tests/visual/agentin-market.visual.spec.ts-snapshots/*
```

### Done when

- `ideal-full` 导航只发布 AgentIn、技能市场、我的文件；
- `/teacher/ai-agent/tools` 与 `/teacher/ai-agent/schedules` 仍可直接访问；
- `classin-mvp` 与 `standalone-teacher` 的导航和路由不变；
- Profile、E2E、视觉和类型检查通过；
- D-117 与实现追踪已落盘。

## 12. AGIN-10 — 互换技能市场与 AgentIn 导航顺序

只调整 `ideal-full.navigationCapabilityIds` 的声明顺序，并让共享二级导航按 Profile 顺序投影。完成条件是浏览器导航顺序精确为“技能市场 → AgentIn → 我的文件”，其他 Profile、路由与能力可用范围不变。

## 13. 实施停止条件

出现以下任一情况时停止当前 Ticket，不自行扩展：

- 原截图无法支持某个页面、交互或权限判断；
- 需要修改 `classin-mvp`、Standalone、Agent Run Domain 或 Skill Workspace；
- Avatar 裁切无法保持可追溯或涉及新的外部素材；
- 当前项目 Token 无法表达原图且需要改全局 Design System；
- 现有用户修改与 Ticket Write Set 冲突；
- 测试暴露与 D-116 或已批准 Spec 相冲突的行为。
