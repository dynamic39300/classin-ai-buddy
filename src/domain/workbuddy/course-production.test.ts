import { describe, expect, it } from 'vitest';
import {
  confirmCoursewareBrief,
  createSingleCoursewareRun,
  executeCoursewarePlan,
  reviseCoursewareBrief,
  updateCoursewareBrief,
} from './course-production';

describe('single-courseware Course Production Module', () => {
  it('keeps clarification, plan confirmation and deterministic execution explicit', () => {
    const created = createSingleCoursewareRun('设计动量守恒模型课件', 'snapshot-1');
    expect(created.stage).toBe('needs_information');

    const updated = updateCoursewareBrief(created, { expectedPages: 16 });
    const planned = confirmCoursewareBrief(updated);
    expect(planned.stage).toBe('awaiting_plan_confirmation');
    expect(planned.brief.expectedPages).toBe(16);

    const completed = executeCoursewarePlan(planned);
    expect(completed.stage).toBe('artifact_ready');
    expect(completed.events.map(({ title }) => title)).toEqual([
      'ContextSnapshot 已载入',
      '任务计划已确认',
      '教学结构已生成',
      '课件草稿已组装',
      '质量检查通过',
    ]);
    expect(completed.artifact).toMatchObject({ id: 'artifact-courseware-momentum-v1', version: 'v1', pageCount: 16, validationState: 'passed' });
  });

  it('only accepts commands allowed by the current discriminated stage', () => {
    const created = createSingleCoursewareRun('设计动量守恒模型课件', 'snapshot-1');
    expect(executeCoursewarePlan(created)).toBe(created);
    const planned = confirmCoursewareBrief(created);
    expect(reviseCoursewareBrief(planned).stage).toBe('needs_information');
    expect(confirmCoursewareBrief(planned)).toBe(planned);
  });
});
