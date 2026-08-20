import { describe, expect, it } from 'vitest';
import { WORKBUDDY_COURSEWARE_DEFINITION, WORKBUDDY_COURSEWARE_OUTPUT } from '@mocks/scenarios/workbuddy-course-production';
import {
  confirmCoursewareBrief, createSingleCoursewareRun, executeCoursewarePlan, replanCoursewareRun,
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
  });

  it('preserves the previous plan, events, Snapshot and Artifact when replanning', () => {
    const completed = executeCoursewarePlan(confirmCoursewareBrief(createSingleCoursewareRun(WORKBUDDY_COURSEWARE_DEFINITION, '设计动量守恒模型课件', 'snapshot-1')), WORKBUDDY_COURSEWARE_OUTPUT);
    const replanned = replanCoursewareRun(completed, 'snapshot-2', '切换教学范围', { actionId: 'action-1', receiptId: 'receipt-1' });
    expect(replanned).toMatchObject({ revision: 2, contextSnapshotId: 'snapshot-2', stage: 'needs_information', artifact: null });
    expect(replanned.supersededEvidence[0]).toMatchObject({ snapshotId: 'snapshot-1', artifact: { id: 'artifact-courseware-momentum-v1' }, actionId: 'action-1', receiptId: 'receipt-1', reason: '切换教学范围' });
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
