---
title: WorkBuddy M4.1 对话式 Agent Run 实施验收记录
status: READY_FOR_USER_REVIEW
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
- 支持课件编辑、停止、继续、补充指令和一次受控 Replanning；
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
- 视觉快照覆盖：补参、计划、执行、Artifact、编辑、Action、Approval、Receipt、方案包计划、方案包执行和部分成功恢复。

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
3. 编辑课件并完成 Approval 与 Receipt；
4. 从课件派生课程方案包，确认双向定位；
5. 新建课程方案包任务，检查四类产物、部分成功和失败项重试；
6. 在紧凑窗口下检查 Timeline、右侧活动区和主操作是否仍可达。

## 8. Review 状态

- 产品设计与 To Spec：已由用户确认；
- Tickets 01—09：已完成；
- Ticket 10：等待 Spec / Standards 双轴代码审查完成后关闭；
- M4.1 实施验收：`READY_FOR_USER_REVIEW`，尚未声明用户验收通过。
