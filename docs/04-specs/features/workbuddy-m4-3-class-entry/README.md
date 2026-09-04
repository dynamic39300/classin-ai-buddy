---
title: M4.3 ClassIn 站内 TeacherIn MVP 入口规格包
status: IMPLEMENTED_READY_FOR_REVIEW
version: v1.4
date: 2026-09-04
decision: D-098/D-099/D-130/D-131
---

# M4.3 ClassIn 站内 TeacherIn MVP 入口

> 当前展示品牌按 D-132 统一为 **ClassIn TeacherIn**（界面简称 **TeacherIn**）。本目录和既有类型中的 `workbuddy` 保留为内部工程兼容标识。

本目录按 `PRD → Feature Spec → Tickets → Implementation → Review → Acceptance` 管理 M4.3：在班级课程详情中提供教师私密 TeacherIn MVP 入口，同时保留班级共享“AI 应用”和 Demo 中的终局一级 TeacherIn。

| 事实源 | 文件 | 状态 |
| --- | --- | --- |
| 产品需求 | [PRODUCT-REQUIREMENTS.md](./PRODUCT-REQUIREMENTS.md) | `APPROVED_FOR_IMPLEMENTATION` |
| 工程规格 | [FEATURE-SPEC.md](./FEATURE-SPEC.md) | `APPROVED_FOR_IMPLEMENTATION` |
| 实施票据 | [TICKET-BREAKDOWN.md](./TICKET-BREAKDOWN.md) | `COMPLETE_USER_ACCEPTED` |
| 实现追踪 | [IMPLEMENTATION-TRACEABILITY.md](./IMPLEMENTATION-TRACEABILITY.md) | `PASS` |
| 工程复核 | [IMPLEMENTATION-REVIEW.md](./IMPLEMENTATION-REVIEW.md) | `PASS_USER_ACCEPTED` |

2026-09-04 按 D-130 / D-131 完成组合升级：`classin-mvp` 继续使用原独立全屏 `ClassMvpWorkBuddyShell`，保留旧导航版式、品牌区、入口班级信息、返回班级命令、独立 Route、Launch Context、Session Namespace 与私有任务数据；菜单更新为“我的任务、技能市场、AgentIn、我的文件”，正文与一级 TeacherIn“我的任务”复用同一个 Task Assembly 首页及交互。

用户于 2026-08-25 完成页面实机验收，确认入口、独立 Shell、导航裁剪、原新建任务页面、返回链路与终局隔离均无问题，并授权继续进入 M4.4。

上述 2026-08-25 Shell 结论是历史验收记录；当前可见产品事实由 D-130 与本文件 v1.4 替代。
