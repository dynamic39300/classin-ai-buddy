---
id: CAP-05
title: WorkBuddy 设置
status: DONE
---

## Scope

实现通用、模型、数据与备份、消息通知、沙箱与执行环境、能力真值和反馈设置分组。

## Acceptance

- 分组切换保持在统一设置壳中，当前项有可访问的 `aria-current`。
- 模型连接、备份、通知和反馈提供可操作的反馈状态。
- 机构锁定项、危险动作策略和体验数据真值可见；不修改 ClassIn 正式业务对象。

## Evidence

- `src/features/ai-agent-workspace/CapabilityWorkspace.tsx`
- `tests/e2e/workbuddy-capability-surfaces.spec.ts`
