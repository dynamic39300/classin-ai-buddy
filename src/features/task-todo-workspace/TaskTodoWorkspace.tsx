import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ListFilter,
  Search,
  Send,
  X,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TeachingObjectIcon } from '@design-system/TeachingObjectIcon';
import { TeachingActionButton } from '@design-system/TeachingActionButton';
import type { AppRole } from '@domain/account/role';
import {
  archiveTaskManually,
  buildTaskSections,
  formatTaskTime,
  getTaskCompletionLabel,
  getTaskStateLabel,
  getVisibleTaskItems,
  resolveTaskActions,
  resolveTaskUrgency,
  restoreTaskManually,
  TASK_KIND_LABELS,
  TASK_URGENCY_LABELS,
  type TaskActionSet,
  type TaskFilters,
  type TaskItem,
  type TaskKind,
  type TaskLifecycle,
} from '@domain/task/task';
import { getTaskTeachingObjectKind } from '@domain/teaching-object/teaching-object';
import type { TeachingQuickAction } from '@domain/teaching-action/teaching-action';
import { TASK_ITEMS, TASK_NOW } from '@mocks/scenarios/tasks';
import styles from './TaskTodoWorkspace.module.css';

const EMPTY_FILTERS: TaskFilters = {
  query: '',
  kind: 'all',
  classId: 'all',
  course: 'all',
  urgency: 'all',
};

function resolveInitialClassFilter(role: AppRole, value: string | null): string {
  if (!value || value === 'all') return 'all';
  return getVisibleTaskItems(role, TASK_ITEMS).some((item) => item.classId === value) ? value : 'all';
}

function resolveInitialTaskKind(value: string | null): TaskFilters['kind'] {
  return value && value in TASK_KIND_LABELS ? value as TaskKind : 'all';
}

function resolveInitialCourseFilter(role: AppRole, value: string | null): string {
  if (!value || value === 'all') return 'all';
  return getVisibleTaskItems(role, TASK_ITEMS).some((item) => item.course === value) ? value : 'all';
}

function resolveInitialLifecycle(value: string | null): TaskLifecycle {
  return value === 'done' ? 'done' : 'open';
}

function formatDetailDate(item: TaskItem): string {
  const raw = item.dueAt ?? item.startsAt;
  if (!raw) return '无截止时间';
  const date = new Date(raw);
  const suffix = item.dueAt ? '截止' : '开始';
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} ${suffix}`;
}

function getStudentInsight(item: TaskItem): string {
  if (item.studentState === 'graded') return item.score === undefined ? '已批改 · 查看老师反馈' : `得分 ${item.score} · 有老师反馈`;
  if (item.studentState === 'needs-correction') return '老师已退回 · 需要订正后再次提交';
  if (item.studentState === 'submitted') return '已提交 · 等待老师批改';
  if (item.studentState === 'in-progress') return '草稿已保存 · 可以继续完成';
  if (item.studentState === 'not-started' && item.allowLateSubmission && item.dueAt && new Date(item.dueAt).getTime() < TASK_NOW.getTime()) {
    return '未提交 · 已截止 · 允许补交';
  }
  if (item.kind === 'classroom') return '课前目标：按时进入课堂';
  return item.studentGoal ? `学习目标：${item.studentGoal}` : '按要求完成本次学习任务';
}

function getTaskRowStatus(role: AppRole, item: TaskItem, lifecycle: TaskLifecycle): string {
  if (lifecycle === 'done') return getTaskCompletionLabel(role, item);
  if (role === 'teacher') {
    return item.teacherProgress
      ? `${getTaskStateLabel(role, item)}（${item.teacherProgress.submittedCount}/${item.teacherProgress.totalCount}）`
      : getTaskStateLabel(role, item);
  }
  if (item.kind === 'classroom') return '待上课';
  if (item.studentState === 'not-started' && item.allowLateSubmission && item.dueAt && new Date(item.dueAt).getTime() < TASK_NOW.getTime()) {
    return '逾期 · 可补交';
  }
  const state = getTaskStateLabel(role, item);
  return item.studentState === 'graded' && item.score !== undefined ? `${state} · ${item.score}分` : state;
}

type TaskTodoWorkspaceProps = {
  role: AppRole;
  detailId?: string;
};

type TaskDialogView =
  | { kind: 'detail' }
  | { kind: 'action'; action: TeachingQuickAction };

type TaskActionSlot = 'primary' | 'secondary';

function isReminderAction(action: TeachingQuickAction): boolean {
  return action.id === 'remind-submission';
}

function getOperationTitle(role: AppRole, item: TaskItem, view: TaskDialogView): string {
  if (view.kind !== 'action') return item.title;
  if (isReminderAction(view.action)) return '确认催交';
  if (view.action.priority === 'primary' && role === 'teacher' && (item.kind === 'homework' || item.kind === 'quiz')) return '作业批改';
  return view.action.label;
}

function getOperationDescription(role: AppRole, item: TaskItem): string {
  if (item.kind === 'classroom') return '当前 Demo 未连接课堂服务。你可以确认课程信息，但不会真正进入教室。';
  if (item.kind === 'recorded') return '当前 Demo 未连接录播服务。此处保留观看入口，不会加载或播放视频。';
  if (item.kind === 'material' || item.kind === 'scorm') return '当前 Demo 未连接资料服务。此处保留学习入口，不会加载内容或记录学习进度。';
  if (item.kind === 'announcement') return '当前 Demo 未连接公告服务。此处只展示任务上下文，不改变消息已读状态。';
  if (item.kind === 'homework' || item.kind === 'quiz') {
    return role === 'teacher'
      ? '当前 Demo 未连接批改服务。此处只展示班级整体进度，不写入成绩或批改结果。'
      : '当前 Demo 未连接作答服务。此处只展示本人任务状态，不提交作答或更改完成状态。';
  }
  return `当前 Demo 未连接${TASK_KIND_LABELS[item.kind]}服务。此处保留操作入口，不改变任务状态。`;
}

export function TaskTodoWorkspace({ role, detailId }: TaskTodoWorkspaceProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedClassFilter = searchParams.get('class');
  const requestedCourseFilter = searchParams.get('course');
  const resolvedClassFilter = resolveInitialClassFilter(role, requestedClassFilter);
  const resolvedCourseFilter = resolveInitialCourseFilter(role, requestedCourseFilter);
  const invalidClassFilter = Boolean(requestedClassFilter && resolvedClassFilter === 'all');
  const invalidCourseFilter = Boolean(requestedCourseFilter && resolvedCourseFilter === 'all');
  const [items, setItems] = useState<ReadonlyArray<TaskItem>>(TASK_ITEMS);
  const lifecycle = resolveInitialLifecycle(searchParams.get('lifecycle'));
  const queryFilter = searchParams.get('q') ?? '';
  const kindFilter = resolveInitialTaskKind(searchParams.get('kind'));
  const filters = useMemo<TaskFilters>(() => ({
    ...EMPTY_FILTERS,
    query: queryFilter,
    kind: kindFilter,
    classId: resolvedClassFilter,
    course: resolvedCourseFilter,
  }), [kindFilter, queryFilter, resolvedClassFilter, resolvedCourseFilter]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [dialogView, setDialogView] = useState<TaskDialogView>({ kind: 'detail' });
  const [operationResult, setOperationResult] = useState<string | null>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const taskListRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const initialDialogFocusRef = useRef<HTMLButtonElement>(null);
  const restoreDialogTriggerRef = useRef(false);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const initialScrollTopRef = useRef(Number(searchParams.get('scroll')));

  const visibleItems = useMemo(() => getVisibleTaskItems(role, items), [items, role]);
  const sections = useMemo(
    () => buildTaskSections(role, items, filters, lifecycle, TASK_NOW),
    [filters, items, lifecycle, role],
  );
  const requestedTaskId = detailId ?? searchParams.get('task');
  const selectedTaskIdRef = useRef(requestedTaskId);
  const selectedItem = requestedTaskId ? visibleItems.find(({ id }) => id === requestedTaskId) ?? null : null;
  const selectedActions = selectedItem ? resolveTaskActions(role, selectedItem, TASK_NOW) : null;
  const classes = Array.from(new Map(visibleItems.map((item) => [item.classId, item.className])).entries());
  const courses = [...new Set(visibleItems.map((item) => item.course))];
  const activeFilterCount = Number(filters.kind !== 'all') + Number(filters.classId !== 'all') + Number(filters.course !== 'all');

  useLayoutEffect(() => {
    const requestedScroll = initialScrollTopRef.current;
    if (!Number.isFinite(requestedScroll) || requestedScroll <= 0 || !taskListRef.current) return;
    taskListRef.current.scrollTop = requestedScroll;
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!selectedItem || detailId || !dialog) return;
    if (!dialog.open) dialog.showModal();
    initialDialogFocusRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [detailId, selectedItem]);

  useEffect(() => {
    if (selectedItem || !restoreDialogTriggerRef.current) return;
    restoreDialogTriggerRef.current = false;
    window.requestAnimationFrame(() => lastTriggerRef.current?.focus());
  }, [selectedItem]);

  useEffect(() => {
    if (selectedTaskIdRef.current === requestedTaskId) return;
    selectedTaskIdRef.current = requestedTaskId;
    setDialogView({ kind: 'detail' });
    setOperationResult(null);
  }, [requestedTaskId]);

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

  const selectItem = (item: TaskItem, trigger: HTMLButtonElement) => {
    lastTriggerRef.current = trigger;
    selectedTaskIdRef.current = item.id;
    setFeedback(null);
    setOperationResult(null);
    setDialogView({ kind: 'detail' });
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('task', item.id);
      return next;
    }, { replace: true });
  };

  const closeDetails = () => {
    setFeedback(null);
    setOperationResult(null);
    setDialogView({ kind: 'detail' });
    selectedTaskIdRef.current = null;
    if (detailId) {
      const prefix = role === 'teacher' ? '/teacher' : '/student';
      navigate(searchParams.get('from') === 'home'
        ? `${prefix}/home`
        : role === 'teacher' ? '/teacher/tasks' : '/student/todos');
      return;
    }
    restoreDialogTriggerRef.current = true;
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('task');
      return next;
    }, { replace: true });
  };

  const changeLifecycle = (next: TaskLifecycle) => {
    setFeedback(null);
    setOperationResult(null);
    setDialogView({ kind: 'detail' });
    setSearchParams((current) => {
      const nextParams = new URLSearchParams(current);
      if (next === 'open') nextParams.delete('lifecycle');
      else nextParams.set('lifecycle', next);
      nextParams.delete('task');
      return nextParams;
    }, { replace: true });
  };

  const updateQuery = (query: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (query) next.set('q', query);
      else next.delete('q');
      next.delete('task');
      return next;
    }, { replace: true });
  };

  const updateClassFilter = (classId: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (classId === 'all') next.delete('class');
      else next.set('class', classId);
      next.delete('task');
      return next;
    }, { replace: true });
  };

  const updateKindFilter = (kind: TaskFilters['kind']) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (kind === 'all') next.delete('kind');
      else next.set('kind', kind);
      next.delete('task');
      return next;
    }, { replace: true });
  };

  const updateCourseFilter = (course: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (course === 'all') next.delete('course');
      else next.set('course', course);
      next.delete('task');
      return next;
    }, { replace: true });
  };

  const clearFilters = () => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('q');
      next.delete('class');
      next.delete('course');
      next.delete('kind');
      next.delete('task');
      return next;
    }, { replace: true });
  };

  const openActionView = (
    item: TaskItem,
    trigger: HTMLButtonElement | null,
    slot: TaskActionSlot,
  ) => {
    const actions = resolveTaskActions(role, item, TASK_NOW);
    const action = actions[slot];
    if (!action) return;
    if (trigger) lastTriggerRef.current = trigger;
    selectedTaskIdRef.current = item.id;
    setFeedback(null);
    setOperationResult(null);
    setDialogView({ kind: 'action', action });
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('task', item.id);
      return next;
    }, { replace: true });
  };

  const runSecondaryAction = (item: TaskItem, trigger: HTMLButtonElement) => {
    openActionView(item, trigger, 'secondary');
  };

  const confirmReminderAction = (item: TaskItem) => {
    const progress = item.teacherProgress;
    const pending = progress ? Math.max(0, progress.totalCount - progress.submittedCount) : 0;
    setOperationResult(`已准备向 ${pending} 名未提交学生发送催交通知；本 Demo 不真实发送。`);
  };

  const updateArchiveState = (item: TaskItem) => {
    const roleState = item.roleState[role];
    const next = roleState?.lifecycle === 'open'
      ? archiveTaskManually(role, item, '2026-08-08T14:10:00+08:00')
      : restoreTaskManually(role, item);
    if (next === item) return;
    setItems((current) => current.map((candidate) => candidate.id === item.id ? next : candidate));
    const nextLifecycle = roleState?.lifecycle === 'open' ? 'done' : 'open';
    setSearchParams((current) => {
      const nextParams = new URLSearchParams(current);
      if (nextLifecycle === 'open') nextParams.delete('lifecycle');
      else nextParams.set('lifecycle', nextLifecycle);
      return nextParams;
    }, { replace: true });
    setFeedback(roleState?.lifecycle === 'open' ? '已忽略，可从已处理恢复。' : '已恢复到待处理列表。');
  };

  const renderOperationView = (item: TaskItem, pendingCount: number) => {
    if (dialogView.kind === 'action' && isReminderAction(dialogView.action)) {
      return (
        <section className={styles.operationBody} aria-label="催交范围确认">
          <div className={styles.operationIntro}>
            <strong>向 {pendingCount} 名未提交学生发送催交通知？</strong>
            <p>只发送系统提醒，不改变学生提交状态。</p>
          </div>
          {operationResult ? <p className={styles.operationResult} role="status">{operationResult}</p> : null}
        </section>
      );
    }

    const progress = item.teacherProgress;
    return (
      <section className={styles.operationBody} aria-label={`${TASK_KIND_LABELS[item.kind]}操作`}>
        <p className={styles.operationBoundary} role="status">{getOperationDescription(role, item)}</p>
        {role === 'teacher' && progress ? (
          <section className={styles.progressSection} aria-label="提交与批改进度">
            <div className={styles.sectionLabel}><span>提交与批改</span><strong>{progress.totalCount ? Math.round((progress.submittedCount / progress.totalCount) * 100) : 0}%</strong></div>
            <div className={styles.metricRow}>
              <div><strong>{progress.submittedCount}</strong><span>已提交</span></div>
              <div><strong>{pendingCount}</strong><span>未提交</span></div>
              <div><strong>{progress.reviewedCount}</strong><span>已批改</span></div>
            </div>
          </section>
        ) : null}
        {role === 'student-family' ? (
          <section className={styles.learningSection}>
            <span>当前状态</span>
            <strong>{getStudentInsight(item)}</strong>
            {item.studentGoal ? <p>{item.studentGoal}</p> : null}
          </section>
        ) : null}
        <dl className={styles.operationMeta}>
          <div><dt>课程</dt><dd>{item.course}</dd></div>
          <div><dt>{role === 'teacher' ? '教学班级' : '老师'}</dt><dd>{role === 'teacher' ? item.className : item.actorName}</dd></div>
          <div><dt>时间</dt><dd>{formatDetailDate(item)}</dd></div>
        </dl>
      </section>
    );
  };

  const returnToDetail = () => {
    setDialogView({ kind: 'detail' });
    setOperationResult(null);
    window.requestAnimationFrame(() => initialDialogFocusRef.current?.focus());
  };

  const renderDetails = (item: TaskItem, actions: TaskActionSet) => {
    const urgency = resolveTaskUrgency(role, item, TASK_NOW);
    const roleState = item.roleState[role];
    const canUndo = roleState?.completion === 'manual';
    const teachingObjectKind = getTaskTeachingObjectKind(item.kind);
    const progress = item.teacherProgress;
    const pendingCount = progress ? Math.max(0, progress.totalCount - progress.submittedCount) : 0;
    const submittedPercent = progress?.totalCount
      ? Math.round((progress.submittedCount / progress.totalCount) * 100)
      : 0;
    const secondaryAction = actions.secondary;
    const isActionView = dialogView.kind === 'action';
    const operationTitle = getOperationTitle(role, item, dialogView);

    return (
      <section className={styles.details} aria-labelledby="task-detail-title">
        <header>
          {isActionView ? (
            <button type="button" onClick={returnToDetail} aria-label="返回任务详情" title="返回任务详情">
              <ArrowLeft aria-hidden="true" size={17} />
            </button>
          ) : null}
          <div className={styles.detailTitle}>
            <span className={styles.detailKind} data-kind={item.kind}>
              <TeachingObjectIcon kind={teachingObjectKind} size={15} />{TASK_KIND_LABELS[item.kind]}
            </span>
            <h2 id="task-detail-title">{isActionView ? operationTitle : item.title}</h2>
            <p>{item.course} · {item.className}</p>
          </div>
          <button
            type="button"
            onClick={closeDetails}
            aria-label={isActionView ? '关闭任务操作' : detailId ? '返回' : '关闭任务详情'}
            title={isActionView ? '关闭任务操作' : detailId ? '返回' : '关闭任务详情'}
          >
            {detailId && !isActionView ? <ArrowLeft aria-hidden="true" size={17} /> : <X aria-hidden="true" size={17} />}
          </button>
        </header>

        {isActionView ? renderOperationView(item, pendingCount) : <div className={styles.detailBody}>
          <div className={styles.detailStatusLine}>
            <span data-urgency={urgency}>{lifecycle === 'done' ? getTaskCompletionLabel(role, item) : TASK_URGENCY_LABELS[urgency]}</span>
            <strong>{getTaskStateLabel(role, item)}</strong>
          </div>

          <dl className={styles.detailMeta}>
            <div><dt>时间</dt><dd>{formatDetailDate(item)}</dd></div>
            <div><dt>{role === 'teacher' ? '教学班级' : '老师'}</dt><dd>{role === 'teacher' ? item.className : item.actorName}</dd></div>
          </dl>

          {role === 'teacher' && progress ? (
            <section className={styles.progressSection} aria-label="提交与批改进度">
              <div className={styles.sectionLabel}><span>提交与批改</span><strong>{submittedPercent}%</strong></div>
              <div className={styles.progressTrack} role="progressbar" aria-label="提交率" aria-valuemin={0} aria-valuemax={progress.totalCount} aria-valuenow={progress.submittedCount} aria-valuetext={`${progress.submittedCount}人已提交，共${progress.totalCount}人`}>
                <i style={{ width: `${submittedPercent}%` }} />
              </div>
              <div className={styles.metricRow}>
                <div><strong>{progress.submittedCount}</strong><span>已提交</span></div>
                <div><strong>{pendingCount}</strong><span>未提交</span></div>
                <div><strong>{progress.reviewedCount}</strong><span>已批改</span></div>
              </div>
            </section>
          ) : null}

          {role === 'student-family' ? (
            <section className={styles.learningSection}>
              <span>当前状态</span>
              <strong>{getStudentInsight(item)}</strong>
              {item.studentGoal ? <p>{item.studentGoal}</p> : null}
            </section>
          ) : null}

          {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}
        </div>}

        <footer className={styles.detailActions}>
          {isActionView ? (
            <>
              <span />
              {isReminderAction(dialogView.action) ? (
                <>
                  <button className={styles.secondaryAction} type="button" onClick={returnToDetail}>取消</button>
                  <button className={styles.primaryAction} type="button" onClick={() => confirmReminderAction(item)} ref={initialDialogFocusRef}>确认催交</button>
                </>
              ) : (
                <button className={styles.primaryAction} type="button" onClick={closeDetails} ref={initialDialogFocusRef}>关闭</button>
              )}
            </>
          ) : (item.manualArchiveAllowed || canUndo) ? (
            <button className={styles.archiveAction} type="button" onClick={() => updateArchiveState(item)}>
              <CheckCircle2 aria-hidden="true" size={15} />{canUndo ? '恢复待处理' : '忽略此提醒'}
            </button>
          ) : <span />}
          {!isActionView && secondaryAction ? (
            <button className={styles.secondaryAction} type="button" onClick={() => openActionView(item, null, 'secondary')}>
              {isReminderAction(secondaryAction) ? <Send aria-hidden="true" size={15} /> : <ArrowRight aria-hidden="true" size={15} />}{secondaryAction.label}
            </button>
          ) : null}
          {!isActionView ? <button className={styles.primaryAction} type="button" onClick={() => openActionView(item, null, 'primary')} ref={initialDialogFocusRef}>
            {actions.primary.label}<ArrowRight aria-hidden="true" size={15} />
          </button> : null}
        </footer>
      </section>
    );
  };

  if (detailId) {
    return (
      <div className={styles.standalonePage}>
        {selectedItem && selectedActions ? renderDetails(selectedItem, selectedActions) : (
          <div className={styles.emptyState}>
            <CheckCircle2 aria-hidden="true" size={22} />
            <strong>目标任务在当前视角不可用</strong>
            <button type="button" onClick={closeDetails}>返回</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.toolbar}>
        <div className={styles.segmented} aria-label={role === 'teacher' ? '任务状态' : '待办状态'}>
          <button type="button" aria-pressed={lifecycle === 'open'} onClick={() => changeLifecycle('open')}>
            {role === 'teacher' ? '待处理' : '待完成'}
          </button>
          <button type="button" aria-pressed={lifecycle === 'done'} onClick={() => changeLifecycle('done')}>已处理</button>
        </div>

        <label className={styles.searchBox}>
          <Search aria-hidden="true" size={16} />
          <span className={styles.srOnly}>{role === 'teacher' ? '搜索任务' : '搜索待办'}</span>
          <input
            type="search"
            value={filters.query}
            onChange={(event) => updateQuery(event.target.value)}
            placeholder={role === 'teacher' ? '搜索任务、课程或班级' : '搜索待办、课程或班级'}
          />
        </label>

        <div className={styles.filterControl} ref={filterRef}>
          <button
            className={styles.filterButton}
            ref={filterTriggerRef}
            type="button"
            aria-label={role === 'teacher' ? '筛选任务' : '筛选待办'}
            aria-expanded={filterOpen}
            aria-controls="task-filter-panel"
            onClick={() => setFilterOpen((open) => !open)}
          >
            <ListFilter aria-hidden="true" size={15} />筛选{activeFilterCount ? <span>{activeFilterCount}</span> : null}
          </button>
          {filterOpen ? (
            <div className={styles.filterPanel} id="task-filter-panel" role="group" aria-label={role === 'teacher' ? '筛选任务选项' : '筛选待办选项'}>
              <label>班级范围<select aria-label="班级范围" value={filters.classId} onChange={(event) => updateClassFilter(event.target.value)}><option value="all">全部班级</option>{classes.map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></label>
              <label>课程范围<select aria-label="课程范围" value={filters.course} onChange={(event) => updateCourseFilter(event.target.value)}><option value="all">全部课程</option>{courses.map((course) => <option value={course} key={course}>{course}</option>)}</select></label>
              <label>任务类型<select aria-label="任务类型" value={filters.kind} onChange={(event) => updateKindFilter(event.target.value as TaskFilters['kind'])}><option value="all">全部类型</option>{(Object.keys(TASK_KIND_LABELS) as TaskKind[]).map((kind) => <option value={kind} key={kind}>{TASK_KIND_LABELS[kind]}</option>)}</select></label>
              <button type="button" disabled={activeFilterCount === 0 && filters.query === ''} onClick={clearFilters}>清除筛选</button>
            </div>
          ) : null}
        </div>
      </header>

      <main className={styles.taskList} aria-label={role === 'teacher' ? '任务列表' : '待办列表'} ref={taskListRef}>
        {(invalidClassFilter || invalidCourseFilter || (feedback && !selectedItem)) ? <p className={styles.feedback} role="status">{invalidClassFilter ? '当前班级筛选不可用，已显示全部班级。' : invalidCourseFilter ? '当前课程筛选不可用，已显示全部课程。' : feedback}</p> : null}
        {requestedTaskId && !selectedItem ? <p className={styles.feedback} role="status">目标任务在当前视角不可用。</p> : null}

        {sections.length ? sections.map((section) => (
          <section className={styles.taskSection} key={section.bucket} aria-labelledby={`task-section-${section.bucket}`}>
            <header>
              <div><h2 id={`task-section-${section.bucket}`}>{section.title}</h2><span>{section.items.length}</span></div>
            </header>
            <div className={styles.rows}>
              {section.items.map((item) => {
                const teachingObjectKind = getTaskTeachingObjectKind(item.kind);
                const urgency = resolveTaskUrgency(role, item, TASK_NOW);
                const actions = resolveTaskActions(role, item, TASK_NOW);
                const rowStatus = getTaskRowStatus(role, item, lifecycle);
                return (
                  <article className={styles.taskRow} data-bucket={section.bucket} data-kind={item.kind} data-urgency={urgency} key={item.id}>
                    <span className={styles.kindIcon} data-kind={item.kind}><TeachingObjectIcon kind={teachingObjectKind} size={17} /></span>
                    <button className={styles.rowMain} type="button" aria-describedby={`task-row-status-${item.id}`} onClick={(event) => selectItem(item, event.currentTarget)}>
                      <span className={styles.rowTitle}><strong>{item.title}</strong><small data-kind={item.kind}>{TASK_KIND_LABELS[item.kind]}</small></span>
                      <span className={styles.rowMeta}>{item.className} · {formatTaskTime(role, item, TASK_NOW)}</span>
                    </button>
                    <span className={styles.rowStatus} id={`task-row-status-${item.id}`}>{rowStatus}</span>
                    <div className={styles.rowCommands}>
                      {actions.secondary ? (
                        <TeachingActionButton action={actions.secondary} type="button" onClick={(event) => runSecondaryAction(item, event.currentTarget)} />
                      ) : null}
                      <TeachingActionButton action={actions.primary} type="button" onClick={(event) => openActionView(item, event.currentTarget, 'primary')} disabled={actions.primary.disabled} title={actions.primary.hint} />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )) : (
          <div className={styles.emptyState}>
            <CheckCircle2 aria-hidden="true" size={22} />
            <strong>{filters.query || activeFilterCount > 0 ? '没有符合条件的内容' : lifecycle === 'open' ? '当前没有待处理事项' : '暂无已处理记录'}</strong>
            {filters.query || activeFilterCount > 0 ? <button type="button" aria-label="清除全部筛选" onClick={clearFilters}>清除筛选</button> : null}
          </div>
        )}
      </main>

      {selectedItem && selectedActions ? (
        <dialog
          className={styles.dialogBackdrop}
          ref={dialogRef}
          aria-labelledby="task-detail-title"
          onCancel={(event) => { event.preventDefault(); closeDetails(); }}
          onMouseDown={(event) => { if (event.target === event.currentTarget) closeDetails(); }}
        >
          <div className={styles.dialogSurface}>
            {renderDetails(selectedItem, selectedActions)}
          </div>
        </dialog>
      ) : null}
    </div>
  );
}
