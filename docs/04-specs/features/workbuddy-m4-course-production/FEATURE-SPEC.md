---
title: WorkBuddy M4 课程生产纵向闭环 Feature Spec
status: READY_FOR_AGENT
version: v0.1
date: 2026-08-20
source_prd: ../workbuddy-v1-workspace/PAGE-LEVEL-PRD.md
review_gate: PHASE_4
---

# WorkBuddy M4 课程生产纵向闭环 Feature Spec

## Problem Statement

M3 已经证明教师可以在完整 ClassIn PC Shell 中进入 AI Agent、创建任务、恢复历史 Run、查看 Artifact 并管理任务历史，但当前内容仍是固定展示骨架：Core Context 只有三个静态 Chip，创建任务不会形成标准 Run，执行过程没有稳定事件契约，Artifact 不能经过审批写回，也不存在由 Adapter 证明的 ExecutionReceipt。

教师需要的不只是“看起来像 Agent”的页面，而是一条能够解释输入依据、保持教师控制、交付可审阅产物并安全回到 ClassIn 业务对象的闭环。同时，课程方案包必须作为独立任务模型存在，不能吞并单课件任务；从既有课件派生方案包时，也必须创建关联但独立的新 Run。

M4 因此需要把已审阅 PRD 落实成可重置的产品与工程纵向场景，覆盖 `Goal → Core Context → Plan → Process → Artifact → ProposedAction → Approval → Adapter → ExecutionReceipt`，并明确所有数据和执行仍为本地 Mock。

## Solution

在现有教师 AI Agent Work Surface 中实现两条可重置课程生产链：生成单个课件，以及生成课程方案包。两条链共享受治理 Core Context、显式 Run/Artifact/Action 状态、确定性场景执行和 Mock ClassIn 写回 Interface，但保留独立 Task Type、Run、Artifact Graph 和 Receipt。

M4 主场景复用当前 ClassIn PC 已有 Mock 事实：王老师、`org-classin-demo`、高二物理 3 班、动量与碰撞、第一单元受力与动量、动量守恒模型课堂、现有 Space 资源及稳定版本。教师从 AI Agent 直接新建任务时，只自动带入 Actor 与组织；班级、课程、单元、学习者范围、资源和 Domain Knowledge 作为明确建议或选择，不因“最近使用”自动确认。

页面通过一个 WorkBuddy Course Production Module 使用稳定 Interface。复杂的层级清理、必需项检查、Snapshot、Run 转换、Artifact Graph、Action Policy、Approval 和 Receipt 归属 Domain/Application 实现，不散落在 React 页面。Mock Adapter 返回未来真实 Adapter 可复用的结果形状，并覆盖成功、部分成功、权限拒绝、版本冲突和可恢复失败。

## User Stories

1. As a ClassIn teacher, I want a new Agent task to begin with only my identity and organization confirmed, so that another class is never silently reused.
2. As a ClassIn teacher, I want WorkBuddy to suggest relevant ClassIn objects without selecting them for me, so that I remain responsible for the task scope.
3. As a ClassIn teacher, I want to inspect class, course, unit, activity, learner scope, resources, evidence, and Domain Knowledge in one Core Context panel, so that I understand what the Run may use.
4. As a ClassIn teacher, I want every Context item to show its source, version or update time, permission, sensitivity, and inclusion state, so that facts and suggestions remain distinguishable.
5. As a ClassIn teacher, I want learner context to default to an aggregate class range, so that student names are not sent to ordinary course-production capabilities.
6. As a ClassIn teacher, I want required Context gaps to be described as items needing attention rather than system errors, so that I know how to continue.
7. As a ClassIn teacher, I want selecting a different class or course to clear incompatible descendants, so that the Context hierarchy stays valid.
8. As a ClassIn teacher, I want to confirm Context once and create a versioned ContextSnapshot, so that the Run can later explain exactly what it used.
9. As a ClassIn teacher, I want to distinguish live ClassIn facts from the frozen Snapshot, so that historical evidence is not mistaken for current business state.
10. As a ClassIn teacher, I want separate task shortcuts for a single courseware and a course package, so that each real teaching need keeps its own complete loop.
11. As a ClassIn teacher, I want task submission to preserve my goal and Context when validation fails, so that I do not have to reconstruct work.
12. As a ClassIn teacher, I want structured clarification to reuse facts already known from Context, so that the Agent does not ask repetitive questions.
13. As a ClassIn teacher, I want to review the Agent's interpretation, steps, expected outputs, and waiting points before execution, so that I can correct the plan.
14. As a ClassIn teacher, I want confirming a plan to produce stable process events rather than opaque animation, so that progress is auditable and deterministic in the prototype.
15. As a ClassIn teacher, I want process events to explain what is happening, what entered a step, and what came out, so that I can follow execution without technical logs.
16. As a ClassIn teacher, I want capability detail to show only the ContextProjection actually used, so that the full Snapshot is never implied to be sent to every Skill or Tool.
17. As a ClassIn teacher, I want a generated courseware ArtifactDraft to have a stable ID, version, source step, validation state, and truth label, so that I can review it as an object rather than transient chat text.
18. As a ClassIn teacher, I want to open, close, and focus the Artifact without losing my Run or Context draft, so that review remains continuous.
19. As a ClassIn teacher, I want “保存到 ClassIn” to first create a ProposedAction, so that no model output directly mutates a business object.
20. As a ClassIn teacher, I want a ProposedAction to state the target object, difference, impact, permission, risk, reversibility, source Artifact version, and expiry, so that approval is informed.
21. As a ClassIn teacher, I want approving an action to remain distinct from successful execution, so that a UI click never falsely proves a save.
22. As a ClassIn teacher, I want successful Mock execution to return an ExecutionReceipt with actual object ID, version, time, result, and return link, so that completion has stable evidence.
23. As a ClassIn teacher, I want repeated approval or retry to be idempotent, so that the same business side effect is not duplicated.
24. As a ClassIn teacher, I want permission denial to preserve the Artifact and explain what was not executed, so that I can choose another location or request access.
25. As a ClassIn teacher, I want version conflict to compare expected and current versions before overwrite, so that newer ClassIn work is protected.
26. As a ClassIn teacher, I want a recoverable Adapter failure to preserve the approved action and allow safe retry, so that temporary failure does not discard work.
27. As a ClassIn teacher, I want a course package Run to generate a graph containing courseware, homework, quiz, and recording-script Artifacts, so that dependencies and progress are visible.
28. As a ClassIn teacher, I want package items to show planned, generating, ready, failed, excluded, approved, and written-back states independently, so that the package never hides partial results.
29. As a ClassIn teacher, I want to exclude or retry an eligible package item before approval, so that one failure does not force an all-or-nothing result.
30. As a ClassIn teacher, I want package writeback to return item-level success, failure, not-executed, and waiting results, so that “partial success” is actionable.
31. As a ClassIn teacher, I want to generate a course package from an approved courseware Artifact, so that I can expand a useful standalone result into a broader teaching plan.
32. As a ClassIn teacher, I want the derived package to create a new linked Run and independent ContextSnapshot, so that the original courseware Run and version remain intact.
33. As a ClassIn teacher, I want the source courseware to appear as an explicit sourceArtifactRef, so that the relationship is traceable without copying hidden Context.
34. As a ClassIn teacher, I want changing a primary class or course during execution to show impacted steps, Artifacts, Actions, and removed Context, so that I can judge the cost.
35. As a ClassIn teacher, I want confirmed Context change to create a new Snapshot and replanned Run while preserving superseded evidence, so that history is not rewritten.
36. As a ClassIn teacher, I want Artifact, Core Context, and execution detail to share one active panel slot, so that the workspace does not become a permanent four-column layout.
37. As a ClassIn teacher, I want historical Run restoration to recover the selected Snapshot, Artifact, panel mode, and Receipt state, so that I can resume review.
38. As a ClassIn teacher, I want a visible reset action for the M4 scenario, so that reviewers can return to the same fixture without clearing browser storage manually.
39. As a reviewer, I want all generated content, Adapter execution, and ClassIn results labelled as fixed Mock, so that visual polish never implies production readiness.
40. As a keyboard user, I want Context sections, plan decisions, Artifact actions, approvals, recovery choices, and return links to have visible focus and predictable focus return, so that the complete flow is operable without a pointer.
41. As a reviewer, I want loading, needs-attention, waiting, recoverable failure, permission denial, conflict, partial success, completed-pending-review, completed, and superseded states to be demonstrable, so that the state architecture can be evaluated.
42. As an implementation agent, I want tests to cross the same small interfaces used by the UI, so that Domain and Adapter behavior can change without rewriting page-level tests.

## Implementation Decisions

- M4 is limited to the core Agent course-production pages and overlays required by the two approved Task Types. Skills, Tools, content marketplace, schedules, files management, and settings remain separate later slices even though their navigation destinations stay reachable.
- The resettable M4 fixture uses existing ClassIn Mock facts for `org-classin-demo / physics-3 / course-momentum / unit-momentum-1 / activity-momentum-lesson` and existing Space references. Existing M3 history fixtures remain historical Demo examples and are not treated as ClassIn source facts.
- The primary Module presents a small command/query Interface for preparing and confirming Context, creating a Run, applying Run commands, inspecting the active view, proposing an Action, approving or rejecting it, executing through the Adapter, and resetting the scenario.
- Context hierarchy validation, required-item rules, student-sensitive defaults, Snapshot versioning, ContextProjection, state transitions, idempotency, and result normalization stay behind that Interface.
- `WorkBuddyRun`, `ContextSnapshot`, `ArtifactDraft`, `ProposedAction`, `Approval`, and `ExecutionReceipt` use stable IDs, fixture versions, discriminated states, allowed commands, and explicit recovery paths.
- A single active-panel state supports `artifact | core_context | process_detail | none`. Switching modes preserves per-panel selection, scroll intent, and unapplied Context draft.
- Task submission does not use elapsed timers or random progress. The resettable scenario Adapter advances through explicit commands and stable events so tests and Review reproduce the same result.
- Complete ContextSnapshot never crosses the Capability Projection Seam. Process detail receives a minimal projection derived from the fixed CapabilityManifest and step purpose.
- ClassIn owns classes, courses, units, activities, Space items, permission, versions, and formal writeback state. WorkBuddy stores references and execution evidence, not copies of those facts.
- M4 uses one Mock ClassIn Adapter plus a deterministic test Adapter as two concrete implementations at the writeback Seam. No real API, model, MCP, durable workflow, or database is introduced.
- The Adapter Interface accepts an approved, policy-checked action with idempotency key and expected target version, then returns normalized object-level receipts. It does not accept raw model output or UI state.
- Successful save is shown only after an ExecutionReceipt. Approval, animation completion, or model text cannot declare a ClassIn mutation.
- Courseware and course-package Runs remain independent. A derived package Run stores `sourceArtifactRef` and `parentRunRef`, then confirms its own ContextSnapshot.
- Package partial success is represented by object-level receipt items; successful items are not retried, failed eligible items retain a retry command, and waiting dependencies remain not executed.
- All fixtures are fixed, desensitized, versioned, in-memory, and resettable. Refresh/cross-session persistence is outside M4.
- UI continues using the locked ClassIn/Linear/NineClaw design foundation, existing semantic tokens, compact process density, one dominant action, and explicit truth labels.

## Testing Decisions

- The highest and primary Seam is the public browser journey from teacher role selection through AI Agent, Context confirmation, Run plan/process, Artifact review, Action approval, Mock execution, Receipt inspection, and scenario reset.
- Browser tests assert roles, accessible names, state text, allowed actions, URL/return behavior, focus, scroll ownership, truth labels, and visible object-level outcomes. They do not assert private React state or CSS module names.
- Domain tests cross the Course Production Module Interface and verify hierarchy cleanup, required Context, Snapshot immutability, allowed commands, independent linked Runs, superseded evidence, and state invariants.
- Adapter contract tests run the same cases against the Mock execution Adapter and deterministic test Adapter: success, idempotent replay, partial success, permission denial, version conflict, and recoverable failure/retry.
- ContextProjection tests prove ordinary courseware capabilities receive grade/subject/goal/content/knowledge/resource references but no student names or unrelated Context.
- Existing WorkBuddy E2E and visual tests are prior art. M4 adds focused browser journeys and 1440×900 baselines for Context, plan/process, Artifact/Action, package partial success, and compact reachability.
- Completion requires regular typecheck and focused tests, then full TypeScript, ESLint, Vitest, production build, full E2E, applicable visual tests, accessibility checks, and two-axis Standards/Spec review.

## Out of Scope

- Real model generation, streaming provider events, MCP calls, Skill execution, durable workflow, scheduler, database, authentication, or ClassIn production API.
- Real PPTX/DOCX/video generation or full document editor behavior; M4 uses fixed ArtifactDraft content and truthful preview labels.
- Production organization switching, long-term Run persistence, cross-device synchronization, collaboration, notifications, analytics pipeline, or billing.
- Complete Skills, Tools/MCP, content marketplace, file management, schedules, settings, model configuration, commercial authorization, or student WorkBuddy pages.
- Student-sensitive individual diagnosis, personal learning profiles, or model access to student names.
- Final production conflict protocol, undo implementation, transactional guarantees, or external side-effect compensation.
- Replacing the complete ClassIn PC Mock dataset or rewriting the already accepted M3 history examples.

## Further Notes

- Governing decisions: D-001, D-002, D-004, D-005, D-009 through D-014, D-018 through D-024.
- Governing reviewed sources: Core Context Feature Spec, WorkBuddy V1 Page-level PRD, Component/Field/State Spec, Key Flows, Work Surface Layout Spec, Architecture Baseline, and Course Production Six-Part Decomposition.
- Confirmed test seams: one browser-level teacher course-production journey; lower Domain Module and Adapter contract seams only where invariants cannot be proven economically through the browser.
- 2026-08-20，用户确认 M4 Seam、八个 tracer-bullet Tickets 的粒度与阻塞关系，并授权继续发布 Spec/Tickets 和实施。
