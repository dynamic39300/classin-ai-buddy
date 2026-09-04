import type { ConversationRunEvent, ConversationRunEventDetail } from '@contracts/workbuddy/conversation-run';
import type {
  WorkBuddyImRunPlanStep,
  WorkBuddyImRunProjection,
  WorkBuddyImTaskId,
  WorkBuddyImTarget,
} from '@contracts/workbuddy/im-conversation-run';
import type { HomeworkReminderArtifactDraft, HomeworkReminderExecutionReceipt } from './im-homework-reminder';
import { getWorkBuddyImTaskDefinition } from './im-task-catalog';
import type { WeeklyPreparationNoticeArtifactDraft } from './im-weekly-preparation-notice';
import type { EvaluationEvent } from './evaluation';
import type { GuidedExplanationArtifact, GuidedExplanationReceipt } from './guided-explanation';

type WorkBuddyImArtifactDraft = HomeworkReminderArtifactDraft | WeeklyPreparationNoticeArtifactDraft | GuidedExplanationArtifact;

function event(
  runRef: string,
  sequence: number,
  input: Readonly<{
    id: string;
    actor: ConversationRunEvent['actor'];
    kind: ConversationRunEvent['kind'];
    state: ConversationRunEvent['state'];
    title: string;
    summary: string;
    occurredAt: string;
    stepRef?: string;
    detail?: ConversationRunEventDetail;
    objectRefs?: ConversationRunEvent['objectRefs'];
  }>,
): ConversationRunEvent {
  return Object.freeze({
    id: input.id,
    runRef,
    sequence,
    occurredAt: input.occurredAt,
    updatedAt: input.occurredAt,
    actor: input.actor,
    kind: input.kind,
    state: input.state,
    title: input.title,
    summary: input.summary,
    stepRef: input.stepRef,
    objectRefs: Object.freeze([...(input.objectRefs ?? [])]),
    allowedCommands: Object.freeze([]),
    detail: input.detail,
  });
}

function capabilityEvent(runRef: string, sequence: number, step: WorkBuddyImRunPlanStep, occurredAt: string): ConversationRunEvent {
  return event(runRef, sequence, {
    id: `${runRef}:${step.id}`,
    actor: step.capabilityId.startsWith('classin-') ? 'tool' : 'skill',
    kind: 'capability_call',
    state: 'queued',
    title: step.title,
    summary: step.expectedOutput,
    occurredAt,
    stepRef: step.id,
    objectRefs: [{ type: 'capability', id: step.capabilityId }],
    detail: Object.freeze({
      capabilityLabel: step.capabilityLabel,
      purpose: step.purpose,
      inputSummary: step.inputSummary,
      outputSummary: step.expectedOutput,
      elapsedLabel: '等待执行',
      contextLabels: step.contextLabels,
      excludedSensitiveCount: 0,
    }),
  });
}

export function createWorkBuddyImConversationRun(input: Readonly<{
  target: WorkBuddyImTarget;
  taskId: WorkBuddyImTaskId;
  goal: string;
  startedAt: number;
  occurredAt: string;
  organizeEndsAt: number;
  runInstanceId?: string;
}>): WorkBuddyImRunProjection {
  const definition = getWorkBuddyImTaskDefinition(input.taskId);
  const runRef = `run-im-${input.taskId}-${input.target.classId}${input.runInstanceId ? `-${input.runInstanceId}` : ''}`;
  return Object.freeze({
    runRef,
    taskId: input.taskId,
    startedAt: input.startedAt,
    title: `${input.target.classLabel} · ${definition.runTitle}`,
    goal: input.goal,
    status: 'organizing',
    events: Object.freeze([
      event(runRef, 1, {
        id: `${runRef}:goal`, actor: 'teacher', kind: 'teacher_message', state: 'completed', title: '你的要求', summary: input.goal, occurredAt: input.occurredAt,
      }),
      event(runRef, 2, {
        id: `${runRef}:understanding`, actor: 'agent', kind: 'goal_understood', state: 'running', title: '正在理解任务',
        summary: `正在结合“${input.target.classLabel}”整理目标、数据范围和执行步骤。`, occurredAt: input.occurredAt,
      }),
    ]),
    plan: definition.plan,
    progress: Object.freeze({ status: 'organizing', stepEndsAt: input.organizeEndsAt }),
    truthLabel: '[模拟] TeacherIn IM Agent Run',
  });
}

export function appendWorkBuddyImSupplement(
  run: WorkBuddyImRunProjection,
  text: string,
  occurredAt: string,
): WorkBuddyImRunProjection {
  const normalized = text.trim();
  if (!normalized || (run.status !== 'organizing' && run.status !== 'running')) return run;
  const supplement = event(run.runRef, run.events.length + 1, {
    id: `${run.runRef}:supplement:${run.events.length + 1}`,
    actor: 'teacher',
    kind: 'teacher_message',
    state: 'completed',
    title: '你补充了要求',
    summary: normalized,
    occurredAt,
  });
  return Object.freeze({ ...run, events: Object.freeze([...run.events, supplement]) });
}

export function completeWorkBuddyImUnderstanding(
  run: WorkBuddyImRunProjection,
  occurredAt: string,
): WorkBuddyImRunProjection {
  const definition = getWorkBuddyImTaskDefinition(run.taskId);
  const understanding = run.events.map((item) => item.kind === 'goal_understood'
    ? Object.freeze({
      ...item,
      state: 'completed' as const,
      title: '已理解你的任务',
      summary: definition.understandingSummary,
      updatedAt: occurredAt,
    })
    : item);
  const planEvent = event(run.runRef, understanding.length + 1, {
    id: `${run.runRef}:plan`, actor: 'agent', kind: 'plan', state: 'completed', title: '已拆解为 4 个执行步骤',
    summary: definition.planSummary, occurredAt,
  });
  const capabilityEvents = run.plan.map((step, index) => capabilityEvent(run.runRef, understanding.length + index + 2, step, occurredAt));
  return Object.freeze({
    ...run,
    status: 'running',
    events: Object.freeze([...understanding, planEvent, ...capabilityEvents]),
    progress: Object.freeze({ status: 'idle' as const }),
  });
}

export function startWorkBuddyImCapability(
  run: WorkBuddyImRunProjection,
  activeIndex: number,
  stepEndsAt: number,
  occurredAt: string,
): WorkBuddyImRunProjection {
  const step = run.plan[activeIndex];
  if (!step) return run;
  return Object.freeze({
    ...run,
    status: 'running',
    events: Object.freeze(run.events.map((item) => item.stepRef === step.id
      ? Object.freeze({ ...item, state: 'running' as const, updatedAt: occurredAt, detail: item.detail ? Object.freeze({ ...item.detail, elapsedLabel: '执行中' }) : undefined })
      : item)),
    progress: Object.freeze({ status: 'running' as const, activeIndex, completedCount: activeIndex, totalCount: run.plan.length, stepEndsAt }),
  });
}

export function completeWorkBuddyImCapability(
  run: WorkBuddyImRunProjection,
  activeIndex: number,
  outputSummary: string,
  elapsedLabel: string,
  occurredAt: string,
): WorkBuddyImRunProjection {
  const step = run.plan[activeIndex];
  if (!step) return run;
  return Object.freeze({
    ...run,
    events: Object.freeze(run.events.map((item) => item.stepRef === step.id
      ? Object.freeze({
        ...item,
        state: 'completed' as const,
        summary: outputSummary,
        updatedAt: occurredAt,
        detail: item.detail ? Object.freeze({ ...item.detail, outputSummary, elapsedLabel }) : undefined,
      })
      : item)),
    progress: Object.freeze({ status: 'running' as const, activeIndex, completedCount: activeIndex + 1, totalCount: run.plan.length, stepEndsAt: 0 }),
  });
}

export function completeWorkBuddyImConversationRun(
  run: WorkBuddyImRunProjection,
  draft: WorkBuddyImArtifactDraft,
  occurredAt: string,
): WorkBuddyImRunProjection {
  const artifactTitle = 'presentation' in draft
    ? '交互讲题内容已生成'
    : draft.kind === 'weekly-preparation-notice' ? '课前准备通知已生成' : '提醒草稿已生成';
  const artifactSummary = 'presentation' in draft
    ? `${draft.steps.length} 个讲解步骤 · 待教师审核 · 版本 v${draft.version}`
    : draft.kind === 'weekly-preparation-notice'
      ? `${draft.planItems.length} 节教学安排 · 1 条待审阅群通知 · 草稿 v${draft.version}`
      : `${draft.groups.length} 项作业 · 1 条待审阅群消息 · 草稿 v${draft.version}`;
  const artifact = event(run.runRef, run.events.length + 1, {
    id: `${run.runRef}:artifact`, actor: 'system', kind: 'artifact', state: 'completed', title: artifactTitle,
    summary: artifactSummary,
    occurredAt,
    objectRefs: [{ type: 'artifact', id: draft.id, version: `v${draft.version}` }],
  });
  return Object.freeze({
    ...run,
    status: 'completed_pending_review',
    events: Object.freeze([...run.events, artifact]),
    progress: Object.freeze({ status: 'completed' as const, completedCount: run.plan.length, totalCount: run.plan.length }),
  });
}

export function completeEmptyWorkBuddyImConversationRun(
  run: WorkBuddyImRunProjection,
  summary: string,
  occurredAt: string,
): WorkBuddyImRunProjection {
  return Object.freeze({
    ...run,
    status: 'completed',
    events: Object.freeze([...run.events, event(run.runRef, run.events.length + 1, {
      id: `${run.runRef}:summary`, actor: 'agent', kind: 'system', state: 'completed', title: '核对完成', summary, occurredAt,
    })]),
    progress: Object.freeze({ status: 'completed' as const, completedCount: run.plan.length, totalCount: run.plan.length }),
  });
}

export function failWorkBuddyImCapability(
  run: WorkBuddyImRunProjection,
  activeIndex: number,
  message: string,
  occurredAt: string,
): WorkBuddyImRunProjection {
  const step = run.plan[activeIndex];
  const events = run.events.map((item) => item.stepRef === step?.id
    ? Object.freeze({ ...item, state: 'failed' as const, summary: message, updatedAt: occurredAt, detail: item.detail ? Object.freeze({ ...item.detail, outputSummary: message, elapsedLabel: '执行失败' }) : undefined })
    : item);
  return Object.freeze({
    ...run,
    status: 'failed',
    events: Object.freeze([...events, event(run.runRef, events.length + 1, {
      id: `${run.runRef}:error`, actor: 'system', kind: 'error', state: 'failed', title: '任务暂时无法继续', summary: message, occurredAt,
    })]),
    progress: Object.freeze({ status: 'idle' as const }),
  });
}

export function reviseWorkBuddyImArtifactEvent(
  run: WorkBuddyImRunProjection,
  draft: WorkBuddyImArtifactDraft,
): WorkBuddyImRunProjection {
  const summary = 'presentation' in draft
    ? `${draft.steps.length} 个讲解步骤 · 待教师审核 · 版本 v${draft.version}`
    : draft.kind === 'weekly-preparation-notice'
    ? `${draft.planItems.length} 节教学安排 · 1 条待审阅群通知 · 草稿 v${draft.version}`
    : `${draft.groups.length} 项作业 · 1 条待审阅群消息 · 草稿 v${draft.version}`;
  return Object.freeze({
    ...run,
    events: Object.freeze(run.events.map((item) => item.kind === 'artifact'
      ? Object.freeze({
        ...item,
        summary,
        objectRefs: Object.freeze([{ type: 'artifact' as const, id: draft.id, version: `v${draft.version}` }]),
      })
      : item)),
  });
}

export function appendWorkBuddyImEvaluationEvent(
  run: WorkBuddyImRunProjection,
  receipt: HomeworkReminderExecutionReceipt | GuidedExplanationReceipt,
  evaluation: EvaluationEvent,
): WorkBuddyImRunProjection {
  if (run.events.some(({ id }) => id === evaluation.id)) return run;
  const receiptEvent = event(run.runRef, run.events.length + 1, {
    id: receipt.id,
    actor: 'tool',
    kind: 'receipt',
    state: receipt.status === 'success' ? 'completed' : 'failed',
    title: receipt.status === 'success' ? '班级群消息执行完成' : '班级群消息执行未完成',
    summary: `${receipt.truthLabel} ${receipt.result}`,
    occurredAt: receipt.executedAt,
    objectRefs: [
      { type: 'action', id: receipt.actionId },
      { type: 'approval', id: receipt.approvalId },
      { type: 'receipt', id: receipt.id },
    ],
  });
  const evaluationEvent = event(run.runRef, run.events.length + 2, {
    id: evaluation.id,
    actor: 'system',
    kind: 'evaluation',
    state: 'completed',
    title: evaluation.signal.outcome === 'adopted' ? '已记录教师采纳结果' : '已记录本次未完成采纳',
    summary: evaluation.signal.outcome === 'adopted'
      ? `${evaluation.truthLabel} 草稿已获教师批准并成功发送；尚不代表教学效果。`
      : `${evaluation.truthLabel} 执行状态：${evaluation.signal.executionStatus}；尚未形成业务采纳。`,
    occurredAt: evaluation.observedAt,
    objectRefs: [
      { type: 'context_snapshot', id: evaluation.contextSnapshotRef },
      { type: 'artifact', id: evaluation.artifactRef.id, version: evaluation.artifactRef.version },
      { type: 'action', id: evaluation.actionRef },
      { type: 'approval', id: evaluation.approvalRef },
      { type: 'receipt', id: evaluation.receiptRef },
      { type: 'evaluation', id: evaluation.id },
    ],
  });
  return Object.freeze({ ...run, events: Object.freeze([...run.events, receiptEvent, evaluationEvent]) });
}
