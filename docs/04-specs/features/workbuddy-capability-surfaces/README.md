---
title: WorkBuddy 能力与资源页面
status: IMPLEMENTED_REVIEW_PENDING
version: v0.1
date: 2026-08-22
review_gate: CAPABILITY_SURFACES_UI_REVIEW
---

# WorkBuddy 能力与资源页面

本 Feature 实现 AI Agent 二级导航下的六个可操作页面：技能市场、工具连接、内容资源、我的文件、定时任务和设置。

页面设计依据：

- `docs/04-specs/features/workbuddy-v1-workspace/PAGE-LEVEL-PRD.md`
- `docs/04-specs/features/workbuddy-v1-workspace/COMPONENT-FIELD-AND-STATE-SPEC.md`
- `docs/02-product/workbuddy-v1-target-blueprint/NINECLAW-CLASSIN-PARITY-MATRIX.md`
- ClassIn PC / Linear 的已锁定视觉和交互规范

当前实现是固定、脱敏、可重置的体验数据；页面交互、状态和入口均真实可操作，但不宣称真实 Skill、MCP、内容平台、调度服务或生产数据连接已经接入。

| 文档 | 状态 |
| --- | --- |
| [Feature Spec](./FEATURE-SPEC.md) | `READY_FOR_USER_REVIEW` |
| [高保真页面规格](./PAGE-LEVEL-PRD.md) | `READY_FOR_USER_REVIEW` |
| [Ticket Breakdown](./TICKET-BREAKDOWN-PROPOSAL.md) | `READY_FOR_USER_REVIEW` |

实现状态：六个页面及关键交互已完成，等待用户进行页面级高保真验收。对应本地 tickets 位于 `.scratch/workbuddy-capability-surfaces/issues/`。
