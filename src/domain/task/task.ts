import type { AppRole } from '@domain/account/role';
import { asPrimary, asSecondary, type TeachingQuickActionSet } from '@domain/teaching-action/teaching-action';

export type TaskKind =
  | 'classroom'
  | 'homework'
  | 'quiz'
  | 'announcement'
  | 'discussion'
  | 'answer-sheet'
  | 'check-in'
  | 'recorded'
  | 'material'
  | 'scorm'
  | 'schedule'
  | 'ai-oral';
export type TaskUrgency = 'urgent' | 'watch' | 'later';
export type TaskTimeBucket = 'overdue' | 'today' | 'later';
export type TaskLifecycle = 'open' | 'done';
export type StudentTaskState =
  | 'not-started'
  | 'in-progress'
  | 'submitted'
  | 'needs-correction'
  | 'graded';
export type TeacherTaskState = 'collecting' | 'grading' | 'published';

export type TaskRoleState = {
  lifecycle: TaskLifecycle;
  completion: 'business' | 'manual' | null;
  archivedAt: string | null;
};

export type TaskItem = {
  id: string;
  organizationId: string;
  kind: TaskKind;
  title: string;
  course: string;
  unitName?: string;
  classId: string;
  className: string;
  actorName: string;
  dueAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  link: {
    homeworkId?: string;
    lessonId?: string;
    announcementId?: string;
  };
  roleState: Partial<Record<AppRole, TaskRoleState>>;
  teacherState?: TeacherTaskState;
  teacherProgress?: {
    submittedCount: number;
    totalCount: number;
    reviewedCount: number;
  };
  studentState?: StudentTaskState;
  studentGoal?: string;
  score?: number;
  allowLateSubmission?: boolean;
  manualArchiveAllowed?: boolean;
};

export type TaskFilters = {
  query: string;
  kind: TaskKind | 'all';
  classId: string | 'all';
  course: string | 'all';
  urgency: TaskUrgency | 'all';
};

export type TaskSection = {
  bucket: TaskTimeBucket | 'done';
  title: string;
  items: TaskItem[];
};

export type TaskAction = {
  label: string;
};

export type TaskActionKind = 'operation-dialog' | 'placeholder-dialog';

export type TaskPrimaryAction = TaskAction & {
  kind: TaskActionKind;
  disabled?: boolean;
  hint?: string;
};

export type TaskSecondaryAction = {
  label: string;
  kind: 'confirm-dialog';
};

export type TaskActionSet = TeachingQuickActionSet;

export const TASK_KIND_LABELS: Record<TaskKind, string> = {
  classroom: '课堂',
  homework: '作业',
  quiz: '测验',
  announcement: '公告',
  discussion: '讨论',
  'answer-sheet': '答题卡',
  'check-in': '打卡',
  recorded: '录播课',
  material: '学习资料',
  scorm: 'SCORM',
  schedule: '日程',
  'ai-oral': 'AI口语卡',
};

export const TASK_URGENCY_LABELS: Record<TaskUrgency, string> = {
  urgent: '紧急',
  watch: '关注',
  later: '可稍后',
};

export const TASK_BUCKET_LABELS: Record<TaskTimeBucket, string> = {
  overdue: '已过截止',
  today: '今日要处理',
  later: '后续要处理',
};

const DAY_MS = 24 * 60 * 60 * 1000;

function getRoleState(role: AppRole, item: TaskItem): TaskRoleState | undefined {
  return item.roleState[role];
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function isSameDay(iso: string | null, now: Date): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  return !Number.isNaN(date.getTime()) && startOfDay(date) === startOfDay(now);
}

function sortTime(item: TaskItem): number {
  const value = item.dueAt ?? item.startsAt ?? item.createdAt;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

export function getVisibleTaskItems(
  role: AppRole,
  items: ReadonlyArray<TaskItem>,
): TaskItem[] {
  return items.filter((item) => getRoleState(role, item) !== undefined);
}

export function resolveTaskUrgency(
  role: AppRole,
  item: TaskItem,
  now: Date,
): TaskUrgency {
  if (getRoleState(role, item)?.lifecycle === 'done') return 'later';

  const anchor = item.dueAt ?? item.startsAt;
  if (!anchor) return 'later';
  const time = new Date(anchor).getTime();
  if (Number.isNaN(time)) return 'later';
  const delta = time - now.getTime();
  if (delta <= DAY_MS) return 'urgent';
  if (delta <= 7 * DAY_MS) return 'watch';
  return 'later';
}

export function resolveTaskTimeBucket(
  role: AppRole,
  item: TaskItem,
  now: Date,
): TaskTimeBucket {
  if (item.dueAt) {
    const due = new Date(item.dueAt).getTime();
    if (!Number.isNaN(due) && due < now.getTime()) return 'overdue';
    if (isSameDay(item.dueAt, now)) return 'today';
  }
  if (isSameDay(item.startsAt, now)) return 'today';
  return 'later';
}

export function matchesTaskFilters(
  role: AppRole,
  item: TaskItem,
  filters: TaskFilters,
  now: Date,
): boolean {
  const query = filters.query.trim().toLocaleLowerCase();
  const matchesQuery = query.length === 0
    || item.title.toLocaleLowerCase().includes(query)
    || item.className.toLocaleLowerCase().includes(query)
    || item.course.toLocaleLowerCase().includes(query);
  return matchesQuery
    && (filters.kind === 'all' || item.kind === filters.kind)
    && (filters.classId === 'all' || item.classId === filters.classId)
    && (filters.course === 'all' || item.course === filters.course)
    && (filters.urgency === 'all' || resolveTaskUrgency(role, item, now) === filters.urgency);
}

export function buildTaskSections(
  role: AppRole,
  items: ReadonlyArray<TaskItem>,
  filters: TaskFilters,
  lifecycle: TaskLifecycle,
  now: Date,
): TaskSection[] {
  const filtered = getVisibleTaskItems(role, items)
    .filter((item) => getRoleState(role, item)?.lifecycle === lifecycle)
    .filter((item) => matchesTaskFilters(role, item, filters, now));

  if (lifecycle === 'done') {
    return filtered.length === 0
      ? []
      : [{
          bucket: 'done',
          title: role === 'teacher' ? '已处理' : '已完成',
          items: filtered.sort((left, right) => {
            const leftAt = getRoleState(role, left)?.archivedAt ?? left.createdAt;
            const rightAt = getRoleState(role, right)?.archivedAt ?? right.createdAt;
            return new Date(rightAt).getTime() - new Date(leftAt).getTime();
          }),
        }];
  }

  const buckets: Record<TaskTimeBucket, TaskItem[]> = {
    overdue: [],
    today: [],
    later: [],
  };
  for (const item of filtered) buckets[resolveTaskTimeBucket(role, item, now)].push(item);

  return (['overdue', 'today', 'later'] as const)
    .map((bucket) => ({
      bucket,
      title: TASK_BUCKET_LABELS[bucket],
      items: buckets[bucket].sort((left, right) => {
        const urgencyDelta = ['urgent', 'watch', 'later'].indexOf(resolveTaskUrgency(role, left, now))
          - ['urgent', 'watch', 'later'].indexOf(resolveTaskUrgency(role, right, now));
        return urgencyDelta || sortTime(left) - sortTime(right);
      }),
    }))
    .filter(({ items: bucketItems }) => bucketItems.length > 0);
}

export function resolveTaskAction(role: AppRole, item: TaskItem, now: Date): TaskAction {
  if (item.kind === 'classroom') {
    const startsAt = item.startsAt ? new Date(item.startsAt).getTime() : Number.NaN;
    const withinEntryWindow = !Number.isNaN(startsAt)
      && startsAt - now.getTime() <= 30 * 60 * 1000
      && (!item.endsAt || now.getTime() < new Date(item.endsAt).getTime());
    if (withinEntryWindow) {
      return { label: '去上课' };
    }
    return role === 'teacher'
      ? { label: '去备课' }
      : { label: '课前准备' };
  }

  if (item.kind === 'announcement') {
    return { label: '查看公告' };
  }

  if (item.kind !== 'homework' && item.kind !== 'quiz') {
    const labels: Record<Exclude<TaskKind, 'classroom' | 'homework' | 'quiz' | 'announcement'>, string> = {
      discussion: '去参与',
      'answer-sheet': '去作答',
      'check-in': '去打卡',
      recorded: '去观看',
      material: '去学习',
      scorm: '去学习',
      schedule: '去查看',
      'ai-oral': '去朗读',
    };
    return { label: labels[item.kind] };
  }

  if (role === 'teacher') {
    if (item.teacherState === 'published') {
      return { label: '作业数据' };
    }
    if (item.teacherState === 'grading') {
      return { label: '继续批改' };
    }
    const submitted = item.teacherProgress?.submittedCount ?? 0;
    return { label: submitted > 0 ? '去批改' : '提交概况' };
  }

  const labels: Record<StudentTaskState, string> = {
    'not-started': '去做作业',
    'in-progress': '继续作业',
    submitted: '查看提交',
    'needs-correction': '去订正',
    graded: '查看结果',
  };
  const isOverdue = item.dueAt ? new Date(item.dueAt).getTime() < now.getTime() : false;
  const label = isOverdue && item.studentState === 'not-started' && item.allowLateSubmission
    ? '补交'
    : labels[item.studentState ?? 'not-started'];
  return { label };
}

export function resolveTaskActions(role: AppRole, item: TaskItem, now: Date): TaskActionSet {
  const primary = resolveTaskAction(role, item, now);
  const primaryId = item.kind === 'classroom'
    ? primary.label === '去上课' ? 'attend-class' : role === 'teacher' ? 'prepare-class' : 'view-class-preparation'
    : item.kind === 'homework' || item.kind === 'quiz'
      ? role === 'teacher'
        ? item.teacherState === 'published' ? 'view-homework-data' : item.teacherState === 'grading' ? 'continue-review' : 'review-submissions'
        : item.studentState === 'in-progress' ? 'continue-homework' : item.studentState === 'submitted' ? 'view-submission' : item.studentState === 'needs-correction' ? 'correct-homework' : item.studentState === 'graded' ? 'view-result' : 'do-homework'
      : item.kind === 'recorded' ? 'watch-recording'
        : item.kind === 'announcement' ? 'view-announcement'
          : item.kind === 'discussion' ? 'participate'
            : item.kind === 'answer-sheet' ? 'answer'
              : item.kind === 'check-in' ? 'check-in'
                : item.kind === 'ai-oral' ? 'read-aloud'
                  : item.kind === 'material' || item.kind === 'scorm' ? 'learn' : 'view';
  const primaryAction = asPrimary({
    id: primaryId,
    label: primary.label,
    kind: item.kind === 'announcement' ? 'operation-dialog' : 'placeholder-dialog',
    feedback: `${primary.label}为 Demo Placeholder，未连接真实教学服务。`,
  });

  if (role === 'teacher' && (item.kind === 'homework' || item.kind === 'quiz')) {
    const pending = Math.max(0, (item.teacherProgress?.totalCount ?? 0) - (item.teacherProgress?.submittedCount ?? 0));
    if (pending > 0 && item.teacherState !== 'published') {
      return {
        primary: { ...primaryAction, kind: 'operation-dialog' },
        secondary: asSecondary({ id: 'remind-submission', label: '去催交', kind: 'confirm-dialog', feedback: `催交 ${pending} 人为 Demo Placeholder，未连接真实通知服务。` }),
      };
    }
  }

  if (role === 'teacher' && item.kind === 'classroom' && primary.label === '去上课') {
    return {
      primary: primaryAction,
      secondary: asSecondary({ id: 'prepare-class', label: '去备课', kind: 'placeholder-dialog', feedback: '备课入口已保留，本 Demo 不修改真实课堂内容。' }),
    };
  }

  return { primary: primaryAction };
}

export function getActionableTaskBadgeCount(
  role: AppRole,
  items: ReadonlyArray<TaskItem>,
  now: Date,
): number {
  return getVisibleTaskItems(role, items)
    .filter((item) => getRoleState(role, item)?.lifecycle === 'open')
    .filter((item) => {
      const bucket = resolveTaskTimeBucket(role, item, now);
      return bucket === 'overdue' || bucket === 'today';
    })
    .filter((item) => !resolveTaskActions(role, item, now).primary.disabled)
    .length;
}

export function getTaskCompletionLabel(role: AppRole, item: TaskItem): '已完成' | '已忽略' {
  return getRoleState(role, item)?.completion === 'manual' ? '已忽略' : '已完成';
}

export function getTaskStateLabel(role: AppRole, item: TaskItem): string {
  if (role === 'teacher') {
    const labels: Record<TeacherTaskState, string> = {
      collecting: '收集中',
      grading: '批改中',
      published: '已发布',
    };
    return item.teacherState ? labels[item.teacherState] : '待处理';
  }
  const labels: Record<StudentTaskState, string> = {
    'not-started': '未开始',
    'in-progress': '进行中',
    submitted: '已提交',
    'needs-correction': '待订正',
    graded: '已批改',
  };
  return labels[item.studentState ?? 'not-started'];
}

export function formatTaskTime(role: AppRole, item: TaskItem, now: Date): string {
  const state = getRoleState(role, item);
  if (state?.lifecycle === 'done' && state.archivedAt) {
    return `${formatDateTime(state.archivedAt, now)} 完成`;
  }
  if (item.dueAt) {
    const overdue = new Date(item.dueAt).getTime() < now.getTime();
    return `${formatDateTime(item.dueAt, now)} ${overdue ? '已截止' : '截止'}`;
  }
  if (item.startsAt) return `${formatDateTime(item.startsAt, now)} 开始`;
  return '无截止时间';
}

function formatDateTime(iso: string, now: Date): string {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return '';
  const clock = `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
  if (isSameDay(iso, now)) return `今天 ${clock}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (isSameDay(iso, tomorrow)) return `明天 ${clock}`;
  return `${value.getMonth() + 1}月${value.getDate()}日 ${clock}`;
}

export function archiveTaskManually(
  role: AppRole,
  item: TaskItem,
  archivedAt: string,
): TaskItem {
  const state = getRoleState(role, item);
  if (item.kind === 'classroom' || !item.manualArchiveAllowed || state?.lifecycle !== 'open') return item;
  return {
    ...item,
    roleState: {
      ...item.roleState,
      [role]: { lifecycle: 'done', completion: 'manual', archivedAt },
    },
  };
}

export function restoreTaskManually(role: AppRole, item: TaskItem): TaskItem {
  const state = getRoleState(role, item);
  if (state?.lifecycle !== 'done' || state.completion !== 'manual') return item;
  return {
    ...item,
    roleState: {
      ...item.roleState,
      [role]: { lifecycle: 'open', completion: null, archivedAt: null },
    },
  };
}
