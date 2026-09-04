---
title: ClassIn PC 基座中的教师 WorkBuddy V1 实施规格
status: IMPLEMENTED_REVIEWED
version: v0.3
date: 2026-08-20
source_prd: PAGE-LEVEL-PRD.md
implementation_gate: M3_LAYOUT_REVISION_COMPLETE
---

# ClassIn PC 基座中的教师 WorkBuddy V1 实施规格

## Problem Statement

教师 WorkBuddy 的产品定义、页面地图、详细 PRD、状态矩阵、视觉规范与交互规则已经完成 Review，但当前可运行代码尚未把这些结论放进真实 ClassIn PC 产品背景。若继续建设独立 Agent Demo，教师身份、组织、班级、课程、空间、待办和返回现场只能被重复伪造；若直接开始实现 43 个页面，又会在没有统一工程基座、测试 Seam 和实施顺序的情况下扩大返工。

当前需要先把已确认的 ClassIn PC 产品基座变成唯一运行环境，再完成一个范围清晰的教师 AI Agent Shell 纵向切片：教师可以从 ClassIn 一级导航进入 AI Agent，在扁平二级导航中创建任务、打开近期任务和访问能力入口，同时明确哪些内容只是本地 Demo。该切片是后续按 PRD 实现完整 WorkBuddy 的稳定起点，不代表真实 AI、ClassIn API 或业务写回已经可用。

## Solution

完整继承已验证的 ClassIn PC 单应用产品基座和教师/学生页面树，把 WorkBuddy 作为教师端纵向 Feature 接入。教师端一级导航增加 `AI Agent`；进入后在该入口下展开 NineClaw 风格的扁平二级导航，承载新建任务、近期任务、Skills、Tools、内容、我的文件、定时任务和设置，不增加第三级菜单、独立历史栏或右侧导航列。

首个实施切片提供可操作的新建任务页、可打开的历史 Run 骨架和单一 Artifact 活动面板。Core Context 使用结构化班级、课程、单元等摘要进行表达，但只使用固定、脱敏、可重置 Mock。其余能力页保留可进入的真值占位，以便验证完整信息架构而不伪装功能已实现。

实施以现有 ClassIn AppShell 和教师嵌套路由作为唯一 UI 组合 Seam；首要验收 Seam 是从角色选择开始的浏览器用户旅程。页面内部状态和纯 Domain 转换只在确有不变量时补充更低层测试，不为原型结构制造重复 Seam。

## User Stories

1. As a ClassIn teacher, I want AI Agent to appear beside my existing work modules, so that it feels like part of my daily ClassIn workspace.
2. As a ClassIn teacher, I want entering AI Agent to preserve the existing identity and organization shell, so that I know which teaching context I am operating in.
3. As a ClassIn teacher, I want one flat AI Agent secondary navigation panel, so that I can reach tasks and capabilities without learning a third navigation level.
4. As a ClassIn teacher, I want to start a new Agent task from a prominent secondary-navigation action, so that task creation is always reachable.
5. As a ClassIn teacher, I want six recent tasks visible at the 1440×900 review viewport, so that I can resume common work without opening a separate history page.
6. As a ClassIn teacher, I want additional recent tasks to remain available by scrolling the history section, so that history does not create another permanent column.
7. As a ClassIn teacher, I want each recent task to show a relative time by default, so that I can distinguish similarly named work.
8. As a ClassIn teacher, I want a task's overflow action to replace the time on hover, focus, or selection, so that rename, pin, and delete stay available without visual noise.
9. As a keyboard user, I want every task, overflow action, secondary destination, and primary action to be focusable with a visible focus state, so that the workspace is operable without a pointer.
10. As a ClassIn teacher, I want opening a recent task to restore a recognizable Run surface, so that task history is more than a static list.
11. As a ClassIn teacher, I want a Run header to show its title, current state, and Demo truth label, so that I understand what is happening and what is simulated.
12. As a ClassIn teacher, I want the Run timeline to separate goal, Context, completed steps, and the current step, so that I can follow progress without reading technical logs.
13. As a ClassIn teacher, I want only one active auxiliary panel at a time, so that Artifact, Core Context, and execution details do not create a four-column workspace.
14. As a ClassIn teacher, I want to open and close the current Artifact panel without losing the Run, so that I can control the reading width.
15. As a ClassIn teacher, I want the new-task composer to accept a teaching goal in natural language, so that I can begin from intent rather than tool selection.
16. As a ClassIn teacher, I want structured Core Context chips for class, course, and unit beside the composer, so that I can inspect what the Agent will use.
17. As a ClassIn teacher, I want distinct shortcuts for a single courseware task and a course-package task, so that neither approved task model replaces the other.
18. As a ClassIn teacher, I want Skills, Tools, content, files, schedules, and settings to be directly reachable at the same secondary level, so that the full V1 information architecture is testable.
19. As a ClassIn teacher, I want unimplemented destinations to say that they are Phase 4 placeholders, so that I do not mistake them for working integrations.
20. As a ClassIn teacher, I want Tool details to remain management surfaces rather than direct task launchers, so that task execution stays in standard WorkBuddy Runs.
21. As a ClassIn teacher, I want Skill creation to be able to enter a Skill Creator Run, so that creating a Skill follows the same task execution model.
22. As a ClassIn teacher, I want to leave AI Agent for another ClassIn module and return through normal navigation, so that Agent work does not replace the rest of ClassIn.
23. As a student, I do not want to see the teacher AI Agent entry, so that role boundaries remain explicit.
24. As a reviewer, I want the 1440×900 screen to show both navigation levels, six recent tasks, a current/new Run, and one primary action without clipping, so that the approved layout can be evaluated directly.
25. As a reviewer, I want all Mock and future capabilities labelled truthfully, so that a polished surface never implies production readiness.
26. As an implementation agent, I want one npm/Vite application, one rule source, and one package-manager lockfile, so that checks and future tickets do not operate against conflicting architectures.
27. As an implementation agent, I want source-baseline test failures distinguished from migration regressions, so that product behavior is not silently changed to satisfy stale selectors.
28. As an implementation agent, I want the teacher AI Agent route to be the highest practical composition and test Seam, so that most behavior can be verified without coupling tests to component internals.

## Implementation Decisions

- The current runtime is one npm, React, Vite, and strict TypeScript application. A monorepo, API/BFF, or durable Agent runtime is introduced only when a second real deployable or runtime exists.
- The complete teacher and student ClassIn page trees remain available. WorkBuddy is added only to the teacher tree; role-specific pages do not import one another's private implementations.
- The existing AppShell continues to own identity, organization, primary navigation, account behavior, the main content slot, and the route-level Topbar policy. It suppresses the generic Topbar only for WorkBuddy routes per D-030; task navigation remains private to the WorkBuddy Feature.
- AppShell is the UI composition Seam: it owns only a contextual-navigation slot beneath the active primary item; the WorkBuddy Feature owns the flat secondary navigation, while the nested teacher-route layout owns only the current Work Surface.
- `AI Agent` is a teacher primary navigation destination. The WorkBuddy panel is the only secondary navigation level; Section labels may group items visually but do not create third-level navigation.
- Recent history shows six rows in the locked review viewport and scrolls for more. Pinned tasks sort ahead of ordinary tasks without live status updates forcing scroll jumps.
- History overflow actions are rename, pin/unpin, and delete. In the shell slice these mutations are memory-only and explicitly labelled as Demo behavior; persistence, undo, cross-session restore, and deletion policy are later vertical slices.
- The new-task shell includes natural-language goal input, resource entry, Core Context summary, and separate single-courseware and course-package shortcuts.
- Core Context is represented with structured ClassIn business-object references. The shell slice does not send student data, call Skills/Tools, or create a durable Context Snapshot.
- A historical Run shell shows user-understandable goal, Context summary, plan/progress events, and one Artifact panel. Technical tool-call detail, approvals, recovery, and version conflict behavior remain governed by the reviewed PRD but are outside this shell slice.
- Skills, Tools, content, files, schedules, and settings are routable secondary destinations. Until their own tickets are implemented, they show explicit Phase 4 truth labels rather than fake operations.
- Tool/MCP management never launches a Run directly. Skill Creator later launches a standard, linked WorkBuddyRun.
- All new visual work reuses the locked 4px grid, existing semantic tokens, Inter Variable plus Chinese system fonts, restrained ClassIn green, approved radius hierarchy, compact history density, and continuous-work-surface rules.
- No real ClassIn API, model, MCP, file generation, persistence, publication, or business writeback is implied by this implementation.
- The migrated source contained stale browser selectors for the former `学生/家长视角` label while the product UI says `学生视角`. Target tests may be aligned to the current source UI after the mismatch is recorded; product copy is not changed merely to make stale tests pass.

## Testing Decisions

- The primary Seam is the public browser journey: choose teacher role, enter AI Agent from primary navigation, use the flat secondary navigation, open recent Runs and capability destinations, leave for another ClassIn module, and return.
- Browser tests assert user-visible roles, labels, URLs, focus, overflow actions, scroll ownership, and truth labels. They do not assert CSS module names, private state, component trees, or implementation-specific hooks.
- The teacher navigation Domain receives a focused unit test proving AI Agent is present only for teachers and that nested AI Agent URLs resolve to the same primary item. Existing navigation tests are prior art.
- The shell receives an integration test only if browser coverage cannot cheaply exercise an important memory-only transition. The preferred number of new seams is one.
- Visual acceptance uses the existing Playwright visual harness at 1440×900. It verifies two navigation levels, six visible history rows, one Run/New Task surface, one active panel, no clipping, and visible focus/selection states.
- Accessibility checks cover landmark names, button/link accessible names, keyboard reachability, focus visibility, color-independent status text, and reduced-motion behavior.
- Full implementation completion requires typecheck, lint, relevant focused tests during development, the full Vitest suite once, production build, relevant Playwright E2E, visual review, and a final dual-axis code review.
- Source-baseline failures are reproduced in the source repository before classification. A target-only failure is a migration or implementation regression; a source/UI mismatch is documented and fixed as test maintenance in its own accepted slice.

## Out of Scope

- Production Agent execution, model selection, streaming events, Skill/MCP calls, or provider integrations.
- Real ClassIn authentication, organization switching, API data, student records, file storage, notifications, or business writeback.
- Durable Run history, cross-session persistence, rename conflict handling, undo, or retention policy.
- Full implementation of the 43 reviewed pages and overlays in one ticket.
- Complete Core Context detail/edit/impact-analysis behavior.
- Structured parameter completion, plan approval, exception recovery, ProposedAction, Approval, ExecutionReceipt, Artifact editing, version comparison, or Focus Surface.
- Final completion of Skills, Tools, content, files, schedules, settings, commercial authorization, or usage accounting.
- Student WorkBuddy or a student AI Agent entry.
- Re-researching the Jiuzhang Aixue Web AI-tool matrix.
- Restoring deleted legacy WorkBuddy Demo code or the superseded pnpm workspace architecture.

## Further Notes

- Source product foundation: `classin-pc-optimizer` at `main@ff5dfa0f332f4a937aa6faa8b2b88a0313858a8c`.
- Governing decisions: D-010 through D-023, especially D-016, D-017, D-018, D-021, and D-023.
- Governing PRD package status: `REVIEWED_APPROVED`, Phase 3 gate passed.
- This implementation spec deliberately narrows the first code Review Gate to the ClassIn foundation plus WorkBuddy shell. Subsequent tickets must remain tracer-bullet slices through task state, Context, execution, Artifact, and writeback rather than horizontal batches of components.
- Confirmed highest test Seam: one browser-level teacher AI Agent journey rooted at the existing role selector and AppShell, with only a small pure-navigation unit test below it。2026-08-20，用户确认该 Seam 与当前实现方向一致，并授权继续实施流程。
- 2026-08-20，用户确认六个 tracer-bullet Tickets 的粒度与阻塞关系；本地 Tracker 位于 `.scratch/workbuddy-v1-shell/issues/`，按 frontier 从 Ticket 01 开始。
- 2026-08-20，M3 六个 Tickets 全部完成。最终门禁为 Typecheck/Lint PASS、Vitest 44 files/312 tests PASS、全量 E2E 57/57 PASS、WorkBuddy 定向 E2E 6/6 PASS、WorkBuddy Visual 2/2 PASS、Build PASS；Spec 与 Standards 双轴 Review 均 PASS，无剩余 P0–P3 finding。

## M3 Review 布局修订（2026-08-20）

### Problem Statement

M3 的功能框架已通过用户验收，但独立的 AI Agent 二级导航列占用了 Work Surface 的横向空间。任务执行过程、Artifact 预览与编辑，以及后续 Core Context 结构化选项需要共享更完整的连续工作区；若继续保留独立导航列，后续辅助面板会过早形成拥挤的多栏布局。

### Solution

保留既有两级信息架构和全部二级导航能力，把二级导航作为 AI Agent 一级入口的上下文扩展，直接展开在 ClassIn 左侧栏的 AI Agent 条目下方。AI Agent 路由之外不显示该扩展；进入 Agent 路由后，右侧 Stage 只承载 Work Surface，不再为导航预留独立列。

### User Stories

29. As a ClassIn teacher, I want Agent tasks and capabilities to expand directly below the AI Agent entry, so that the navigation belongs to the ClassIn workspace rather than consuming task-canvas width.
30. As a ClassIn teacher, I want the entire right-hand Stage available to the current Run, Artifact, and Core Context, so that later editing and comparison surfaces have enough room.
31. As a ClassIn teacher, I want recent-task management and capability routes to behave exactly as before after relocation, so that the layout revision does not break the approved M3 loop.
32. As a ClassIn user outside AI Agent, I want the contextual Agent navigation to disappear, so that other ClassIn modules retain their established sidebar density.
33. As a keyboard user, I want the embedded secondary navigation to preserve visible focus, scroll access, menu focus return, and route selection, so that relocation does not reduce operability.
34. As a reviewer, I want the Agent work surface to begin immediately after the ClassIn sidebar, so that no empty or duplicate navigation column remains.

### Implementation Decisions

- The information architecture remains two levels: `AI Agent` is the primary destination; new task, Runs, capabilities, schedules, files, and settings remain one flat secondary level.
- AppShell remains the composition root and exposes one contextual-navigation slot beneath a matching primary item. WorkBuddy supplies the content through its existing navigation Module; AppShell does not absorb Run history logic.
- The nested WorkBuddy route layout owns only the right-hand Work Surface after this revision. It no longer renders or sizes a navigation column.
- The embedded secondary navigation omits a duplicate `AI Agent` heading because the primary item immediately above already names the context.
- At compact desktop widths, an active Agent route keeps the ClassIn sidebar expanded so embedded destinations remain reachable; other routes retain the existing icon-only compact sidebar.
- Run state, history mutations, route contracts, Artifact behavior, Core Context data, capability truth labels, and teacher-only role boundary are unchanged.

### Testing Decisions

- The confirmed Seam remains the browser journey. Tests observe that the secondary navigation is contained by the teacher primary navigation, disappears outside Agent routes, and preserves all approved interactions.
- Visual geometry verifies that the contextual navigation stays inside the ClassIn sidebar and that the Work Surface begins at the Stage boundary without a second navigation column.
- Existing history scroll, focus return, reduced-motion, accessibility, route, Run, and Artifact checks remain mandatory regression evidence.

### Out of Scope

- Redesigning the task execution, Artifact, or Core Context content itself.
- Adding new Agent capabilities, persistence, backend interfaces, mobile navigation, or production ClassIn integration.
- Changing the already approved M3 Run state model or truth-label semantics.

### Completion Evidence

- Tickets 07/08 completed through the approved `to-spec → to-tickets → implement` workflow.
- Typecheck, ESLint, 44 Vitest files/312 tests, production build, WorkBuddy E2E 6/6, full E2E 57/57, and WorkBuddy Visual 3/3 passed.
- Visual evidence covers 1440×900 New Task, 1440×900 Run + Artifact, and 1000×768 compact embedded navigation; compact coverage verifies every secondary destination is scroll-reachable and non-Agent routes return to the 64px icon-only sidebar.
- Standards Review and Spec Review passed with no remaining P0–P3 finding.
