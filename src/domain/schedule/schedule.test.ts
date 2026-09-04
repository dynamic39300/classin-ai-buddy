import { describe, expect, it } from 'vitest';
import type { ScheduleEvent } from './schedule';
import {
  getCourseCountForDate,
  getCourseGroupsForDate,
  getEventsForDate,
  getScheduleEventPlacement,
  getScheduleInitialScrollMinute,
  getScheduleTimelineMinute,
  getVisibleScheduleEvents,
  resolveScheduleAction,
  resolveScheduleActions,
  resolveScheduleDetailDestination,
  resolveScheduleHomeworkCreateDestination,
} from './schedule';

const baseEvent: ScheduleEvent = {
  id: 'event-1',
  organizationId: 'org-classin-demo',
  kind: 'lesson',
  classId: 'physics-3',
  lessonId: 'lesson-1',
  audience: 'both',
  date: '2026-08-08',
  startTime: '14:30',
  endTime: '15:30',
  title: '动量守恒模型',
  course: '高二物理',
  context: '3班',
  phase: 'upcoming',
};

describe('schedule domain', () => {
  it('isolates role-specific events', () => {
    const events: ScheduleEvent[] = [
      baseEvent,
      { ...baseEvent, id: 'teacher-only', audience: 'teacher' },
      { ...baseEvent, id: 'student-only', audience: 'student-family' },
    ];

    expect(getVisibleScheduleEvents('teacher', events).map(({ id }) => id)).toEqual(['event-1', 'teacher-only']);
    expect(getVisibleScheduleEvents('student-family', events).map(({ id }) => id)).toEqual(['event-1', 'student-only']);
  });

  it('filters and sorts a selected date by start time', () => {
    const events: ScheduleEvent[] = [
      { ...baseEvent, id: 'late', startTime: '19:00' },
      { ...baseEvent, id: 'other-date', date: '2026-08-09' },
      { ...baseEvent, id: 'early', startTime: '09:00' },
    ];

    expect(getEventsForDate('2026-08-08', events).map(({ id }) => id)).toEqual(['early', 'late']);
  });

  it('groups lessons and related learning activities under one course context', () => {
    const events: ScheduleEvent[] = [
      {
        ...baseEvent,
        id: 'lesson-momentum',
        courseId: 'course-momentum',
        unitId: 'unit-momentum',
        unitName: '动量守恒',
      },
      {
        id: 'assignment-momentum', organizationId: 'org-classin-demo', kind: 'assignment', classId: 'physics-3',
        courseId: 'course-momentum', unitId: 'unit-momentum', unitName: '动量守恒', relatedLessonId: 'lesson-momentum',
        homeworkId: 'homework-momentum', activityType: 'homework', audience: 'both', availableDate: '2026-08-03',
        date: '2026-08-10', startTime: '18:00', title: '动量守恒作业', course: '高二物理', context: '3班',
        studentState: 'in-progress', teacherState: 'collecting',
      },
      {
        id: 'recording-momentum', organizationId: 'org-classin-demo', kind: 'recording', classId: 'physics-3',
        courseId: 'course-momentum', unitId: 'unit-momentum', unitName: '动量守恒', relatedLessonId: 'lesson-momentum',
        recordingId: 'recording-momentum', audience: 'both', date: '2026-08-11', startTime: '09:00',
        title: '课堂录播', course: '高二物理', context: '3班', phase: 'completed', studentState: 'not-started', teacherState: 'published',
      },
    ];

    expect(getCourseGroupsForDate('2026-08-08', events)).toEqual([
      expect.objectContaining({
        id: 'physics-3:course-momentum:unit-momentum',
        className: '3班',
        courseName: '高二物理',
        unitName: '动量守恒',
        events: [
          expect.objectContaining({ id: 'lesson-momentum' }),
          expect.objectContaining({ id: 'assignment-momentum' }),
          expect.objectContaining({ id: 'recording-momentum' }),
        ],
      }),
    ]);
  });

  it('counts only lessons and open courses in the month overview', () => {
    const events: ScheduleEvent[] = [
      baseEvent,
      {
        id: 'assignment-1', organizationId: 'org-classin-demo', kind: 'assignment', classId: 'physics-3', homeworkId: 'homework-1',
        activityType: 'homework', audience: 'both', availableDate: '2026-08-03', date: '2026-08-08',
        startTime: '18:00', title: '动量守恒作业', course: '高二物理', context: '3班',
        studentState: 'not-started', teacherState: 'collecting',
      },
      {
        id: 'recording-1', organizationId: 'org-classin-demo', kind: 'recording', classId: 'physics-3', recordingId: 'recording-1',
        audience: 'both', date: '2026-08-08', startTime: '18:30', title: '课堂录播', course: '高二物理', context: '3班',
        phase: 'completed', studentState: 'not-started', teacherState: 'published',
      },
      {
        id: 'open-1', organizationId: 'org-classin-demo', kind: 'open-course', openCourseId: 'open-1',
        audience: 'both', date: '2026-08-08', startTime: '19:00', endTime: '20:00', title: '公开课',
        course: '家校沟通', context: '公开课', phase: 'upcoming',
      },
    ];

    expect(getCourseCountForDate('2026-08-08', events)).toBe(2);
  });

  it('maps event time into a bounded continuous 24-hour timeline', () => {
    expect(getScheduleTimelineMinute('00:00')).toBe(0);
    expect(getScheduleTimelineMinute('14:30')).toBe(870);
    expect(getScheduleTimelineMinute('24:00')).toBe(1440);
    expect(getScheduleTimelineMinute('25:30')).toBe(1440);
    expect(getScheduleTimelineMinute('not-a-time')).toBe(0);
  });

  it('calculates minute-level event placement and compact activity height', () => {
    expect(getScheduleEventPlacement(baseEvent)).toEqual({ startMinute: 870, durationMinutes: 60 });
    const assignment = {
      id: 'assignment-placement', organizationId: 'org-classin-demo', kind: 'assignment' as const,
      classId: 'physics-3', homeworkId: 'homework-placement', activityType: 'homework' as const,
      audience: 'both' as const, availableDate: '2026-08-03', date: '2026-08-08', startTime: '23:45',
      title: '截止作业', course: '高二物理', context: '3班', studentState: 'not-started' as const, teacherState: 'collecting' as const,
    };
    expect(getScheduleEventPlacement(assignment)).toEqual({ startMinute: 1425, durationMinutes: 15 });
  });

  it('chooses an intelligent initial scroll minute', () => {
    expect(getScheduleInitialScrollMinute([baseEvent])).toBe(810);
    expect(getScheduleInitialScrollMinute([{ ...baseEvent, kind: 'assignment', id: 'activity-only', startTime: '09:00', homeworkId: 'homework-only', activityType: 'homework', availableDate: '2026-08-01', studentState: 'not-started', teacherState: 'collecting' }])).toBe(480);
  });

  it('resolves role and state specific actions', () => {
    expect(resolveScheduleAction('teacher', baseEvent).label).toBe('去备课');
    expect(resolveScheduleAction('student-family', baseEvent).label).toBe('课前准备');
    expect(resolveScheduleAction('student-family', { ...baseEvent, phase: 'completed' }).label).toBe('看回放');
    expect(resolveScheduleAction('teacher', { ...baseEvent, phase: 'live' }).label).toBe('去上课');

    const assignment: ScheduleEvent = {
      id: 'assignment-1', organizationId: 'org-classin-demo', kind: 'assignment', classId: 'physics-3', homeworkId: 'homework-1',
      activityType: 'homework', audience: 'both', availableDate: '2026-08-03', date: '2026-08-08',
      startTime: '18:00', title: '动量守恒作业', course: '高二物理', context: '3班',
      studentState: 'needs-correction', teacherState: 'grading',
    };
    expect(resolveScheduleAction('student-family', assignment).label).toBe('去订正');
    expect(resolveScheduleAction('teacher', assignment).label).toBe('继续批改');
  });

  it('uses the same 30-minute classroom entry window for both roles', () => {
    const beforeWindow = new Date('2026-08-08T13:59:59+08:00');
    const windowStart = new Date('2026-08-08T14:00:00+08:00');
    const teacherActions = resolveScheduleActions('teacher', baseEvent, windowStart);

    expect(resolveScheduleAction('teacher', baseEvent, beforeWindow).label).toBe('去备课');
    expect(teacherActions.primary.label).toBe('去上课');
    expect(teacherActions.secondary?.label).toBe('去备课');
    expect(resolveScheduleAction('student-family', baseEvent, windowStart).label).toBe('去上课');
  });

  it('resolves full details to their owning workspace', () => {
    expect(resolveScheduleDetailDestination('teacher', baseEvent)).toBe('/teacher/classes/physics-3');
    expect(resolveScheduleDetailDestination('student-family', baseEvent)).toBe('/student/classes/physics-3');

    const assignment: ScheduleEvent = {
      id: 'assignment-1', organizationId: 'org-classin-demo', kind: 'assignment', classId: 'physics-3', homeworkId: 'homework-1',
      activityType: 'homework', audience: 'both', availableDate: '2026-08-03', date: '2026-08-08',
      startTime: '18:00', title: '动量守恒作业', course: '高二物理', context: '3班',
      studentState: 'in-progress', teacherState: 'collecting',
    };
    expect(resolveScheduleDetailDestination('teacher', assignment)).toBe('/teacher/homework/homework-1?source=teacher_schedule&event=assignment-1&date=2026-08-08');
    expect(resolveScheduleDetailDestination('student-family', assignment)).toBe('/student/homework/homework-1?source=student_schedule&event=assignment-1&date=2026-08-08');

    const openCourse: ScheduleEvent = {
      id: 'open-1', organizationId: 'org-classin-demo', kind: 'open-course', openCourseId: 'open-reading',
      audience: 'both', date: '2026-08-08', startTime: '19:00', endTime: '20:00', title: '公开课',
      course: '家校沟通', context: '公开课', phase: 'upcoming',
    };
    expect(resolveScheduleDetailDestination('teacher', openCourse)).toBe('/teacher/open-courses?dialog=detail&course=open-reading');
    expect(resolveScheduleDetailDestination('teacher', baseEvent, { date: '2026-08-08', view: 'day' }))
      .toBe('/teacher/classes/physics-3?source=teacher_schedule&date=2026-08-08&view=day&event=event-1');
  });

  it('prefills homework creation from a lesson context', () => {
    expect(resolveScheduleHomeworkCreateDestination({
      ...baseEvent,
      courseId: 'course-momentum',
      unitId: 'unit-momentum-1',
    })).toBe('/teacher/homework/new?class=physics-3&date=2026-08-08&event=event-1&course=course-momentum&source=teacher_schedule&unit=unit-momentum-1');
  });

  it('covers every event family without storing role-specific CTA copy in events', () => {
    const completedLesson = { ...baseEvent, phase: 'completed' } as const;
    expect(resolveScheduleAction('teacher', completedLesson).label).toBe('课堂报告');

    const openCourse: ScheduleEvent = {
      id: 'open-1', organizationId: 'org-classin-demo', kind: 'open-course', openCourseId: 'open-1',
      audience: 'both', date: '2026-08-08', startTime: '19:00', endTime: '20:00', title: '公开课',
      course: '家校沟通', context: '公开课', phase: 'upcoming',
    };
    expect(resolveScheduleAction('teacher', openCourse).label).toBe('课程管理');
    expect(resolveScheduleAction('student-family', openCourse).label).toBe('查看课程');
    expect(resolveScheduleAction('teacher', { ...openCourse, phase: 'completed' }).label).toBe('课程报告');
    expect(resolveScheduleAction('student-family', { ...openCourse, phase: 'completed' }).label).toBe('看回放');
  });
});
