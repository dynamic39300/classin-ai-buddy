import { describe, expect, it } from 'vitest';
import { CLASS_RECORDS, OPEN_COURSE_RECORDS } from '@mocks/scenarios/classes';
import { MESSAGE_THREADS } from '@mocks/scenarios/messages';
import { SCHEDULE_EVENTS } from '@mocks/scenarios/schedule';
import { TASK_ITEMS } from '@mocks/scenarios/tasks';
import { INSIGHT_CLASSES } from '@mocks/scenarios/insights';
import {
  buildHomeModel,
  buildStudentHomeModel,
  buildTeacherHomeModel,
  countTeacherUrgentForStudent,
  getTeacherHomeEventContext,
} from './home';

const sources = {
  classes: CLASS_RECORDS,
  openCourses: OPEN_COURSE_RECORDS,
  tasks: TASK_ITEMS,
  scheduleEvents: SCHEDULE_EVENTS,
  messageThreads: MESSAGE_THREADS,
  insights: INSIGHT_CLASSES,
};
const now = new Date('2026-08-08T14:05:00+08:00');

describe('home domain selectors', () => {
  it('derives the teacher current action from schedule facts', () => {
    const model = buildHomeModel('teacher', sources, now);
    expect(model.currentOrNextEvent?.id).toBe('class-momentum');
    expect(model.todayEvents.length).toBeGreaterThan(0);
    expect(model.classes.every(({ visibleTo }) => visibleTo.includes('teacher'))).toBe(true);
    expect(Object.values(model.taskCounts).reduce((total, count) => total + count, 0)).toBe(model.openTasks.length);
  });

  it('derives student tasks without exposing teacher-only objects', () => {
    const model = buildHomeModel('student-family', sources, now);
    expect(model.openTasks.length).toBeGreaterThan(0);
    expect(model.openTasks.every((item) => item.roleState['student-family'] !== undefined)).toBe(true);
    expect(model.completedTasks.map(({ id }) => id)).toContain('task-collision-report-done');
  });

  it('returns only a teacher urgency count for the student reminder', () => {
    const count = countTeacherUrgentForStudent(TASK_ITEMS, now);
    expect(count).toBeGreaterThan(0);
    expect(typeof count).toBe('number');
  });

  it('builds the teacher A2 workbench model without duplicating classroom tasks', () => {
    const model = buildTeacherHomeModel(sources, now, '王老师');

    expect(model.currentOrNextEvent?.id).toBe('class-momentum');
    expect(model.futureEvents.map(({ id }) => id)).toContain('class-collision-next');
    expect(model.futureEvents.every(({ kind }) => kind === 'lesson' || kind === 'open-course')).toBe(true);
    expect(model.futureDays.map(({ date }) => date)).toEqual(['2026-08-09', '2026-08-10']);
    expect(model.futureDays).toContainEqual(expect.objectContaining({ date: '2026-08-10', events: [], overflowCount: 0 }));
    expect(model.topTask?.id).toBe('task-wave-correction');
    expect(model.openTasks.some(({ kind }) => kind === 'classroom')).toBe(false);
    expect(model.insight.status).toBe('ready');
    if (model.insight.status !== 'ready') throw new Error('Expected teacher insight summaries to be ready');
    expect(model.insight.items).toEqual([
      expect.objectContaining({ classId: 'physics-3', className: '高二物理 3 班', headline: '课堂参与高于课后作业表现，下一步优先核对未提交与错题学生。' }),
      expect.objectContaining({ classId: 'english-2', className: '初三英语 2 班', headline: '课堂响应较好，优先处理未交与错题。' }),
      expect.objectContaining({ classId: 'physics-1', className: '高二物理 1 班', headline: '到课与主动参与是当前主要关注点，先定位缺勤和低参与学生。' }),
    ]);
    expect(model.messageSummaries.map(({ id }) => id)).toEqual(['class-physics-3', 'direct-wang-li']);
    expect(model.unreadMessageCount).toBe(3);
    expect(Array.from(model.greeting).length).toBeLessThanOrEqual(16);
  });

  it('derives the minimum useful class and unit context for home timeline items', () => {
    const lesson = SCHEDULE_EVENTS.find(({ id }) => id === 'class-momentum');
    const openCourse = SCHEDULE_EVENTS.find(({ id }) => id === 'open-family');
    expect(lesson).toBeDefined();
    expect(openCourse).toBeDefined();
    expect(getTeacherHomeEventContext(lesson!)).toBe('高二物理 3班 · 动量守恒');
    expect(getTeacherHomeEventContext(openCourse!)).toBe('家校沟通');
  });

  it('keeps the insight section unavailable when class identity cannot be resolved', () => {
    const model = buildTeacherHomeModel({ ...sources, insights: [] }, now, '王老师');

    expect(model.insight.status).toBe('unavailable');
    expect(model.insight.items).toEqual([]);
  });

  it('keeps section availability independent when a source is loading or fails', () => {
    const model = buildTeacherHomeModel({
      ...sources,
      statuses: { schedule: 'loading', tasks: 'error', insights: 'unavailable', messages: 'error' },
    }, now, '王老师');

    expect(model.scheduleStatus).toBe('loading');
    expect(model.tasksStatus).toBe('error');
    expect(model.insight.status).toBe('unavailable');
    expect(model.messagesStatus).toBe('error');
    expect(model.currentOrNextEvent?.id).toBe('class-momentum');
  });

  it('keeps read direct or class threads visible instead of treating them as empty', () => {
    const readThreads = MESSAGE_THREADS
      .filter((thread) => thread.category === 'direct' || thread.category === 'class')
      .map((thread) => ({ ...thread, unreadByRole: { ...thread.unreadByRole, teacher: 0 } }));
    const model = buildTeacherHomeModel({ ...sources, messageThreads: readThreads }, now, '王老师');

    expect(model.messagesStatus).toBe('ready');
    expect(model.unreadMessageCount).toBe(0);
    expect(model.messageSummaries.length).toBeGreaterThan(0);
  });

  it('builds the student A2 model for today, tomorrow, and the day after tomorrow', () => {
    const model = buildStudentHomeModel({
      tasks: TASK_ITEMS,
      scheduleEvents: SCHEDULE_EVENTS,
      messageThreads: MESSAGE_THREADS,
      growth: {
        attendanceDays: 12,
        homeworkCompletion: 89,
        consecutiveDays: 7,
        totalHours: 18,
        accuracy: 76,
        rewards: 24,
        accuracyTrend: 'up',
      },
    }, now);

    expect(model.schedule.recentDays.map(({ label, date }) => [label, date])).toEqual([
      ['今天', '2026-08-08'],
      ['明天', '2026-08-09'],
      ['后天', '2026-08-10'],
    ]);
    expect(model.schedule.primary?.id).toBe('class-momentum');
    expect(model.schedule.primary?.timeLabel).toBe('14:30');
    expect(model.schedule.recentDays[0]?.events.find(({ id }) => id === 'class-reading')?.timeLabel).toBe('09:00');
    expect(model.schedule.recentDays[0]?.events.map(({ id }) => id)).toContain('assignment-momentum');
    expect(model.schedule.recentDays[1]?.events.map(({ id }) => id)).toContain('class-reading-next');
    expect(model.schedule.recentDays[2]?.events.map(({ id }) => id)).toContain('recording-momentum');
    expect(model.schedule.primary?.className).toBe('高二物理 3班');
    expect(model.schedule.primary?.unitName).toBe('动量守恒');
    expect(model.tasks.counts.overdue).toBeGreaterThan(0);
    expect(model.classMessages.latest?.category).toBe('class');
    expect(model.growth.metrics.map(({ label }) => label)).toEqual(['出勤', '正确率']);
  });

  it('keeps the three student home sections independently unavailable', () => {
    const model = buildStudentHomeModel({
      tasks: TASK_ITEMS,
      scheduleEvents: SCHEDULE_EVENTS,
      messageThreads: MESSAGE_THREADS,
      growth: null,
      statuses: { schedule: 'loading', tasks: 'error', messages: 'unavailable', growth: 'unavailable' },
    }, now);

    expect(model.schedule.status).toBe('loading');
    expect(model.tasks.status).toBe('error');
    expect(model.classMessages.status).toBe('unavailable');
    expect(model.growth.status).toBe('unavailable');
    expect(model.schedule.recentDays).toHaveLength(3);
  });
});
