---
id: CAP-06
title: 导航集成、端到端与视觉验收
status: DONE
---

## Scope

把六个页面接入教师 WorkBuddy 二级导航，并验证关键操作、任务入口、键盘可达性和紧凑窗口布局。

## Acceptance

- 页面地址可直接打开：`/skills`、`/tools`、`/content`、`/files`、`/schedules`、`/settings`。
- 5 条 Playwright 流程通过，6 个视觉快照生成并通过。
- TypeScript、Lint、Unit、Build 全部通过。
- 未引入真实 Skill、MCP、调度、内容平台或生产数据连接。

## Evidence

- `tests/e2e/workbuddy-capability-surfaces.spec.ts`
- `tests/visual/workbuddy-capability-surfaces.visual.spec.ts`
- `tests/visual/workbuddy-capability-surfaces.visual.spec.ts-snapshots/`
