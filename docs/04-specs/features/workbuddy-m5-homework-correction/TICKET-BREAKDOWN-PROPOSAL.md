---
title: WorkBuddy M5 作业订正 Ticket 拆分
status: READY_FOR_USER_REVIEW
version: v0.1
date: 2026-08-22
---

# WorkBuddy M5 作业订正 Ticket 拆分

> 本地仓库未配置外部 issue tracker，因此先按 To Tickets 规则记录在本文件；用户确认粒度后，再生成 `.scratch/workbuddy-m5-homework-correction/issues/` 的逐票文件。

## 01 — 作业证据与错误推断 Domain Module

**Blocked by:** None — can start immediately.

**What it delivers:** 从固定作业提交构建可追溯的错误聚类和带置信度的错因候选；原始提交和成绩保持只读。

- [ ] 定义 `ObservedError`、`CauseHypothesis`、`ErrorCluster` 和错误分析 Artifact。
- [ ] 校验来源提交、置信度、推断标记和 Artifact 版本。
- [ ] 覆盖空提交、重复来源、无证据推断、脱敏和确定性输出测试。

## 02 — 订正 Artifact 与草稿写回 Adapter

**Blocked by:** 01 — 作业证据与错误推断 Domain Module。

**What it delivers:** 教师可以获得一份由错误簇驱动的、可编辑的订正练习草稿，并在治理后创建新的 ClassIn 作业草稿。

- [ ] 定义订正练习 Artifact 和 `create_draft_homework` ProposedAction。
- [ ] 通过 Approval、版本检查、幂等键和 Receipt 写入新草稿。
- [ ] 覆盖权限拒绝、版本冲突、重复执行和原作业不变。

## 03 — Homework ConversationRun Experience Adapter

**Blocked by:** 01、02。

**What it delivers:** 在现有 Agent 任务窗口中从 Goal、Context、Plan、Process 走到两个 Artifact、Approval 和 Receipt。

- [ ] 增加第三种 Task Type 与稳定 Run ID。
- [ ] 复用 M4.1 事件、Cursor、Stop/Cancel/Retry/Reset 和右侧 `上下文 / 产出`。
- [ ] 以 capability actor 标识 submission-reader、error-clusterer、cause-hypothesis、correction-generator 和 correction-check。

## 04 — 教师 WorkSurface 与 Core Context 入口

**Blocked by:** 03 — Homework ConversationRun Experience Adapter。

**What it delivers:** 教师可以从 AI Agent 新建任务入口选择“作业批改与订正”，勾选作业和学习者范围，并进入同一任务窗口。

- [ ] 只新增任务入口与必要 Context 投影，不改 ClassIn 全局 Shell。
- [ ] 默认隐藏底层模拟/工程术语，只保留统一真值标记。
- [ ] 复用现有可访问性、紧凑桌面和视觉 Token。

## 05 — M5 端到端与视觉 Review Gate

**Blocked by:** 02、04。

**What it delivers:** 一条可重复的浏览器闭环和错误保护验收，证明分析、订正草稿、审批、回执和原始作业保护同时成立。

- [ ] 完成 teacher E2E、领域/Adapter 契约测试和 1440×900/紧凑桌面视觉测试。
- [ ] 负向断言原始成绩、提交和消息不变。
- [ ] 完成 To Spec/Standards 双轴 Review，并回写实施验收记录。
