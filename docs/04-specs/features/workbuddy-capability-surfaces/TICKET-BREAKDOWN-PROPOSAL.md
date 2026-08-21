---
title: WorkBuddy 能力与资源页面 Ticket 拆分
status: IMPLEMENTED
version: v0.1
date: 2026-08-22
---

# WorkBuddy 能力与资源页面 Ticket 拆分

## 01 — CapabilityWorkspace 共享 Module 与状态契约

**Blocked by:** None — can start immediately.

**What it delivers:** 六个页面共享统一的搜索、筛选、详情、反馈、重置和真值状态，不再由每个页面各自维护一套浅层状态。

- [x] 定义 surface、fixture、view model 和 command contract。
- [x] 覆盖加载、空、错误、权限、策略阻断和成功反馈。
- [x] 添加 provider/unit tests。

## 02 — Skill Market 与 Tool Connections

**Blocked by:** 01。

**What it delivers:** 教师可浏览、安装、启停 Skill，查看详情；可查看 Tool 连接状态、测试连接和治理配置，且详情不可直接发起任务。

- [x] 推荐/广场/我的 Tabs、搜索、来源筛选、详情抽屉。
- [x] Skill 安装/启停反馈和权限说明。
- [x] Tool 连接、测试、策略阻断、Secret 掩码和删除保护。

## 03 — Content Resources 与 My Files

**Blocked by:** 01。

**What it delivers:** 教师可搜索内容、查看详情、收藏、改编到新任务；可按来源浏览文件、预览并把文件作为 Context 引用。

- [x] 内容广场/我的作品/收藏 Tabs 与来源、类型筛选。
- [x] 内容详情和改编到新任务草稿。
- [x] 文件来源筛选、预览详情、权限状态和 Context 引用反馈。

## 04 — Scheduled Tasks

**Blocked by:** 01。

**What it delivers:** 教师可创建、编辑、启停、立即运行和查看定时任务历史，且立即运行回流标准 Run 入口。

- [x] 列表、创建/编辑规则、触发状态和历史反馈。
- [x] 立即运行回流标准任务草稿，保留后续 Run/审批边界。
- [x] 权限/资源缺失和阻断状态。

## 05 — WorkBuddy Settings

**Blocked by:** 01。

**What it delivers:** 教师可在一个设置壳内管理偏好、模型、数据与备份、通知、沙箱、能力真值和反馈。

- [x] 设置分组导航与每组表单/状态。
- [x] 模型连接测试、数据范围说明、反馈脱敏选项。
- [x] 机构锁定项、危险动作策略和成功反馈。

## 06 — Surface Integration, E2E and Visual Review Gate

**Blocked by:** 02、03、04、05。

**What it delivers:** 六个导航入口都能完成高保真页面级验收，包含关键操作、返回现场、键盘可用性和紧凑窗口表现。

- [x] 六个 URL 的 E2E 和可达性验收。
- [x] 1440×900 与紧凑窗口视觉快照。
- [x] 更新 README、Ticket 和唯一事实源。
