---
id: CAP-01
title: CapabilityWorkspace 共享 Module 与状态契约
status: DONE
---

## Scope

为六个 WorkBuddy 二级页面提供统一的 surface 配置、体验数据、搜索/筛选、详情、状态反馈和空结果表现。

## Acceptance

- 六个 surface 共享同一页面编排和设计 token。
- 体验数据固定、脱敏、可重置，并明确显示“体验数据”真值标签。
- 状态更新只发生在页面内存，不伪装为生产写回。
- `capability-workspace.test.ts` 覆盖 surface、tab、过滤、来源和权限状态。

## Evidence

- `src/features/ai-agent-workspace/capability-workspace.ts`
- `src/features/ai-agent-workspace/CapabilityWorkspace.tsx`
- `src/features/ai-agent-workspace/capability-workspace.test.ts`
