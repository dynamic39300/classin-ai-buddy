---
title: 作业批改、错因分析与订正对话式 Run PRD
status: READY_FOR_USER_REVIEW
version: v0.1
date: 2026-08-22
---

# 作业批改、错因分析与订正对话式 Run PRD

## Problem Statement

教师已经可以在 ClassIn 的作业页面查看提交、批阅和打回订正，但这些动作是分散的。教师需要自己从作业结果中归纳共性问题、判断可能的错因、设计分层订正练习，再回到作业页面手动创建内容。现有 WorkBuddy 对话式 Run 已证明了任务理解、上下文、计划、过程和受治理交付的交互骨架，但还没有承载学生结果证据和二次订正结果。

## Solution

新增一个 Agent 任务类型“作业批改与订正”。教师从 WorkBuddy 输入目标并勾选班级、课程、作业、评分标准和学习者范围。一个持续存在的 Conversation Run 在同一 Timeline 内完成：

```text
Goal
→ Core Context
→ 批改范围确认
→ Plan
→ 读取提交 / 错误聚类 / 错因候选 / 订正生成 / 质量检查
→ 错因分析 Artifact
→ 分层订正练习 Artifact
→ ProposedAction（创建订正作业草稿）
→ Approval
→ ExecutionReceipt
→ 学生完成后的二次结果复查入口
```

首次交付只创建“订正作业草稿”，不自动改正式成绩、不覆盖原始提交、不自动发送学生消息。学生完成订正后，教师可在同一 Run 的后续复查入口看到二次结果证据；本阶段使用固定模拟结果，不实现真实学生端联动。

## User Stories

1. As a ClassIn teacher, I want to describe a goal such as “分析最近一次作业并生成订正练习”, so that I do not need to manually assemble multiple tools.
2. As a ClassIn teacher, I want to choose a class and course, so that the Agent only reads the intended teaching scope.
3. As a ClassIn teacher, I want to choose one homework record, so that the analysis has a clear source and cutoff.
4. As a ClassIn teacher, I want to choose a whole class or a permitted learner group, so that personal evidence is not silently expanded.
5. As a ClassIn teacher, I want to see the grading rubric and data timestamp before execution, so that I know what the Agent is allowed to infer.
6. As a ClassIn teacher, I want missing scope or rubric information to appear as a clarification card, so that the Agent does not invent grading rules.
7. As a ClassIn teacher, I want to confirm the scope in the same Timeline, so that the resulting ContextSnapshot is auditable.
8. As a ClassIn teacher, I want a plan that names submission reading, error clustering, cause candidates, correction generation and checking, so that I can understand the work before it starts.
9. As a ClassIn teacher, I want to revise or cancel the plan, so that analysis never runs without my control.
10. As a ClassIn teacher, I want each capability call to show its purpose, input summary, output summary and governed Context projection, so that student-sensitive evidence is not exposed to every capability.
11. As a ClassIn teacher, I want the system to distinguish observed errors from inferred causes, so that a hypothesis is not presented as a student fact.
12. As a ClassIn teacher, I want each error cluster to retain source submission references, so that I can inspect why it was identified.
13. As a ClassIn teacher, I want a class-level summary and learner-level detail separated, so that I can start with common problems without exposing unnecessary personal detail.
14. As a ClassIn teacher, I want a generated correction exercise to carry target error clusters, difficulty, answer key and source step, so that the exercise is reviewable.
15. As a ClassIn teacher, I want to edit the correction exercise before saving, so that teaching judgement remains primary.
16. As a ClassIn teacher, I want the system to propose creating a new draft homework rather than mutating the original homework, so that source evidence and official scores remain unchanged.
17. As a ClassIn teacher, I want an explicit Approval before a draft is created, so that no student-facing activity starts automatically.
18. As a ClassIn teacher, I want the Receipt to show the created draft object, version, source homework and result, so that I can locate and inspect it.
19. As a ClassIn teacher, I want permission denial, stale homework version and recoverable failure to preserve the analysis and proposed action, so that recovery does not regenerate or overwrite evidence.
20. As a ClassIn teacher, I want the next review step to show whether students completed the correction and whether the same error cluster improved, so that the loop ends in evidence rather than generation alone.
21. As a reviewer, I want every generated hypothesis to carry an evidence reference and uncertainty label, so that the prototype does not turn model inference into a domain fact.
22. As a reviewer, I want all fixtures to be deterministic, fixed, redacted and resettable, so that the full Run can be replayed.

## Implementation Decisions

- Add a third `ConversationRun` task kind for homework correction. The existing ConversationRun Interface remains the single external Seam for opening, subscribing and dispatching commands.
- Add a homework-correction domain Module with a small Interface: create a Run from a confirmed homework ContextSnapshot, advance deterministic process steps, create error-analysis and correction Artifacts, prepare/approve/execute a draft-homework ProposedAction, and expose an object-level Receipt.
- Reuse existing `Homework`, `HomeworkSubmission`, `HomeworkFeedback` and `HomeworkStudent` facts as read-only inputs. The original submission text, score and review status remain owned by the homework Domain.
- Introduce explicit `ObservedError`, `CauseHypothesis`, `CorrectionArtifact` and `HomeworkCorrectionReceipt` shapes. `ObservedError` must reference one or more submission IDs; `CauseHypothesis` must include `confidence` and `evidenceRefs`.
- The first writeback target is a new draft homework record with `publication.kind = draft`. No command in this slice can change an existing score, feedback, submission status, publication status or student message.
- The deterministic Adapter emits visible `queued → running → completed` capability events and stable IDs. It must not claim a real model, real Skill, real student outcome or production ClassIn writeback.
- The right Inspector uses the existing `上下文 / 产出` modes. The Output tab contains the error analysis and correction exercise as separate linked Artifacts.
- The final Receipt carries `truthLabel = SIMULATED` until a real ClassIn draft-homework Adapter exists.
- A later extension may attach a real student completion and recheck feed; that feed is not fabricated into the first Run.

## Testing Decisions

- Domain tests cross the homework-correction Module Interface and verify evidence references, uncertainty labels, artifact versioning, allowed commands, approval gating and Receipt invariants.
- ConversationRun contract tests open, subscribe, replay by cursor, dispatch clarification/plan/process/artifact/action/approval/receipt commands, reject duplicate or out-of-order commands, and reset deterministically.
- Adapter tests verify success, permission denial, version conflict, recoverable failure and idempotent replay without mutating the source homework or submissions.
- Browser tests use the same public teacher journey as M4.1: select Context, submit goal, confirm plan, inspect capability calls, review both Artifacts, edit the correction draft, approve, execute and inspect the Receipt.
- Negative browser assertions prove that original scores, original submissions and student messages are not changed by the Run.
- Visual tests cover clarification, plan, error-cluster Artifact, correction Artifact, Approval and Receipt at 1440×900 and compact desktop.

## Out of Scope

- Real LLM, model streaming, Skill/MCP runtime, external search or generated files.
- Automatic score changes, automatic feedback sending, automatic student messaging, parent messaging or bulk publication.
- Full student-side correction activity and live recheck data; only a future review entry point is represented.
- Cross-class aggregation, predictive diagnosis, causal claims, teacher performance scoring and ungoverned learner memory.
- Redesign of the existing homework page, ClassIn Shell, global navigation or M4.1 courseware/package Run.
- Production persistence, multi-device synchronization and real ClassIn API integration.

## Further Notes

This slice deliberately proves the highest-risk new invariant—student evidence and AI hypotheses must remain distinct—before expanding to rehearsal and personalized intervention. It is an implementation slice, not a claim that the complete teacher AI capability matrix is production-ready.
