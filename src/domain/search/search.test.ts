import { describe, expect, it } from 'vitest';
import { CLASS_RECORDS, OPEN_COURSE_RECORDS } from '@mocks/scenarios/classes';
import { MESSAGE_THREADS } from '@mocks/scenarios/messages';
import { SCHEDULE_EVENTS } from '@mocks/scenarios/schedule';
import { TASK_ITEMS } from '@mocks/scenarios/tasks';
import { buildSearchDocuments, searchDocuments } from './search';

const sources = {
  classes: CLASS_RECORDS,
  openCourses: OPEN_COURSE_RECORDS,
  tasks: TASK_ITEMS,
  scheduleEvents: SCHEDULE_EVENTS,
  messageThreads: MESSAGE_THREADS,
};

describe('global search domain', () => {
  it('keeps teacher-only content out of student results', () => {
    const studentDocuments = buildSearchDocuments('student-family', sources);
    expect(studentDocuments.some(({ id }) => id === 'class:physics-1')).toBe(false);
    expect(studentDocuments.some(({ id }) => id === 'message:direct-teacher-zhang')).toBe(false);
  });

  it('searches titles and context with deterministic ranking', () => {
    const documents = buildSearchDocuments('teacher', sources);
    const results = searchDocuments(documents, '动量');
    expect(results[0]?.title).toContain('动量');
    expect(results.some(({ type }) => type === 'task')).toBe(true);
    expect(searchDocuments(documents, '高二物理', 'class').every(({ type }) => type === 'class')).toBe(true);
  });

  it('returns useful role-filtered suggestions for an empty query', () => {
    expect(searchDocuments(buildSearchDocuments('teacher', sources), '', 'all', 8)).toHaveLength(8);
  });
});
