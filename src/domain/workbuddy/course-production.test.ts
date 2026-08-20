import { describe, expect, it } from 'vitest';
import { WORKBUDDY_COURSEWARE_DEFINITION, WORKBUDDY_COURSEWARE_OUTPUT, WORKBUDDY_COURSEWARE_SAVE_ACTION } from '@mocks/scenarios/workbuddy-course-production';
import { createCoursewareSaveAction } from './writeback';
import {
  approveCoursewareArtifact, confirmCoursewareBrief, createSingleCoursewareRun, executeCoursewarePlan, replanCoursewareRun,
  reviseCoursewareBrief, updateCoursewareBrief,
} from './course-production';

describe('single-courseware Course Production Module', () => {
  it('keeps clarification, plan confirmation and deterministic execution explicit', () => {
    const created = createSingleCoursewareRun(WORKBUDDY_COURSEWARE_DEFINITION, '设计动量守恒模型课件', 'snapshot-1');
    const planned = confirmCoursewareBrief(updateCoursewareBrief(created, { expectedPages: 16 }));
    const completed = executeCoursewarePlan(planned, WORKBUDDY_COURSEWARE_OUTPUT);
    expect(planned).toMatchObject({ stage: 'awaiting_plan_confirmation', brief: { expectedPages: 16 } });
    expect(completed.events.map(({ title }) => title)).toEqual(['核心上下文已载入', '任务计划已确认', '教学结构已生成', '课件草稿已组装', '质量检查通过']);
    expect(completed.artifact).toMatchObject({ id: 'artifact-courseware-momentum-v1', pageCount: 16, validationState: 'passed' });
    expect(completed).toMatchObject({ reviewStatus: 'pending', allowedCommands: expect.arrayContaining(['approve-artifact']) });
    expect(approveCoursewareArtifact(completed)).toMatchObject({ reviewStatus: 'approved', allowedCommands: expect.arrayContaining(['derive-package', 'propose-save']) });
  });

  it('preserves the previous plan, events, Snapshot and Artifact when replanning', () => {
    const completed = executeCoursewarePlan(confirmCoursewareBrief(createSingleCoursewareRun(WORKBUDDY_COURSEWARE_DEFINITION, '设计动量守恒模型课件', 'snapshot-1')), WORKBUDDY_COURSEWARE_OUTPUT);
    const action = createCoursewareSaveAction({ ...WORKBUDDY_COURSEWARE_SAVE_ACTION, contextSnapshotId: 'snapshot-1' });
    const receipt = {
      id: 'receipt-1', actionId: action.id, approvalId: 'approval-1', idempotencyKey: action.idempotencyKey,
      executedAt: '2026-08-20T10:06:00+08:00', truthLabel: '[模拟]单课件执行回执', status: 'success' as const,
      object: { id: 'object-1', version: 'v1', label: '原课件', returnUrl: '/teacher/classes/physics-3' }, result: '原课件已保存',
    };
    const replanned = replanCoursewareRun(completed, 'snapshot-2', '切换教学范围', { title: '生成机械波课件', goal: '设计机械波课件', plan: completed.plan.map((step) => ({ ...step, id: `${step.id}-r2` })) }, { action, receipt });
    expect(replanned).toMatchObject({ revision: 2, goal: '设计机械波课件', contextSnapshotId: 'snapshot-2', stage: 'needs_information', artifact: null });
    expect(replanned.supersededEvidence[0]).toMatchObject({ snapshotId: 'snapshot-1', artifact: { id: 'artifact-courseware-momentum-v1' }, reason: '切换教学范围' });
    expect(replanned.supersededEvidence[0]?.action).toMatchObject({ id: 'action-courseware-save-1', target: { unitId: 'unit-momentum-1' } });
    expect(replanned.supersededEvidence[0]?.receipt).toMatchObject({ id: 'receipt-1', status: 'success', result: '原课件已保存' });
    expect(replanned.supersededEvidence[0]?.plan).toHaveLength(4);
    expect(replanned.supersededEvidence[0]?.events).toHaveLength(5);
  });

  it('only accepts commands allowed by the current stage', () => {
    const created = createSingleCoursewareRun(WORKBUDDY_COURSEWARE_DEFINITION, '设计动量守恒模型课件', 'snapshot-1');
    expect(executeCoursewarePlan(created, WORKBUDDY_COURSEWARE_OUTPUT)).toBe(created);
    const planned = confirmCoursewareBrief(created);
    expect(reviseCoursewareBrief(planned).stage).toBe('needs_information');
    expect(confirmCoursewareBrief(planned)).toBe(planned);
  });
});
