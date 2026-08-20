import { describe, expect, it } from 'vitest';
import { buildHistoricalTrend, filterAndSortStudents, getInsightCourseScenario, getInsightScenario, getRecentLessons, getStudentRiskRank, getStudentStatus, resolveInsightTarget, sortStudents } from './insights';
import { INSIGHT_LESSONS, INSIGHT_SCENARIOS, INSIGHT_STUDENTS } from '@mocks/scenarios/insights';

describe('teaching insights', () => {
  it('keeps every lesson and student inside its class scenario', () => {
    expect(INSIGHT_SCENARIOS).toHaveLength(3);

    for (const scenario of INSIGHT_SCENARIOS) {
      expect(scenario.students).toHaveLength(scenario.class.studentCount);
      expect(scenario.lessons.every(({ classId }) => classId === scenario.class.id)).toBe(true);
      expect(scenario.students.every(({ classId }) => classId === scenario.class.id)).toBe(true);
      expect(scenario.courses.length).toBeGreaterThan(0);
      expect(scenario.courses.every(({ course }) => course.classId === scenario.class.id)).toBe(true);
      const courseIds = new Set(scenario.courses.map(({ course }) => course.id));
      expect(scenario.lessons.every(({ courseId }) => courseIds.has(courseId))).toBe(true);
      expect(scenario.courses.every(({ course, lessons, students }) => (
        lessons.every(({ classId, courseId }) => classId === scenario.class.id && courseId === course.id)
        && students.every(({ classId, courseId }) => classId === scenario.class.id && courseId === course.id)
      ))).toBe(true);
    }
  });

  it('resolves only courses owned by the current class', () => {
    const english = INSIGHT_SCENARIOS[0]!;
    expect(getInsightCourseScenario(english, 'english-reading')?.course.name).toBe('英语精读');
    expect(getInsightCourseScenario(english, 'physics-momentum')).toBeNull();
    expect(getInsightCourseScenario(english, null)).toBeNull();
  });

  it('resolves class scenarios and rejects cross-class deep links', () => {
    expect(getInsightScenario('physics-3', INSIGHT_SCENARIOS)?.class.name).toBe('高二物理 3 班');
    expect(getInsightScenario('missing', INSIGHT_SCENARIOS)).toBeNull();
    expect(resolveInsightTarget(new URLSearchParams('class=english-2&student=student-002'), INSIGHT_SCENARIOS)).toEqual({ status: 'ready', classId: 'english-2', studentId: 'student-002' });
    expect(resolveInsightTarget(new URLSearchParams('class=physics-3&student=student-002'), INSIGHT_SCENARIOS)).toEqual({ status: 'invalid-student', classId: 'physics-3', studentId: 'student-002' });
  });

  it('filters students by class and status before applying a deterministic sort', () => {
    const result = filterAndSortStudents(INSIGHT_SCENARIOS.flatMap(({ students }) => students), { classId: 'physics-3', status: 'attention', sortKey: 'lateCount', direction: 'desc' });
    expect(result).not.toHaveLength(0);
    expect(result.every(({ classId, needsAttention }) => classId === 'physics-3' && needsAttention)).toBe(true);
    expect(result[0]?.classId).toBe('physics-3');
  });

  it('exposes only source-aligned class and latest-lesson metrics', () => {
    const metrics = INSIGHT_SCENARIOS[0]!.metrics;

    expect(metrics.filter(({ group }) => group === 'attendance')).toHaveLength(1);
    expect(metrics.filter(({ group }) => group === 'interaction')).toHaveLength(2);
    expect(metrics.filter(({ group }) => group === 'homework')).toHaveLength(2);
    expect(metrics.every(({ definition, source, unit }) => Boolean(definition && source && unit))).toBe(true);
    expect(metrics.every(({ source }) => source === 'fact')).toBe(true);
    expect(metrics.map(({ id }) => id)).toEqual([
      'attendance-rate', 'active-participation', 'passive-response', 'submission-rate', 'homework-accuracy',
    ]);
  });

  it('returns at most three recent lessons for the requested class', () => {
    const lessons = getRecentLessons(INSIGHT_LESSONS, 'english-2');
    expect(lessons).toHaveLength(3);
    expect(lessons.every(({ classId }) => classId === 'english-2')).toBe(true);
    expect(lessons.map(({ id }) => id)).toEqual(['lesson-001', 'lesson-002', 'lesson-003']);
  });

  it('filters recent lessons and students by a concrete course', () => {
    const english = INSIGHT_SCENARIOS[0]!;
    const readingLessons = getRecentLessons(english.lessons, english.class.id, 'english-reading');
    expect(readingLessons.map(({ id }) => id)).toEqual(['lesson-001', 'lesson-003', 'lesson-004']);
    expect(readingLessons.every(({ courseId }) => courseId === 'english-reading')).toBe(true);

    const reading = getInsightCourseScenario(english, 'english-reading')!;
    const students = filterAndSortStudents(reading.students, { classId: english.class.id, courseId: reading.course.id });
    expect(students).toHaveLength(english.class.studentCount);
    expect(students.every(({ courseId }) => courseId === reading.course.id)).toBe(true);
  });

  it('builds historical trend series from lesson facts without prediction points', () => {
    const lessons = INSIGHT_SCENARIOS[0]!.lessons;
    const series = buildHistoricalTrend(lessons, ['attendanceRate', 'homeworkAccuracy']);

    expect(series.map(({ metricId }) => metricId)).toEqual(['attendanceRate', 'homeworkAccuracy']);
    expect(series[0]?.points.map(({ date }) => date)).toEqual([
      '2026-07-24', '2026-07-29', '2026-08-03', '2026-08-06',
    ]);
    expect(series[0]?.points.every(({ source }) => source === 'fact')).toBe(true);
    expect(series.flatMap(({ points }) => points)).not.toContainEqual(expect.objectContaining({ source: 'prediction' }));
  });

  it('prioritizes attention over reward and otherwise returns stable', () => {
    expect(getStudentStatus({ ...INSIGHT_STUDENTS[0]!, needsAttention: true, hasReward: true })).toBe('attention');
    expect(getStudentStatus(INSIGHT_STUDENTS[0]!)).toBe('reward');
    expect(getStudentStatus(INSIGHT_STUDENTS[5]!)).toBe('stable');
  });

  it('uses an explicit risk rank for the default student order', () => {
    expect(getStudentRiskRank({ ...INSIGHT_STUDENTS[0]!, needsAttention: true, hasReward: true })).toBe(3);
    expect(getStudentRiskRank(INSIGHT_STUDENTS[0]!)).toBe(2);
    expect(getStudentRiskRank(INSIGHT_STUDENTS[5]!)).toBe(1);
    expect(sortStudents(INSIGHT_STUDENTS, 'status', 'desc')[0]?.needsAttention).toBe(true);
  });

  it('sorts a copy and keeps equal values stable by name', () => {
    const original = [...INSIGHT_STUDENTS];
    const result = sortStudents(INSIGHT_STUDENTS, 'accuracy', 'desc');
    expect(result[0]?.name).toBe('赵英');
    expect(INSIGHT_STUDENTS).toEqual(original);
  });

  it('supports every desktop table sort key in both directions', () => {
    const keys = [
      'name', 'status', 'attendance', 'lateCount', 'absentDays', 'interactionCount',
      'questionCount', 'accuracy', 'homeworkCompleted', 'onTimeRate', 'makeupCount', 'homeworkAccuracy',
    ] as const;

    for (const key of keys) {
      expect(sortStudents(INSIGHT_STUDENTS, key, 'asc')).toHaveLength(INSIGHT_STUDENTS.length);
      expect(sortStudents(INSIGHT_STUDENTS, key, 'desc')).toHaveLength(INSIGHT_STUDENTS.length);
    }

    expect(sortStudents(INSIGHT_STUDENTS, 'attendance', 'asc')[0]?.name).toBe('张三');
    expect(sortStudents(INSIGHT_STUDENTS, 'interactionCount', 'desc')[0]?.name).toBe('赵英');

    const highKpi = {
      ...INSIGHT_STUDENTS[0]!, id: 'high-kpi', name: '高值', homework: 1,
      lateCount: 5, absentDays: 4, questionCount: 9, onTimeRate: 100, makeupCount: 3, homeworkAccuracy: 99,
    };
    const lowKpi = {
      ...INSIGHT_STUDENTS[1]!, id: 'low-kpi', name: '低值', homework: 99,
      lateCount: 0, absentDays: 0, questionCount: 0, onTimeRate: 20, makeupCount: 0, homeworkAccuracy: 50,
    };
    const pair = [lowKpi, highKpi];

    expect(sortStudents(pair, 'lateCount', 'desc')[0]?.id).toBe('high-kpi');
    expect(sortStudents(pair, 'absentDays', 'desc')[0]?.id).toBe('high-kpi');
    expect(sortStudents(pair, 'questionCount', 'desc')[0]?.id).toBe('high-kpi');
    expect(sortStudents(pair, 'onTimeRate', 'desc')[0]?.id).toBe('high-kpi');
    expect(sortStudents(pair, 'makeupCount', 'desc')[0]?.id).toBe('high-kpi');
    expect(sortStudents(pair, 'homeworkAccuracy', 'desc')[0]?.id).toBe('high-kpi');
  });
});
