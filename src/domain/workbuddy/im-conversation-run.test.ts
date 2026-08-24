import { describe, expect, it } from 'vitest';
import { createHomeworkScenario, HOMEWORK_NOW } from '@mocks/scenarios/homework';
import { prepareHomeworkReminder } from './im-homework-reminder';
import {
  appendWorkBuddyImSupplement,
  completeWorkBuddyImCapability,
  completeWorkBuddyImConversationRun,
  completeWorkBuddyImUnderstanding,
  createWorkBuddyImConversationRun,
  failWorkBuddyImCapability,
  startWorkBuddyImCapability,
} from './im-conversation-run';

const TARGET = { classId: 'physics-3', classLabel: '高二物理 3 班', threadId: 'class-physics-3' } as const;

function createRun() {
  return createWorkBuddyImConversationRun({
    target: TARGET,
    taskId: 'homework-reminder',
    goal: '找出未提交作业的学员并生成提醒',
    startedAt: 0,
    occurredAt: HOMEWORK_NOW.toISOString(),
    organizeEndsAt: 1_200,
  });
}

describe('WorkBuddy IM conversation run projection', () => {
  it('keeps the teacher goal, plan, capability states and artifact in one ordered run', () => {
    let run = createRun();
    expect(run.events.map(({ kind, state }) => [kind, state])).toEqual([
      ['teacher_message', 'completed'],
      ['goal_understood', 'running'],
    ]);

    run = completeWorkBuddyImUnderstanding(run, HOMEWORK_NOW.toISOString());
    expect(run.events.map(({ kind }) => kind)).toEqual([
      'teacher_message', 'goal_understood', 'plan',
      'capability_call', 'capability_call', 'capability_call', 'capability_call',
    ]);
    expect(run.events.filter(({ kind }) => kind === 'capability_call').every(({ state }) => state === 'queued')).toBe(true);

    for (let index = 0; index < run.plan.length; index += 1) {
      run = startWorkBuddyImCapability(run, index, 2_600 + index * 1_400, HOMEWORK_NOW.toISOString());
      expect(run.events.find(({ stepRef }) => stepRef === run.plan[index]?.id)?.state).toBe('running');
      run = completeWorkBuddyImCapability(run, index, `步骤 ${index + 1} 已完成`, '1.4 秒', HOMEWORK_NOW.toISOString());
    }

    const scenario = createHomeworkScenario();
    const preparation = prepareHomeworkReminder({
      facts: { ...scenario, classId: TARGET.classId, classLabel: TARGET.classLabel },
      threadId: TARGET.threadId,
      teacherId: 'teacher-001',
      teacherName: '王老师',
      now: HOMEWORK_NOW,
    });
    if (preparation.status !== 'ready') throw new Error('expected reminder artifact');
    run = completeWorkBuddyImConversationRun(run, preparation.draft, HOMEWORK_NOW.toISOString());

    expect(run.status).toBe('completed_pending_review');
    expect(run.progress).toEqual({ status: 'completed', completedCount: 4, totalCount: 4 });
    expect(run.events.at(-1)).toMatchObject({ kind: 'artifact', state: 'completed', title: '提醒草稿已生成' });
    expect(run.events.filter(({ kind }) => kind === 'capability_call').every(({ state }) => state === 'completed')).toBe(true);
  });

  it('freezes completed evidence and leaves later capabilities queued after a tool failure', () => {
    let run = completeWorkBuddyImUnderstanding(createRun(), HOMEWORK_NOW.toISOString());
    run = startWorkBuddyImCapability(run, 0, 2_600, HOMEWORK_NOW.toISOString());
    run = completeWorkBuddyImCapability(run, 0, '班级已锁定', '1.4 秒', HOMEWORK_NOW.toISOString());
    run = startWorkBuddyImCapability(run, 1, 4_000, HOMEWORK_NOW.toISOString());
    run = failWorkBuddyImCapability(run, 1, '作业查询暂时不可用', HOMEWORK_NOW.toISOString());

    expect(run.status).toBe('failed');
    expect(run.events.find(({ stepRef }) => stepRef === 'resolve-class-context')?.state).toBe('completed');
    expect(run.events.find(({ stepRef }) => stepRef === 'query-active-homework')?.state).toBe('failed');
    expect(run.events.find(({ stepRef }) => stepRef === 'check-submission-status')?.state).toBe('queued');
    expect(run.events.some(({ kind }) => kind === 'artifact')).toBe(false);
    expect(run.events.at(-1)).toMatchObject({ kind: 'error', state: 'failed' });
  });

  it('records a teacher supplement inside the active private run', () => {
    const run = appendWorkBuddyImSupplement(createRun(), '提醒语气简洁一些', HOMEWORK_NOW.toISOString());
    expect(run.events.at(-1)).toMatchObject({
      actor: 'teacher', kind: 'teacher_message', state: 'completed', title: '你补充了要求', summary: '提醒语气简洁一些',
    });
  });
});
