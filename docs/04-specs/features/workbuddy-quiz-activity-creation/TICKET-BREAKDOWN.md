---
title: WorkBuddy Quiz Activity Draft Creation Tickets
status: COMPLETE
version: v1.4
date: 2026-08-24
---

# Ticket Breakdown

| Ticket | 纵向交付 | 依赖 | Done when | 状态 |
| --- | --- | --- | --- | --- |
| WQ-01 | PRD、Spec、决策与截图字段清单 | D-086 | `WQ-PRD-001..013` 可追踪，未知字段不被猜测 | PASS |
| WQ-02 | QuizActivityCreation Domain tracer bullet | 01 | 固定 5 题试卷、参数与 draft-only 状态通过 Domain Seam | PASS |
| WQ-03 | Quiz Draft Adapter 与 Class Activity 草稿模型 | 02 | 成功/幂等/冲突/权限/失败契约通过；草稿进入共享 Class Store | PASS |
| WQ-04 | 一级 WorkBuddy 对话 Run 与交互卡 | 02,03 | 教师可从入口完成生成、参数确认、审批和 Receipt | PASS |
| WQ-05 | 班级课程详情草稿承接、编辑与发布 | 03 | 同一活动可逐题及按参数编辑；发布前学生不可见、发布后可见 | PASS |
| WQ-06 | E2E、视觉、a11y 与回归 | 04,05 | 核心浏览器旅程、1440×900、静态和回归通过 | PASS |
| WQ-07 | Standards/Spec Review 与 Implementation 追踪 | 06 | 无未处理 hard finding，全部需求有证据 | PASS |
| WQ-08 | Agent Run 连续动态体验对齐 | 04,07,D-092 | 仅保留真实教师决策点；系统生成自动逐步推进，刷新可恢复，Integration/E2E/Visual 通过 | PASS |
| WQ-09 | 对话补参、持续 Composer 与按需产出 Inspector | 08,D-093 | 题型/总分可填写并改变 Artifact；Composer 可操作；生成前无预览、生成后链接展开；Integration/E2E/Visual 通过 | PASS |
| WQ-10 | 标准 Run Header 与辅助区命令对齐 | 09,D-094 | Header、上下文/产出计数、Tab、版本元数据与文字收起命令和既有 Run 一致；Integration/E2E/Visual 通过 | PASS |
| WQ-11 | 试卷审阅 Gate 与 Agent Run 全面规整 | 10,D-095 | 生成后自动打开产出；确认 Artifact 前无活动参数；审阅证据进入 Domain/Session；复用标准 Shell；Domain/Integration/E2E/Visual 通过 | PASS |

实施顺序：`01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10 → 11`。每票为一条可运行纵向切片，不按页面/组件/Adapter 横向拆分。
