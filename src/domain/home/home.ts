import type { AppRole } from '@domain/account/role';
import type { ClassRecord, OpenCourseRecord } from '@domain/class/class';
import type { GrowthOverview } from '@domain/growth/growth';
import type { ClassInsight } from '@domain/insights/insights';
import { countUnreadByCategory, formatMessageListTime, getLastMessageEntry, getMessageThreadSubtitle, getMessageThreadTitle, getVisibleMessageThreads, type MessageThread } from '@domain/message/message';
import { resolveScheduleActions, getVisibleScheduleEvents, type ScheduleEvent } from '@domain/schedule/schedule';
import { getVisibleTaskItems, resolveTaskActions, resolveTaskTimeBucket, resolveTaskUrgency, type TaskItem, type TaskTimeBucket } from '@domain/task/task';
import type { ProductTarget } from '@domain/navigation/product-target';
import type { TeachingQuickActionSet } from '@domain/teaching-action/teaching-action';

export type HomeSources = {
  classes: ReadonlyArray<ClassRecord>;
  openCourses: ReadonlyArray<OpenCourseRecord>;
  tasks: ReadonlyArray<TaskItem>;
  scheduleEvents: ReadonlyArray<ScheduleEvent>;
  messageThreads: ReadonlyArray<MessageThread>;
};

export type TeacherHomeSources = Pick<HomeSources, 'tasks' | 'scheduleEvents' | 'messageThreads'> & {
  insights: ReadonlyArray<ClassInsight>;
  statuses?: Partial<Record<'schedule' | 'tasks' | 'insights' | 'messages', Exclude<TeacherHomeSectionStatus, 'empty'>>>;
};

export type TeacherHomeSectionStatus = 'loading' | 'ready' | 'empty' | 'error' | 'unavailable';

export type TeacherHomeFutureDay = {
  date: string;
  events: ScheduleEvent[];
  overflowCount: number;
};

export type TeacherHomeInsight =
  | {
      status: 'ready';
      items: ReadonlyArray<{
        classId: string;
        className: string;
        headline: string;
        affectedStudentCount: number;
      }>;
      affectedStudentCount: number;
    }
  | {
      status: Exclude<TeacherHomeSectionStatus, 'ready'>;
      items: readonly [];
      affectedStudentCount: 0;
      reason: string;
    };

export type TeacherHomeMessageSummary = {
  id: string;
  category: 'direct' | 'class';
  title: string;
  subtitle: string;
  preview: string;
  timeLabel: string;
  unreadCount: number;
  classId?: string;
  peerId?: string;
};

export type TeacherHomeModel = {
  greeting: string;
  dateLabel: string;
  currentOrNextEvent: ScheduleEvent | null;
  todayEvents: ScheduleEvent[];
  futureEvents: ScheduleEvent[];
  futureDays: TeacherHomeFutureDay[];
  scheduleStatus: TeacherHomeSectionStatus;
  openTasks: TaskItem[];
  topTask: TaskItem | null;
  urgentTaskCount: number;
  taskCounts: Record<TaskTimeBucket, number>;
  tasksStatus: TeacherHomeSectionStatus;
  insight: TeacherHomeInsight;
  messageSummaries: TeacherHomeMessageSummary[];
  unreadMessageCount: number;
  messagesStatus: TeacherHomeSectionStatus;
};

export type HomeModel = {
  currentOrNextEvent: ScheduleEvent | null;
  todayEvents: ScheduleEvent[];
  openTasks: TaskItem[];
  completedTasks: TaskItem[];
  urgentTaskCount: number;
  taskCounts: Record<TaskTimeBucket, number>;
  classes: ClassRecord[];
  openCourses: OpenCourseRecord[];
  unreadMessageCount: number;
};

export type StudentHomeSectionStatus = TeacherHomeSectionStatus;

export type StudentHomeLearningItem = {
  id: string;
  kind: 'lesson' | 'open-course' | 'homework' | 'quiz' | 'recording' | 'task';
  title: string;
  timeLabel: string;
  classId?: string;
  className?: string;
  courseId?: string;
  courseName?: string;
  unitId?: string;
  unitName?: string;
  state: 'current' | 'upcoming' | 'overdue' | 'completed' | 'in-progress' | 'unavailable';
  action: {
    target: ProductTarget | null;
    actions: TeachingQuickActionSet;
  };
};

export type StudentHomeDay = {
  date: string;
  label: '今天' | '明天' | '后天';
  events: StudentHomeLearningItem[];
};

export type StudentHomeMessageSummary = {
  id: string;
  category: 'class';
  title: string;
  preview: string;
  timeLabel: string;
  unreadCount: number;
  classId?: string;
};

export type StudentHomeGrowthMetric = {
  label: string;
  value: string;
  detail: string;
};

export type StudentHomeSources = Pick<HomeSources, 'tasks' | 'scheduleEvents' | 'messageThreads'> & {
  growth: GrowthOverview | null;
  statuses?: Partial<Record<'schedule' | 'tasks' | 'messages' | 'growth', Exclude<StudentHomeSectionStatus, 'empty'>>>;
};

export type StudentHomeModel = {
  schedule: {
    status: StudentHomeSectionStatus;
    primary: StudentHomeLearningItem | null;
    recentDays: [StudentHomeDay, StudentHomeDay, StudentHomeDay];
  };
  tasks: {
    status: StudentHomeSectionStatus;
    counts: Record<TaskTimeBucket, number>;
    top: StudentHomeLearningItem | null;
  };
  classMessages: {
    status: StudentHomeSectionStatus;
    unreadCount: number;
    latest: StudentHomeMessageSummary | null;
  };
  growth: {
    status: StudentHomeSectionStatus;
    metrics: StudentHomeGrowthMetric[];
  };
  teacherReminder: {
    status: 'ready' | 'empty' | 'unavailable';
    urgentCount: number;
  };
};

function getEventTimestamp(event: ScheduleEvent): number {
  return new Date(`${event.date}T${event.startTime}:00+08:00`).getTime();
}

function getSortedScheduleEvents(role: AppRole, events: ReadonlyArray<ScheduleEvent>): ScheduleEvent[] {
  return getVisibleScheduleEvents(role, events).sort((left, right) => getEventTimestamp(left) - getEventTimestamp(right));
}

function resolveCurrentOrNextEvent(events: ReadonlyArray<ScheduleEvent>, now: Date): ScheduleEvent | null {
  return events.find((event) => {
    const endAt = 'endTime' in event
      ? new Date(`${event.date}T${event.endTime}:00+08:00`).getTime()
      : getEventTimestamp(event);
    return endAt >= now.getTime();
  }) ?? null;
}

function getOpenTasks(role: AppRole, tasks: ReadonlyArray<TaskItem>): TaskItem[] {
  return getVisibleTaskItems(role, tasks)
    .filter((item) => item.roleState[role]?.lifecycle === 'open')
    .sort((left, right) => {
      const leftAt = left.dueAt ?? left.startsAt ?? left.createdAt;
      const rightAt = right.dueAt ?? right.startsAt ?? right.createdAt;
      return new Date(leftAt).getTime() - new Date(rightAt).getTime();
    });
}

function getCompletedTasks(role: AppRole, tasks: ReadonlyArray<TaskItem>): TaskItem[] {
  return getVisibleTaskItems(role, tasks)
    .filter((item) => item.roleState[role]?.lifecycle === 'done')
    .sort((left, right) => {
      const leftAt = left.roleState[role]?.archivedAt ?? left.createdAt;
      const rightAt = right.roleState[role]?.archivedAt ?? right.createdAt;
      return new Date(rightAt).getTime() - new Date(leftAt).getTime();
    });
}

function getStudentEventState(event: ScheduleEvent, now: Date, primaryId?: string): StudentHomeLearningItem['state'] {
  if (event.id === primaryId) return event.kind === 'lesson' && event.phase === 'live' ? 'current' : 'upcoming';
  if (event.kind === 'lesson' || event.kind === 'open-course') {
    return event.phase === 'completed' ? 'completed' : event.phase === 'live' ? 'current' : 'upcoming';
  }
  if (event.kind === 'assignment') {
    if (event.studentState === 'graded' || event.studentState === 'submitted') return 'completed';
    if (event.date < formatCalendarDate(now)) return 'overdue';
    return event.studentState === 'in-progress' || event.studentState === 'needs-correction' ? 'in-progress' : 'upcoming';
  }
  if (event.studentState === 'completed') return 'completed';
  return event.studentState === 'in-progress' ? 'in-progress' : 'upcoming';
}

function getStudentEventKind(event: ScheduleEvent): StudentHomeLearningItem['kind'] {
  if (event.kind === 'assignment') return event.activityType;
  return event.kind;
}

function getStudentEventTarget(event: ScheduleEvent): ProductTarget {
  if (event.kind === 'open-course') {
    return { kind: 'open-course', openCourseId: event.openCourseId, source: 'home' };
  }
  if (event.kind === 'assignment') {
    return { kind: 'homework', homeworkId: event.homeworkId, source: 'home' };
  }
  return {
    kind: 'class',
    classId: event.classId,
    courseId: event.courseId,
    unitId: event.unitId,
    activityId: event.kind === 'lesson' ? event.activityId : event.kind === 'recording' ? event.recordingId : undefined,
    source: 'home',
  };
}

function getStudentEventTimeLabel(event: ScheduleEvent): string {
  return event.startTime;
}

function toStudentEventItem(event: ScheduleEvent, now: Date, primaryId?: string): StudentHomeLearningItem {
  const actions = resolveScheduleActions('student-family', event, now);
  return {
    id: event.id,
    kind: getStudentEventKind(event),
    title: event.title,
    timeLabel: getStudentEventTimeLabel(event),
    classId: 'classId' in event ? event.classId : undefined,
    className: event.context,
    courseId: event.courseId,
    courseName: event.course,
    unitId: event.unitId,
    unitName: event.unitName,
    state: getStudentEventState(event, now, primaryId),
    action: {
      target: getStudentEventTarget(event),
      actions,
    },
  };
}

function toStudentTaskItem(task: TaskItem, now: Date): StudentHomeLearningItem {
  const actions = resolveTaskActions('student-family', task, now);
  const target = task.link.homeworkId
    ? { kind: 'homework' as const, homeworkId: task.link.homeworkId, source: 'home' as const }
    : { kind: 'task' as const, taskId: task.id, source: 'home' as const };
  const state = task.roleState['student-family']?.lifecycle === 'done'
    ? 'completed'
    : resolveTaskTimeBucket('student-family', task, now) === 'overdue' ? 'overdue' : task.studentState === 'in-progress' || task.studentState === 'needs-correction' ? 'in-progress' : 'upcoming';
  return {
    id: task.id,
    kind: task.kind === 'quiz' ? 'quiz' : task.kind === 'homework' ? 'homework' : 'task',
    title: task.title,
    timeLabel: task.dueAt ? task.dueAt.slice(11, 16) : task.startsAt ? task.startsAt.slice(11, 16) : '',
    classId: task.classId,
    className: task.className,
    courseName: task.course,
    unitName: task.unitName,
    state,
    action: { target, actions },
  };
}

function buildStudentGrowthMetrics(growth: GrowthOverview | null): StudentHomeGrowthMetric[] {
  if (!growth) return [];
  return [
    { label: '出勤', value: `${growth.attendanceDays} 天`, detail: `连续学习 ${growth.consecutiveDays} 天` },
    { label: '正确率', value: `${growth.accuracy}%`, detail: growth.accuracyTrend === 'up' ? '较上次提升' : '保持稳定' },
  ];
}

export function buildStudentHomeModel(
  sources: StudentHomeSources,
  now: Date,
): StudentHomeModel {
  const events = getSortedScheduleEvents('student-family', sources.scheduleEvents);
  const dates = [0, 1, 2].map((offset) => {
    const date = new Date(now);
    date.setDate(now.getDate() + offset);
    return formatCalendarDate(date);
  }) as [string, string, string];
  const labels: StudentHomeDay['label'][] = ['今天', '明天', '后天'];
  const primaryEvent = resolveCurrentOrNextEvent(events.filter((event) => event.kind === 'lesson' || event.kind === 'open-course'), now);
  const openTasks = getOpenTasks('student-family', sources.tasks).filter(({ kind }) => kind !== 'classroom');
  const primary = primaryEvent
    ? toStudentEventItem(primaryEvent, now, primaryEvent.id)
    : openTasks[0] ? toStudentTaskItem(openTasks[0], now) : null;
  const recentDays = dates.map((date, index) => ({
    date,
    label: labels[index],
    events: events.filter((event) => event.date === date).map((event) => toStudentEventItem(event, now, primaryEvent?.id)),
  })) as [StudentHomeDay, StudentHomeDay, StudentHomeDay];
  const taskCounts: Record<TaskTimeBucket, number> = { overdue: 0, today: 0, later: 0 };
  for (const task of openTasks) taskCounts[resolveTaskTimeBucket('student-family', task, now)] += 1;
  const classThreads = getVisibleMessageThreads('student-family', sources.messageThreads)
    .filter((thread) => thread.category === 'class')
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  const latestThread = classThreads[0];
  const scheduleStatus = sources.statuses?.schedule ?? (events.length > 0 ? 'ready' : 'empty');
  const tasksStatus = sources.statuses?.tasks ?? (openTasks.length > 0 ? 'ready' : 'empty');
  const messagesStatus = sources.statuses?.messages ?? (latestThread ? 'ready' : 'empty');
  const growthStatus = sources.statuses?.growth ?? (sources.growth ? 'ready' : 'unavailable');
  return {
    schedule: {
      status: scheduleStatus,
      primary,
      recentDays,
    },
    tasks: {
      status: tasksStatus,
      counts: taskCounts,
      top: openTasks[0] ? toStudentTaskItem(openTasks[0], now) : null,
    },
    classMessages: {
      status: messagesStatus,
      unreadCount: classThreads.reduce((total, thread) => total + (thread.unreadByRole['student-family'] ?? 0), 0),
      latest: latestThread ? {
        id: latestThread.id,
        category: 'class',
        title: getMessageThreadTitle('student-family', latestThread),
        preview: getLastMessageEntry(latestThread)?.body ?? latestThread.notice?.body[0] ?? '',
        timeLabel: formatMessageListTime(latestThread.updatedAt, now),
        unreadCount: latestThread.unreadByRole['student-family'] ?? 0,
        classId: latestThread.classId,
      } : null,
    },
    growth: {
      status: growthStatus,
      metrics: buildStudentGrowthMetrics(sources.growth),
    },
    teacherReminder: {
      status: countTeacherUrgentForStudent(sources.tasks, now) > 0 ? 'ready' : 'empty',
      urgentCount: countTeacherUrgentForStudent(sources.tasks, now),
    },
  };
}

export function buildHomeModel(role: AppRole, sources: HomeSources, now: Date): HomeModel {
  const events = getSortedScheduleEvents(role, sources.scheduleEvents);
  const currentOrNextEvent = resolveCurrentOrNextEvent(events, now);
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const openTasks = getOpenTasks(role, sources.tasks);
  const taskCounts: Record<TaskTimeBucket, number> = { overdue: 0, today: 0, later: 0 };
  for (const task of openTasks) taskCounts[resolveTaskTimeBucket(role, task, now)] += 1;
  const unread = countUnreadByCategory(role, sources.messageThreads);
  return {
    currentOrNextEvent,
    todayEvents: events.filter(({ date }) => date === today),
    openTasks,
    completedTasks: getCompletedTasks(role, sources.tasks),
    urgentTaskCount: openTasks.filter((item) => resolveTaskUrgency(role, item, now) === 'urgent').length,
    taskCounts,
    classes: sources.classes.filter(({ visibleTo }) => visibleTo.includes(role)),
    openCourses: sources.openCourses.filter(({ visibleTo }) => visibleTo.includes(role)),
    unreadMessageCount: Object.values(unread).reduce((total, count) => total + count, 0),
  };
}

function formatHomeDate(now: Date): string {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${weekdays[now.getDay()]}`;
}

function formatCalendarDate(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

export function getTeacherHomeEventContext(event: ScheduleEvent): string {
  const scope = event.unitName?.trim() || event.course.trim();
  const context = event.kind === 'open-course' && event.context.trim() === '公开课'
    ? ''
    : event.context.trim();
  return [context, scope].filter(Boolean).join(' · ');
}

function buildGreeting(now: Date, teacherName: string): string {
  const hour = now.getHours();
  const period = hour < 12 ? '上午好' : hour < 18 ? '下午好' : '晚上好';
  const name = teacherName.trim() || '老师';
  return `${period}，${name}`;
}

function getTeacherHomeTasks(tasks: ReadonlyArray<TaskItem>, now: Date): {
  openTasks: TaskItem[];
  topTask: TaskItem | null;
  taskCounts: Record<TaskTimeBucket, number>;
  urgentTaskCount: number;
} {
  const openTasks = getOpenTasks('teacher', tasks)
    .filter((item) => item.kind !== 'classroom')
    .sort((left, right) => {
      const bucketOrder: Record<TaskTimeBucket, number> = { overdue: 0, today: 1, later: 2 };
      const bucketDelta = bucketOrder[resolveTaskTimeBucket('teacher', left, now)] - bucketOrder[resolveTaskTimeBucket('teacher', right, now)];
      if (bucketDelta !== 0) return bucketDelta;
      const urgencyDelta = ['urgent', 'watch', 'later'].indexOf(resolveTaskUrgency('teacher', left, now)) - ['urgent', 'watch', 'later'].indexOf(resolveTaskUrgency('teacher', right, now));
      if (urgencyDelta !== 0) return urgencyDelta;
      const leftAt = left.dueAt ?? left.startsAt ?? left.createdAt;
      const rightAt = right.dueAt ?? right.startsAt ?? right.createdAt;
      return new Date(leftAt).getTime() - new Date(rightAt).getTime();
    });
  const taskCounts: Record<TaskTimeBucket, number> = { overdue: 0, today: 0, later: 0 };
  for (const task of openTasks) taskCounts[resolveTaskTimeBucket('teacher', task, now)] += 1;
  return {
    openTasks,
    topTask: openTasks[0] ?? null,
    taskCounts,
    urgentTaskCount: openTasks.filter((item) => resolveTaskUrgency('teacher', item, now) === 'urgent').length,
  };
}

function resolveInsight(
  insights: ReadonlyArray<ClassInsight>,
  currentOrNextEvent: ScheduleEvent | null,
  topTask: TaskItem | null,
  sourceStatus: Exclude<TeacherHomeSectionStatus, 'empty'> = 'ready',
): TeacherHomeInsight {
  if (sourceStatus !== 'ready') {
    return {
      status: sourceStatus,
      items: [],
      affectedStudentCount: 0,
      reason: sourceStatus === 'loading' ? '学情数据正在加载。' : sourceStatus === 'error' ? '学情数据加载失败，请重试或进入教学洞察。' : '当前学情数据暂不可用，请进入教学洞察查看。',
    };
  }
  const eventClassId = currentOrNextEvent && 'classId' in currentOrNextEvent ? currentOrNextEvent.classId : null;
  const candidateClassId = eventClassId ?? topTask?.classId ?? null;
  const ordered = [...insights].sort((left, right) => {
    if (left.id === candidateClassId) return -1;
    if (right.id === candidateClassId) return 1;
    return 0;
  });
  if (ordered.length === 0) {
    return {
      status: 'unavailable',
      items: [],
      affectedStudentCount: 0,
      reason: '暂无法定位对应班级的学情数据，请进入教学洞察查看。',
    };
  }
  const items = ordered.slice(0, 3).map((match) => ({
    classId: match.id,
    className: match.name,
    headline: match.diagnosis.headline,
    affectedStudentCount: Math.max(0, Math.round(match.studentCount * (100 - match.homeworkRate) / 100)),
  }));
  return {
    status: 'ready',
    items,
    affectedStudentCount: items.reduce((total, item) => total + item.affectedStudentCount, 0),
  };
}

function buildMessageSummaries(role: AppRole, threads: ReadonlyArray<MessageThread>, now: Date): TeacherHomeMessageSummary[] {
  return getVisibleMessageThreads(role, threads)
    .filter((thread): thread is MessageThread & { category: 'direct' | 'class' } => thread.category === 'direct' || thread.category === 'class')
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 2)
    .map((thread) => ({
      id: thread.id,
      category: thread.category,
      title: getMessageThreadTitle(role, thread),
      subtitle: getMessageThreadSubtitle(role, thread),
      preview: getLastMessageEntry(thread)?.body ?? thread.notice?.body[0] ?? '',
      timeLabel: formatMessageListTime(thread.updatedAt, now),
      unreadCount: thread.unreadByRole[role] ?? 0,
      classId: thread.classId,
      peerId: thread.peerId,
    }));
}

export function buildTeacherHomeModel(
  sources: TeacherHomeSources,
  now: Date,
  teacherName: string,
): TeacherHomeModel {
  const events = getSortedScheduleEvents('teacher', sources.scheduleEvents);
  const today = formatCalendarDate(now);
  const currentOrNextEvent = resolveCurrentOrNextEvent(events.filter((event) => event.kind === 'lesson'), now);
  const futureDates = [1, 2].map((offset) => {
    const date = new Date(now);
    date.setDate(now.getDate() + offset);
    return formatCalendarDate(date);
  });
  const taskModel = getTeacherHomeTasks(sources.tasks, now);
  const unread = countUnreadByCategory('teacher', sources.messageThreads);
  const messageSummaries = buildMessageSummaries('teacher', sources.messageThreads, now);
  const scheduleStatus = sources.statuses?.schedule ?? (events.length > 0 ? 'ready' : 'empty');
  const tasksStatus = sources.statuses?.tasks ?? (taskModel.openTasks.length > 0 ? 'ready' : 'empty');
  const messagesStatus = sources.statuses?.messages ?? (messageSummaries.length > 0 ? 'ready' : 'empty');
  const futureEvents = events.filter((event) => (event.kind === 'lesson' || event.kind === 'open-course') && futureDates.includes(event.date));
  const futureDays = futureDates.map((date) => {
    const dayEvents = futureEvents.filter((event) => event.date === date);
    return { date, events: dayEvents.slice(0, 2), overflowCount: Math.max(0, dayEvents.length - 2) };
  });
  return {
    greeting: buildGreeting(now, teacherName),
    dateLabel: formatHomeDate(now),
    currentOrNextEvent,
    todayEvents: events.filter(({ date }) => date === today),
    futureEvents: futureDays.flatMap(({ events: dayEvents }) => dayEvents),
    futureDays,
    scheduleStatus,
    ...taskModel,
    tasksStatus,
    insight: resolveInsight(sources.insights, currentOrNextEvent, taskModel.topTask, sources.statuses?.insights ?? 'ready'),
    messageSummaries,
    unreadMessageCount: unread.direct + unread.class,
    messagesStatus,
  };
}

export function countTeacherUrgentForStudent(tasks: ReadonlyArray<TaskItem>, now: Date): number {
  return getOpenTasks('teacher', tasks).filter((item) => {
    const bucket = resolveTaskTimeBucket('teacher', item, now);
    return bucket === 'overdue' || (bucket === 'today' && resolveTaskUrgency('teacher', item, now) === 'urgent');
  }).length;
}
