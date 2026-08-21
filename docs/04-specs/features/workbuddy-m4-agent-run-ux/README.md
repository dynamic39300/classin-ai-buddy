---
title: WorkBuddy M4.1 对话式 Agent Run UX 规格包
status: REVIEWED_APPROVED
version: v0.2
date: 2026-08-21
review_gate: M4_1_PRODUCT_REVIEW
---

# WorkBuddy M4.1 对话式 Agent Run UX 规格包

## 1. 阶段定位

M4 已经实现并验证单课件、课程方案包、Core Context、Artifact、ProposedAction、Approval、ExecutionReceipt、异常恢复与 Replanning 的功能和领域语义。用户 Review 确认能力覆盖没有问题，但现有交互主要依靠阶段卡片、按钮推进和右侧面板切换，无法让教师感知一个正在发生的标准 Agent Run。

M4.1 只重做**体验表达与页面编排**：把完整任务闭环放回一个持续存在的 Agent 对话窗口，通过消息、结构化卡片、动态过程事件、确认窗口和右侧辅助区连续完成。当前阶段使用确定性 Experience Adapter 模拟动态 Agent；未来真实 Agent Runtime 通过稳定 Seam 替换。

## 2. 已确认设计输入

- D-025：单课件与课程方案包在同一对话式 Run 时间线内完成完整闭环；
- D-026：Core Context 使用默认展开的业务对象树，右侧活动区只切换 `上下文 / 产出`；
- D-027：当前模拟 Run 体验，未来真实 Agent Runtime 通过同一 Interface 替换；
- D-028：NineClaw 目标录屏是逐帧还原基线，默认 100% 覆盖可见元素、顺序、状态与动效并完整登记源文案；V05 的智能课件任务作为唯一内容主线，V04/V06 只补充产物预览、编辑和保存交互，其任务文案统一改写为智能课件语义；
- M4 既有领域对象、业务审批、写回 Adapter 和 Receipt 真值不被前端重构绕过。

## 3. 本规格包

| 文档 | 回答的问题 | 状态 |
| --- | --- | --- |
| [体验差异与范围](./UX-DELTA-AND-SCOPE.md) | 为什么重做、什么改变、什么保持不变、模拟与真实 Agent 的 Seam 在哪里 | `REVIEWED_APPROVED` |
| [对话式 Agent Run PRD](./CONVERSATION-RUN-PRD.md) | 单一任务窗口如何承载 Goal、补参、计划、执行、产物、审批与回执 | `REVIEWED_APPROVED` |
| [事件、卡片与状态规格](./EVENT-CARD-AND-STATE-SPEC.md) | 时间线里有哪些事件/卡片，每种状态、命令、焦点与恢复规则是什么 | `REVIEWED_APPROVED` |
| [Core Context 树与 Composer 规格](./CORE-CONTEXT-TREE-AND-COMPOSER-SPEC.md) | 班级、课程、计划、单元、活动、资源如何展开、勾选并进入 Prompt | `REVIEWED_APPROVED` |
| [统一右侧活动区规格](./ACTIVE-INSPECTOR-SPEC.md) | `上下文 / 产出` 如何切换、收起、自动提示、全屏与恢复 | `REVIEWED_APPROVED` |
| [双任务 Storyboard](./COURSEWARE-AND-PACKAGE-STORYBOARD.md) | 单课件和课程方案包逐帧、逐动作如何动态完成完整 Run | `REVIEWED_APPROVED` |
| [M4.1 Review 清单](./M4-1-REVIEW-CHECKLIST.md) | 用户需要逐项确认什么，哪些事项仍未锁定 | `REVIEWED_APPROVED` |
| [M4.1 用户端到端验收清单](./M4-1-USER-END-TO-END-ACCEPTANCE-CHECKLIST.md) | 在可运行页面中按教师真实操作顺序验收两条完整闭环、恢复与可用性 | `READY_FOR_USER_REVIEW` |
| [NineClaw 逐帧还原矩阵](./NINECLAW-FRAME-PARITY-MATRIX.md) | V04/V05/V06 的可见交互如何统一映射为同一智能课件任务 | `TO_SPEC_EVIDENCE` |
| [M4.1 Feature Spec](./FEATURE-SPEC.md) | 把已批准产品设计转换为 ConversationRun Interface、实施决策、测试 Seam 与验收边界 | `READY_FOR_AGENT` |
| [Ticket 拆分提案](./TICKET-BREAKDOWN-PROPOSAL.md) | 10 个 tracer-bullet 纵向票及其阻塞关系 | `REVIEWED_APPROVED` |
| [M4.1 实施验收记录](./M4-1-IMPLEMENTATION-REVIEW.md) | 当前可操作闭环、自动化事实、明确边界与用户 Review 顺序 | `READY_FOR_USER_REVIEW` |

## 4. 本轮 Write Set

本轮只允许修改：

- 本目录下的 M4.1 产品与交互规格；
- `docs/00-project/DECISION-LEDGER.md`；
- M4 `PHASE-4-REVIEW-CHECKLIST.md`；
- 必要的文档索引。

本轮明确不修改：

- `src/` 和 `tests/`；
- 导航结构、导航文案、历史任务数量和导航视觉；
- M4 领域状态机、Action/Approval/Receipt 规则；
- 真实 LLM、Agent Runtime、Skill/MCP、文件生成或 ClassIn 生产 Adapter；
- 全局 ClassIn PC 的 Demo 文案。

## 5. Review 顺序

1. 先审 [体验差异与范围](./UX-DELTA-AND-SCOPE.md)，确认 M4.1 没有改变底层业务语义；
2. 再审 [对话式 Agent Run PRD](./CONVERSATION-RUN-PRD.md) 和 [双任务 Storyboard](./COURSEWARE-AND-PACKAGE-STORYBOARD.md)，确认主体验；
3. 审 [Core Context 树与 Composer](./CORE-CONTEXT-TREE-AND-COMPOSER-SPEC.md) 与 [统一右侧活动区](./ACTIVE-INSPECTOR-SPEC.md)；
4. 最后审 [事件、卡片与状态规格](./EVENT-CARD-AND-STATE-SPEC.md) 和 [M4.1 Review 清单](./M4-1-REVIEW-CHECKLIST.md)；
5. 全部确认后再执行 To Spec → To Tickets → Implementation。

## 6. 完成定义

M4.1 设计只有在以下条件同时满足时才可以进入 To Spec：

- 两条任务都能在同一个 Run 对话窗口内从 Goal 走到 Receipt；
- 补参、Plan、Process、Skill/Tool、Artifact、Approval 都有明确的时间线表达；
- Core Context 勾选与 Composer Chip 双向同步；
- Context 与产出共享一个右侧活动区，状态和焦点不会互相覆盖；
- 页面不依靠阶段 Route 表达任务进度，刷新/历史恢复仍使用稳定 Run ID；
- 模拟 Experience Adapter 与未来真实 Agent Runtime 的替换 Seam 清晰；
- 失败、等待、取消、修改目标、审批和恢复不退化成静态成功演示；
- NineClaw 逐帧对照表覆盖目标录屏全部可见事实，所有 ClassIn 适配、脱敏与新增治理都有差异记录；
- 未确认的导航和真值文案问题没有被静默锁定。
