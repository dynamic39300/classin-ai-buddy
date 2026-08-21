import { describe, expect, it } from 'vitest';
import { WORKBUDDY_COURSEWARE_DEFINITION } from '@mocks/scenarios/workbuddy-course-production';
import {
  advanceCoursewareExperience,
  createCoursewareExperience,
  projectCoursewareExperienceEvents,
  resumeCoursewareExperience,
  startCoursewareExperience,
  stopCoursewareExperience,
} from './conversation-run-experience';

describe('deterministic courseware conversation experience', () => {
  it('makes every capability observably run before it completes', () => {
    const plan = WORKBUDDY_COURSEWARE_DEFINITION.plan;
    let state = startCoursewareExperience(createCoursewareExperience(plan));

    for (let activeIndex = 0; activeIndex < plan.length; activeIndex += 1) {
      const events = projectCoursewareExperienceEvents(state, plan, []);

      expect(events).toHaveLength(plan.length);
      expect(events[activeIndex]).toMatchObject({
        id: `experience:${plan[activeIndex]!.id}`,
        capabilityId: plan[activeIndex]!.capability,
        state: 'running',
      });
      expect(events.slice(0, activeIndex).every(({ state: eventState }) => eventState === 'completed')).toBe(true);
      expect(events.slice(activeIndex + 1).every(({ state: eventState }) => eventState === 'queued')).toBe(true);

      state = advanceCoursewareExperience(state, plan.length);
    }

    expect(state).toEqual({ status: 'completed', activeIndex: null, completedCount: plan.length });
    expect(projectCoursewareExperienceEvents(state, plan, []).every(({ state }) => state === 'completed')).toBe(true);
  });

  it('projects only the governed context summary for each capability', () => {
    const plan = WORKBUDDY_COURSEWARE_DEFINITION.plan;
    const state = startCoursewareExperience(createCoursewareExperience(plan));
    const events = projectCoursewareExperienceEvents(state, plan, [{
      snapshotId: 'snapshot-1',
      snapshotVersion: 'workbuddy-m4-context-v1',
      capabilityId: 'goal-interpreter',
      purpose: '解释教学目标与边界',
      taskGoal: '生成智能课件',
      generatedAt: 'deterministic:001',
      excludedSensitiveCount: 1,
      items: [{
        id: 'class-1', section: 'teaching_scope', kind: 'class', label: '高二物理 3 班', source: 'classin',
        sourceVersion: 'v1', permission: 'read', sensitivity: 'class', selection: 'locked', included: true,
      }],
    }]);

    expect(events[0]).toMatchObject({
      purpose: '解释教学目标与边界',
      contextLabels: ['高二物理 3 班'],
      excludedSensitiveCount: 1,
    });
    expect(events[1]!.contextLabels).toEqual([]);
  });

  it('stops without completing the active step and resumes from the same boundary', () => {
    const plan = WORKBUDDY_COURSEWARE_DEFINITION.plan;
    const running = advanceCoursewareExperience(startCoursewareExperience(createCoursewareExperience(plan)), plan.length);
    const stopped = stopCoursewareExperience(running);

    expect(stopped).toEqual({ status: 'stopped', activeIndex: null, completedCount: 1 });
    expect(advanceCoursewareExperience(stopped, plan.length)).toBe(stopped);

    const resumed = resumeCoursewareExperience(stopped, plan.length);
    expect(resumed).toEqual({ status: 'running', activeIndex: 1, completedCount: 1 });
    expect(projectCoursewareExperienceEvents(resumed, plan, []).map(({ state }) => state)).toEqual([
      'completed', 'running', 'queued', 'queued',
    ]);
  });
});
