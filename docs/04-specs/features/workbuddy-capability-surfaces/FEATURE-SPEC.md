---
title: WorkBuddy 能力与资源页面 Feature Spec
status: IMPLEMENTING_V04
triage: ready-for-agent
version: v0.4
date: 2026-08-22
---

# WorkBuddy 能力与资源页面 Feature Spec

## Problem Statement

能力页面已经完成第一轮高保真实现，但旧“内容资源”与 TeacherIn 重复承担内容市场、作品管理和发布职责；“我的文件”也尚未把 Space 稳定引用与 TeacherIn 草稿回执串起来。升级规则见 `CONTENT-RESOURCE-ARCHITECTURE-UPGRADE.md`。

## Solution

保留共享能力页面 Module，但默认导航只暴露五个 WorkBuddy 管理页面；旧 Content Surface 转为可恢复的 Dormant Module：

- Skills：广场、我的 Skill、详情与安装/启停/去使用，以及查找、上传、创建和新任务选择闭环；
- Tools：连接广场、连接状态、测试连接、权限摘要与治理；
- TeacherIn Context：在 Core Context 中选择 TeacherIn 资源并冻结稳定引用；
- Files：复用 Space 存储引用的 AI 协作产物视图、预览、加入任务与创建 TeacherIn 草稿；
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
6. As a teacher, I want to select TeacherIn resources inside Core Context, so that the authoritative source and version remain traceable.
7. As a teacher, I want WorkBuddy to create a TeacherIn draft from an Artifact, so that I can continue editing, authorization and publishing in TeacherIn.
8. As a teacher, I want to view AI collaboration outputs by task, time and version, so that I can recover prior work without mixing in uploaded or organization files.
9. As a teacher, I want to preview a file and add it as task Context, so that a file enters a Run as a reference.
10. As a teacher, I want to create a scheduled task with target, Context rule, timezone and notification, so that recurring work is explicit.
11. As a teacher, I want to see upcoming executions and history with linked Run/Artifact/Receipt, so that scheduled work is auditable.
12. As a teacher, I want settings to distinguish provider connection, model availability, data boundary and notification status, so that one green state does not hide another failure.
13. As a teacher, I want all operations to show success, empty, loading, failure, policy blocked and permission states, so that the pages are not static galleries.
14. As a reviewer, I want fixed IDs and deterministic interactions, so that the five visible surfaces and dormant Content Module are reproducible in tests.

## Implementation Decisions

- Use one `CapabilityWorkspace` Module with a discriminated `surface` input and surface-specific view models; `content` remains in the complete registry but is excluded from the visible registry.
- The first implementation uses local fixed fixtures and local state behind a resettable provider. No remote API, model provider, MCP process, scheduler, file storage or content marketplace is introduced.
- Skill install/enable, Tool connect/test, Content favorite/adapt, File context selection, Schedule save/toggle/run and Settings changes are modeled as explicit commands with visible feedback.
- “添加技能” opens a compact menu. “查找技能” and “创建技能” create a new-task draft with the matching governed helper Skill selected; “上传技能” stays in the market and accepts a folder/ZIP/Markdown drop or GitHub/ZIP URL through a simulated validation Adapter.
- The new-task composer exposes an optional searchable Skill picker and removable selected-Skill chip. It does not require teachers to choose an internal capability before submitting an ordinary task.
- “作为 Context”创建稳定的 Space/TeacherIn 引用并进入 `/teacher/ai-agent/new`，保留已有任务目标；它不通过追加自然语言伪造引用。
- “创建草稿到 TeacherIn”经过 ProposedAction、教师 Approval 与 ExecutionReceipt；成功后只产生 TeacherIn 草稿。
- Tool detail has no direct task execution command. Scheduled “立即运行” records a planned Run entry but does not bypass the existing ConversationRun approval chain.
- Scheduled tasks use individually bounded Surface cards with a semantic state rail, icon anchor and separated plan row so lists remain scannable as task count grows. Hover and Focus Within enhance the same card boundary without becoming the only interaction cue.
- Settings uses a section rail inside the page rather than a third global navigation level.
- All page-level fixtures carry `SIMULATED` truth metadata in the view model; teacher-facing copy uses concise “体验数据” labeling rather than raw engineering terms.
- The shared Module owns filter/search/selection/feedback state; individual surface renderers only compose the public view.

## Testing Decisions

- Unit tests cover filtering, command state transitions, policy-blocked Tool actions, scheduled task validation, settings updates and reset.
- Integration tests render each surface through the public provider and verify navigation actions, add-menu branches, upload validation, task Skill selection, dialogs, empty/error states and accessible names.
- Browser tests覆盖五个可见 URL、TeacherIn Context 与草稿闭环；旧 Content 使用领域/Module 回归测试。
- Visual tests覆盖 Skills、Tools、Files、Schedules、Settings 以及 TeacherIn 选择/草稿状态；旧 Content 快照作为 Dormant 资产保留。
- Tests do not assert CSS module names or React state; they assert visible outcomes, URLs, focus and allowed actions.

## Out of Scope

- Real Skill runtime, MCP process, model provider, content marketplace API, file download backend or durable scheduler.
- Production ClassIn permissions, cloud storage and cross-session persistence.
- New WorkBuddy task types or M5/M6/M7 business slices.
- Rebuilding the ClassIn Space, Settings or account system; this surface only provides WorkBuddy-scoped views and links.

## Further Notes

This Feature completes the previously empty IA destinations so the high-fidelity WorkBuddy shell is reviewable end to end. It does not claim that every underlying AI capability is production-ready.
