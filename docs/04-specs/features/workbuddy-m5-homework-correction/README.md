---
title: WorkBuddy M5 作业批改、错因分析与订正
status: READY_FOR_USER_REVIEW
version: v0.1
date: 2026-08-22
review_gate: M5_PRODUCT_SPEC_REVIEW
---

# WorkBuddy M5：作业批改 → 错因分析 → 订正

本目录是工程顺序中的第二条纵向切片。它复用 M4.1 已验证的对话式 `ConversationRun`、Core Context、Timeline、Artifact、ProposedAction、Approval 和 ExecutionReceipt，不改变课程生产 Run 的既有语义。

| 文档 | 回答的问题 | 状态 |
| --- | --- | --- |
| [作业订正 PRD](./CONVERSATION-RUN-PRD.md) | 教师如何在一个任务窗口内完成批改分析与订正闭环 | `READY_FOR_USER_REVIEW` |
| [Feature Spec](./FEATURE-SPEC.md) | 状态、接口、领域规则、测试 Seam 与范围 | `READY_FOR_USER_REVIEW` |
| [Ticket Breakdown](./TICKET-BREAKDOWN-PROPOSAL.md) | 可独立验收的实施切片与阻塞关系 | `READY_FOR_USER_REVIEW` |

## 与 M4.1 的关系

- M4.1 的课程目标 → 课程对象仍是第一条主样板；本目录不重写其页面或领域对象。
- 本切片先使用固定、脱敏、可重置的作业与提交数据，验证学生证据、评分标准、答案保护和二次结果证据。
- 当前仍是确定性 Experience Adapter；真实模型、Skill/MCP、ClassIn 生产 API 和持久化不在本切片范围内。
