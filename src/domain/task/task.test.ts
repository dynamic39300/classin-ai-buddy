import { describe, expect, it } from 'vitest';
import {
  archiveTaskManually,
  buildTaskSections,
  getActionableTaskBadgeCount,
  getVisibleTaskItems,
  resolveTaskAction,
  resolveTaskActions,
  resolveTaskTimeBucket,
  restoreTaskManually,
  type TaskFilters,
  type TaskItem,
} from './task';

const now = new Date('2026-08-08T14:05:00+08:00');
const filters: TaskFilters = { query: '', kind: 'all', classId: 'all', course: 'all', urgency: 'all' };

function makeTask(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: 'task-1',
    organizationId: 'org-1',
    kind: 'homework',
    title: '动量守恒作业',
    course: '高二物理',
    classId: 'class-1',
    className: '高二物理 1 班',
    actorName: '王老师',
    dueAt: '2026-08-08T18:00:00+08:00',
    startsAt: null,
    endsAt: null,
    createdAt: '2026-08-01T08:00:00+08:00',
    link: { homeworkId: 'homework-1' },
    roleState: {
      teacher: { lifecycle: 'open', completion: null, archivedAt: null },
      'student-family': { lifecycle: 'open', completion: null, archivedAt: null },
    },
    teacherState: 'collecting',
    teacherProgress: { submittedCount: 18, totalCount: 20, reviewedCount: 0 },
    studentState: 'in-progress',
    ...overrides,
  };
}

describe('task visibility and sections', () => {
  it('keeps role-specific task scopes isolated', () => {
    const teacherOnly = makeTask({
      id: 'teacher-only',
      roleState: { teacher: { lifecycle: 'open', completion: null, archivedAt: null } },
    });
    expect(getVisibleTaskItems('teacher', [teacherOnly])).toHaveLength(1);
    expect(getVisibleTaskItems('student-family', [teacherOnly])).toHaveLength(0);
  });

  it('groups open tasks by overdue, today and later', () => {
    const overdue = makeTask({ id: 'overdue', dueAt: '2026-08-07T18:00:00+08:00' });
    const later = makeTask({ id: 'later', dueAt: '2026-08-12T18:00:00+08:00' });
    expect(resolveTaskTimeBucket('teacher', overdue, now)).toBe('overdue');
    expect(buildTaskSections('teacher', [later, overdue], filters, 'open', now).map(({ bucket }) => bucket))
      .toEqual(['overdue', 'later']);
  });

  it('filters by query, class, course and activity kind', () => {
    const visible = buildTaskSections('teacher', [makeTask()], {
      query: '动量',
      kind: 'homework',
      classId: 'class-1',
      course: '高二物理',
      urgency: 'urgent',
    }, 'open', now);
    expect(visible.flatMap(({ items }) => items)).toHaveLength(1);

    expect(buildTaskSections('teacher', [makeTask()], {
      ...filters,
      course: '初三英语',
    }, 'open', now)).toHaveLength(0);
  });
});

describe('role actions', () => {
  it('keeps teacher grading copy compact while progress remains in the row status', () => {
    expect(resolveTaskAction('teacher', makeTask(), now).label).toBe('去批改');
  });

  it('uses student submission state for the learning action', () => {
    expect(resolveTaskAction('student-family', makeTask(), now).label).toBe('继续作业');
    expect(resolveTaskAction('student-family', makeTask({ studentState: 'needs-correction' }), now).label)
      .toBe('去订正');
  });

  it('opens a classroom inside its thirty-minute entry window', () => {
    const classroom = makeTask({
      kind: 'classroom',
      dueAt: null,
      startsAt: '2026-08-08T14:30:00+08:00',
      endsAt: '2026-08-08T15:30:00+08:00',
    });
    expect(resolveTaskAction('teacher', classroom, now).label).toBe('去上课');
  });

  it('keeps one primary action and adds contextual teacher reminder', () => {
    const actions = resolveTaskActions('teacher', makeTask(), now);
    expect(actions.primary.label).toBe('去批改');
    expect(actions.primary.kind).toBe('operation-dialog');
    expect(actions.secondary?.label).toBe('去催交');
    expect(actions.secondary?.kind).toBe('confirm-dialog');
  });

  it('resolves unsupported services to placeholder dialogs instead of navigation', () => {
    const classroom = makeTask({
      kind: 'classroom',
      dueAt: null,
      startsAt: '2026-08-08T14:30:00+08:00',
      endsAt: '2026-08-08T15:30:00+08:00',
    });
    expect(resolveTaskActions('teacher', classroom, now).primary.kind).toBe('placeholder-dialog');
    expect(resolveTaskActions('student-family', makeTask(), now).primary.kind).toBe('placeholder-dialog');
    expect(resolveTaskActions('student-family', makeTask({ kind: 'recorded' }), now)).toMatchObject({
      primary: { label: '去观看', kind: 'placeholder-dialog' },
    });
  });

  it('derives badge count from actionable time buckets', () => {
    const later = makeTask({ id: 'later', dueAt: '2026-08-12T18:00:00+08:00' });
    const overdue = makeTask({ id: 'overdue', dueAt: '2026-08-07T18:00:00+08:00' });
    expect(getActionableTaskBadgeCount('teacher', [later, overdue], now)).toBe(1);
  });
});

describe('manual archive', () => {
  it('archives and restores only manually manageable reminders', () => {
    const task = makeTask({ manualArchiveAllowed: true });
    const archived = archiveTaskManually('teacher', task, '2026-08-08T14:10:00+08:00');
    expect(archived.roleState.teacher?.lifecycle).toBe('done');
    expect(restoreTaskManually('teacher', archived).roleState.teacher?.lifecycle).toBe('open');
    expect(archiveTaskManually('teacher', makeTask(), '2026-08-08T14:10:00+08:00')).toBeDefined();
  });

  it('does not manually archive classroom reminders', () => {
    const classroom = makeTask({ kind: 'classroom', manualArchiveAllowed: true });
    expect(archiveTaskManually('teacher', classroom, '2026-08-08T14:10:00+08:00')).toBe(classroom);
  });
});
