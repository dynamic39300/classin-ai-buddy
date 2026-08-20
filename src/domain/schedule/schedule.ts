import type { AppRole } from '@domain/account/role';
import {
  asPrimary,
  asSecondary,
  type TeachingQuickAction,
  type TeachingQuickActionSet,
} from '@domain/teaching-action/teaching-action';

export type ScheduleEventKind = 'lesson' | 'assignment' | 'recording' | 'open-course';
export type ScheduleAudience = 'both' | AppRole;
export type LessonPhase = 'completed' | 'upcoming' | 'live';
export type StudentAssignmentState = 'not-started' | 'in-progress' | 'submitted' | 'needs-correction' | 'graded';
export type TeacherAssignmentState = 'collecting' | 'grading' | 'published';
export type RecordingStudentState = 'not-started' | 'in-progress' | 'completed';
export type RecordingTeacherState = 'draft' | 'published';

type BaseScheduleEvent = {
  id: string;
  organizationId: string;
  audience: ScheduleAudience;
  date: string;
  startTime: string;
  title: string;
  course: string;
  context: string;
  courseId?: string;
  unitId?: string;
  unitName?: string;
  relatedLessonId?: string;
  instructor?: string;
  location?: string;
};

export type LessonScheduleEvent = BaseScheduleEvent & {
  kind: 'lesson';
  classId: string;
  courseId?: string;
  unitId?: string;
  lessonId: string;
  activityId?: string;
  endTime: string;
  phase: LessonPhase;
};

export type AssignmentScheduleEvent = BaseScheduleEvent & {
  kind: 'assignment';
  classId: string;
  homeworkId: string;
  activityType: 'homework' | 'quiz';
  availableDate: string;
  studentState: StudentAssignmentState;
  teacherState: TeacherAssignmentState;
};

export type RecordingScheduleEvent = BaseScheduleEvent & {
  kind: 'recording';
  classId: string;
  recordingId: string;
  phase: LessonPhase;
  studentState: RecordingStudentState;
  teacherState: RecordingTeacherState;
};

export type OpenCourseScheduleEvent = BaseScheduleEvent & {
  kind: 'open-course';
  openCourseId: string;
  endTime: string;
  phase: LessonPhase;
};

export type ScheduleEvent = LessonScheduleEvent | AssignmentScheduleEvent | RecordingScheduleEvent | OpenCourseScheduleEvent;

export type ScheduleCourseGroup = {
  id: string;
  className: string;
  courseName: string;
  unitName: string | null;
  events: ScheduleEvent[];
};

export type ScheduleAction = TeachingQuickAction;

export const SCHEDULE_KIND_LABELS: Record<ScheduleEventKind, string> = {
  lesson: '课堂',
  assignment: '作业截止',
  recording: '录播课',
  'open-course': '公开课',
};

function toMinutes(time: string): number {
  return getScheduleTimelineMinute(time);
}

export const SCHEDULE_DAY_MINUTES = 24 * 60;

/** Convert a display time into a bounded minute offset on the same day. */
export function getScheduleTimelineMinute(time: string): number {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(time);
  if (!match) return 0;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours >= 24) return SCHEDULE_DAY_MINUTES;
  return Math.min(SCHEDULE_DAY_MINUTES, hours * 60 + minutes);
}

export type ScheduleEventPlacement = {
  startMinute: number;
  durationMinutes: number;
};

export function getScheduleEventPlacement(event: ScheduleEvent): ScheduleEventPlacement {
  const startMinute = getScheduleTimelineMinute(event.startTime);
  if (startMinute >= SCHEDULE_DAY_MINUTES) return { startMinute, durationMinutes: 0 };
  const endMinute = 'endTime' in event ? getScheduleTimelineMinute(event.endTime) : startMinute + 30;
  const durationMinutes = Math.min(
    SCHEDULE_DAY_MINUTES - startMinute,
    Math.max(15, endMinute - startMinute),
  );
  return { startMinute, durationMinutes };
}

export function getVisibleScheduleEvents(
  role: AppRole,
  events: ReadonlyArray<ScheduleEvent>,
): ScheduleEvent[] {
  return events.filter(({ audience }) => audience === 'both' || audience === role);
}

export function getEventsForDate(
  date: string,
  events: ReadonlyArray<ScheduleEvent>,
): ScheduleEvent[] {
  return events
    .filter((event) => event.date === date)
    .sort((left, right) => toMinutes(left.startTime) - toMinutes(right.startTime));
}

function isCourseEvent(event: ScheduleEvent): boolean {
  return event.kind === 'lesson' || event.kind === 'open-course';
}

function isActivityEvent(event: ScheduleEvent): event is AssignmentScheduleEvent | RecordingScheduleEvent {
  return event.kind === 'assignment' || event.kind === 'recording';
}

function getCourseGroupId(event: ScheduleEvent): string {
  if (event.kind === 'open-course') return `open-course:${event.openCourseId}`;
  return `${event.classId}:${event.courseId ?? event.course}:${event.unitId ?? event.unitName ?? 'root'}`;
}

export function getCourseGroupsForDate(
  date: string,
  events: ReadonlyArray<ScheduleEvent>,
): ScheduleCourseGroup[] {
  const directEvents = getEventsForDate(date, events);
  const lessonIds = new Set(
    directEvents.filter((event): event is LessonScheduleEvent => event.kind === 'lesson').map(({ id }) => id),
  );
  const relatedEvents = events.filter((event) => isActivityEvent(event) && event.relatedLessonId && lessonIds.has(event.relatedLessonId));
  const combined = [...directEvents, ...relatedEvents].filter((event, index, all) => all.findIndex(({ id }) => id === event.id) === index);
  const groups = new Map<string, ScheduleCourseGroup>();

  for (const event of combined) {
    const id = getCourseGroupId(event);
    const group = groups.get(id) ?? {
      id,
      className: event.kind === 'open-course' ? '公开课' : event.context,
      courseName: event.course,
      unitName: event.unitName ?? null,
      events: [],
    };
    group.events.push(event);
    if (!group.unitName && event.unitName) group.unitName = event.unitName;
    groups.set(id, group);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      events: [...group.events].sort((left, right) => {
        const leftPriority = isCourseEvent(left) ? 0 : 1;
        const rightPriority = isCourseEvent(right) ? 0 : 1;
        return leftPriority - rightPriority;
      }),
    }))
    .sort((left, right) => toMinutes(left.events[0]?.startTime ?? '23:59') - toMinutes(right.events[0]?.startTime ?? '23:59'));
}

export function getCourseCountForDate(
  date: string,
  events: ReadonlyArray<ScheduleEvent>,
): number {
  return events.filter((event) => event.date === date && isCourseEvent(event)).length;
}

export function getScheduleInitialScrollMinute(events: ReadonlyArray<ScheduleEvent>): number {
  const firstCourse = events
    .filter(isCourseEvent)
    .sort((left, right) => toMinutes(left.startTime) - toMinutes(right.startTime))[0];
  if (!firstCourse) return 8 * 60;
  return Math.max(0, getScheduleTimelineMinute(firstCourse.startTime) - 60);
}

function resolveStudentAssignmentAction(event: AssignmentScheduleEvent): ScheduleAction {
  const actions: Record<StudentAssignmentState, Pick<ScheduleAction, 'id' | 'label'>> = {
    'not-started': { id: 'do-homework', label: '去做作业' },
    'in-progress': { id: 'continue-homework', label: '继续作业' },
    submitted: { id: 'view-submission', label: '查看提交' },
    'needs-correction': { id: 'correct-homework', label: '去订正' },
    graded: { id: 'view-result', label: '查看结果' },
  };
  return asPrimary({
    ...actions[event.studentState],
    kind: 'operation-dialog',
    feedback: '作业入口已保留，将在学生待办 Feature 中实现。',
  });
}

function isLessonEntryWindow(event: LessonScheduleEvent, now?: Date): boolean {
  if (event.phase === 'live') return true;
  if (event.phase !== 'upcoming' || !now) return false;
  const startsAt = new Date(`${event.date}T${event.startTime}:00+08:00`).getTime();
  const endsAt = new Date(`${event.date}T${event.endTime}:00+08:00`).getTime();
  return now.getTime() >= startsAt - 30 * 60 * 1000 && now.getTime() < endsAt;
}

export function resolveScheduleActions(role: AppRole, event: ScheduleEvent, now?: Date): TeachingQuickActionSet {
  if (event.kind === 'assignment') {
    if (role === 'student-family') return { primary: resolveStudentAssignmentAction(event) };
    const actions: Record<TeacherAssignmentState, Pick<ScheduleAction, 'id' | 'label'>> = {
      collecting: { id: 'review-submissions', label: '提交概况' },
      grading: { id: 'continue-review', label: '继续批改' },
      published: { id: 'view-homework-data', label: '作业数据' },
    };
    return { primary: asPrimary({
      ...actions[event.teacherState],
      kind: 'operation-dialog',
      feedback: '作业管理入口已保留，将在待办 Feature 中实现。',
    }) };
  }

  if (event.kind === 'recording') {
    return { primary: role === 'teacher'
      ? asPrimary({ id: event.phase === 'completed' ? 'view-recording-data' : 'manage-recording', label: event.phase === 'completed' ? '录播数据' : '录播管理', kind: 'placeholder-dialog', feedback: '录播课整体数据入口已保留，本 Demo 不连接真实播放器。' })
      : asPrimary({ id: event.studentState === 'in-progress' ? 'continue-recording' : 'watch-recording', label: event.studentState === 'in-progress' ? '继续观看' : '去观看', kind: 'placeholder-dialog', feedback: '录播入口已保留，本 Demo 不连接真实播放器。' }) };
  }

  if ((event.kind === 'lesson' && isLessonEntryWindow(event, now)) || event.phase === 'live') {
    const primary = asPrimary({
      id: 'attend-class' as const,
      label: '去上课',
      kind: 'placeholder-dialog' as const,
      feedback: '已打开课堂连接准备页。本 Demo 不连接真实在线课堂。',
    });
    return event.kind === 'lesson' && role === 'teacher'
      ? { primary, secondary: asSecondary({ id: 'prepare-class', label: '去备课', kind: 'placeholder-dialog', feedback: '备课入口已保留，本 Demo 不修改真实课堂内容。' }) }
      : { primary };
  }

  if (event.kind === 'lesson') {
    if (event.phase === 'completed') {
      return role === 'teacher'
        ? { primary: asPrimary({ id: 'view-class-report', label: '课堂报告', kind: 'placeholder-dialog', feedback: '课堂报告入口已保留，将在教学洞察 Feature 中实现。' }) }
        : { primary: asPrimary({ id: 'watch-replay', label: '看回放', kind: 'placeholder-dialog', feedback: '回放入口已保留；出现时机尚待真实课堂规则确认。' }) };
    }
    return { primary: role === 'teacher'
      ? asPrimary({ id: 'prepare-class', label: '去备课', kind: 'placeholder-dialog', feedback: '备课入口已保留，本 Demo 不修改真实课堂内容。' })
      : asPrimary({ id: 'view-class-preparation', label: '课前准备', kind: 'placeholder-dialog', feedback: '课堂准备信息已保留，本 Demo 不连接真实课堂服务。' }) };
  }

  return { primary: role === 'teacher'
    ? asPrimary({ id: event.phase === 'completed' ? 'view-open-course-report' : 'manage-open-course', label: event.phase === 'completed' ? '课程报告' : '课程管理', kind: 'open-course-dialog', feedback: '公开课管理入口已保留，将在公开课 Feature 中实现。' })
    : asPrimary({ id: event.phase === 'completed' ? 'watch-replay' : 'view-open-course', label: event.phase === 'completed' ? '看回放' : '查看课程', kind: 'open-course-dialog', feedback: '公开课入口已保留，本 Demo 不连接真实直播或回放。' }) };
}

export function resolveScheduleAction(role: AppRole, event: ScheduleEvent, now?: Date): ScheduleAction {
  return resolveScheduleActions(role, event, now).primary;
}

export type ScheduleReturnContext = {
  date: string;
  view: 'day' | 'week';
};

function addScheduleReturnContext(
  params: URLSearchParams,
  role: AppRole,
  event: ScheduleEvent,
  context?: ScheduleReturnContext,
): URLSearchParams {
  if (!context) return params;
  params.set('source', role === 'teacher' ? 'teacher_schedule' : 'student_schedule');
  params.set('date', context.date);
  params.set('view', context.view);
  params.set('event', event.id);
  return params;
}

export function resolveScheduleDetailDestination(role: AppRole, event: ScheduleEvent, context?: ScheduleReturnContext): string {
  const prefix = role === 'teacher' ? 'teacher' : 'student';
  if (event.kind === 'lesson') {
    const path = `/${prefix}/classes/${encodeURIComponent(event.classId)}`;
    const params = new URLSearchParams();
    if (event.activityId) params.set('activity', event.activityId);
    addScheduleReturnContext(params, role, event, context);
    return params.size ? `${path}?${params.toString()}` : path;
  }
  if (event.kind === 'assignment') {
    const source = role === 'teacher' ? 'teacher_schedule' : 'student_schedule';
    const params = new URLSearchParams({ source, event: event.id, date: event.date });
    if (context) params.set('view', context.view);
    return `/${prefix}/homework/${encodeURIComponent(event.homeworkId)}?${params.toString()}`;
  }
  if (event.kind === 'recording') {
    const path = `/${prefix}/classes/${encodeURIComponent(event.classId)}`;
    const params = new URLSearchParams({ activity: event.recordingId });
    addScheduleReturnContext(params, role, event, context);
    return `${path}?${params.toString()}`;
  }
  const params = addScheduleReturnContext(new URLSearchParams(), role, event, context);
  if (role === 'teacher') {
    params.set('dialog', 'detail');
    params.set('course', event.openCourseId);
    return `/teacher/open-courses?${params.toString()}`;
  }
  return `/${prefix}/open-courses/${event.openCourseId}${params.size ? `?${params.toString()}` : ''}`;
}

export function resolveScheduleHomeworkCreateDestination(event: LessonScheduleEvent, view?: 'day' | 'week'): string {
  const params = new URLSearchParams({ class: event.classId, date: event.date, event: event.id });
  if (view) params.set('view', view);
  if (event.courseId) params.set('course', event.courseId);
  params.set('source', 'teacher_schedule');
  if (event.unitId) params.set('unit', event.unitId);
  return `/teacher/homework/new?${params.toString()}`;
}
