import { describe, expect, it } from 'vitest';
import { HOMEWORK_RECORDS, HOMEWORK_SUBMISSIONS, HOMEWORK_NOW } from '@mocks/scenarios/homework';
import {
  calculateHomeworkStatistics,
  gradeHomeworkSubmission,
  groupSubmissions,
  publishHomework,
  resolveHomeworkStatus,
  returnHomeworkSubmission,
  submitHomeworkAnswer,
  validateHomeworkForm,
  type HomeworkFormValues,
} from './homework';

const activeHomework = HOMEWORK_RECORDS.find(({ id }) => id === 'homework-momentum-a');
const lateHomework = HOMEWORK_RECORDS.find(({ id }) => id === 'homework-late');
const draftHomework = HOMEWORK_RECORDS.find(({ id }) => id === 'homework-draft');
const pendingSubmission = HOMEWORK_SUBMISSIONS.find(({ id }) => id === 'submission-momentum-002');

if (!activeHomework || !lateHomework || !draftHomework || !pendingSubmission) throw new Error('Homework test seed is incomplete');

describe('homework domain', () => {
  it('derives published status from time without storing an active snapshot', () => {
    expect(resolveHomeworkStatus(activeHomework, new Date('2026-08-07T10:00:00+08:00'))).toBe('scheduled');
    expect(resolveHomeworkStatus(activeHomework, HOMEWORK_NOW)).toBe('active');
    expect(resolveHomeworkStatus(activeHomework, new Date('2026-08-11T10:00:00+08:00'))).toBe('ended');
    expect(resolveHomeworkStatus(draftHomework, HOMEWORK_NOW)).toBe('draft');
  });

  it('validates the fixed editor contract and publishes to a complete class', () => {
    const values: HomeworkFormValues = {
      title: '  新作业  ', instructions: ' 完成练习 ', startsAt: '2026-08-10T08:00:00+08:00',
      dueAt: '2026-08-09T08:00:00+08:00', classId: 'physics-3', courseId: 'course-momentum',
      unitId: null, allowLateSubmission: true,
    };
    expect(validateHomeworkForm(values)).toEqual({ dueAt: '截止时间必须晚于开始时间' });
    const result = publishHomework({ ...values, dueAt: '2026-08-11T08:00:00+08:00' }, 'homework-new', 'teacher-001', ['student-001'], HOMEWORK_NOW);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe('新作业');
      expect(result.value.maxScore).toBe(100);
      expect(result.value.recipientStudentIds).toEqual(['student-001']);
    }
  });

  it('derives all four teacher groups and grading statistics', () => {
    const submissions = HOMEWORK_SUBMISSIONS.filter(({ homeworkId }) => homeworkId === activeHomework.id);
    expect(groupSubmissions(activeHomework, submissions)).toEqual({
      not_submitted: ['student-001', 'student-005'],
      pending: ['student-002'],
      returned: ['student-003'],
      graded: ['student-004'],
    });
    expect(calculateHomeworkStatistics(activeHomework, submissions)).toEqual({
      totalCount: 5, submittedCount: 3, submissionRate: 60, pendingCount: 1, returnedCount: 1,
      gradedCount: 1, highestScore: 95, averageScore: 95, excellentCount: null,
    });
  });

  it('supports first, late, modify, and correction submission modes', () => {
    const first = submitHomeworkAnswer(activeHomework, 'student-001', '首次答案', 'first', HOMEWORK_NOW);
    expect(first.ok && first.value.status).toBe('submitted');
    const late = submitHomeworkAnswer(lateHomework, 'student-001', '补交答案', 'late', HOMEWORK_NOW);
    expect(late.ok && late.value.isLate).toBe(true);
    if (!first.ok) throw new Error(first.error.message);
    const modified = submitHomeworkAnswer(activeHomework, 'student-001', '修改答案', 'modify', HOMEWORK_NOW, first.value);
    expect(modified.ok && modified.value.revision).toBe(2);
    const returned = returnHomeworkSubmission(first.value, '请订正单位', HOMEWORK_NOW);
    if (!returned.ok) throw new Error(returned.error.message);
    const corrected = submitHomeworkAnswer(activeHomework, 'student-001', '订正答案', 'correction', HOMEWORK_NOW, returned.value);
    expect(corrected.ok && corrected.value.status).toBe('resubmitted');
  });

  it('rejects empty answers, invalid review data, and repeated review', () => {
    expect(submitHomeworkAnswer(activeHomework, 'student-001', '  ', 'first', HOMEWORK_NOW)).toMatchObject({ ok: false });
    expect(submitHomeworkAnswer(activeHomework, 'student-outsider', '答案', 'first', HOMEWORK_NOW)).toMatchObject({ ok: false });
    expect(gradeHomeworkSubmission(pendingSubmission, 88.5, '', HOMEWORK_NOW)).toMatchObject({ ok: false });
    expect(returnHomeworkSubmission(pendingSubmission, ' ', HOMEWORK_NOW)).toMatchObject({ ok: false });
    const graded = gradeHomeworkSubmission(pendingSubmission, 88, '完成较好', HOMEWORK_NOW);
    if (!graded.ok) throw new Error(graded.error.message);
    expect(gradeHomeworkSubmission(graded.value, 90, '', HOMEWORK_NOW)).toMatchObject({ ok: false });
  });
});
