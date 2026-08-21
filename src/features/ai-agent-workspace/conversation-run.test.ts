import { describe, expect, it } from 'vitest';
import { approveAction, createCoursewareSaveAction, type ExecutionReceipt } from '@domain/workbuddy/writeback';
import { approveCoursewareArtifact, confirmCoursewareBrief, createSingleCoursewareRun, executeCoursewarePlan } from '@domain/workbuddy/course-production';
import {
  WORKBUDDY_COURSEWARE_DEFINITION,
  WORKBUDDY_COURSEWARE_OUTPUT,
  WORKBUDDY_COURSEWARE_SAVE_ACTION,
} from '@mocks/scenarios/workbuddy-course-production';
import { createDeterministicConversationRunModule } from '@mocks/adapters/workbuddy-conversation-run';
import { projectCoursewareConversationRun } from './conversation-run-projection';
import { projectCoursewareRunView } from './workbuddy-course-production-view';

function createCompletedProjection() {
  let run = createSingleCoursewareRun(
    WORKBUDDY_COURSEWARE_DEFINITION,
    '为高一（3）班生成一份函数单调性智能课件',
    'context-snapshot-courseware-1',
  );
  run = confirmCoursewareBrief(run);
  run = executeCoursewarePlan(run, WORKBUDDY_COURSEWARE_OUTPUT);
  run = approveCoursewareArtifact(run);
  if (!run.artifact) throw new Error('Expected courseware artifact fixture');

  const proposed = createCoursewareSaveAction({
    ...WORKBUDDY_COURSEWARE_SAVE_ACTION,
    runRef: run.id,
    contextSnapshotId: run.contextSnapshotId,
    artifactId: run.artifact.id,
    artifactVersion: run.artifact.version,
  });
  const approved = approveAction(proposed, 'approval-courseware-save-1', '2026-08-20T10:05:00+08:00', 'teacher-wang');
  if (!approved) throw new Error('Expected approval fixture');
  const receipt: ExecutionReceipt = Object.freeze({
    id: 'receipt-courseware-save-1',
    actionId: approved.action.id,
    approvalId: approved.approval.id,
    idempotencyKey: approved.action.idempotencyKey,
    executedAt: '2026-08-20T10:06:00+08:00',
    truthLabel: '[模拟]单课件执行回执',
    status: 'success',
    result: '课件草稿已保存到 ClassIn',
    object: Object.freeze({ id: 'courseware-101', version: 'v1', label: '函数单调性智能课件', returnUrl: '/teacher/classes/physics-3' }),
  });
  const view = projectCoursewareRunView(run, [], approved.action, receipt, {}, null);
  if (!view) throw new Error('Expected courseware view');
  return projectCoursewareConversationRun(view);
}

describe('ConversationRun public seam', () => {
  it('restores a completed courseware run as one ordered timeline', () => {
    const module = createDeterministicConversationRunModule([createCompletedProjection()]);

    const projection = module.open('run-m4-courseware');

    expect(projection?.events.map(({ kind }) => kind)).toEqual([
      'teacher_message',
      'goal_understood',
      'clarification_submitted',
      'context_confirmed',
      'plan',
      'process',
      'process',
      'capability_call',
      'capability_call',
      'capability_call',
      'artifact',
      'proposed_action',
      'approval',
      'receipt',
    ]);
    expect(projection?.events.at(-1)).toMatchObject({
      id: 'receipt-courseware-save-1',
      state: 'completed',
      objectRefs: [{ type: 'receipt', id: 'receipt-courseware-save-1' }],
    });
    expect(projection?.cursor).toBe('14');
  });

  it('replays from a cursor and rejects duplicate teacher commands', () => {
    const module = createDeterministicConversationRunModule([createCompletedProjection()]);
    const received: string[] = [];
    const unsubscribe = module.subscribe('run-m4-courseware', '12', (events) => {
      received.push(...events.map(({ id }) => id));
    });

    const first = module.dispatch('run-m4-courseware', {
      id: 'command-supplement-1',
      type: 'supplement',
      text: '把图像示例改成课堂探究活动',
    });
    const duplicate = module.dispatch('run-m4-courseware', {
      id: 'command-supplement-1',
      type: 'supplement',
      text: '把图像示例改成课堂探究活动',
    });
    unsubscribe();

    expect(received).toEqual(['approval-courseware-save-1', 'receipt-courseware-save-1', 'command-supplement-1']);
    expect(first).toMatchObject({ status: 'accepted', cursor: '15' });
    expect(duplicate).toMatchObject({ status: 'duplicate', cursor: '15' });
    expect(module.open('run-m4-courseware')?.events.filter(({ id }) => id === 'command-supplement-1')).toHaveLength(1);
  });
});
