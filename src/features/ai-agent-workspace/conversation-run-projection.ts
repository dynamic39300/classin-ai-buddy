import type {
  ConversationRunEvent,
  ConversationRunEventKind,
  ConversationRunActor,
  ConversationRunCommandType,
  ConversationRunObjectRef,
  ConversationRunEventDetail,
  ConversationRunProjection,
  ConversationRunStatus,
} from '@contracts/workbuddy/conversation-run';
import type { CoursewareRunView, PackageRunView } from './workbuddy-course-production-view';

type EventInput = Readonly<{
  id: string;
  kind: ConversationRunEventKind;
  state?: ConversationRunEvent['state'];
  title: string;
  summary: string;
  actor?: ConversationRunActor;
  stepRef?: string;
  allowedCommands?: readonly ConversationRunCommandType[];
  objectRefs?: readonly ConversationRunObjectRef[];
  detail?: ConversationRunEventDetail;
}>;

const CAPABILITY_LABELS: Readonly<Record<string, string>> = Object.freeze({
  'goal-interpreter': '智能课件目标理解',
  'lesson-structure': '智能课件结构设计',
  'courseware-renderer': '智能课件页面生成',
  'courseware-quality-check': '智能课件质量检查',
});
const CAPABILITY_INPUTS: Readonly<Record<string, string>> = Object.freeze({
  'goal-interpreter': '教师目标、课时要求与已确认教学范围',
  'lesson-structure': '目标约束、课程标准与课件内容要求',
  'courseware-renderer': '课件结构、页面风格与课堂活动要求',
  'courseware-quality-check': '智能课件草稿与目标覆盖清单',
});
const CAPABILITY_DURATIONS: Readonly<Record<string, string>> = Object.freeze({
  'goal-interpreter': '4 秒', 'lesson-structure': '12 秒', 'courseware-renderer': '28 秒', 'courseware-quality-check': '7 秒',
});

function freezeEvent(runRef: string, sequence: number, input: EventInput): ConversationRunEvent {
  return Object.freeze({
    id: input.id,
    runRef,
    sequence,
    occurredAt: `deterministic:${String(sequence).padStart(3, '0')}`,
    updatedAt: `deterministic:${String(sequence).padStart(3, '0')}`,
    actor: input.actor ?? (input.kind === 'teacher_message' || input.kind === 'clarification_submitted'
      ? 'teacher'
      : input.kind === 'capability_call' ? 'skill'
        : input.kind === 'system' ? 'system' : 'agent'),
    kind: input.kind,
    state: input.state ?? 'completed',
    title: input.title,
    summary: input.summary,
    stepRef: input.stepRef,
    objectRefs: Object.freeze([...(input.objectRefs ?? [])]),
    allowedCommands: Object.freeze([...(input.allowedCommands ?? [])]),
    detail: input.detail ? Object.freeze({ ...input.detail, contextLabels: Object.freeze([...input.detail.contextLabels]) }) : undefined,
  });
}

function getStatus(view: CoursewareRunView): ConversationRunStatus {
  if (view.receipt?.status === 'success') return 'completed';
  if (view.receipt) return 'failed';
  if (view.action) return 'waiting_approval';
  if (view.run.stage === 'needs_information') return 'needs_information';
  if (view.run.stage === 'awaiting_plan_confirmation') return 'awaiting_plan_confirmation';
  return 'completed_pending_review';
}

function getCoursewareAllowedCommands(view: CoursewareRunView): readonly ConversationRunCommandType[] {
  if (view.receipt?.status === 'success') return Object.freeze(['supplement', 'derive_package']);
  if (view.receipt) return Object.freeze(['supplement', 'recover_action']);
  if (view.action?.status === 'approved') return Object.freeze(['supplement', 'execute_action']);
  if (view.action) return Object.freeze(['supplement', 'approve_action', 'reject_action']);
  if (view.run.stage === 'needs_information') return Object.freeze(['submit_clarification', 'confirm_clarification', 'supplement', 'cancel']);
  if (view.run.stage === 'awaiting_plan_confirmation') return Object.freeze(['revise_plan', 'start_plan', 'supplement', 'cancel']);
  if (view.run.artifact && view.run.reviewStatus === 'pending') return Object.freeze(['revise_artifact', 'approve_artifact', 'supplement']);
  if (view.run.artifact) return Object.freeze(['propose_action', 'derive_package', 'supplement']);
  return Object.freeze(['supplement']);
}

export function projectCoursewareConversationRun(view: CoursewareRunView): ConversationRunProjection {
  const { run } = view;
  const inputs: EventInput[] = [];
  for (const [index, evidence] of run.supersededEvidence.entries()) {
    const revision = index + 1;
    const revisionRef = `${run.id}:r${revision}`;
    const superseded = { state: 'superseded' as const, allowedCommands: Object.freeze([]) };
    inputs.push(
      {
        id: `${revisionRef}:goal`, kind: 'teacher_message', title: '调整前教学目标',
        summary: evidence.reason, ...superseded,
      },
      {
        id: `${revisionRef}:understanding`, kind: 'goal_understood', title: '调整前目标理解',
        summary: '该目标理解已由新的教学范围和计划替代。', ...superseded,
      },
      {
        id: `${revisionRef}:clarification`, kind: 'clarification_submitted', title: '调整前课件要求',
        summary: '原课件要求已冻结为历史证据。', ...superseded,
      },
      {
        id: `${revisionRef}:context`, kind: 'context_confirmed', title: '调整前核心上下文',
        summary: evidence.contextLabels.join(' · ') || evidence.snapshotId, objectRefs: [{ type: 'context_snapshot', id: evidence.snapshotId }], ...superseded,
      },
      {
        id: `${revisionRef}:plan`, kind: 'plan', title: '调整前智能课件执行计划',
        summary: `${evidence.plan.length} 个步骤 · 已被新计划替代`, ...superseded,
      },
    );
    for (const step of evidence.plan) inputs.push({
      id: `experience:r${revision}:${step.id}`, kind: 'capability_call', title: step.title,
      summary: step.capabilitySummary, stepRef: step.id, objectRefs: [{ type: 'capability', id: step.capability }], ...superseded,
    });
    for (const artifact of evidence.artifactHistory) inputs.push({
      id: `${artifact.id}:${artifact.version}`, kind: 'artifact', title: artifact.title,
      summary: `${artifact.version} · 已被新教学范围替代`, objectRefs: [{ type: 'artifact', id: artifact.id, version: artifact.version }], ...superseded,
    });
    if (evidence.action) {
      inputs.push({
        id: evidence.action.id, kind: 'proposed_action', title: '调整前 ClassIn 保存提案',
        summary: '该提案属于旧上下文，已停止继续执行。', objectRefs: [{ type: 'action', id: evidence.action.id }], ...superseded,
      });
      if (evidence.action.status === 'approved' || evidence.receipt) inputs.push({
        id: `${evidence.action.id}:approval`, kind: 'approval', title: '调整前教师审批',
        summary: '该审批随旧提案一并归档。', objectRefs: [{ type: 'action', id: evidence.action.id }], ...superseded,
      });
    }
    if (evidence.receipt) inputs.push({
      id: evidence.receipt.id, kind: 'receipt', title: '调整前执行回执', summary: evidence.receipt.result,
      objectRefs: [{ type: 'receipt', id: evidence.receipt.id }], ...superseded,
    });
    inputs.push({
      id: `${run.id}:superseded:${evidence.snapshotId}`,
      kind: 'system',
      state: 'superseded',
      title: '已归档调整前的计划与产物',
      summary: `${evidence.reason} · ${evidence.contextLabels.join(' · ')}`,
      objectRefs: evidence.artifact ? [{ type: 'artifact', id: evidence.artifact.id, version: evidence.artifact.version }] : [],
    });
  }
  const revisionRef = `${run.id}:r${run.revision}`;
  inputs.push(
    {
      id: `${revisionRef}:goal`, kind: 'teacher_message', title: '教学目标', summary: run.goal,
    },
    {
      id: `${revisionRef}:understanding`, kind: 'goal_understood', title: '已理解你的目标',
      summary: `我会基于已确认的教学范围，生成“${run.title}”并保留可复查的过程。`,
    },
  );

  if (run.stage === 'needs_information') {
    inputs.push({
      id: `${revisionRef}:clarification`, kind: 'clarification_request', state: 'requires_teacher_input',
      title: '还需要确认课件要求', summary: '请确认课时、时长、教材版本和课件风格。',
      allowedCommands: ['submit_clarification', 'confirm_clarification', 'cancel'],
    });
  } else {
    inputs.push(
      {
        id: `${revisionRef}:clarification`, kind: 'clarification_submitted', title: '课件要求已补充',
        summary: `${run.brief.durationMinutes} 分钟 · ${run.brief.teachingApproach} · ${run.brief.expectedPages} 页`,
      },
      {
        id: `${revisionRef}:context`, kind: 'context_confirmed', title: '核心上下文已确认',
        summary: '本次任务将使用冻结的教学范围与资源引用。',
        objectRefs: [{ type: 'context_snapshot', id: run.contextSnapshotId }],
      },
      {
        id: `${revisionRef}:plan`, kind: 'plan', state: run.stage === 'awaiting_plan_confirmation' ? 'requires_teacher_input' : 'completed',
        title: '智能课件执行计划', summary: `${run.plan.length} 个步骤 · 等待教师确认后执行`,
        allowedCommands: run.stage === 'awaiting_plan_confirmation' ? ['revise_plan', 'start_plan', 'cancel'] : [],
      },
    );
    const projectionByCapability = new Map(view.projections.map((projection) => [projection.capabilityId, projection]));
    for (const step of run.plan) {
      const context = projectionByCapability.get(step.capability);
      inputs.push({
        id: `experience:r${run.revision}:${step.id}`, kind: 'capability_call', state: 'queued', title: step.title, summary: step.capabilitySummary,
        stepRef: step.id,
        objectRefs: [{ type: 'capability', id: step.capability }],
        detail: {
          capabilityLabel: CAPABILITY_LABELS[step.capability] ?? step.capabilitySummary,
          purpose: context?.purpose ?? step.capabilitySummary,
          inputSummary: CAPABILITY_INPUTS[step.capability] ?? '已确认的任务输入',
          outputSummary: step.expectedOutput,
          elapsedLabel: CAPABILITY_DURATIONS[step.capability] ?? '已完成',
          contextLabels: Object.freeze(context?.items.map(({ label }) => label) ?? []),
          excludedSensitiveCount: context?.excludedSensitiveCount ?? 0,
        },
      });
    }
  }

  const artifacts = run.artifactHistory.length ? run.artifactHistory : run.artifact ? [run.artifact] : [];
  for (const artifact of artifacts) {
    const isCurrent = run.artifact?.id === artifact.id && run.artifact.version === artifact.version;
    inputs.push({
      id: `${artifact.id}:${artifact.version}`,
      kind: 'artifact',
      title: artifact.changeSummary ? `课件已更新为 ${artifact.version}` : artifact.title,
      summary: artifact.changeSummary?.join(' · ') ?? `${artifact.pageCount} 页 · ${artifact.validationSummary}`,
      objectRefs: [{ type: 'artifact', id: artifact.id, version: artifact.version }],
      allowedCommands: isCurrent && run.reviewStatus === 'pending' ? ['revise_artifact', 'approve_artifact']
        : isCurrent && run.reviewStatus === 'approved' && !view.action && !view.receipt ? ['propose_action', 'derive_package'] : [],
    });
  }

  if (view.action) {
    inputs.push({
      id: view.action.id,
      kind: 'proposed_action',
      state: view.action.status === 'rejected' || view.action.status === 'expired' ? 'failed' : 'completed',
      title: '保存到 ClassIn',
      summary: `${view.action.target.label} · ${view.action.difference}`,
      objectRefs: [{ type: 'action', id: view.action.id }],
      allowedCommands: view.receipt ? [] : view.action.status === 'proposed' ? ['approve_action', 'reject_action']
        : view.action.status === 'approved' ? ['execute_action'] : [],
    });
    if (view.action.status === 'approved' || view.receipt) {
      const approvalId = `${view.action.id}:approval`;
      inputs.push({
        id: approvalId,
        kind: 'approval',
        title: '教师已确认保存动作',
        summary: '保存提案已批准，等待执行结果。',
        objectRefs: [{ type: 'approval', id: approvalId }, { type: 'action', id: view.action.id }],
      });
    }
  }

  if (view.receipt) {
    inputs.push({
      id: view.receipt.id,
      kind: 'receipt',
      state: view.receipt.status === 'success' ? 'completed' : 'failed',
      title: view.receipt.status === 'success' ? '课件草稿已保存到 ClassIn' : '保存动作需要处理',
      summary: view.receipt.result,
      objectRefs: [{ type: 'receipt', id: view.receipt.id }],
      allowedCommands: view.receipt.status === 'success' ? ['derive_package']
        : view.receipt.status === 'permission_denied' || view.receipt.status === 'version_conflict' ? ['recover_action'] : ['execute_action'],
    });
  }

  const events = Object.freeze(inputs.map((input, index) => freezeEvent(run.id, index + 1, input)));
  return Object.freeze({
    runRef: run.id,
    taskKind: 'courseware',
    title: run.title,
    goal: run.goal,
    status: getStatus(view),
    events,
    cursor: String(events.length),
    allowedCommands: getCoursewareAllowedCommands(view),
    presentation: Object.freeze({
      inspectorOpen: true,
      inspectorMode: run.artifact ? 'output' : 'context',
      outputCount: run.artifact ? 1 : 0,
      unreadOutputCount: 0,
      composerDraft: '',
      progress: Object.freeze({ status: 'idle' as const }),
      executingAction: false,
      replanPending: false,
      contextExpandedIds: null,
      contextQuery: '',
      contextScrollTop: 0,
      artifactFocused: false,
      artifactEditing: false,
      artifactEditDraft: '',
      artifactSelectedBlock: '',
      artifactPreviewPage: 1,
      artifactScrollTop: 0,
      packageEditingArtifactId: null,
      packageEditDraft: '',
      packageConfiguration: Object.freeze({ lessonCount: 2, homeworkCount: 12, quizMinutes: 15, recordingMinutes: 8 }),
    }),
  });
}

export function projectPackageConversationRun(view: PackageRunView): ConversationRunProjection {
  const { run } = view;
  const inputs: EventInput[] = [
    { id: `${run.id}:goal`, kind: 'teacher_message', title: '课程方案包目标', summary: run.goal },
    {
      id: `${run.id}:understanding`, kind: 'goal_understood', title: '已理解你的交付目标',
      summary: '我会围绕同一课程目标生成课件、作业、测验和录播脚本，并保留每项产物的独立状态。',
    },
  ];
  if (run.sourceArtifactRef) inputs.push({
    id: `${run.id}:source-artifact`, kind: 'system', title: `来源课件 · ${run.sourceArtifactRef.version}`,
    summary: '这是一条独立方案包任务；来源课件只作为锁定引用，不会继承隐藏上下文。',
    objectRefs: [{ type: 'artifact', id: run.sourceArtifactRef.id, version: run.sourceArtifactRef.version }],
  });
  if (!run.contextSnapshotId) inputs.push({
    id: `${run.id}:context-required`, kind: 'clarification_request', state: 'requires_teacher_input',
    title: '需要确认独立核心上下文', summary: '请在右侧确认班级、课程、单元和资料；本任务不会隐式复用另一条 Run 的 ContextSnapshot。',
  });
  else inputs.push({
    id: `${run.id}:context`, kind: 'context_confirmed', title: '独立核心上下文已确认',
    summary: '本次方案包使用独立 ContextSnapshot；四类产物共享课程目标，但不共享写回状态。',
    objectRefs: [{ type: 'context_snapshot', id: run.contextSnapshotId }],
  });
  if (run.showPackageConfiguration || run.showGeneration || run.showArtifacts) inputs.push({
    id: `${run.id}:plan`, kind: 'plan', state: run.showPackageConfiguration ? 'requires_teacher_input' : 'completed',
    title: '课程方案包执行计划', summary: '先形成共享课程目标和课件结构，再并行生成配套产物。',
    allowedCommands: run.showPackageConfiguration ? ['begin_package', 'set_package_item_included', 'cancel'] : [],
  });
  if (run.showGeneration) inputs.push({
    id: `${run.id}:package-progress`, kind: 'process', state: 'running', title: '课程方案包生成进度',
    summary: '正在按依赖顺序生成课件、作业、测验和录播脚本。',
  });
  for (const artifact of run.artifacts) {
    if (!run.showGeneration && !run.showArtifacts) continue;
    inputs.push({
      id: `${run.id}:${artifact.id}:${artifact.version}`,
      kind: run.showArtifacts ? 'artifact' : 'process',
      state: artifact.state === 'failed' ? 'failed' : artifact.state === 'waiting' || artifact.state === 'generating' ? 'running' : 'completed',
      title: artifact.title,
      summary: `${artifact.version} · ${artifact.state === 'written_back' ? '已写回' : artifact.state === 'excluded' ? '已排除' : artifact.state === 'failed' ? '生成失败' : artifact.state === 'waiting' ? '等待依赖' : '可预览'}`,
      objectRefs: [{ type: 'artifact', id: artifact.id, version: artifact.version }],
      allowedCommands: run.showArtifacts && !view.action && !view.receipt && ['ready', 'excluded'].includes(artifact.state)
        ? ['revise_package_artifact', 'set_package_item_included', 'propose_action'] : [],
    });
  }
  if (run.showArtifacts) inputs.push({
    id: `${run.id}:package-ready`, kind: 'system', title: '课程方案包已生成',
    summary: `${run.artifacts.filter(({ state }) => state !== 'excluded').length} 项产物已形成，可在右侧逐项预览、排除或选择写回。`,
  });
  if (view.action) {
    inputs.push({
      id: view.action.id, kind: 'proposed_action', title: '保存课程方案包到 ClassIn',
      summary: `${view.action.artifactRefs.length} 项对象 · ${view.action.difference}`,
      objectRefs: [{ type: 'action', id: view.action.id }],
      allowedCommands: view.receipt ? [] : view.action.status === 'proposed' ? ['approve_action', 'reject_action', 'set_package_item_included']
        : view.action.status === 'approved' ? ['execute_action'] : [],
    });
    if (view.action.status === 'approved' || view.receipt) inputs.push({
      id: `${view.action.id}:approval`, kind: 'approval', title: '教师已批准方案包写回',
      summary: '写回提案已批准，等待对象级执行结果。',
      objectRefs: [{ type: 'action', id: view.action.id }],
    });
  }
  for (const receipt of view.receiptHistory.length ? view.receiptHistory : view.receipt ? [view.receipt] : []) inputs.push({
    id: receipt.id, kind: 'receipt', state: receipt.status === 'success' ? 'completed' : 'failed',
    title: receipt.status === 'success' ? '课程方案包已写回 ClassIn' : '课程方案包写回结果', summary: receipt.result,
    objectRefs: [{ type: 'receipt', id: receipt.id }],
    allowedCommands: receipt.status === 'partial_success' && view.retryableArtifactIds.length ? ['retry_failed'] : [],
  });
  const events = Object.freeze(inputs.map((input, index) => freezeEvent(run.id, index + 1, input)));
  const status: ConversationRunStatus = view.receipt?.status === 'success' ? 'completed'
    : view.receipt ? 'failed'
      : view.action ? 'waiting_approval'
        : run.showContextConfirmation ? 'needs_information'
          : run.showPackageConfiguration ? 'awaiting_plan_confirmation'
            : run.showGeneration ? 'running' : 'completed_pending_review';
  const allowedCommands: readonly ConversationRunCommandType[] = view.receipt?.status === 'partial_success'
    ? view.retryableArtifactIds.length
      ? Object.freeze(['retry_failed', 'supplement'])
      : view.canProposeSave ? Object.freeze(['propose_action', 'supplement']) : Object.freeze(['supplement'])
    : view.receipt
      ? Object.freeze(['supplement'])
      : view.action?.status === 'approved'
        ? Object.freeze(['execute_action', 'supplement'])
        : view.action
          ? Object.freeze(['approve_action', 'reject_action', 'set_package_item_included', 'supplement'])
          : run.showPackageConfiguration
            ? Object.freeze(['begin_package', 'set_package_item_included', 'supplement', 'cancel'])
            : run.showArtifacts
              ? Object.freeze(['revise_package_artifact', 'set_package_item_included', 'propose_action', 'supplement'])
              : Object.freeze(['supplement']);
  return Object.freeze({
    runRef: run.id,
    taskKind: 'course_package',
    title: run.title,
    goal: run.goal,
    status,
    events,
    cursor: String(events.length),
    allowedCommands,
    presentation: Object.freeze({
      inspectorOpen: true,
      inspectorMode: run.showArtifacts ? 'output' : 'context',
      outputCount: run.showArtifacts ? run.artifacts.filter(({ state }) => state !== 'excluded').length : 0,
      unreadOutputCount: 0,
      composerDraft: '',
      progress: Object.freeze({ status: 'idle' as const }),
      executingAction: false,
      replanPending: false,
      contextExpandedIds: null,
      contextQuery: '',
      contextScrollTop: 0,
      artifactFocused: false,
      artifactEditing: false,
      artifactEditDraft: '',
      artifactSelectedBlock: '',
      artifactPreviewPage: 1,
      artifactScrollTop: 0,
      packageEditingArtifactId: null,
      packageEditDraft: '',
      packageConfiguration: Object.freeze({ lessonCount: 2, homeworkCount: 12, quizMinutes: 15, recordingMinutes: 8 }),
    }),
  });
}
