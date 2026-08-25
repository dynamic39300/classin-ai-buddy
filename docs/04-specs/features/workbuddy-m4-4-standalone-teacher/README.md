---
title: M4.4 独立教师 WorkBuddy Web 产品规格包
status: COMPLETE_USER_ACCEPTED
version: v1.2
date: 2026-08-25
decision: D-102/D-103/D-104/D-105/D-106/D-107
---

# M4.4 独立教师 WorkBuddy Web 产品

本目录按 `Research → PRD → Feature Spec → Tickets → Implementation → Review → Acceptance` 管理 M4.4。产品面向个人教师和未合作机构中的教师，提供独立官网、个人账号、完整 WorkBuddy、AI 点数、模拟会员订单以及连接 ClassIn 的价值引导。

| 事实源 | 文件 | 状态 |
| --- | --- | --- |
| 行业研究 | [研究底稿](../../../01-research/source-notes/standalone-teacher-workbuddy-acquisition-credits-and-membership-20260825.md) | `COMPLETE` |
| 内容生态边界 | [TeacherIn 内容兼容与独立产品边界](../../../06-architecture/TEACHERIN-CONTENT-COMPATIBILITY.md) | `LOCKED` |
| 产品需求 | [PRODUCT-REQUIREMENTS.md](./PRODUCT-REQUIREMENTS.md) | `APPROVED_FOR_IMPLEMENTATION` |
| 工程规格 | [FEATURE-SPEC.md](./FEATURE-SPEC.md) | `APPROVED_FOR_IMPLEMENTATION` |
| 实施票据 | [TICKET-BREAKDOWN.md](./TICKET-BREAKDOWN.md) | `COMPLETE` |
| 实现追踪 | [IMPLEMENTATION-TRACEABILITY.md](./IMPLEMENTATION-TRACEABILITY.md) | `COMPLETE` |
| 工程复核 | [IMPLEMENTATION-REVIEW.md](./IMPLEMENTATION-REVIEW.md) | `PASS` |
| 用户验收 | 2026-08-25 方案与页面 Review | `COMPLETE_USER_ACCEPTED` |

`standalone-teacher` 是第三套独立 Product Module，不是终局或 ClassIn MVP 的路由别名。三套产品只复用经过明确审阅的底层 Module 与 Interface；产品 Shell、配置、Session、账号、任务和商业数据完全隔离。

内容生态采用“运行隔离、格式兼容”：Standalone 的内容对象和数据独立，但所有内容资源从生产起即遵循 TeacherIn 内容契约。该关系的唯一详细说明见 [TeacherIn 内容兼容与独立产品边界](../../../06-architecture/TEACHERIN-CONTENT-COMPATIBILITY.md)。

M4.4 已完成封版前清理：Standalone 的账号、Workspace、能力数据、内容数据及写回证据均按个人账号隔离；内容发布在独立产品内形成持久化闭环，不再借用 ClassIn/TeacherIn 页面或业务 Adapter。M4.5 仅承接跨产品 UI 与体验一致性优化，不改写本规格包已验收的业务逻辑。
