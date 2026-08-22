---
title: WorkBuddy 能力与资源页面 Feature Spec
status: IMPLEMENTED_REVIEW_PENDING
triage: ready-for-agent
version: v0.3
date: 2026-08-22
---

# WorkBuddy 能力与资源页面 Feature Spec

## Problem Statement

AI Agent 二级导航已经完成接入，但技能市场、工具连接、内容资源、我的文件、定时任务和设置仍显示空占位，教师无法检查这些能力在 WorkBuddy 中如何被发现、管理、引用和回流任务。

## Solution

实现一个共享的能力页面 Module，根据当前目的地投影对应的数据、筛选、详情和操作。六个页面保持同一 ClassIn/Linear 工作台语言，但不复制六套页面框架：

- Skills：广场、我的 Skill、详情与安装/启停/去使用，以及查找、上传、创建和新任务选择闭环；
- Tools：连接广场、连接状态、测试连接、权限摘要与治理；
- Content：内容广场、筛选、详情、收藏与改编到新任务；
- Files：复用 Space 存储引用的 AI 协作产物视图、预览和加入任务；
- Schedules：任务规则列表、创建/编辑、启停、立即运行和历史；
- Settings：通用、模型、数据与备份、通知、沙箱、关于和反馈。

## User Stories

1. As a teacher, I want to browse recommended and installed Skills, so that I understand what WorkBuddy can do.
2. As a teacher, I want to install, enable, update, disable and remove a Skill with permission summary, so that capability governance is visible.
3. As a teacher, I want to enter a Skill into a new task without immediately running it, so that I retain task control.
3a. As a teacher, I want the add entry to distinguish finding, uploading and creating a Skill, so that each intent starts in the right surface.
3b. As a teacher, I want to optionally search, select and remove an installed Skill in the new-task composer, so that direct capability use remains discoverable without becoming mandatory.
4. As a teacher, I want to inspect Tool connection state and test it, so that failures are actionable.
5. As a teacher, I want Tool details to avoid a direct “run task” action, so that Tools remain governed capabilities rather than task entry points.
6. As a teacher, I want to search and filter reusable content, so that I can locate teaching material quickly.
7. As a teacher, I want to preview, favorite and adapt content into a new WorkBuddy task, so that source references are preserved.
8. As a teacher, I want to view AI collaboration outputs by task, time and version, so that I can recover prior work without mixing in uploaded or organization files.
9. As a teacher, I want to preview a file and add it as task Context, so that a file enters a Run as a reference.
10. As a teacher, I want to create a scheduled task with target, Context rule, timezone and notification, so that recurring work is explicit.
11. As a teacher, I want to see upcoming executions and history with linked Run/Artifact/Receipt, so that scheduled work is auditable.
12. As a teacher, I want settings to distinguish provider connection, model availability, data boundary and notification status, so that one green state does not hide another failure.
13. As a teacher, I want all operations to show success, empty, loading, failure, policy blocked and permission states, so that the pages are not static galleries.
14. As a reviewer, I want fixed IDs and deterministic interactions, so that the six surfaces are reproducible in browser tests.

## Implementation Decisions

- Use one `CapabilityWorkspace` Module with a discriminated `surface` input and surface-specific view models; keep data, state transitions and UI projection separate.
- The first implementation uses local fixed fixtures and local state behind a resettable provider. No remote API, model provider, MCP process, scheduler, file storage or content marketplace is introduced.
- Skill install/enable, Tool connect/test, Content favorite/adapt, File context selection, Schedule save/toggle/run and Settings changes are modeled as explicit commands with visible feedback.
- “添加技能” opens a compact menu. “查找技能” and “创建技能” create a new-task draft with the matching governed helper Skill selected; “上传技能” stays in the market and accepts a folder/ZIP/Markdown drop or GitHub/ZIP URL through a simulated validation Adapter.
- The new-task composer exposes an optional searchable Skill picker and removable selected-Skill chip. It does not require teachers to choose an internal capability before submitting an ordinary task.
- “去使用”“改编到任务”“作为 Context” navigate to `/teacher/ai-agent/new` with an intentional draft message or feedback; they do not silently create or execute a Run.
- Tool detail has no direct task execution command. Scheduled “立即运行” records a planned Run entry but does not bypass the existing ConversationRun approval chain.
- Scheduled tasks use individually bounded Surface cards with a semantic state rail, icon anchor and separated plan row so lists remain scannable as task count grows. Hover and Focus Within enhance the same card boundary without becoming the only interaction cue.
- Settings uses a section rail inside the page rather than a third global navigation level.
- All page-level fixtures carry `SIMULATED` truth metadata in the view model; teacher-facing copy uses concise “体验数据” labeling rather than raw engineering terms.
- The shared Module owns filter/search/selection/feedback state; individual surface renderers only compose the public view.

## Testing Decisions

- Unit tests cover filtering, command state transitions, policy-blocked Tool actions, scheduled task validation, settings updates and reset.
- Integration tests render each surface through the public provider and verify navigation actions, add-menu branches, upload validation, task Skill selection, dialogs, empty/error states and accessible names.
- Browser tests cover all six URLs, at least one successful operation and one recoverable/error state per surface.
- Visual tests cover Skills, Tools, Content, Files, Schedules and Settings at 1440×900 plus a compact viewport; assert no horizontal overflow.
- Tests do not assert CSS module names or React state; they assert visible outcomes, URLs, focus and allowed actions.

## Out of Scope

- Real Skill runtime, MCP process, model provider, content marketplace API, file download backend or durable scheduler.
- Production ClassIn permissions, cloud storage and cross-session persistence.
- New WorkBuddy task types or M5/M6/M7 business slices.
- Rebuilding the ClassIn Space, Settings or account system; this surface only provides WorkBuddy-scoped views and links.

## Further Notes

This Feature completes the previously empty IA destinations so the high-fidelity WorkBuddy shell is reviewable end to end. It does not claim that every underlying AI capability is production-ready.
