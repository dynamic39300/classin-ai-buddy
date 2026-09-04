import { describe, expect, it, vi } from 'vitest';
import { approveHomeworkReminder, prepareHomeworkReminder } from '@domain/workbuddy/im-homework-reminder';
import { createHomeworkScenario, HOMEWORK_NOW } from '@mocks/scenarios/homework';
import { MockWorkBuddyImHomeworkReminderAdapter } from './workbuddy-im-homework-reminder';

describe('MockWorkBuddyImHomeworkReminderAdapter', () => {
  it('writes once for the same approved idempotency key', async () => {
    const scenario = createHomeworkScenario();
    const facts = { ...scenario, classId: 'physics-3', classLabel: '高二物理 3 班' };
    const appendTeacherMessage = vi.fn();
    const adapter = new MockWorkBuddyImHomeworkReminderAdapter({ readSnapshot: () => facts, appendTeacherMessage });
    const preparation = prepareHomeworkReminder({ facts, threadId: 'class-physics-3', teacherId: 'teacher-001', teacherName: '王老师', now: HOMEWORK_NOW });
    if (preparation.status !== 'ready') throw new Error('expected ready preparation');
    const approved = approveHomeworkReminder(preparation.action, 'teacher-001', new Date('2026-08-09T10:02:00+08:00'));
    if (!approved) throw new Error('expected approval');

    const first = await adapter.execute(approved.action, approved.approval);
    const repeated = await adapter.execute(approved.action, approved.approval);

    expect(first.status).toBe('success');
    expect(repeated).toBe(first);
    expect(appendTeacherMessage).toHaveBeenCalledTimes(1);
    expect(appendTeacherMessage).toHaveBeenCalledWith(expect.objectContaining({ authorName: '王老师', threadId: 'class-physics-3' }));
  });

  it('blocks a stale context before producing a message', async () => {
    const scenario = createHomeworkScenario();
    let facts = { ...scenario, classId: 'physics-3', classLabel: '高二物理 3 班' };
    const appendTeacherMessage = vi.fn();
    const adapter = new MockWorkBuddyImHomeworkReminderAdapter({ readSnapshot: () => facts, appendTeacherMessage });
    const preparation = prepareHomeworkReminder({ facts, threadId: 'class-physics-3', teacherId: 'teacher-001', teacherName: '王老师', now: HOMEWORK_NOW });
    if (preparation.status !== 'ready') throw new Error('expected ready preparation');
    const approved = approveHomeworkReminder(preparation.action, 'teacher-001', new Date('2026-08-09T10:02:00+08:00'));
    if (!approved) throw new Error('expected approval');
    facts = { ...facts, submissions: [...facts.submissions, {
      id: 'late-change', homeworkId: 'homework-momentum-a', studentId: 'student-001', answerText: '刚刚提交', status: 'submitted',
      submittedAt: '2026-08-09T10:01:00+08:00', draftSavedAt: null, isLate: false, revision: 1, feedback: null, updatedAt: '2026-08-09T10:01:00+08:00',
    }] };

    const receipt = await adapter.execute(approved.action, approved.approval);
    expect(receipt.status).toBe('stale_context');
    expect(appendTeacherMessage).not.toHaveBeenCalled();
  });

  it('distinguishes permission denial from a recoverable retry without duplicate writes', async () => {
    const scenario = createHomeworkScenario();
    const facts = { ...scenario, classId: 'physics-3', classLabel: '高二物理 3 班' };
    const appendTeacherMessage = vi.fn();
    const adapter = new MockWorkBuddyImHomeworkReminderAdapter({ readSnapshot: () => facts, appendTeacherMessage });
    const preparation = prepareHomeworkReminder({ facts, threadId: 'class-physics-3', teacherId: 'teacher-001', teacherName: '王老师', now: HOMEWORK_NOW });
    if (preparation.status !== 'ready') throw new Error('expected ready preparation');
    const approved = approveHomeworkReminder(preparation.action, 'teacher-001', new Date('2026-08-09T10:02:00+08:00'));
    if (!approved) throw new Error('expected approval');

    adapter.setScenario('permission_denied');
    expect((await adapter.execute(approved.action, approved.approval)).status).toBe('permission_denied');
    expect(appendTeacherMessage).not.toHaveBeenCalled();

    adapter.setScenario('recoverable_failure');
    expect((await adapter.execute(approved.action, approved.approval)).status).toBe('recoverable_failure');
    expect((await adapter.execute(approved.action, approved.approval)).status).toBe('success');
    expect(appendTeacherMessage).toHaveBeenCalledTimes(1);
  });
});
