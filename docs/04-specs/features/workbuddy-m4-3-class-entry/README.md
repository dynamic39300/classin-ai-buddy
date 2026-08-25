---
title: M4.3 ClassIn 站内 TeachBuddy MVP 入口规格包
status: COMPLETE_USER_ACCEPTED
version: v1.3
date: 2026-08-25
decision: D-098/D-099/D-100/D-101
---

# M4.3 ClassIn 站内 TeachBuddy MVP 入口

> 当前展示品牌按 D-108 统一为 **ClassIn TeachBuddy**（界面简称 **TeachBuddy**）。本目录和既有类型中的 `workbuddy` 保留为内部工程兼容标识。

本目录按 `PRD → Feature Spec → Tickets → Implementation → Review → Acceptance` 管理 M4.3：在班级课程详情中提供教师私密 TeachBuddy MVP 入口，同时保留班级共享“AI 应用”和 Demo 中的终局一级 TeachBuddy。

| 事实源 | 文件 | 状态 |
| --- | --- | --- |
| 产品需求 | [PRODUCT-REQUIREMENTS.md](./PRODUCT-REQUIREMENTS.md) | `APPROVED_FOR_IMPLEMENTATION` |
| 工程规格 | [FEATURE-SPEC.md](./FEATURE-SPEC.md) | `APPROVED_FOR_IMPLEMENTATION` |
| 实施票据 | [TICKET-BREAKDOWN.md](./TICKET-BREAKDOWN.md) | `COMPLETE_USER_ACCEPTED` |
| 实现追踪 | [IMPLEMENTATION-TRACEABILITY.md](./IMPLEMENTATION-TRACEABILITY.md) | `PASS` |
| 工程复核 | [IMPLEMENTATION-REVIEW.md](./IMPLEMENTATION-REVIEW.md) | `PASS_USER_ACCEPTED` |

本 Feature 建立 `ideal-full` 与 `classin-mvp` 两个独立 Product Module：分别拥有 Shell/导航身份、能力配置、Route、Session Namespace 和全部 WorkBuddy 私有数据；只复用更低层的 WorkBuddy Core、通用 Surface、Design System 与 Adapter Interface。MVP 从班级详情进入独立全屏 WorkBuddy 页面，不在原 ClassIn 主导航中新增入口。第一轮 MVP 裁剪保留“我的任务、技能市场、工具连接、我的文件”，隐藏定时任务和设置；终局功能与历史不受影响。

用户于 2026-08-25 完成页面实机验收，确认入口、独立 Shell、导航裁剪、原新建任务页面、返回链路与终局隔离均无问题，并授权继续进入 M4.4。
