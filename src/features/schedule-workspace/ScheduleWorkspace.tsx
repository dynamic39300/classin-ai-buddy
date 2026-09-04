import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListFilter,
  MapPin,
  RotateCcw,
  UserRound,
  X,
} from 'lucide-react';
import { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TeachingObjectIcon } from '@design-system/TeachingObjectIcon';
import { TeachingActionButton } from '@design-system/TeachingActionButton';
import type { AppRole } from '@domain/account/role';
import {
  getCourseCountForDate,
  getCourseGroupsForDate,
  getScheduleEventPlacement,
  getScheduleInitialScrollMinute,
  getVisibleScheduleEvents,
  resolveScheduleActions,
  resolveScheduleDetailDestination,
  resolveScheduleHomeworkCreateDestination,
  SCHEDULE_KIND_LABELS,
  type AssignmentScheduleEvent,
  type LessonScheduleEvent,
  type ScheduleReturnContext,
  type ScheduleEvent,
} from '@domain/schedule/schedule';
import type { TeachingQuickAction } from '@domain/teaching-action/teaching-action';
import { getScheduleTeachingObjectKind, TEACHING_OBJECT_LABELS } from '@domain/teaching-object/teaching-object';
import { toOpenCourseWorkspaceRecord } from '@domain/open-course/open-course';
import { ClassWorkspaceContext } from '@features/class-workspace/class-workspace-store';
import { TeacherOpenCourseDetailDialog } from '@features/open-course-workspace';
import { CURRENT_WEEK_DAYS, SCHEDULE_EVENT_DETAILS, SCHEDULE_EVENTS } from '@mocks/scenarios/schedule';
import styles from './ScheduleWorkspace.module.css';

const TIME_MARKS = Array.from({ length: 25 }, (_, index) => index);
const BASE_WEEK_START = new Date('2026-08-03T12:00:00+08:00');
const FIXED_TODAY = '2026-08-08';
const DEMO_NOW = new Date('2026-08-08T14:30:00+08:00');
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

function toDateKey(date: Date): string {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function parseDateKey(date: string): Date {
  return new Date(date + 'T12:00:00+08:00');
}

function getWeekOffset(date: string): number {
  return Math.floor((parseDateKey(date).getTime() - BASE_WEEK_START.getTime()) / (7 * 86_400_000));
}

function getMonthOffset(date: string): number {
  const value = parseDateKey(date);
  return (value.getFullYear() - 2026) * 12 + value.getMonth() - 7;
}

function getWeekDays(offset: number) {
  const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  return weekdays.map((weekday, index) => {
    const date = new Date(BASE_WEEK_START);
    date.setDate(BASE_WEEK_START.getDate() + offset * 7 + index);
    return { date: toDateKey(date), day: String(date.getDate()).padStart(2, '0'), weekday };
  });
}

function getWeekLabel(days: ReadonlyArray<{ date: string }>): string {
  const firstDay = days[0];
  const lastDay = days[6];
  if (!firstDay || !lastDay) return '';
  const start = parseDateKey(firstDay.date);
  const end = parseDateKey(lastDay.date);
  const startLabel = start.getFullYear() + '年' + (start.getMonth() + 1) + '月' + start.getDate() + '日';
  const endLabel = start.getFullYear() === end.getFullYear()
    ? (end.getMonth() + 1) + '月' + end.getDate() + '日'
    : end.getFullYear() + '年' + (end.getMonth() + 1) + '月' + end.getDate() + '日';
  return startLabel + ' - ' + endLabel;
}

function getMonthDays(monthOffset: number): Date[] {
  const month = new Date('2026-08-01T12:00:00+08:00');
  month.setMonth(month.getMonth() + monthOffset);
  const firstDayIndex = (month.getDay() + 6) % 7;
  const firstCell = new Date(month);
  firstCell.setDate(1 - firstDayIndex);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCell);
    date.setDate(firstCell.getDate() + index);
    return date;
  });
}

function formatDate(date: string): string {
  const value = parseDateKey(date);
  return (value.getMonth() + 1) + '月' + value.getDate() + '日';
}

function getCurrentTimeMinute(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function formatClockTime(date: Date): string {
  return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
}

function getEventStateLabel(role: AppRole, event: ScheduleEvent): string {
  if (event.kind === 'assignment') {
    if (role === 'teacher') return { collecting: '收集中', grading: '批改中', published: '已发布' }[event.teacherState];
    return {
      'not-started': '未开始',
      'in-progress': '进行中',
      submitted: '已提交',
      'needs-correction': '待订正',
      graded: '已批改',
    }[event.studentState];
  }
  if (event.kind === 'recording') {
    if (role === 'teacher') return event.teacherState === 'published' ? '已发布' : '草稿';
    return { 'not-started': '未观看', 'in-progress': '观看中', completed: '已完成' }[event.studentState];
  }
  return { completed: '已结束', upcoming: '待开始', live: '进行中' }[event.phase];
}

function getEventObjectLabel(event: ScheduleEvent): string {
  return TEACHING_OBJECT_LABELS[getScheduleTeachingObjectKind(event)];
}

function ScheduleDetailDialog({
  event,
  role,
  onClose,
  onNavigate,
  onCreateHomework,
  scheduleContext,
  initialView,
  selectedAction,
  now,
}: {
  event: ScheduleEvent;
  role: AppRole;
  onClose: () => void;
  onNavigate: (destination: string) => void;
  onCreateHomework: (event: LessonScheduleEvent) => void;
  scheduleContext: ScheduleReturnContext;
  initialView: 'detail' | 'operation';
  selectedAction?: TeachingQuickAction;
  now: Date;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const actions = resolveScheduleActions(role, event, now);
  const [operationAction, setOperationAction] = useState(selectedAction ?? actions.primary);
  const [view, setView] = useState(initialView);
  const scenario = SCHEDULE_EVENT_DETAILS[event.id];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    closeRef.current?.focus();
    return () => {
      if (dialog.open && typeof dialog.close === 'function') dialog.close();
    };
  }, []);

  const contextLabel = event.context + ' · ' + event.course + (event.unitName ? ' · ' + event.unitName : '');
  const timeLabel = formatDate(event.date) + ' ' + event.startTime
    + ('endTime' in event ? ' - ' + event.endTime : event.kind === 'assignment' ? ' 截止' : '');

  return (
    <dialog
      className={styles.detailDialog}
      ref={dialogRef}
      aria-labelledby="schedule-dialog-title"
      aria-describedby="schedule-dialog-context"
      onCancel={(cancelEvent) => { cancelEvent.preventDefault(); onClose(); }}
      onClick={(clickEvent) => { if (clickEvent.currentTarget === clickEvent.target) onClose(); }}
    >
      <div className={styles.dialogSurface}>
        <header className={styles.dialogHeader}>
          <div>
            <span className={styles.kindLabel} data-kind={event.kind}><TeachingObjectIcon kind={getScheduleTeachingObjectKind(event)} size={14} />{getEventObjectLabel(event)}</span>
            <h2 id="schedule-dialog-title">{event.title}</h2>
            <p id="schedule-dialog-context">{contextLabel}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={'关闭' + event.title + '详情'} title="关闭">
            <X aria-hidden="true" size={18} />
          </button>
        </header>

        {view === 'detail' ? <div className={styles.dialogBody}>
          <dl className={styles.eventFacts}>
            <div><dt><Clock3 aria-hidden="true" size={15} />时间</dt><dd>{timeLabel}</dd></div>
            <div>
              <dt><UserRound aria-hidden="true" size={15} />{role === 'teacher' ? '教学上下文' : '教师与课程'}</dt>
              <dd>{role === 'teacher' ? event.context + ' · ' + event.course : (event.instructor ?? '课程教师') + ' · ' + event.course}</dd>
            </div>
            {event.location ? <div><dt><MapPin aria-hidden="true" size={15} />地点</dt><dd>{event.location}</dd></div> : null}
            <div><dt><BookOpen aria-hidden="true" size={15} />当前状态</dt><dd>{getEventStateLabel(role, event)}</dd></div>
          </dl>

          {role === 'teacher' && scenario?.teacherMetrics ? (
            <section className={styles.metricSection} aria-labelledby="teacher-metrics-title">
              <header><h3 id="teacher-metrics-title">全班数据</h3><span>整体数据</span></header>
              <div className={styles.metrics}>
                {scenario.teacherMetrics.map((metric) => <div key={metric.label}><strong>{metric.value}</strong><span>{metric.label}</span></div>)}
              </div>
            </section>
          ) : null}

          {event.kind === 'lesson' && event.phase === 'completed' ? (
            <section className={styles.evaluationSection}>
              <h3>{role === 'teacher' ? '课后评价' : '我的课后评价'}</h3>
              <p>{role === 'teacher' ? scenario?.teacherEvaluation ?? '暂无班级评价数据' : scenario?.studentEvaluation ?? '尚未提交评价'}</p>
            </section>
          ) : null}

          {event.kind === 'recording' ? (
            <section className={styles.recordingNote}>
              <TeachingObjectIcon kind="recording" size={18} />
              <p>{role === 'teacher' ? '录播课只展示班级整体观看数据，学生明细请进入课程报告。' : '播放器为 Demo Placeholder，不连接真实回放服务。'}</p>
            </section>
          ) : null}
        </div> : (
          <div className={styles.operationBody}>
            <div><span>当前操作</span><h3>{operationAction.label}</h3></div>
            <p>{operationAction.feedback ?? `${operationAction.label}为 Demo Placeholder，未连接真实教学服务。`}</p>
            <small>Demo Placeholder</small>
          </div>
        )}

        <footer className={styles.dialogActions}>
          {view === 'operation' ? (
            <button className={styles.secondaryAction} type="button" onClick={() => setView('detail')}>返回详情</button>
          ) : role === 'teacher' && event.kind === 'lesson' && event.phase !== 'completed' ? (
            <button className={styles.secondaryAction} type="button" onClick={() => onCreateHomework(event)}>布置作业</button>
          ) : null}
          {view === 'detail' ? <button className={styles.secondaryAction} type="button" onClick={() => onNavigate(resolveScheduleDetailDestination(role, event, scheduleContext))}>
              {'查看完整' + (event.kind === 'lesson' ? '班级课节' : SCHEDULE_KIND_LABELS[event.kind]) + '详情'}
            </button> : null}
          {view === 'detail' && actions.secondary ? <button className={styles.secondaryAction} type="button" onClick={() => { setOperationAction(actions.secondary!); setView('operation'); }}>{actions.secondary.label}</button> : null}
          <button className={styles.primaryAction} type="button" onClick={view === 'detail' ? () => { setOperationAction(actions.primary); setView('operation'); } : onClose}>
            {view === 'detail' ? <>{actions.primary.label}<ArrowRight aria-hidden="true" size={15} /></> : '完成查看'}
          </button>
        </footer>
      </div>
    </dialog>
  );
}

type ScheduleWorkspaceProps = { role: AppRole; now?: Date };
type ScheduleViewMode = 'day' | 'week';

export function ScheduleWorkspace({ role, now }: ScheduleWorkspaceProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const classStore = useContext(ClassWorkspaceContext);
  const openCourses = classStore?.openCourses ?? [];
  const initialDate = searchParams.get('date') ?? FIXED_TODAY;
  const initialView: ScheduleViewMode = searchParams.get('view') === 'day' ? 'day' : 'week';
  const [weekOffset, setWeekOffset] = useState(() => getWeekOffset(initialDate));
  const [monthOffset, setMonthOffset] = useState(() => getMonthOffset(initialDate));
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [viewMode, setViewMode] = useState<ScheduleViewMode>(initialView);
  const [filterOpen, setFilterOpen] = useState(false);
  const [classFilter, setClassFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentTime] = useState(() => now ?? DEMO_NOW);
  const [quickAction, setQuickAction] = useState<{ eventId: string; action: TeachingQuickAction } | null>(null);
  const [timelinePositionRequest, setTimelinePositionRequest] = useState(0);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const filterTriggerRef = useRef<HTMLButtonElement | null>(null);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const hadSelectedEventRef = useRef(Boolean(searchParams.get('event')));
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const lastTimelineScrollTopRef = useRef(0);
  const pendingTimelinePositionRef = useRef<{ type: 'minute'; minute: number } | { type: 'pixel'; top: number } | null>(null);

  const visibleEvents = useMemo(() => getVisibleScheduleEvents(role, SCHEDULE_EVENTS), [role]);
  const classOptions = useMemo(() => [...new Set(visibleEvents.map(({ context }) => context))], [visibleEvents]);
  const courseOptions = useMemo(() => [...new Set(visibleEvents.map(({ course }) => course))], [visibleEvents]);
  const statusOptions = useMemo(() => [...new Set(visibleEvents.map((event) => getEventStateLabel(role, event)))], [role, visibleEvents]);
  const filteredEvents = useMemo(() => visibleEvents.filter((event) => (
    (classFilter === 'all' || event.context === classFilter)
    && (courseFilter === 'all' || event.course === courseFilter)
    && (kindFilter === 'all' || event.kind === kindFilter)
    && (statusFilter === 'all' || getEventStateLabel(role, event) === statusFilter)
  )), [classFilter, courseFilter, kindFilter, role, statusFilter, visibleEvents]);
  const requestedEventId = searchParams.get('event');
  const selectedEvent = requestedEventId ? visibleEvents.find(({ id }) => id === requestedEventId) ?? null : null;
  const selectedTeacherOpenCourse = role === 'teacher' && selectedEvent?.kind === 'open-course'
    ? openCourses.find(({ id }) => id === selectedEvent.openCourseId)
    : undefined;
  const activeDate = selectedDate;
  const days = weekOffset === 0 ? CURRENT_WEEK_DAYS : getWeekDays(weekOffset);
  const activeDay = days.find(({ date }) => date === activeDate) ?? getWeekDays(getWeekOffset(activeDate))[0];
  const gridDays = viewMode === 'day' && activeDay ? [activeDay] : days;
  const rangeDateSet = new Set(gridDays.map(({ date }) => date));
  const rangeEvents = filteredEvents.filter(({ date }) => rangeDateSet.has(date));
  const courseGroups = getCourseGroupsForDate(activeDate, filteredEvents);
  const courseCount = getCourseCountForDate(activeDate, filteredEvents);
  const rangeCourseCount = rangeEvents.filter(({ kind }) => kind === 'lesson' || kind === 'open-course').length;
  const rangeActivityCount = rangeEvents.length - rangeCourseCount;
  const spanningAssignments = rangeEvents.filter((event): event is AssignmentScheduleEvent => event.kind === 'assignment');
  const activeFilterCount = [classFilter, courseFilter, kindFilter, statusFilter].filter((value) => value !== 'all').length;
  const monthDays = getMonthDays(monthOffset);
  const viewedMonth = new Date('2026-08-01T12:00:00+08:00');
  viewedMonth.setMonth(viewedMonth.getMonth() + monthOffset);
  const activeDateEvents = useMemo(() => filteredEvents.filter(({ date }) => date === activeDate), [activeDate, filteredEvents]);
  const currentTimeMinute = getCurrentTimeMinute(currentTime);
  const currentTimeLabel = formatClockTime(currentTime);

  const updateSearchParams = (date: string, mode: ScheduleViewMode, eventId?: string) => {
    const nextParams = new URLSearchParams({ date, view: mode });
    if (eventId) nextParams.set('event', eventId);
    setSearchParams(nextParams, { replace: true });
  };

  const preserveTimelinePosition = () => {
    pendingTimelinePositionRef.current = { type: 'pixel', top: timelineScrollRef.current?.scrollTop ?? lastTimelineScrollTopRef.current };
    setTimelinePositionRequest((request) => request + 1);
  };

  const selectDate = (date: string, positioning: 'preserve' | 'current' = 'preserve') => {
    if (positioning === 'current') {
      pendingTimelinePositionRef.current = { type: 'minute', minute: Math.max(0, currentTimeMinute - 60) };
      setTimelinePositionRequest((request) => request + 1);
    } else {
      preserveTimelinePosition();
    }
    setSelectedDate(date);
    setWeekOffset(getWeekOffset(date));
    setMonthOffset(getMonthOffset(date));
    updateSearchParams(date, viewMode);
  };

  const changePeriod = (direction: -1 | 1) => {
    if (viewMode === 'day') {
      const nextDate = parseDateKey(activeDate);
      nextDate.setDate(nextDate.getDate() + direction);
      selectDate(toDateKey(nextDate));
      return;
    }
    const nextOffset = weekOffset + direction;
    const nextDays = getWeekDays(nextOffset);
    selectDate(nextDays[0]?.date ?? FIXED_TODAY);
  };

  const changeView = (mode: ScheduleViewMode) => {
    preserveTimelinePosition();
    setViewMode(mode);
    updateSearchParams(activeDate, mode, selectedEvent?.id);
  };

  const selectEvent = (event: ScheduleEvent, trigger: HTMLButtonElement, contextDate = event.date) => {
    preserveTimelinePosition();
    lastTriggerRef.current = trigger;
    setQuickAction(null);
    setSelectedDate(contextDate);
    updateSearchParams(contextDate, viewMode, event.id);
  };

  const selectEventAction = (event: ScheduleEvent, action: TeachingQuickAction, trigger: HTMLButtonElement, contextDate = event.date) => {
    preserveTimelinePosition();
    lastTriggerRef.current = trigger;
    setQuickAction({ eventId: event.id, action });
    setSelectedDate(contextDate);
    updateSearchParams(contextDate, viewMode, event.id);
  };

  const closeDetails = () => {
    setQuickAction(null);
    updateSearchParams(activeDate, viewMode);
  };

  useLayoutEffect(() => {
    const scroller = timelineScrollRef.current;
    if (!scroller) return;
    const timeline = scroller.firstElementChild;
    const totalHeight = timeline?.scrollHeight || scroller.scrollHeight;
    if (!totalHeight) return;
    const pending = pendingTimelinePositionRef.current;
    const endMarker = timeline?.querySelector('[data-timeline-end]');
    const dayHeight = endMarker instanceof HTMLElement ? endMarker.offsetTop : totalHeight;
    const minuteToTop = (minute: number) => dayHeight * Math.max(0, minute - 10) / 1440;
    const targetTop = pending?.type === 'pixel'
      ? pending.top
      : minuteToTop(pending?.type === 'minute'
        ? pending.minute
        : getScheduleInitialScrollMinute(activeDateEvents));
    scroller.scrollTop = Math.max(0, Math.min(targetTop, Math.max(0, totalHeight - scroller.clientHeight)));
    lastTimelineScrollTopRef.current = scroller.scrollTop;
    pendingTimelinePositionRef.current = null;
  }, [activeDateEvents, timelinePositionRequest, viewMode]);

  useEffect(() => {
    if (!filterOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || filterRef.current?.contains(target)) return;
      setFilterOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setFilterOpen(false);
      window.requestAnimationFrame(() => filterTriggerRef.current?.focus());
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [filterOpen]);

  useEffect(() => {
    const hasSelectedEvent = Boolean(selectedEvent);
    if (hadSelectedEventRef.current && !hasSelectedEvent) {
      window.requestAnimationFrame(() => lastTriggerRef.current?.focus());
    }
    hadSelectedEventRef.current = hasSelectedEvent;
  }, [selectedEvent]);

  return (
    <div className={styles.page}>
      <header className={styles.toolbar}>
        <div className={styles.weekControls}>
          <button className={styles.currentWeekButton} type="button" onClick={() => selectDate(FIXED_TODAY, 'current')}>
            <RotateCcw aria-hidden="true" size={15} /> 今天
          </button>
          <button type="button" onClick={() => changePeriod(-1)} aria-label={viewMode === 'week' ? '上一周' : '前一天'}><ChevronLeft aria-hidden="true" size={17} /></button>
          <strong>{viewMode === 'week' ? getWeekLabel(days) : formatDate(activeDate) + ' ' + (activeDay?.weekday ?? '')}</strong>
          <button type="button" onClick={() => changePeriod(1)} aria-label={viewMode === 'week' ? '下一周' : '后一天'}><ChevronRight aria-hidden="true" size={17} /></button>
        </div>
        <div className={styles.toolbarActions}>
          <span className={styles.rangeSummary}>{rangeCourseCount + ' 节课，' + rangeActivityCount + ' 项学习活动'}</span>
          <div className={styles.filterControl} ref={filterRef}>
            <button ref={filterTriggerRef} className={styles.filterButton} type="button" aria-label="筛选日程" aria-expanded={filterOpen} aria-controls="schedule-filter-panel" onClick={() => setFilterOpen((open) => !open)}>
              <ListFilter aria-hidden="true" size={15} />筛选{activeFilterCount ? <span>{activeFilterCount}</span> : null}
            </button>
            {filterOpen ? (
              <div className={styles.filterPanel} id="schedule-filter-panel" role="group" aria-label="筛选日程选项">
                <label>班级范围<select aria-label="班级范围" value={classFilter} onChange={(event) => setClassFilter(event.target.value)}><option value="all">全部班级</option>{classOptions.map((option) => <option value={option} key={option}>{option}</option>)}</select></label>
                <label>课程范围<select aria-label="课程范围" value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}><option value="all">全部课程</option>{courseOptions.map((option) => <option value={option} key={option}>{option}</option>)}</select></label>
                <label>事项类型<select aria-label="事项类型" value={kindFilter} onChange={(event) => setKindFilter(event.target.value)}><option value="all">全部类型</option>{(['lesson', 'assignment', 'recording', 'open-course'] as const).map((kind) => <option value={kind} key={kind}>{SCHEDULE_KIND_LABELS[kind]}</option>)}</select></label>
                <label>当前状态<select aria-label="当前状态" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">全部状态</option>{statusOptions.map((option) => <option value={option} key={option}>{option}</option>)}</select></label>
                <button type="button" onClick={() => { setClassFilter('all'); setCourseFilter('all'); setKindFilter('all'); setStatusFilter('all'); }}>清除筛选</button>
              </div>
            ) : null}
          </div>
          <div className={styles.viewSwitch} aria-label="日历视图">
            <button type="button" aria-label="日视图" aria-pressed={viewMode === 'day'} onClick={() => changeView('day')}>日</button>
            <button type="button" aria-label="周视图" aria-pressed={viewMode === 'week'} onClick={() => changeView('week')}>周</button>
          </div>
        </div>
      </header>

      <div className={styles.workspace}>
        <section className={styles.calendar} aria-label={viewMode === 'week' ? '完整周视图' : '单日视图'}>
          <div className={styles.taskBand}>
            <span>学习活动</span>
            <div>
              {spanningAssignments.length ? spanningAssignments.map((event) => (
                <button key={event.id} type="button" onClick={(clickEvent) => selectEvent(event, clickEvent.currentTarget)}>
                  <TeachingObjectIcon kind={getScheduleTeachingObjectKind(event)} size={14} />
                  <span><strong>{event.title}</strong><small>{event.context + ' · ' + event.course}</small></span>
                  <time>{formatDate(event.date) + ' ' + event.startTime + ' 截止'}</time>
                </button>
              )) : <p>{viewMode === 'week' ? '本周没有跨日学习活动' : '当天没有学习活动'}</p>}
            </div>
          </div>

          <div className={styles.timelineHeader} data-view={viewMode}>
            <div className={styles.corner} aria-hidden="true">时间</div>
            {gridDays.map(({ date, day, weekday }, index) => (
              <button className={styles.dayHeader} data-today={date === FIXED_TODAY} style={{ gridColumn: index + 2, gridRow: 1 }} type="button" key={date} aria-pressed={activeDate === date} onClick={() => selectDate(date)}>
                <span>{weekday}</span><strong>{day}</strong>
              </button>
            ))}
          </div>

          <div
            className={styles.timelineScroll}
            ref={timelineScrollRef}
            data-testid="schedule-timeline-scroll"
            aria-label="课程表时间网格"
            role="region"
            tabIndex={0}
            onScroll={(event) => { lastTimelineScrollTopRef.current = event.currentTarget.scrollTop; }}
          >
            <div className={styles.timelineGrid} data-view={viewMode} style={{ '--schedule-day-count': gridDays.length } as CSSProperties}>
              {gridDays.map((day, dayIndex) => (
                <div className={styles.dayColumn} data-selected={day.date === activeDate} style={{ '--schedule-day-index': dayIndex } as CSSProperties} key={'column-' + day.date} />
              ))}
              {TIME_MARKS.map((hour) => (
                <div className={styles.hourLine} data-hour-line={hour} data-timeline-end={hour === 24 ? 'true' : undefined} style={{ '--schedule-line-minute': hour * 60 } as CSSProperties} key={'hour-' + hour} />
              ))}
              {TIME_MARKS.map((hour) => (
                <span className={styles.timeLabel} data-hour-label={hour} style={{ '--schedule-line-minute': hour * 60 } as CSSProperties} key={'label-' + hour}>{String(hour).padStart(2, '0') + ':00'}</span>
              ))}
            {rangeEvents.map((event) => {
              const dayIndex = gridDays.findIndex(({ date }) => date === event.date);
              const placement = getScheduleEventPlacement(event);
              return (
                <button
                  className={styles.event}
                  data-kind={event.kind}
                  data-selected={event.id === selectedEvent?.id}
                  style={{
                    '--schedule-day-index': dayIndex,
                    '--schedule-event-start': placement.startMinute,
                    '--schedule-event-duration': placement.durationMinutes,
                  } as CSSProperties}
                  type="button"
                  key={event.id}
                  aria-label={event.startTime + ' ' + event.title + '，' + getEventObjectLabel(event)}
                  onClick={(clickEvent) => selectEvent(event, clickEvent.currentTarget)}
                >
                  <time>{event.startTime}</time><strong><TeachingObjectIcon kind={getScheduleTeachingObjectKind(event)} size={12} /><span>{event.title}</span></strong><small>{event.course}</small>
                </button>
              );
            })}
              {gridDays.map(({ date }, dayIndex) => date === FIXED_TODAY ? (
                <div
                  className={styles.currentTimeLine}
                  data-testid="current-time-line"
                  role="img"
                  aria-label={'当前时间 ' + currentTimeLabel}
                  style={{ '--schedule-day-index': dayIndex, '--schedule-line-minute': currentTimeMinute } as CSSProperties}
                  key="current-time-line"
                ><span>{currentTimeLabel}</span></div>
              ) : null)}
            </div>
          </div>
        </section>
      </div>

      <aside className={styles.rightRail} aria-label="课程表辅助栏">
          <aside className={styles.monthPanel} aria-label="月历">
            <header>
              <h2 id="schedule-month-heading">{viewedMonth.getFullYear() + '年' + (viewedMonth.getMonth() + 1) + '月'}</h2>
              <div>
                <button type="button" aria-label="上个月" onClick={() => setMonthOffset((offset) => offset - 1)}><ChevronLeft aria-hidden="true" size={16} /></button>
                <button type="button" aria-label="下个月" onClick={() => setMonthOffset((offset) => offset + 1)}><ChevronRight aria-hidden="true" size={16} /></button>
              </div>
            </header>
            <div className={styles.monthWeekdays}>{WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}</div>
            <div className={styles.monthGrid}>
              {monthDays.map((date) => {
                const key = toDateKey(date);
                const count = getCourseCountForDate(key, filteredEvents);
                const outside = date.getMonth() !== viewedMonth.getMonth();
                const ariaLabel = (date.getMonth() + 1) + '月' + date.getDate() + '日，' + count + '节课' + (key === FIXED_TODAY ? '，今天' : '');
                return (
                  <button type="button" key={key} aria-label={ariaLabel} aria-pressed={activeDate === key} data-outside={outside} data-today={key === FIXED_TODAY} onClick={() => selectDate(key)}>
                    <span>{date.getDate()}</span>
                    {count > 0 ? <small>{count}</small> : null}
                  </button>
                );
              })}
            </div>
          </aside>

          <aside className={styles.dayPanel} aria-label="当日安排">
            <header className={styles.dayPanelHeader}>
              <div><span>{formatDate(activeDate)}</span><h2 id="schedule-day-heading">{activeDay?.weekday ?? ''}当日安排</h2></div>
              <span>{courseCount + ' 节课'}</span>
            </header>
            <div className={styles.courseGroups} data-testid="schedule-day-agenda-scroll" aria-label="当日课程列表" role="region" tabIndex={0}>
              {courseGroups.length ? courseGroups.map((group) => (
                <section className={styles.courseGroup} aria-label={group.className + ' · ' + group.courseName} key={group.id}>
                  <header><span>{group.className}</span><h3 id={'schedule-group-' + group.id}>{group.courseName}</h3>{group.unitName ? <p>{group.unitName}</p> : null}</header>
                  <div className={styles.groupEvents}>
                    {group.events.map((event) => {
                      const action = resolveScheduleActions(role, event, currentTime).primary;
                      return (
                        <article key={event.id} data-event-id={event.id} data-kind={event.kind}>
                          <button
                            className={styles.agendaContent}
                            type="button"
                            onClick={(clickEvent) => selectEvent(event, clickEvent.currentTarget, activeDate)}
                            aria-label={'查看 ' + event.startTime + ' ' + event.title + '，' + getEventObjectLabel(event)}
                          >
                            <time>{event.startTime}</time>
                            <span><strong><TeachingObjectIcon kind={getScheduleTeachingObjectKind(event)} size={14} /><span>{event.title}</span></strong><small>{getEventObjectLabel(event) + ' · ' + getEventStateLabel(role, event)}</small></span>
                          </button>
                          <TeachingActionButton action={action} type="button" aria-label={`${event.title}：${action.label}`} onClick={(clickEvent) => selectEventAction(event, action, clickEvent.currentTarget, activeDate)} />
                        </article>
                      );
                    })}
                  </div>
                </section>
              )) : (
                <div className={styles.emptyDay}><CalendarClock aria-hidden="true" size={20} /><strong>当天没有课程或学习活动</strong><span>可以选择其他日期查看。</span></div>
              )}
            </div>
          </aside>
      </aside>

      {selectedEvent?.kind === 'open-course' && selectedTeacherOpenCourse ? (
        <TeacherOpenCourseDetailDialog
          course={toOpenCourseWorkspaceRecord(selectedTeacherOpenCourse)}
          onClose={closeDetails}
          onEdit={() => navigate(`/teacher/open-courses?${new URLSearchParams({
            source: 'teacher_schedule',
            date: activeDate,
            view: viewMode,
            event: selectedEvent.id,
            dialog: 'edit',
            course: selectedEvent.openCourseId,
            returnTo: 'detail',
          }).toString()}`)}
          onInvite={() => navigate(`/teacher/open-courses?${new URLSearchParams({
            source: 'teacher_schedule',
            date: activeDate,
            view: viewMode,
            event: selectedEvent.id,
            dialog: 'invite',
            course: selectedEvent.openCourseId,
          }).toString()}`)}
          onDelete={() => {
            classStore?.setOpenCourses((records) => records.filter(({ id }) => id !== selectedEvent.openCourseId));
            closeDetails();
          }}
          onEnter={() => navigate(`/teacher/open-courses/${selectedEvent.openCourseId}/preflight?${new URLSearchParams({
            source: 'teacher_schedule',
            date: activeDate,
            view: viewMode,
            event: selectedEvent.id,
            dialog: 'detail',
            course: selectedEvent.openCourseId,
          }).toString()}`)}
        />
      ) : selectedEvent ? (
        <ScheduleDetailDialog
          event={selectedEvent}
          role={role}
          onClose={closeDetails}
          onNavigate={navigate}
          scheduleContext={{ date: activeDate, view: viewMode }}
          onCreateHomework={(event) => navigate(resolveScheduleHomeworkCreateDestination(event, viewMode))}
          initialView={quickAction?.eventId === selectedEvent.id ? 'operation' : 'detail'}
          selectedAction={quickAction?.eventId === selectedEvent.id ? quickAction.action : undefined}
          now={currentTime}
        />
      ) : requestedEventId ? <p className={styles.unavailable} role="status">目标日程在当前视角不可用</p> : null}
    </div>
  );
}
