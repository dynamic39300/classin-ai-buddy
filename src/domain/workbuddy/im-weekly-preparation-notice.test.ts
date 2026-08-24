import { describe, expect, it } from 'vitest';
import { createWeeklyPreparationNoticeFacts } from '@mocks/scenarios/workbuddy-im-weekly-plan';
import { HOMEWORK_NOW } from '@mocks/scenarios/homework';
import { prepareWeeklyPreparationNotice, reviseWeeklyPreparationNotice } from './im-weekly-preparation-notice';

describe('weekly preparation notice domain', () => {
  it('turns the current weekly plan into one versioned teacher notice action', () => {
    const result = prepareWeeklyPreparationNotice({
      facts: createWeeklyPreparationNoticeFacts('physics-3', '高二物理 3 班'),
      threadId: 'class-physics-3',
      teacherId: 'teacher-001',
      teacherName: '王老师',
      now: HOMEWORK_NOW,
    });

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.draft.planItems).toHaveLength(3);
    expect(result.draft.body).toContain('动量守恒定律');
    expect(result.draft.body).toContain('机械波基础');
    expect(result.action.factSource).toBe('weekly-teaching-plan');
    expect(result.action.actor.teacherName).toBe('王老师');

    const revised = reviseWeeklyPreparationNotice(result, '请大家提前预习本周课程。');
    expect(revised.draft.version).toBe(2);
    expect(revised.action.body).toBe('请大家提前预习本周课程。');
    expect(revised.action.draftRef.version).toBe(2);
  });
});
