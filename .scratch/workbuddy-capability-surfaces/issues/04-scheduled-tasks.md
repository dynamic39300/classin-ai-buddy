---
id: CAP-04
title: 定时任务
status: DONE
---

## Scope

实现定时任务列表、触发状态、阻断状态、历史入口和立即运行回流标准 Run 草稿。

## Acceptance

- 支持全部/进行中/已暂停/历史视图、来源搜索和详情。
- 资源或连接缺失时显示“已阻断”，并给出恢复日程连接的路径。
- 立即运行不绕过标准 Agent Run；进入新任务草稿并保留任务意图。

## Evidence

- `src/features/ai-agent-workspace/capability-workspace.ts`
- `src/features/ai-agent-workspace/CapabilityWorkspace.tsx`
- `tests/e2e/workbuddy-capability-surfaces.spec.ts`
