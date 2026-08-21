---
id: CAP-03
title: 内容资源与我的文件
status: DONE
---

## Scope

实现内容资源浏览、筛选、详情、收藏和改编任务；实现文件来源、预览和作为任务 Context 的入口。

## Acceptance

- 内容资源支持内容广场、我的作品、收藏、来源/类型筛选和详情。
- 改编内容与引用文件均进入 `/teacher/ai-agent/new` 标准任务草稿，不跳过 Context 或审批。
- 新任务草稿显示被带入的资源意图，并继续由教师确认上下文后创建 Run。

## Evidence

- `src/features/ai-agent-workspace/capability-workspace.ts`
- `src/features/ai-agent-workspace/AiAgentWorkSurface.tsx`
- `tests/e2e/workbuddy-capability-surfaces.spec.ts`
