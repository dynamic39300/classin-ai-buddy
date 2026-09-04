---
title: WorkBuddy M4.1 一体化对话式 Agent Run Feature Spec
status: READY_FOR_AGENT
triage: ready-for-agent
version: v0.1
date: 2026-08-21
source_prd: ./CONVERSATION-RUN-PRD.md
review_gate: M4_1_IMPLEMENTATION
---

# WorkBuddy M4.1 一体化对话式 Agent Run Feature Spec

## Problem Statement

M4 已经实现并验证 `WorkBuddyRun`、`ContextSnapshot`、`ArtifactDraft`、`ProposedAction`、`Approval`、`ExecutionReceipt`、课程方案包、异常恢复与 Replanning 等领域能力，但当前页面把任务表达成相邻阶段卡、按钮推进和静态结果切换。教师虽然能操作功能，却看不到一个 Agent 如何理解目标、发现缺口、制定计划、调用能力、交付产物并等待教师确认，因此体验更像多步骤表单或页面演示，而不是一个连续的 Agent Run。

当前实现还让 Context、过程和产物在多个 Stage Surface 与面板状态间切换。过程事件是最终状态的静态投影，教师看不到事件从等待到运行再到完成的动态变化；结构化补参、Skill/Tool 调用、Artifact 到达、编辑、审批与 Receipt 也没有在同一个任务对话中建立稳定因果链。

教师需要在一个持续存在的任务窗口里完成 `Goal → Core Context → Plan → Process → Artifact → ProposedAction → Approval → ExecutionReceipt`。当前阶段仍然只模拟 Agent Runtime，但模拟必须具有真实、连续、可复现的动态体验；未来接入真实 Agent 时，只替换事件来源，不能重写页面、业务审批和 ClassIn 写回语义。

## Solution

把现有单课件与课程方案包的领域闭环重新投影为一个一体化 Conversation Run Surface。中央区使用连续 Timeline 承载教师消息、目标理解、结构化补参、Context 确认、计划、步骤、Skill/Tool 调用、阶段结果、Artifact、Action、Approval 和 Receipt；底部 Composer 在同一个 Run 内持续接收补充、修改和恢复命令；右侧只有一个默认展开、可收起的辅助区，在“上下文”和“产出”之间切换。

新增一个 Deep ConversationRun Module，向页面提供一个稳定的打开、命令和事件订阅 Interface。当前 Deterministic Experience Adapter 按固定脚本、可控 Clock 和稳定事件 ID 产生 NineClaw 对标的动态 Run；未来 Real Agent Runtime Adapter 通过同一 Seam 产生真实流式事件。Context、Artifact、Action、Approval 和 Receipt 继续由既有领域 Module 和写回 Adapter 治理，页面和 Agent Runtime 都不能自行宣布业务保存成功。

主智能课件体验以 NineClaw V05 为唯一任务叙事，覆盖目标录屏中已登记的可见交互结构、状态顺序和动态效果。V04 提供产物引用、右侧预览和交互式 Artifact 证据；V06 的版面结构只作为聚焦阅读与工具区参考，内嵌编辑、AI 修改和保存反馈按 D-044 替换为只读全局预览与第三方专业编辑器衔接。其“教学动画”“课后练习”文案统一改写为同一个智能课件 Goal、ContextSnapshot 和 Artifact。课程方案包仍是独立 Task Type 和独立 Run，不与单课件任务混合。

## User Stories

1. As a ClassIn teacher, I want AI Agent to open with Core Context visible, so that I can inspect the teaching scope before sending a goal.
2. As a ClassIn teacher, I want classes, courses, plans, units, activities, resources, and Space files to appear as a navigable tree, so that the context matches the way I organize teaching work.
3. As a ClassIn teacher, I want expanding a tree node to preserve my current selection and scroll position, so that deep context exploration does not reset my work.
4. As a ClassIn teacher, I want selecting a parent to include only that object rather than every descendant, so that the Agent receives only the context I intend.
5. As a ClassIn teacher, I want selecting a child to add only the minimal ancestor references required to interpret it, so that the ContextSnapshot stays valid without becoming oversized.
6. As a ClassIn teacher, I want selected context to appear as chips in the Composer, so that I can see what will accompany my prompt.
7. As a ClassIn teacher, I want removing a chip to update the context tree immediately, so that the two representations never disagree.
8. As a ClassIn teacher, I want the Composer to summarize overflow context as `+N`, so that selected objects remain visible without crowding the prompt.
9. As a ClassIn teacher, I want ordinary courseware tasks to use an aggregate learner scope by default, so that student names are not sent without a specific need.
10. As a ClassIn teacher, I want context search and permission states to be keyboard operable, so that I can prepare a task without a pointer.
11. As a ClassIn teacher, I want sending a goal to create one stable Run and one history entry immediately, so that the complete task has a recoverable identity.
12. As a ClassIn teacher, I want my submitted prompt and selected Context summary to remain at the top of the Run Timeline, so that later events retain their origin.
13. As a ClassIn teacher, I want the Agent to first show that it is organizing my request, so that the start of execution does not feel like an instant static page swap.
14. As a ClassIn teacher, I want the Agent to summarize what it understood in teacher language, so that I can correct the goal without reading internal reasoning.
15. As a ClassIn teacher, I want missing information to appear as an inline structured confirmation card, so that I can continue inside the same conversation.
16. As a ClassIn teacher, I want the deterministic smart-courseware scenario to ask for lesson count, duration, style, and textbook version, so that the demonstrated Run is complete and reproducible.
17. As a ClassIn teacher, I want each confirmation step to show progress, choices, an “other” option, skip, and submit, so that the experience matches the proven NineClaw interaction.
18. As a ClassIn teacher, I want submitted clarification to collapse into a concise completed summary, so that the Timeline remains readable without losing evidence.
19. As a ClassIn teacher, I want known Core Context facts not to be asked again, so that the Agent behaves as if it understood the selected teaching scope.
20. As a ClassIn teacher, I want confirming clarification to freeze a ContextSnapshot, so that every later event can reference the actual task context.
21. As a ClassIn teacher, I want the Agent to propose a specific plan with steps, expected outputs, capabilities, and waiting points, so that I understand what will happen before execution.
22. As a ClassIn teacher, I want to approve, revise, or cancel the plan in the Timeline, so that plan control does not require a Stage page.
23. As a ClassIn teacher, I want approving the plan to start dynamic process events in place, so that each step visibly moves from waiting to running to a result.
24. As a ClassIn teacher, I want the current step and failed step expanded while completed low-level calls collapse, so that the Timeline stays compact and understandable.
25. As a ClassIn teacher, I want each Skill or Tool call to state its purpose, permitted Context summary, output, duration, and status, so that capability use is traceable.
26. As a ClassIn teacher, I want technical evidence to be available behind an explicit disclosure, so that I can inspect it without making raw logs the default experience.
27. As a ClassIn teacher, I want secrets, real local paths, account details, and student-sensitive text to stay redacted, so that faithful video reconstruction does not expose unsafe data.
28. As a ClassIn teacher, I want stage results to appear before the final Artifact, so that the generated courseware has a visible production history.
29. As a ClassIn teacher, I want Timeline updates to follow automatically only while I remain at the bottom, so that reading earlier events is never interrupted.
30. As a ClassIn teacher, I want an “N new updates” control after I scroll upward, so that I can return to the newest event intentionally.
31. As a ClassIn teacher, I want stopping or cancelling a Run to have an explicit event and allowed recovery, so that execution does not silently disappear.
32. As a ClassIn teacher, I want ordinary supplemental requests to affect only unfinished steps when safe, so that I can refine work without restarting everything.
33. As a ClassIn teacher, I want material scope changes to show their impact and require Replanning, so that existing evidence is not silently rewritten.
34. As a ClassIn teacher, I want superseded Plan, Snapshot, process, Artifact, Action, and Receipt evidence to remain inspectable, so that revisions are auditable.
35. As a ClassIn teacher, I want every replan to remain in the same Run unless I intentionally start another Task Type, so that one task does not fragment into duplicate history entries.
36. As a ClassIn teacher, I want the right auxiliary area to use only “上下文” and “产出” tabs, so that process information stays with the conversation.
37. As a ClassIn teacher, I want the Context tab open by default for a new Run, so that context remains a first-class part of the task.
38. As a ClassIn teacher, I want to collapse and reopen the right area without losing tree expansion, selection, preview page, or edit draft, so that the workspace remains flexible.
39. As a ClassIn teacher, I want Artifact arrival to update the “产出” count and unread state, so that I know a result is ready without leaving the Timeline.
40. As a ClassIn teacher, I want Artifact arrival to auto-open the Output tab only when I have no active Context edit, clarification, or approval, so that the system does not steal focus.
41. As a ClassIn teacher, I want opening an Artifact from the Timeline to select the same object in the Output tab, so that the reference and preview stay synchronized.
42. As a ClassIn teacher, I want Focus mode and Escape to return focus predictably, so that detailed review remains keyboard accessible.
43. As a ClassIn teacher, I want the generated intelligent courseware to appear as a stable Artifact with title, version, source step, validation, and truth status, so that it is more than transient model text.
44. As a ClassIn teacher, I want the courseware preview to preserve the left Timeline while I review pages on the right, so that the task history remains visible.
45. As a ClassIn teacher, I want preview, focus, download, and edit tools to occupy a stable toolbar, so that artifact actions remain discoverable.
46. As a ClassIn teacher, I want entering edit mode to show save, exit, selected content, and an AI modification input, so that the V06 editing experience is faithfully represented.
47. As a ClassIn teacher, I want an AI modification to create a new courseware version and a Timeline event, so that edits do not overwrite the original Artifact invisibly.
48. As a ClassIn teacher, I want all V04/V06 artifact copy to refer to the same intelligent courseware, so that teaching animation and homework source narratives never leak into this Run.
49. As a ClassIn teacher, I want choosing “保存到 ClassIn” to first create a ProposedAction, so that editing an Artifact does not mutate a ClassIn object automatically.
50. As a ClassIn teacher, I want a low-risk single-object Action to be confirmable from the Timeline card, so that routine saves do not require an oversized dialog.
51. As a ClassIn teacher, I want multi-object or high-risk Actions to use a focused approval window, so that important changes receive sufficient attention.
52. As a ClassIn teacher, I want approval and execution to remain visibly separate, so that clicking confirm cannot be mistaken for a successful writeback.
53. As a ClassIn teacher, I want an ExecutionReceipt to append to the same Timeline with actual object, version, time, result, and return link, so that the Run ends with verifiable business evidence.
54. As a ClassIn teacher, I want permission denial, version conflict, timeout, and recoverable failure to preserve the Artifact and Action chain, so that recovery remains safe.
55. As a ClassIn teacher, I want retry to reuse or renew the correct idempotent business intent without replaying completed side effects, so that recovery does not duplicate work.
56. As a ClassIn teacher, I want a direct course-package task to use the same Conversation Run Surface, so that single and multi-artifact tasks share one Agent mental model.
57. As a ClassIn teacher, I want package progress to expose courseware, homework, quiz, and recording-script dependencies in Timeline events, so that parallel work remains understandable.
58. As a ClassIn teacher, I want completed package items to be reviewable while other items are still running, so that I do not wait unnecessarily.
59. As a ClassIn teacher, I want package review to support item changes, exclusion, and selection before approval, so that batch writeback stays under my control.
60. As a ClassIn teacher, I want partial package success to show succeeded, failed, not-executed, and waiting outcomes in the original Timeline, so that recovery is object specific.
61. As a ClassIn teacher, I want deriving a package from a courseware Artifact to create a linked but independent Run, so that the original courseware evidence remains intact.
62. As a ClassIn teacher, I want source and derived Runs to navigate to each other only when Artifact ID and version match, so that a replanned Artifact cannot inherit the wrong relationship.
63. As a returning ClassIn teacher, I want reopening a Run by stable ID to restore the Timeline projection, selected Snapshot, Artifact, Inspector mode, and Receipt, so that restoration does not depend on existing DOM.
64. As a reviewer, I want the deterministic Experience Adapter to use stable IDs, events, timing ranges, and reset behavior, so that the complete dynamic Run is reproducible.
65. As a reviewer, I want all 22 NineClaw evidence events to have a target mapping or documented context boundary, so that “100% reconstruction” is measurable rather than subjective.
66. As a reviewer, I want visual checks to prove confirmation, plan, running calls, Artifact arrival, edit mode, Action, Approval, and Receipt, so that the implementation is not validated only by its final page.
67. As a reviewer, I want Reduced Motion to preserve event ordering and running states, so that accessibility preferences do not change business behavior.
68. As a reviewer, I want the interface to retain a truthful simulation label without cluttering every default-path sentence with engineering terminology, so that the prototype is honest and still feels like a product.
69. As an implementation agent, I want page tests to cross one ConversationRun Interface, so that the deterministic and future real Runtime can be exchanged without rewriting the UI.
70. As an implementation agent, I want existing M4 domain and writeback contract tests to remain green, so that the experience redesign cannot weaken approval, idempotency, version, permission, and Receipt invariants.

## Implementation Decisions

- The feature uses one primary Deep Module named ConversationRun. Its public responsibilities are opening a Run projection, dispatching teacher commands, and subscribing to ordered Run events from a cursor. Page components do not coordinate domain controllers, timers, and panel states directly.
- The approved high-level Seam is the ConversationRun Interface. The deterministic and future real Agent Runtime implementations remain behind this Seam; the ClassIn writeback Adapter remains a separate existing business-effect Seam.
- The implementation follows expand–migrate–contract. First, ConversationRun is added beside the current stage-oriented workspace without breaking M4. Then single-courseware and package journeys migrate to the new Surface. Stage-only projections and commands are removed only after all migrated journeys and regressions are green.
- Existing Core Context, course-production, package, writeback, approval, Receipt, idempotency, version, permission, and Replanning rules remain authoritative. Conversation events project those objects; they do not replace or duplicate them.
- Every event has a stable event ID, Run reference, sequence, occurrence time, event kind, lifecycle state, teacher-visible summary, object references, and allowed commands. Events with the same identity update in place rather than append contradictory duplicates.
- Event delivery is cursor based. Re-subscribing from a cursor reconstructs the same Timeline; disconnecting the page does not itself cancel the Run.
- Teacher commands are explicit intents such as submit goal, submit clarification, approve or revise plan, supplement, stop, replan, open Artifact, request AI modification, propose Action, approve or reject, execute, retry, and reset. Duplicate commands cannot create duplicate business actions.
- Server/Run state, domain objects, Composer drafts, Context selection drafts, Inspector UI state, and animation progress are separate. Derived view state is computed rather than stored as a second source of truth.
- The Deterministic Experience Adapter uses fixed scenario scripts, a controllable Clock, stable fixture IDs, and no randomness. It must emit at least one observable running state before a step or capability becomes complete.
- The Experience Adapter may emit understanding, plan, process, capability, stage-result, and Artifact-origin events. It cannot create a ClassIn side effect or a success Receipt; those remain owned by the Action Commit and writeback Modules.
- The source-video parity matrix is an implementation input. Source text is retained for evidence, while target text uses one `narrativeRef` and one intelligent-courseware Artifact chain. Copy cannot be invented independently inside UI components.
- V05 supplies the main smart-courseware narrative. V04 and V06 supply artifact interaction behavior only. Source task names, source file names, old completion summaries, local paths, and unrelated task switches are prohibited from the target Timeline.
- Core Context uses an object tree with explicit selection. Selecting a parent does not recursively select descendants; selecting a child adds only necessary ancestor references. Context chips and tree selection are bidirectionally synchronized.
- Submitting a Goal freezes the confirmed context as a stable ContextSnapshot. The complete Snapshot is never passed to every capability; each capability event may show only its governed ContextProjection summary.
- The central Surface is one Timeline plus one persistent Composer. Clarification, plan, process, Artifact references, Action, Approval, Receipt, error, stop, retry, and replan are event cards in the same Run URL.
- The right auxiliary area has only Context and Output modes. Context is the default for a new task. Artifact arrival may switch to Output only when there is no unapplied Context draft, active tree interaction, clarification, or approval.
- Context and Output preserve independent selection, expansion, scroll, edit draft, and Focus state when switching or collapsing. Process detail is disclosed inside Timeline events rather than becoming a third persistent panel mode.
- Artifact editing in M4.1 is deterministic and produces a stable new Artifact version. It does not introduce a real document engine, provider, Skill, file generator, or persistence layer.
- Single-object low-risk approval may be completed inside the Action card. Multi-object and high-risk Actions use a focused approval overlay. Both paths create explicit Approval objects before execution.
- Only an ExecutionReceipt may declare a ClassIn business save successful. UI animation, Agent text, Artifact edit save, and Approval cannot do so.
- Historical restoration uses stable Run ID and the ConversationRun projection. It does not read rendered chat elements as state. Final cross-session persistence technology remains outside this feature unless already provided by the current fixture boundary.
- Truthfulness remains mandatory. The current Runtime is deterministic simulation and fixed Mock data; final user-facing terminology may be refined separately, but the implementation cannot remove the truth distinction or imply production Agent integration.
- Navigation redesign, final history count, Skills/Tools/content implementation, and global Demo-copy cleanup remain outside this Feature Spec.

## Testing Decisions

- The highest testing Seam is the public browser journey through one teacher Run. The primary smart-courseware journey covers Context selection, Goal, clarification, plan, dynamic process, capability calls, Artifact preview, editing, AI modification, ProposedAction, Approval, execution, Receipt, and return link without Stage-page navigation.
- A second browser journey covers the independent course-package Run through dynamic multi-artifact progress, review, batch approval, full success, partial success, item retry, and object-level Receipt.
- Browser tests assert public roles, accessible names, visible copy, event ordering, lifecycle state, allowed commands, focus return, scroll ownership, Inspector tabs, URLs, object references, truth status, and final business outcomes. They do not assert React state, component names, internal timer callbacks, or CSS module names.
- ConversationRun contract tests exercise open, dispatch, subscribe, cursor replay, duplicate command handling, waiting-for-input, in-place event updates, stop, retry, and reset against the deterministic Adapter.
- Domain tests continue to cross the existing course-production, package, Core Context, and writeback Module Interfaces. The redesign must not move hierarchy cleanup, Snapshot immutability, Action ownership, approval, idempotency, version, permission, or Receipt validation into UI tests.
- Adapter contract tests retain success, idempotent replay, permission denial, version conflict, timeout, recoverable failure, partial success, and safe retry for the writeback Seams.
- Parity tests use the approved frame matrix. They assert that all registered evidence events have a target state, that the smart-courseware Timeline contains no animation/homework source narrative, and that key source interaction structures remain observable.
- Visual tests at 1440×900 cover new task with Context tree, clarification card, plan, running capability, Artifact arrival with split preview, edit/AI modify, ProposedAction, Approval, Receipt, package progress, and partial success.
- Compact desktop tests prove the central Timeline, Composer, Context/Output tabs, approval, and primary action remain reachable without horizontal overflow.
- Accessibility tests cover keyboard tree navigation, confirmation fields, Timeline commands, live-region update strategy, Inspector switching, Focus mode, dialogs, error recovery, and `prefers-reduced-motion`.
- Dynamic tests use a controllable Clock or explicit scenario advancement. They do not wait on arbitrary real wall-clock delays, and Reduced Motion cannot skip required running states.
- Implementation verification runs focused typecheck and tests throughout, then full typecheck, lint, Vitest, production build, E2E, visual, accessibility, and a two-axis Standards/Spec code review before commit.

## Out of Scope

- A real LLM, Agent SDK, model streaming provider, MCP runtime, Skill runtime, durable workflow, scheduler, queue, database, or production ClassIn API.
- Real PPTX, DOCX, HTML, image, video, quiz, or recording-script generation; a production document editor; real AI content rewriting; or cross-device file persistence.
- Rebuilding the ClassIn Shell, changing teacher/student route ownership, or introducing a second design system.
- Redesigning AI Agent navigation, deciding the final number of history entries, renaming all navigation items, or implementing Skills, Tools, content, files, schedules, and settings destinations.
- Removing all “模拟”, “Demo”, reset, or review terminology across WorkBuddy or ClassIn PC. Truth terminology requires its own approved decision and cannot remove the underlying truth boundary.
- Model chain-of-thought, hidden prompts, unrestricted raw command logs, real local paths, secrets, student-sensitive source text, or ungoverned long-term memory.
- Production undo, compensation, transaction guarantees, collaboration, notifications, billing, analytics ingestion, organization switching, or final conflict-resolution policy.
- Treating the separate course-package task as one smart-courseware Artifact or mixing package homework/quiz/recording copy into the single-courseware parity journey.

## Further Notes

- Governing decisions: D-004, D-005, D-009, D-012, D-018 through D-028.
- Governing approved product sources: M4.1 UX Delta, Conversation Run PRD, Event/Card/State Spec, Core Context Tree and Composer Spec, Active Inspector Spec, Courseware and Package Storyboard, and M4.1 Review Checklist.
- Evidence source: NineClaw V04/V05/V06 frame parity matrix. It distinguishes exact interaction reuse, task-semantic normalization, ClassIn adaptation, security redaction, and added domain governance.
- Confirmed test seam: one ConversationRun Interface with browser-level teacher journeys; existing Domain and writeback Adapter seams remain lower invariant tests.
- The user approved the complete M4.1 product-document package on 2026-08-21 and authorized continuation through the agreed `to-spec → to-tickets → implement` process.
