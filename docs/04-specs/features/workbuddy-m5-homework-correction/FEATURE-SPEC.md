---
title: WorkBuddy M5 作业订正 Feature Spec
status: READY_FOR_USER_REVIEW
triage: ready-for-agent
version: v0.1
date: 2026-08-22
---

# WorkBuddy M5 作业订正 Feature Spec

## 1. Feature Boundary

本 Feature 在 M4.1 `ConversationRun` 之上增加“作业批改 → 错因分析 → 订正”任务类型。它只读 ClassIn 作业事实，生成可审阅的分析与订正草稿，经过教师审批后创建新的草稿作业，并以 Receipt 结束。

```text
Homework / Submission / Rubric (read)
  → ContextSnapshot
  → WorkBuddyRun
  → ObservedError + CauseHypothesis
  → CorrectionArtifact
  → ProposedAction + Approval
  → DraftHomework Receipt
```

## 2. Domain Invariants

- 任何 `ObservedError` 至少引用一个原始提交 ID；不存在来源的错误不得进入 Artifact。
- `CauseHypothesis` 不是学生事实，必须带 `confidence: low | medium | high`、`evidenceRefs` 和 `isInference: true`。
- 原始 `HomeworkSubmission`、`HomeworkFeedback` 和正式成绩不可由本 Run 修改。
- 订正草稿必须拥有独立 Artifact ID、版本和 source homework reference。
- 只有处于 `approved` 的 ProposedAction 才能执行写回；目标只能是新建草稿作业。
- Receipt 的成功对象必须是新草稿 ID，且包含 source homework ID、Artifact version、Approval ID 和 truth label。
- 权限拒绝、版本冲突和可恢复失败保留同一 Run、Artifact、Action 和 Approval 证据；恢复只能改变目标策略或重试意图，不得覆盖原始提交。

## 3. Task State Machine

```text
organizing
  → needs_information
  → awaiting_plan_confirmation
  → running
  → completed_pending_review
  → waiting_approval
  → completed
```

终态 `cancelled`、`stopped`、`failed` 与 M4.1 共用事件级命令和恢复规则。Artifact 产出顺序为：`error-analysis` → `correction-exercise`；任一中间步骤失败，后续 Artifact 进入 `waiting`，不能伪装为成功。

## 4. Context Contract

必需 Context：

- 一个教师可访问的班级；
- 一个课程或单元；
- 一个已存在的作业；
- 该作业的提交集合和更新时间；
- 评分标准或教师明确确认的批改口径；
- 可选的学习者范围（默认整个班级，敏感细节按能力 Projection 裁剪）。

能力 Projection：

| Capability | 可读 Context | 禁止默认读取 |
| --- | --- | --- |
| submission-reader | 作业、提交状态、更新时间、答案引用 | 无关课程和其他班级 |
| error-clusterer | 脱敏答案片段、题目、评分标准 | 不相关学生个人资料 |
| cause-hypothesis | 错误聚类、来源提交、教学目标 | 未经确认的心理/能力判断 |
| correction-generator | 错因候选、课程/单元、难度约束 | 原始完整敏感答案 |
| correction-check | 订正草稿、目标错误簇、评分标准 | 其他任务的学生数据 |

## 5. Artifacts and Actions

### Error Analysis Artifact

- `id`, `version`, `sourceHomeworkId`, `sourceSubmissionIds`;
- class-level summary;
- error clusters with observed evidence and cause hypotheses;
- confidence and evidence references;
- validation status and truth label.

### Correction Exercise Artifact

- `id`, `version`, `sourceErrorAnalysisId`, `sourceHomeworkId`;
- target error clusters;
- question list, difficulty, answer key and teacher-editable instructions;
- validation status and truth label.

### ProposedAction

`create_draft_homework` only. Its target includes new title, instructions, class/course/unit, source homework ID, Artifact version and expected source version. It cannot target an existing published homework for overwrite.

## 6. Capability Event Contract

每个 Capability Call 至少包含：purpose、inputSummary、outputSummary、elapsedLabel、contextLabels、excludedSensitiveCount、state 和 object references。底层 JSON、原始答案全文、本地路径和模型内部思考不进入默认 Timeline。

## 7. Acceptance Criteria

- [ ] 新建作业订正 Run 后，Timeline 先显示目标理解和 Context 确认，不直接生成结果。
- [ ] 教师未选作业或批改口径时，Run 停在 `needs_information` 并提供可恢复补参。
- [ ] Plan 明确列出读取、聚类、错因候选、订正生成和检查五步。
- [ ] 运行期间至少观察到一个 `running` Capability Event；完成事件按顺序更新。
- [ ] 错因 Artifact 同时显示观察到的错误和带置信度的推断候选。
- [ ] 订正 Artifact 与错因 Artifact 分离、可编辑、可追溯到 source homework。
- [ ] ProposedAction 只能创建新草稿作业；原作业和原提交保持不变。
- [ ] Approval 与 Receipt 在同一 Timeline 中连续出现，Receipt 显示新草稿对象和 source homework。
- [ ] 失败、权限、版本冲突和重复命令有显式状态与恢复路径。
- [ ] 全链路保留 `SIMULATED` 真值标签，不能暗示真实模型或生产写回。

## 8. Testing Seam

最高测试 Seam 仍是 `ConversationRunModule`；作业订正领域 Module、草稿写回 Adapter 和现有 homework Domain 各自保留独立契约测试。页面只消费 Projection 和允许命令，不持有错误聚类、证据归属、审批或写回规则。

## 9. Out of Scope

见 [PRD](./CONVERSATION-RUN-PRD.md) 的 Out of Scope；特别是正式成绩、学生消息、真实重测结果和生产 API。
