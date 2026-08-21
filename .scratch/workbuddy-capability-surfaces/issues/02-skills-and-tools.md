---
id: CAP-02
title: 技能市场与工具连接
status: DONE
---

## Scope

实现 Skill 浏览、安装、启停、详情和权限边界；实现 Tool 连接、测试、策略阻断和失败状态。

## Acceptance

- 技能市场支持推荐、广场、我的 Skill、搜索、详情和安装/启用/停用反馈。
- 工具连接支持连接状态、连接测试、Secret 掩码和策略阻断提示。
- 工具详情明确不能直接发起任务；任务入口只能通过标准新建任务流程。

## Evidence

- `src/features/ai-agent-workspace/CapabilityWorkspace.tsx`
- `tests/e2e/workbuddy-capability-surfaces.spec.ts`
