---
title: WorkBuddy M4.1 对话式 Agent Run 实施验收记录
status: REVIEWED_APPROVED
version: v0.1
date: 2026-08-21
review_gate: M4_1_IMPLEMENTATION_REVIEW
---

# WorkBuddy M4.1 对话式 Agent Run 实施验收记录

## 1. 本阶段交付结论

M4.1 已把 M4 中分散的阶段页表达收敛为持续存在的 Agent 任务窗口。教师可在同一条 Timeline 中完成：

```text
Goal
→ Core Context
→ 信息补齐
→ Plan
→ Process / Skill / Tool
→ Artifact
→ ProposedAction
→ Approval
→ ExecutionReceipt
```

本阶段实现的是可确定性重放的 Agent Run 体验层，不是生产 Agent Runtime。底层 M4 领域对象、审批、策略校验、Adapter 和 ExecutionReceipt 语义继续生效；未来真实 Agent 能力应通过 `ConversationRun` Seam 替换 Experience Adapter，不重写教师交互主链。

## 2. 可验收的两条纵向闭环

### 2.1 智能课件 Run

- 从新任务 Composer 创建 Run，并把勾选的 ClassIn 业务对象固化为 `ContextSnapshot`；
- 在 Timeline 内完成信息补齐、计划确认、过程事件和 Skill / Tool 调用展示；
- 在统一右侧活动区切换上下文与智能课件产物；
- 支持课件全局只读预览、逐页浏览、停止、继续、补充指令和一次受控 Replanning；
- 通过 `ProposedAction → Approval → ExecutionReceipt` 完成受治理写回；
- 权限拒绝等可恢复失败保留在同一 Run 内，并要求重新审批；
- 已批准课件可派生独立课程方案包 Run，并支持双向定位。

### 2.2 课程方案包 Run

- 在同一任务窗口中配置并生成课件、作业、测验、录播脚本四类产物；
- 动态展示各产物的计划、执行进度、依赖等待和完成状态；
- 支持停止、补充要求和继续执行；
- 通过一次批量 Approval 获得对象级 ExecutionReceipt；
- 部分成功时只重试失败项与等待依赖，不重复执行已成功对象；
- 原始 Receipt 和重试 Receipt 都保留在 Timeline 中，形成可复查证据链。

## 3. 页面与交互事实

- Run 的主流程不再依赖阶段 Route 或阶段跳转按钮；
- Core Context 默认展开，以班级、课程、教学计划、单元、活动与空间资源组成可勾选树；
- Context 选择与 Composer Chip 双向同步；
- 右侧只保留 `上下文 / 产出` 两个活动区，并可收起、展开和切换；
- 运行状态、过程事件、产物、审批和回执在同一 Timeline 中连续追加；
- 页面保留可识别但克制的“体验环境”真值标记，不把确定性体验数据表述成生产 Agent 或真实 ClassIn 写回；
- 已删除被新 Surface 全量接管的旧 `CoursewareRunSurface`、`PackageRunSurface` 及旧阶段式浏览器验收。

## 4. NineClaw 对标证据

- `nineclaw-parity.ts` 登记 22 个源事件；
- 每个事件都映射到可验收的 Timeline 表达或明确的 ClassIn 上下文边界；
- 单课件主线统一为“智能课件”，没有混入教学动画或课后练习源任务；
- 视觉快照覆盖：补参、计划、执行、Artifact、全局只读预览、Action、Approval、Receipt、方案包计划、方案包执行和部分成功恢复。

## 5. 自动化验收事实

2026-08-21 的本地复验结果：

| 检查 | 结果 |
| --- | --- |
| TypeScript、ESLint、Vitest | `PASS`：54 个测试文件、388 项测试 |
| Production Build | `PASS`；仅保留既有的大 Chunk 提示 |
| 全量 Playwright E2E | `PASS`：68/68 |
| M4.1 专属视觉验收 | `PASS`：2 条旅程、11 个关键状态快照 |
| 紧凑桌面 1000×768 | `PASS` |
| Reduced Motion、键盘操作、axe | `PASS` |

仓库级旧视觉基线当前同时受到另一并行导航 / Shell 改造影响，因此本轮没有批量覆盖这些全局快照。M4.1 使用独立视觉规格和独立快照目录完成验收，避免把另一个变更集静默混入本提交。

## 6. 明确未实现的生产能力

以下内容不属于 M4.1，页面也不能据此被解释为生产就绪：

- 真实 LLM、Agent Runtime、模型流式协议或 Durable Workflow；
- 真实 Skill / MCP / Tool 调用；
- 真实课件、作业、测验或录播文件生成；
- ClassIn 生产数据 API、权限系统和正式写回 Adapter；
- 跨会话持久化与多端同步。

## 7. 用户 Review 建议顺序

1. 新建“生成智能课件”任务，检查 Context 勾选、信息补齐与计划确认；
2. 运行任务，检查过程事件、Skill / Tool 调用、停止 / 继续和右侧产出；
3. 进入课件全局预览，检查目录、上下翻页、键盘操作与第三方编辑器边界，再完成 Approval 与 Receipt；
4. 从课件派生课程方案包，确认双向定位；
5. 新建课程方案包任务，检查四类产物、部分成功和失败项重试；
6. 在紧凑窗口下检查 Timeline、右侧活动区和主操作是否仍可达。

## 8. Review 状态

- 产品设计与 To Spec：已由用户确认；
- Tickets 01—09：已完成；
- Ticket 10：Spec / Standards 双轴代码审查已完成；
- M4.1 用户端到端验收：2026-08-22 已由用户确认通过；
- AI Agent 导航调整：已完成；
- UI Freeze：`REVIEWED_APPROVED`，可进入下一条业务切片的 To Tickets → Implementation。

## 9. 2026-08-22 Agent Run UI 质感修订

本轮根据用户对流式输出后的整体 UI 反馈，完成一次不改变领域状态、事件顺序、路由和 ClassIn Shell 的视觉与交互修订：

- Timeline 改为带连续执行轨道的紧凑事件流；`queued / running / requires_teacher_input / completed / failed / stopped / cancelled / superseded` 使用语义图标、文本与状态色共同表达，不仅依赖颜色；
- 运行中的 Run、Capability 和方案包产物增加呼吸、扫光与对象级进度反馈，动效仅表达当前活动状态；Reduced Motion 下保持同一业务顺序并关闭自动动画；
- 补参、计划、Action 和批量方案包卡片改为更紧凑的多列扫描布局，保持桌面局部交互感；
- 单对象与多对象 Approval 弹窗缩减宽高和留白，以网格显示来源、范围、变更、影响和版本，并显式说明“批准”和“实际执行回执”仍是两个步骤；
- Composer、Header 状态与 Inspector 操作统一使用现有 ClassIn 绿色语义 Token、克制阴影和 4/6/8px 圆角体系，没有引入第二套设计系统或 AI 紫色主题；
- “新增 N 条”控制调整为合法的 Feed Article，保留按钮语义并通过 axe 的 `aria-required-children` 检查；
- 视觉测试在关键帧截图前显式跟随最新事件，消除流式事件与自动滚动竞争造成的快照抖动。

## 10. 2026-08-22 文档 Artifact 只读预览修订

本轮以 NineClaw 的左会话/右预览结构和聚焦阅读形态为参考，并按用户明确边界移除 Work Buddy 内嵌编辑：

- 智能课件使用 18 页确定性模拟内容，右侧辅助区显示当前页并提供上一页、下一页与页码反馈；
- 聚焦预览显示全部页面目录，支持目录跳转、方向键、PageUp/PageDown、Home/End 与 Esc 退出；
- 预览器显式标注“只读预览”和 `[模拟] PPTX 预览`，不把体验内容描述为真实文件渲染；
- 原“编辑课件”和 AI 修改输入改为“使用专业编辑器打开”，当前未接入第三方编辑器时只返回可解释提示；
- ProposedAction、Approval 与 ExecutionReceipt 继续引用当前 Artifact 版本，不因浏览页码而产生新版本。
- 2026-08-22 复验：TypeScript、ESLint、Production Build 通过；Vitest `58/58` 文件、`418/418` 项通过；M4.1 E2E `15/15` 通过；M4.1 视觉旅程 `2/2` 通过。

本轮复验结果：`npm run check` 通过（57 个测试文件、415 项测试）；Production Build 通过并仅保留既有大 Chunk 提示；M4.1 专属 E2E 14/14 通过；M4.1 视觉旅程 2/2 通过，11 张关键状态快照更新并连续复跑稳定；Reduced Motion 与 axe 验收通过。

## 10. 2026-08-22 Agent Run 执行进度感知修订

本轮在不改变领域状态机、事件顺序和审批写回边界的前提下，强化确定性执行过程的时间感知：

- Run Header 在准备和生成期间显示旋转加载图标、当前步骤序号与整体预计剩余时间；
- 活动 Capability、方案包产物和写回 Action 显示本步骤预计剩余时间，等待与完成状态仍保持原有语义；
- 固定体验节奏调整为准备 `2s`、每个生成步骤 `3s`、写回 `2s`，单课件完整生成约 `12s`，课程方案包完整生成约 `9s`；
- 当前步骤的截止时间进入可恢复 Presentation State，暂停后继续从剩余时间恢复，刷新后不重复计时或执行；
- 高频倒计时仅作为视觉提示，不逐秒触发读屏播报；Reduced Motion 下停止旋转动画并保留静态状态文字。

以上时间仅描述可重置的固定体验 Adapter，不构成真实 Agent Runtime 的执行时长承诺。

本轮复验结果：`npm run check` 通过（57 个测试文件、415 项测试）；Production Build 通过并仅保留既有大 Chunk 提示；M4.1 专属 E2E 14/14 通过；M4.1 视觉旅程 2/2 通过并连续复跑稳定；Reduced Motion 与关键倒计时状态验收通过。

## 11. 2026-08-22 Inspector 收起布局修复

产出完成后辅助区会按既定规则自动打开。此前点击“收起辅助区”时，Presentation State 与单栏 Grid 已正确更新，但 `.inspector { display: grid; }` 覆盖了原生 `hidden` 的隐藏行为，使辅助区作为第二个 Grid Item 自动排到主工作区下一行，造成 Composer 与产出预览上下错位。

本轮为 `.inspector[hidden]` 显式设置 `display: none`，确保收起状态真正退出布局；不改变产出自动打开、上下文/产出切换和 Inspector 内部状态保留规则。新增浏览器回归用例验证关闭状态、产出不可见和单列 Grid，并增加一张 `1440×900` 收起态视觉快照。
