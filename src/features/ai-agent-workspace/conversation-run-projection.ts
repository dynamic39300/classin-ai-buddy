import type {
  ConversationRunEvent,
  ConversationRunEventKind,
  ConversationRunObjectRef,
  ConversationRunProjection,
  ConversationRunStatus,
} from '@contracts/workbuddy/conversation-run';
import type { CoursewareRunView } from './workbuddy-course-production-view';

type EventInput = Readonly<{
  id: string;
  kind: ConversationRunEventKind;
  state?: ConversationRunEvent['state'];
  title: string;
  summary: string;
  objectRefs?: readonly ConversationRunObjectRef[];
}>;

function freezeEvent(runRef: string, sequence: number, input: EventInput): ConversationRunEvent {
  return Object.freeze({
    id: input.id,
    runRef,
    sequence,
    occurredAt: `deterministic:${String(sequence).padStart(3, '0')}`,
    kind: input.kind,
    state: input.state ?? 'completed',
    title: input.title,
    summary: input.summary,
    objectRefs: Object.freeze([...(input.objectRefs ?? [])]),
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

export function projectCoursewareConversationRun(view: CoursewareRunView): ConversationRunProjection {
  const { run } = view;
  const inputs: EventInput[] = [
    {
      id: `${run.id}:goal`, kind: 'teacher_message', title: '教学目标', summary: run.goal,
    },
    {
      id: `${run.id}:understanding`, kind: 'goal_understood', title: '已理解你的目标',
      summary: `我会基于已确认的教学范围，生成“${run.title}”并保留可复查的过程。`,
    },
  ];

  if (run.stage === 'needs_information') {
    inputs.push({
      id: `${run.id}:clarification`, kind: 'clarification_request', state: 'requires_teacher_input',
      title: '还需要确认课件要求', summary: '请确认课时、时长、教材版本和课件风格。',
    });
  } else {
    inputs.push(
      {
        id: `${run.id}:clarification`, kind: 'clarification_submitted', title: '课件要求已补充',
        summary: `${run.brief.durationMinutes} 分钟 · ${run.brief.teachingApproach} · ${run.brief.expectedPages} 页`,
      },
      {
        id: `${run.id}:context`, kind: 'context_confirmed', title: '核心上下文已确认',
        summary: '本次任务将使用冻结的教学范围与资源引用。',
        objectRefs: [{ type: 'context_snapshot', id: run.contextSnapshotId }],
      },
      {
        id: `${run.id}:plan`, kind: 'plan', state: run.stage === 'awaiting_plan_confirmation' ? 'requires_teacher_input' : 'completed',
        title: '智能课件执行计划', summary: `${run.plan.length} 个步骤 · 等待教师确认后执行`,
      },
    );
  }

  for (const event of run.events) {
    inputs.push({
      id: event.id,
      kind: event.capability ? 'capability_call' : 'process',
      title: event.title,
      summary: event.summary.replace('[模拟]', ''),
      objectRefs: event.capability ? [{ type: 'capability', id: event.capability }] : [],
    });
  }

  const artifacts = run.artifactHistory.length ? run.artifactHistory : run.artifact ? [run.artifact] : [];
  for (const artifact of artifacts) {
    inputs.push({
      id: `${artifact.id}:${artifact.version}`,
      kind: 'artifact',
      title: artifact.changeSummary ? `课件已更新为 ${artifact.version}` : artifact.title,
      summary: artifact.changeSummary?.join(' · ') ?? `${artifact.pageCount} 页 · ${artifact.validationSummary}`,
      objectRefs: [{ type: 'artifact', id: artifact.id, version: artifact.version }],
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
    });
    if (view.action.status === 'approved' || view.receipt) {
      const approvalId = view.receipt?.approvalId ?? `${view.action.id}:approval`;
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
    });
  }

  const events = Object.freeze(inputs.map((input, index) => freezeEvent(run.id, index + 1, input)));
  return Object.freeze({
    runRef: run.id,
    title: run.title,
    goal: run.goal,
    status: getStatus(view),
    events,
    cursor: String(events.length),
    allowedCommands: Object.freeze(['supplement'] as const),
  });
}
