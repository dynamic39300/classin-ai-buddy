---
title: M4.3 ClassIn 站内 TeacherIn MVP 入口 Tickets
status: READY_FOR_USER_ACCEPTANCE
version: v1.2
date: 2026-08-24
---

# M4.3 Tickets

| Ticket | 纵向交付 | 依赖 | Done when | 状态 |
| --- | --- | --- | --- | --- |
| M4.3-01 | PRD、Feature Spec、决策与 Write Set | D-098 | 双 Experience、共享实现/隔离数据、隐藏规则和返回链路一致 | PASS |
| M4.3-02 | Experience Profile 与路由 Deep Module | 01 | 两个 Profile 的路径、allowlist、Launch Context 和 fail-closed Module tests 通过 | PASS |
| M4.3-03 | WorkBuddy Data Space Namespace | 02 | Workspace/Runtime/Receipt 隔离；切换 Profile 不串历史或幂等结果 | PASS |
| M4.3-04 | 班级详情双 AI 模块 | 02 | `AI 应用` 保持共享语义；`TeacherIn` 独立、仅教师可见且可进入 | PASS |
| M4.3-05 | MVP 独立全屏工作区与内部导航 | 02,03,04 | 独立 Shell 不挂载 ClassIn 主导航；保留任务、Skills、Tools、Files；所有内部链接留在 MVP Route Base | PASS |
| M4.3-05A | “我的任务”命名与 MVP 导航裁剪 | 05 | 只改左栏名称且保持原 `/new` 页面；隐藏分组文案、Schedules、Settings；导航间距收紧，上下文与返回紧跟导航 | PASS |
| M4.3-06 | 返回链路与 A/B 班 Launch Context | 05 | 返回原现场；A/B 重入共享 MVP 数据空间但不改已有 ContextSnapshot | PASS |
| M4.3-07 | Isolation、Integration、E2E、a11y、Visual | 03–06 | 双入口共存、数据不串、学生隔离和关键视口 Gate 通过 | PASS |
| M4.3-08 | Standards/Spec Review 与用户验收包 | 07 | 工程 Review 与 Requirement 证据完整；等待用户页面验收 | READY_FOR_USER_ACCEPTANCE |

实施顺序：`01 → 02 → 03 → 04 → 05 → 06 → 07 → 08`。后续 MVP 裁剪单独立项，不在本期提前删除能力。
