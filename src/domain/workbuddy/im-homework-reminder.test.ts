import { describe, expect, it } from 'vitest';
import { createHomeworkScenario, HOMEWORK_NOW } from '@mocks/scenarios/homework';
import {
  approveHomeworkReminder,
  hasHomeworkReminderScopeChanges,
  prepareHomeworkReminder,
  restoreHomeworkReminderScope,
  reviseHomeworkReminder,
} from './im-homework-reminder';

function prepare() {
  const scenario = createHomeworkScenario();
  return prepareHomeworkReminder({
    facts: { ...scenario, classId: 'physics-3', classLabel: '高二物理 3 班' },
    threadId: 'class-physics-3',
    teacherId: 'teacher-001',
    teacherName: '王老师',
    now: HOMEWORK_NOW,
  });
}

describe('IM homework reminder domain', () => {
  it('only groups unsubmitted students for active published homework', () => {
    const result = prepare();
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;

    expect(result.draft.groups.map(({ title, students }) => [title, students.map(({ name }) => name)])).toEqual([
      ['动量守恒作业 A 组', ['李明', '周悦']],
      ['机械波错题订正', ['王小明', '张然', '赵英', '周悦']],
    ]);
    expect(result.draft.body).toContain('@李明 @周悦');
    expect(result.draft.body).not.toContain('碰撞模型单元总结');
    expect(result.action.actor).toEqual({ teacherId: 'teacher-001', teacherName: '王老师' });
  });

  it('creates a new draft version and proposed action after teacher edits', () => {
    const result = prepare();
    if (result.status !== 'ready') throw new Error('expected ready preparation');
    const groups = result.draft.groups.map((group, index) => index === 0
      ? { ...group, students: group.students.slice(0, 1) }
      : group);
    const revised = reviseHomeworkReminder(result, { groups });

    expect(revised?.draft.version).toBe(2);
    expect(revised?.draft.body).not.toContain('@周悦 请按要求及时提交。\n\n【机械波');
    expect(revised?.action.idempotencyKey).toContain(':v2');
  });

  it('restores the originally generated checklist and rebuilds the draft action', () => {
    const result = prepare();
    if (result.status !== 'ready') throw new Error('expected ready preparation');
    const groups = result.draft.groups.map((group, index) => index === 0
      ? { ...group, students: group.students.slice(1) }
      : group);
    const revised = reviseHomeworkReminder(result, { groups, body: '教师手动改写的正文' });
    if (!revised) throw new Error('expected revised preparation');

    expect(hasHomeworkReminderScopeChanges(revised.draft)).toBe(true);
    const restored = restoreHomeworkReminderScope(revised);

    expect(restored.draft.version).toBe(3);
    expect(restored.draft.groups).toEqual(result.draft.groups);
    expect(restored.draft.body).toBe(result.draft.body);
    expect(restored.action.body).toBe(result.draft.body);
    expect(restored.action.draftRef.version).toBe(3);
    expect(hasHomeworkReminderScopeChanges(restored.draft)).toBe(false);
  });

  it('requires a current teacher approval before execution', () => {
    const result = prepare();
    if (result.status !== 'ready') throw new Error('expected ready preparation');
    const approved = approveHomeworkReminder(result.action, 'teacher-001', new Date('2026-08-09T10:02:00+08:00'));
    const expired = approveHomeworkReminder(result.action, 'teacher-001', new Date('2026-08-09T10:16:00+08:00'));

    expect(approved?.action.status).toBe('approved');
    expect(approved?.approval.draftVersion).toBe(1);
    expect(expired).toBeNull();
  });

  it('returns an empty state when every active recipient has submitted', () => {
    const scenario = createHomeworkScenario();
    const activeIds = new Set(['homework-momentum-a', 'homework-correction']);
    const submissions = [...scenario.submissions];
    for (const homework of scenario.homeworks) {
      if (!activeIds.has(homework.id) || homework.publication.kind !== 'published') continue;
      for (const studentId of homework.recipientStudentIds) {
        if (submissions.some((item) => item.homeworkId === homework.id && item.studentId === studentId)) continue;
        submissions.push({
          id: `submitted-${homework.id}-${studentId}`,
          homeworkId: homework.id,
          studentId,
          answerText: '已提交',
          status: 'submitted',
          submittedAt: HOMEWORK_NOW.toISOString(),
          draftSavedAt: null,
          isLate: false,
          revision: 1,
          feedback: null,
          updatedAt: HOMEWORK_NOW.toISOString(),
        });
      }
    }
    const result = prepareHomeworkReminder({
      facts: { ...scenario, submissions, classId: 'physics-3', classLabel: '高二物理 3 班' },
      threadId: 'class-physics-3',
      teacherId: 'teacher-001',
      teacherName: '王老师',
      now: HOMEWORK_NOW,
    });
    expect(result.status).toBe('empty');
    if (result.status === 'empty') expect(result.reason).toBe('all-submitted');
  });
});
