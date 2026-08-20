import {
  ArrowUpDown,
  Bot,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  FolderArchive,
  Megaphone,
  MessageSquareText,
  MoreHorizontal,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  PencilLine,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BoundaryDialog } from '@app/shell/BoundaryDialog';
import { usePageHeader } from '@app/shell/usePageHeader';
import { useOperationGuard } from '@app/shell/use-operation-guard';
import { TeachingObjectIcon } from '@design-system/TeachingObjectIcon';
import {
  addClassActivity,
  canCompleteClassCourse,
  canManageClass,
  CLASS_ACTIVITY_TYPE_LABELS,
  CLASS_COURSE_LIFECYCLE_LABELS,
  CLASS_MEMBER_ROLE_LABELS,
  createClassCourse,
  deleteClassCourse,
  deleteClassUnit,
  filterClassRecords,
  getActiveClassMembers,
  getClassActivityAction,
  getClassActivityActions,
  getClassExitEligibility,
  getClassMemberCounts,
  getClassMemberDisplayName,
  removeClassMembers,
  renameClassCourse,
  saveClassUnit,
  setClassHeadmaster,
  validateCourseName,
  validateUnitInput,
  type ClassActivity,
  type ClassActivityAction,
  type ClassActivityType,
  type ClassCourse,
  type ClassRecord,
  type ClassUnit,
  type ClassUnitStatus,
} from '@domain/class/class';
import type { MessageThread } from '@domain/message/message';
import { getClassActivityTeachingObjectKind } from '@domain/teaching-object/teaching-object';
import { InviteMembersDialog } from '@features/class-collaboration-workspace';
import { HomeActivityDialog, type HomeActivityDialogItem } from '@features/home-workspace';
import { CLASS_NOW } from '@mocks/scenarios/classes';
import { ClassActivityActionGroup } from './ClassActivityActionGroup';
import { useClassWorkspaceStore } from './class-workspace-store';
import styles from './TeacherClassWorkspace.module.css';

type TeacherClassWorkspaceProps = {
  detailId?: string;
  messageThreads: ReadonlyArray<MessageThread>;
  renderClassChat: (options: { classId: string; readOnly: boolean }) => ReactNode;
};

type SortKey = 'updated-desc' | 'name-asc';
type DialogKind = 'chat' | 'announcements' | 'settings';
type RailSection = 'members' | 'cocreation' | 'ai';
type SettingsAction = 'exit' | null;
type SettingsDraft = {
  name: string;
  intro: string;
  coverColor: string;
  headmasterId: string;
  allowViewAfterLeaveOrComplete: boolean;
  allowTeacherCreateLesson: boolean;
  allowStudentEditNickname: boolean;
};
type EditorState =
  | { kind: 'class'; name: string }
  | { kind: 'course'; courseId: string | null; name: string }
  | { kind: 'unit'; courseId: string; unitId: string | null; title: string; description: string; status: ClassUnitStatus }
  | { kind: 'activity-name'; courseId: string; unitId: string | null; activityId: string; title: string }
  | { kind: 'activity'; courseId: string; unitId: string | null; activityType: ClassActivityType; title: string; startsAt: string };
type DeleteTarget =
  | { kind: 'course'; courseId: string; label: string }
  | { kind: 'unit'; courseId: string; unitId: string; label: string };
type ActivityDetail = { activity: ClassActivity; courseId: string; unitId: string | null };

const ACTIVITY_TYPES = Object.keys(CLASS_ACTIVITY_TYPE_LABELS) as ClassActivityType[];
const EMPTY_CLASS_COURSES: ReadonlyArray<ClassCourse> = [];

function getNextId(prefix: string, ids: ReadonlyArray<string>): string {
  let index = ids.length + 1;
  while (ids.includes(`${prefix}-${index}`)) index += 1;
  return `${prefix}-${index}`;
}

function countCourseActivities(course: ClassCourse): number {
  return (course.activities?.length ?? 0) + course.units.reduce((sum, unit) => sum + unit.activities.length, 0);
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function parseDialog(value: string | null): DialogKind | null {
  return value === 'chat' || value === 'announcements' || value === 'settings' ? value : null;
}

function getHeadmaster(record: ClassRecord): string {
  const member = getActiveClassMembers(record.members).find(({ role }) => role === 'headmaster');
  return member ? getClassMemberDisplayName(member) : '未设置';
}

function getSettingsDraft(record: ClassRecord): SettingsDraft {
  const headmaster = getActiveClassMembers(record.members).find(({ role }) => role === 'headmaster');
  return {
    name: record.name,
    intro: record.settings.classIntro,
    coverColor: record.settings.coverColor,
    headmasterId: headmaster?.id ?? '',
    allowViewAfterLeaveOrComplete: record.settings.allowViewAfterLeaveOrComplete,
    allowTeacherCreateLesson: record.settings.allowTeacherCreateLesson,
    allowStudentEditNickname: record.settings.allowStudentEditNickname,
  };
}

function getExitBlockedText(reason: 'unfinished-lessons' | 'pro-retention-window' | undefined): string {
  if (reason === 'unfinished-lessons') return '仍有未结束课堂，暂时不能退出。';
  if (reason === 'pro-retention-window') return '最后课堂结束未满 60 天，暂时不能退出。';
  return '当前暂时不能退出。';
}

function FieldHelp({ label, text }: { label: string; text: string }) {
  const tooltipId = useId();
  return (
    <span className={styles.fieldHelp}>
      <button type="button" aria-label={`${label}说明`} aria-describedby={tooltipId}>
        <CircleHelp aria-hidden="true" size={14} />
      </button>
      <span id={tooltipId} role="tooltip">{text}</span>
    </span>
  );
}

function renameActivity(
  courses: ReadonlyArray<ClassCourse>,
  courseId: string,
  unitId: string | null,
  activityId: string,
  title: string,
): ClassCourse[] {
  return courses.map((course) => {
    if (course.id !== courseId) return course;
    if (unitId === null) {
      return {
        ...course,
        activities: course.activities?.map((activity) => activity.id === activityId ? { ...activity, title } : activity),
      };
    }
    return {
      ...course,
      units: course.units.map((unit) => unit.id === unitId
        ? { ...unit, activities: unit.activities.map((activity) => activity.id === activityId ? { ...activity, title } : activity) }
        : unit),
    };
  });
}

function WorkspaceDialog({
  title,
  description,
  onClose,
  children,
  wide = false,
  settings = false,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  settings?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    queueMicrotask(() => {
      const target = dialogRef.current?.querySelector<HTMLElement>('input, textarea, select, button');
      target?.focus();
    });
    return () => {
      if (dialog?.open && typeof dialog.close === 'function') dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className={styles.dialogBackdrop}>
      <dialog
        aria-labelledby="teacher-class-dialog-title"
        aria-describedby={description ? 'teacher-class-dialog-description' : undefined}
        aria-modal="true"
        className={styles.workspaceDialog}
        data-settings={settings}
        data-wide={wide}
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
        ref={dialogRef}
      >
        <header className={styles.dialogHeader}>
          <div>
            <h2 id="teacher-class-dialog-title">{title}</h2>
            {description ? <p id="teacher-class-dialog-description">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label={`关闭${title}`} title="关闭">
            <X aria-hidden="true" size={18} />
          </button>
        </header>
        <div className={styles.dialogBody}>{children}</div>
      </dialog>
    </div>
  );
}

type CompactActionMenuItem = {
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  disabledReason?: string;
  tone?: 'danger';
};

function CompactActionMenu({
  label,
  trigger,
  items,
  iconOnly = false,
}: {
  label: string;
  trigger: ReactNode;
  items: ReadonlyArray<CompactActionMenuItem>;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeFromOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !hostRef.current?.contains(event.target)) setOpen(false);
    };
    const closeFromKeyboard = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      queueMicrotask(() => triggerRef.current?.focus());
    };
    document.addEventListener('pointerdown', closeFromOutside);
    document.addEventListener('keydown', closeFromKeyboard);
    return () => {
      document.removeEventListener('pointerdown', closeFromOutside);
      document.removeEventListener('keydown', closeFromKeyboard);
    };
  }, [open]);

  return (
    <div className={styles.actionMenuHost} data-class-action-menu ref={hostRef}>
      <button
        className={styles.actionMenuTrigger}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        data-icon-only={iconOnly}
        title={label}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown') return;
          event.preventDefault();
          setOpen(true);
          queueMicrotask(() => hostRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus());
        }}
        ref={triggerRef}
      >
        {trigger}
      </button>
      {open ? (
        <div className={styles.actionMenu} role="menu" aria-label={label}>
          {items.map((item) => (
            <button
              type="button"
              role="menuitem"
              data-tone={item.tone}
              disabled={item.disabled}
              key={item.label}
              title={item.disabled ? item.disabledReason : undefined}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.icon}<span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function TeacherClassWorkspace({ detailId, messageThreads, renderClassChat }: TeacherClassWorkspaceProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { classes, setClasses } = useClassWorkspaceStore();
  const { registerGuard } = useOperationGuard();
  const selectedClass = detailId
    ? classes.find(({ id, visibleTo }) => id === detailId && visibleTo.includes('teacher')) ?? null
    : null;
  const initialSettingsClassId = detailId ?? searchParams.get('class');
  const initialSettingsClass = parseDialog(searchParams.get('dialog')) === 'settings'
    ? classes.find(({ id, visibleTo }) => id === initialSettingsClassId && visibleTo.includes('teacher')) ?? null
    : null;
  const initialSettingsDraft = initialSettingsClass
    ? getSettingsDraft(initialSettingsClass)
    : null;
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [sortKey, setSortKey] = useState<SortKey>(() => searchParams.get('sort') === 'name-asc' ? 'name-asc' : 'updated-desc');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(() => searchParams.get('course'));
  const [activityFilter, setActivityFilter] = useState<'all' | 'lesson'>('all');
  const [railOpen, setRailOpen] = useState(true);
  const [railSections, setRailSections] = useState<Record<RailSection, boolean>>({ members: true, cocreation: true, ai: true });
  const [collapsedUnitIds, setCollapsedUnitIds] = useState<ReadonlySet<string>>(new Set());
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [initialEditor, setInitialEditor] = useState<EditorState | null>(null);
  const [editorErrors, setEditorErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [courseToComplete, setCourseToComplete] = useState<ClassCourse | null>(null);
  const [activityDetail, setActivityDetail] = useState<ActivityDetail | null>(null);
  const [activityDialogView, setActivityDialogView] = useState<'detail' | 'operation'>('detail');
  const [activityDialogAction, setActivityDialogAction] = useState<ClassActivityAction | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [boundary, setBoundary] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [announcementDraft, setAnnouncementDraft] = useState('');
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft | null>(initialSettingsDraft);
  const [settingsInitialDraft, setSettingsInitialDraft] = useState<SettingsDraft | null>(initialSettingsDraft);
  const [settingsNameError, setSettingsNameError] = useState<string | null>(null);
  const [pendingDialogClose, setPendingDialogClose] = useState(false);
  const [pendingSettingsRoute, setPendingSettingsRoute] = useState<string | null>(null);
  const [pendingSettingsAction, setPendingSettingsAction] = useState<SettingsAction>(null);
  const dialogTriggerRef = useRef<HTMLElement | null>(null);
  const activityTriggerRef = useRef<HTMLElement | null>(null);
  const dialogKind = parseDialog(searchParams.get('dialog'));
  const canManage = selectedClass ? canManageClass('teacher', selectedClass) : false;
  const settingsClassId = detailId ?? searchParams.get('class');
  const settingsClass = dialogKind === 'settings'
    ? classes.find(({ id, visibleTo }) => id === settingsClassId && visibleTo.includes('teacher')) ?? null
    : null;
  const settingsCanManage = settingsClass ? canManageClass('teacher', settingsClass) : false;
  const settingsCanConfigure = settingsClass?.roleByAppRole.teacher === 'headmaster';
  const settingsActiveMembers = settingsClass ? getActiveClassMembers(settingsClass.members) : [];
  const settingsTeacherCandidates = settingsActiveMembers.filter(({ role }) => role === 'headmaster' || role === 'teacher');
  const settingsMemberCounts = settingsClass ? getClassMemberCounts(settingsClass.members) : null;
  const settingsCurrentTeacherMember = settingsClass
    ? settingsActiveMembers.find((member) => member.isCurrentUser && member.role === settingsClass.roleByAppRole.teacher)
      ?? settingsActiveMembers.find((member) => member.role === settingsClass.roleByAppRole.teacher)
      ?? null
    : null;
  const settingsExitEligibility = settingsClass && settingsCurrentTeacherMember
    ? getClassExitEligibility(settingsClass, settingsCurrentTeacherMember, CLASS_NOW)
    : null;
  const editorDirty = editor !== null && JSON.stringify(editor) !== JSON.stringify(initialEditor);
  const settingsDirty = settingsDraft !== null
    && settingsInitialDraft !== null
    && JSON.stringify(settingsDraft) !== JSON.stringify(settingsInitialDraft);
  const announcementDirty = announcementDraft.trim().length > 0;

  const visibleClasses = useMemo(() => {
    const filtered = filterClassRecords('teacher', classes, query);
    return sortKey === 'name-asc'
      ? [...filtered].sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))
      : [...filtered].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }, [classes, query, sortKey]);

  const visibleCourses = selectedClass?.courses ?? EMPTY_CLASS_COURSES;
  const requestedCourseId = searchParams.get('course');
  const requestedUnitId = searchParams.get('unit');
  const requestedActivityId = searchParams.get('activity');
  const activeCourse = visibleCourses.find(({ id }) => id === (requestedCourseId ?? selectedCourseId)) ?? visibleCourses[0] ?? null;
  const canEditActiveCourse = canManage && activeCourse?.status === 'active';

  useLayoutEffect(() => {
    if (!selectedClass || !requestedActivityId) return;
    const target = Array.from(document.querySelectorAll<HTMLElement>('[data-activity-id]'))
      .find((element) => element.dataset.activityId === requestedActivityId);
    target?.scrollIntoView?.({ block: 'center' });
    target?.focus({ preventScroll: true });
  }, [activeCourse, requestedActivityId, selectedClass]);

  const updateListUrl = useCallback((nextQuery: string, nextSort: SortKey) => {
    const next = new URLSearchParams();
    if (nextQuery) next.set('q', nextQuery);
    if (nextSort !== 'updated-desc') next.set('sort', nextSort);
    setSearchParams(next, { replace: true });
  }, [setSearchParams]);

  const updateClass = useCallback((classId: string, update: (record: ClassRecord) => ClassRecord) => {
    setClasses((current) => current.map((record) => record.id === classId ? update(record) : record));
  }, [setClasses]);

  const updateClassCourses = useCallback((classId: string, update: (courses: ReadonlyArray<ClassCourse>) => ClassCourse[]) => {
    updateClass(classId, (record) => ({ ...record, courses: update(record.courses), updatedAt: CLASS_NOW.toISOString() }));
  }, [updateClass]);

  const closeEditor = useCallback(() => {
    setEditor(null);
    setInitialEditor(null);
    setEditorErrors({});
  }, []);

  const openEditor = (next: EditorState) => {
    setEditor(next);
    setInitialEditor(next);
    setEditorErrors({});
    setFeedback(null);
  };

  const commitEditor = (unitStatus?: ClassUnitStatus) => {
    if (!editor) return;
    if (editor.kind === 'class') {
      const value = editor.name.trim();
      if (!value) return setEditorErrors({ name: '请输入班级名称。' });
      const id = getNextId('class-local', classes.map(({ id: classId }) => classId));
      const record: ClassRecord = {
        id,
        name: value,
        visibleTo: ['teacher'],
        roleByAppRole: { teacher: 'headmaster' },
        memberCount: 1,
        pendingCountByRole: { teacher: 0 },
        unreadCountByRole: { teacher: 0 },
        coverTone: 'green',
        updatedAt: CLASS_NOW.toISOString(),
        courses: [],
        announcements: [],
        members: [{ id: `${id}-headmaster`, name: '王老师', role: 'headmaster', plan: 'free', relationship: '班主任', joinedAt: '2026-08-08', leftAt: null, isCurrentUser: true }],
        settings: { allowStudentInvite: false, allowViewAfterLeaveOrComplete: true, allowTeacherCreateLesson: true, allowStudentEditNickname: true, classIntro: '', coverColor: '#0FAD7C' },
      };
      setClasses((current) => [record, ...current]);
      closeEditor();
      setFeedback('班级已创建，继续创建第一门课程。');
      navigate(`/teacher/classes/${id}`);
      return;
    }
    if (!selectedClass) return;
    if (editor.kind === 'course') {
      const validation = validateCourseName(editor.name);
      if (!validation.valid) return setEditorErrors({ name: validation.error });
      if (editor.courseId) {
        updateClassCourses(selectedClass.id, (courses) => renameClassCourse(courses, editor.courseId!, validation.value));
        closeEditor();
        setFeedback('课程名称已更新。');
        return;
      }
      const id = getNextId('course-local', selectedClass.courses.map(({ id: courseId }) => courseId));
      updateClassCourses(selectedClass.id, (courses) => createClassCourse(courses, { id, name: validation.value, description: '', status: 'active', units: [], activities: [] }));
      setSelectedCourseId(id);
      setSearchParams((current) => { const next = new URLSearchParams(current); next.set('course', id); return next; }, { replace: true });
      closeEditor();
      setFeedback('课程已创建，可以继续创建单元或课程级活动。');
      return;
    }
    if (editor.kind === 'unit') {
      const validation = validateUnitInput(editor.title, editor.description);
      if (!validation.valid) return setEditorErrors({ [validation.field]: validation.error });
      const course = selectedClass.courses.find(({ id }) => id === editor.courseId);
      if (!course) return setEditorErrors({ title: '所选课程已不存在，请关闭后重试。' });
      const existing = course.units.find(({ id }) => id === editor.unitId);
      const status = unitStatus ?? editor.status;
      const unit: ClassUnit = {
        id: existing?.id ?? getNextId('unit-local', course.units.map(({ id }) => id)),
        title: validation.title,
        description: validation.description,
        status,
        activities: existing?.activities ?? [],
      };
      updateClassCourses(selectedClass.id, (courses) => saveClassUnit(courses, editor.courseId, unit));
      closeEditor();
      setFeedback(status === 'published' ? '单元已发布，学生课程目录现在可见。' : '单元草稿已保存，仅老师可见。');
      return;
    }
    if (editor.kind === 'activity-name') {
      const title = editor.title.trim();
      if (!title) return setEditorErrors({ title: '请输入活动标题。' });
      updateClassCourses(selectedClass.id, (courses) => renameActivity(
        courses,
        editor.courseId,
        editor.unitId,
        editor.activityId,
        title,
      ));
      closeEditor();
      setFeedback('活动名称已更新。');
      return;
    }
    if (editor.kind === 'activity') {
      if (editor.activityType === 'homework') {
        const params = new URLSearchParams({ class: selectedClass.id, course: editor.courseId, source: 'class_unit' });
        if (editor.unitId) params.set('unit', editor.unitId);
        closeEditor();
        navigate(`/teacher/homework/new?${params.toString()}`);
        return;
      }
      const title = editor.title.trim();
      if (!title) return setEditorErrors({ title: '请输入活动标题。' });
      const course = selectedClass.courses.find(({ id }) => id === editor.courseId);
      if (!course) return setEditorErrors({ title: '所选课程已不存在，请关闭后重试。' });
      const activity: ClassActivity = {
        id: getNextId('activity-local', [
          ...(course.activities ?? []).map(({ id }) => id),
          ...course.units.flatMap(({ activities }) => activities.map(({ id }) => id)),
        ]),
        type: editor.activityType,
        title,
        status: 'pending',
        ...(editor.activityType === 'lesson' && editor.startsAt ? { scheduledAt: editor.startsAt } : {}),
        detail: editor.activityType === 'lesson' && editor.startsAt ? `课堂 · ${editor.startsAt.replace('T', ' ')}` : '待开始',
      };
      updateClassCourses(selectedClass.id, (courses) => addClassActivity(courses, editor.courseId, editor.unitId, activity));
      closeEditor();
      setFeedback(`${CLASS_ACTIVITY_TYPE_LABELS[editor.activityType]}已创建，状态为待开始。`);
    }
  };
  const commitEditorFromGuard = useEffectEvent(commitEditor);

  useEffect(() => {
    if (!editorDirty) {
      registerGuard({ context: { kind: 'idle' } });
      return () => registerGuard({ context: { kind: 'idle' } });
    }
    registerGuard({
      context: { kind: 'unsaved-edit' },
      resolveUnsaved: (resolution) => {
        if (resolution === 'save') commitEditorFromGuard(editor?.kind === 'unit' ? 'draft' : undefined);
        else closeEditor();
      },
    });
    return () => registerGuard({ context: { kind: 'idle' } });
  }, [closeEditor, editor?.kind, editorDirty, registerGuard]);

  const openSettingsDialog = (record: ClassRecord, trigger?: HTMLElement) => {
    dialogTriggerRef.current = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setPendingDialogClose(false);
    setPendingSettingsRoute(null);
    setPendingSettingsAction(null);
    setSettingsNameError(null);
    setAnnouncementDraft('');
    const draft = getSettingsDraft(record);
    setSettingsDraft(draft);
    setSettingsInitialDraft(draft);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('dialog', 'settings');
      if (detailId) next.delete('class');
      else next.set('class', record.id);
      return next;
    }, { replace: false });
  };

  const openDialog = (kind: DialogKind) => {
    if (kind === 'settings' && selectedClass) {
      openSettingsDialog(selectedClass);
      return;
    }
    dialogTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPendingDialogClose(false);
    setPendingSettingsRoute(null);
    setPendingSettingsAction(null);
    setAnnouncementDraft('');
    setSearchParams((current) => { const next = new URLSearchParams(current); next.set('dialog', kind); return next; }, { replace: false });
  };

  const selectedClassName = selectedClass?.name ?? null;
  const fromHome = searchParams.get('from') === 'home';
  const pageHeader = useMemo(() => detailId && selectedClassName
    ? {
        title: selectedClassName,
        breadcrumbs: fromHome
          ? [{ label: '首页', to: '/teacher/home' }, { label: '我的班级', to: '/teacher/classes' }, { label: selectedClassName }]
          : [{ label: '我的班级', to: '/teacher/classes' }, { label: selectedClassName }],
      }
    : { title: '我的班级' }, [detailId, fromHome, selectedClassName]);
  usePageHeader(pageHeader);

  const forceCloseDialog = () => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('dialog');
      if (!detailId) next.delete('class');
      return next;
    }, { replace: true });
    setAnnouncementDraft('');
    setSettingsDraft(null);
    setSettingsInitialDraft(null);
    setSettingsNameError(null);
    setPendingDialogClose(false);
    setPendingSettingsRoute(null);
    setPendingSettingsAction(null);
    requestAnimationFrame(() => dialogTriggerRef.current?.focus());
  };

  const closeDialog = () => {
    if ((dialogKind === 'settings' && settingsDirty) || (dialogKind === 'announcements' && announcementDirty)) {
      setPendingDialogClose(true);
      return;
    }
    forceCloseDialog();
  };

  const closeActivityDetail = () => {
    setActivityDetail(null);
    requestAnimationFrame(() => activityTriggerRef.current?.focus());
  };

  const applySettingsAction = () => {
    if (!pendingSettingsAction || !settingsClass) return;
    if (!settingsCurrentTeacherMember) {
      setFeedback('当前成员信息不可用，暂时不能退出。');
      setPendingSettingsAction(null);
      return;
    }
    const latestEligibility = getClassExitEligibility(settingsClass, settingsCurrentTeacherMember, CLASS_NOW);
    if (!latestEligibility.allowed) {
      setFeedback(getExitBlockedText(latestEligibility.reason));
      setPendingSettingsAction(null);
      return;
    }
    updateClass(settingsClass.id, (record) => ({
      ...record,
      members: removeClassMembers(record.members, new Set([settingsCurrentTeacherMember.id]), CLASS_NOW.toISOString()),
      updatedAt: CLASS_NOW.toISOString(),
    }));
    setFeedback('已退出班级。');
    forceCloseDialog();
    navigate('/teacher/classes', { replace: true });
    setPendingSettingsAction(null);
  };

  const openActivityDetail = (detail: ActivityDetail, trigger: HTMLElement) => {
    activityTriggerRef.current = trigger;
    setActivityDialogView('detail');
    setActivityDialogAction(getClassActivityAction('teacher', detail.activity, CLASS_NOW));
    setActivityDetail(detail);
  };

  const executeActivityAction = (detail: ActivityDetail, action: ClassActivityAction) => {
    setActivityDetail(detail);
    setActivityDialogAction(action);
    setActivityDialogView('operation');
  };

  const toActivityDialogItem = (detail: ActivityDetail, action: ClassActivityAction): HomeActivityDialogItem => ({
    id: detail.activity.id,
    title: detail.activity.title,
    kind: getClassActivityTeachingObjectKind(detail.activity.type),
    kindLabel: CLASS_ACTIVITY_TYPE_LABELS[detail.activity.type],
    stateLabel: detail.activity.status === 'completed' ? '已完成' : detail.activity.status === 'active' ? '进行中' : detail.activity.status === 'pending' ? '待处理' : '待开始',
    timeLabel: detail.activity.detail,
    className: selectedClass?.name,
    courseName: selectedClass?.courses.find(({ id }) => id === detail.courseId)?.name,
    unitName: detail.unitId ? selectedClass?.courses.find(({ id }) => id === detail.courseId)?.units.find(({ id }) => id === detail.unitId)?.title : undefined,
    actionLabel: action.label,
    actionPlaceholder: action.feedback || `${action.label}为 Demo Placeholder，未连接真实教学服务。`,
  });

  const confirmDelete = () => {
    if (!selectedClass || !deleteTarget) return;
    if (deleteTarget.kind === 'course') {
      updateClassCourses(selectedClass.id, (courses) => deleteClassCourse(courses, deleteTarget.courseId));
      setSelectedCourseId(null);
      setFeedback(`课程“${deleteTarget.label}”已删除。`);
    } else {
      updateClassCourses(selectedClass.id, (courses) => deleteClassUnit(courses, deleteTarget.courseId, deleteTarget.unitId));
      setFeedback(`单元“${deleteTarget.label}”已删除。`);
    }
    setDeleteTarget(null);
  };

  const confirmCourseCompletion = () => {
    if (!selectedClass || !courseToComplete || !canCompleteClassCourse(courseToComplete)) return;
    updateClassCourses(selectedClass.id, (courses) => courses.map((course) => course.id === courseToComplete.id
      ? { ...course, status: 'completed' }
      : course));
    setFeedback(`课程“${courseToComplete.name}”已结课，课程内容已转为只读。`);
    setCourseToComplete(null);
  };

  const renderEditor = () => {
    if (!editor) return null;
    const title = editor.kind === 'class' ? '新建班级'
      : editor.kind === 'course' ? (editor.courseId ? '编辑课程' : '创建课程')
        : editor.kind === 'unit' ? (editor.unitId ? '编辑单元' : '创建单元')
          : editor.kind === 'activity-name' ? '编辑活动'
            : '创建活动';
    return (
      <WorkspaceDialog title={title} description="保存后立即更新本地 Demo 数据。" onClose={closeEditor}>
        <form className={styles.editorForm} onSubmit={(event) => { event.preventDefault(); commitEditor(); }}>
          {editor.kind === 'class' ? (
            <label>班级名称<input aria-label="班级名称" autoFocus value={editor.name} aria-invalid={Boolean(editorErrors.name)} onChange={(event) => setEditor({ ...editor, name: event.target.value })} />{editorErrors.name ? <small role="alert">{editorErrors.name}</small> : null}</label>
          ) : null}
          {editor.kind === 'course' ? (
            <label>课程名称<input aria-label="课程名称" autoFocus maxLength={50} value={editor.name} aria-invalid={Boolean(editorErrors.name)} onChange={(event) => setEditor({ ...editor, name: event.target.value })} />{editorErrors.name ? <small role="alert">{editorErrors.name}</small> : null}</label>
          ) : null}
          {editor.kind === 'unit' ? (
            <>
              <label>单元名称<input aria-label="单元名称" autoFocus maxLength={100} value={editor.title} aria-invalid={Boolean(editorErrors.title)} onChange={(event) => setEditor({ ...editor, title: event.target.value })} />{editorErrors.title ? <small role="alert">{editorErrors.title}</small> : null}</label>
              <label>单元介绍<textarea aria-label="单元介绍" maxLength={300} value={editor.description} aria-invalid={Boolean(editorErrors.description)} onChange={(event) => setEditor({ ...editor, description: event.target.value })} /><span>{editor.description.length}/300</span>{editorErrors.description ? <small role="alert">{editorErrors.description}</small> : null}</label>
            </>
          ) : null}
          {editor.kind === 'activity-name' ? (
            <label>活动名称<input aria-label="活动名称" autoFocus maxLength={100} value={editor.title} aria-invalid={Boolean(editorErrors.title)} onChange={(event) => setEditor({ ...editor, title: event.target.value })} />{editorErrors.title ? <small role="alert">{editorErrors.title}</small> : null}</label>
          ) : null}
          {editor.kind === 'activity' ? (
            <>
              <fieldset><legend>活动类型</legend><div className={styles.activityTypeGrid}>{ACTIVITY_TYPES.map((type) => <button type="button" role="radio" aria-checked={editor.activityType === type} key={type} onClick={() => setEditor({ ...editor, activityType: type })}><TeachingObjectIcon kind={getClassActivityTeachingObjectKind(type)} size={16} />{CLASS_ACTIVITY_TYPE_LABELS[type]}</button>)}</div></fieldset>
              <label>所属单元<select value={editor.unitId ?? ''} onChange={(event) => setEditor({ ...editor, unitId: event.target.value || null })}><option value="">不限单元</option>{selectedClass?.courses.find(({ id }) => id === editor.courseId)?.units.map((unit) => <option value={unit.id} key={unit.id}>{unit.title}</option>)}</select></label>
              {editor.activityType === 'homework' ? <p>将携带当前班级、课程和单元进入现有作业编辑器。</p> : <label>活动标题<input autoFocus value={editor.title} aria-invalid={Boolean(editorErrors.title)} onChange={(event) => setEditor({ ...editor, title: event.target.value })} />{editorErrors.title ? <small role="alert">{editorErrors.title}</small> : null}</label>}
              {editor.activityType === 'lesson' ? <label>开始时间（选填）<input type="datetime-local" value={editor.startsAt} onChange={(event) => setEditor({ ...editor, startsAt: event.target.value })} /></label> : null}
            </>
          ) : null}
          <footer>
            <button type="button" onClick={closeEditor}>取消</button>
            {editor.kind === 'unit' ? <><button type="button" onClick={() => commitEditor('draft')}>保存草稿</button><button className={styles.primaryButton} type="button" onClick={() => commitEditor('published')}>发布</button></> : <button className={styles.primaryButton} type="submit">{editor.kind === 'activity' && editor.activityType === 'homework' ? '进入作业编辑器' : '保存'}</button>}
          </footer>
        </form>
      </WorkspaceDialog>
    );
  };

  const renderSettingsDialog = () => {
    if (dialogKind !== 'settings' || !settingsClass || !settingsDraft || !settingsMemberCounts) return null;
    const updateSettingsDraft = (next: SettingsDraft) => {
      setSettingsDraft(next);
      setSettingsNameError(null);
      setPendingDialogClose(false);
      setPendingSettingsRoute(null);
    };
    const draftHeadmaster = settingsTeacherCandidates.find(({ id }) => id === settingsDraft.headmasterId);
    return (
      <WorkspaceDialog
        title="班级属性"
        description={`${settingsClass.name} · 编辑基础信息与班级权限`}
        onClose={closeDialog}
        settings
      >
        <form className={styles.settingsForm} onSubmit={(event) => {
          event.preventDefault();
          const name = settingsDraft.name.trim();
          if (!name) {
            setSettingsNameError('请输入班级名称。');
            requestAnimationFrame(() => document.getElementById('class-settings-name')?.focus());
            return;
          }
          updateClass(settingsClass.id, (record) => ({
            ...record,
            ...(() => {
              const members = settingsCanConfigure && settingsDraft.headmasterId
                ? setClassHeadmaster(record.members, settingsDraft.headmasterId)
                : record.members;
              const currentTeacher = members.find((member) => (
                member.isCurrentUser
                && member.leftAt === null
                && (member.role === 'headmaster' || member.role === 'teacher')
              ));
              return {
                members,
                roleByAppRole: currentTeacher
                  ? { ...record.roleByAppRole, teacher: currentTeacher.role }
                  : record.roleByAppRole,
              };
            })(),
            name,
            updatedAt: CLASS_NOW.toISOString(),
            settings: {
              ...record.settings,
              classIntro: settingsDraft.intro.trim(),
              coverColor: settingsDraft.coverColor,
              allowViewAfterLeaveOrComplete: settingsDraft.allowViewAfterLeaveOrComplete,
              allowTeacherCreateLesson: settingsDraft.allowTeacherCreateLesson,
              allowStudentEditNickname: settingsDraft.allowStudentEditNickname,
            },
          }));
          setFeedback('班级属性已更新。');
          forceCloseDialog();
        }}>
          <section className={styles.settingsMain} aria-labelledby="class-settings-basic-title">
            <header className={styles.settingsSectionHeader}><div><h3 id="class-settings-basic-title">基础信息</h3></div></header>
            <div className={styles.settingsIdentity}>
              <span className={styles.settingsColorSwatch} style={{ backgroundColor: settingsDraft.coverColor }} aria-hidden="true" />
              <div><strong>{settingsDraft.name.trim() || '未命名班级'}</strong><span>{draftHeadmaster ? getClassMemberDisplayName(draftHeadmaster) : '未设置'}</span></div>
            </div>
            <div className={styles.settingsField}>
              <div className={styles.settingsFieldLabel}><span><label htmlFor="class-settings-name">班级名称</label><FieldHelp label="班级名称" text="用于班级列表、详情标题和相关业务入口。" /></span></div>
              <input id="class-settings-name" aria-label="班级名称" aria-invalid={Boolean(settingsNameError)} aria-describedby={settingsNameError ? 'class-settings-name-error' : undefined} value={settingsDraft.name} disabled={!settingsCanManage} onChange={(event) => updateSettingsDraft({ ...settingsDraft, name: event.target.value })} />
              {settingsNameError ? <small id="class-settings-name-error" role="alert">{settingsNameError}</small> : null}
            </div>
            <div className={styles.settingsField}>
              <div className={styles.settingsFieldLabel}><span><label htmlFor="class-settings-intro">班级简介</label><FieldHelp label="班级简介" text="用于补充班级定位与说明，最多 300 字。" /></span><small>{settingsDraft.intro.length}/300</small></div>
              <textarea id="class-settings-intro" aria-label="班级简介" maxLength={300} placeholder="填写班级介绍（选填）" value={settingsDraft.intro} disabled={!settingsCanManage} onChange={(event) => updateSettingsDraft({ ...settingsDraft, intro: event.target.value })} />
            </div>
            <div className={styles.settingsField}>
              <div className={styles.settingsFieldLabel}><span><label htmlFor="class-settings-color">封面颜色</label><FieldHelp label="封面颜色" text="用于班级列表与身份标识的颜色展示。" /></span></div>
              <span className={styles.colorField}><input id="class-settings-color" type="color" aria-label="封面颜色" value={settingsDraft.coverColor} disabled={!settingsCanManage} onChange={(event) => updateSettingsDraft({ ...settingsDraft, coverColor: event.target.value })} /><span>{settingsDraft.coverColor}</span></span>
            </div>
          </section>

          <aside className={styles.settingsSide} aria-labelledby="class-settings-permissions-title">
            <header className={styles.settingsSectionHeader}><div><h3 id="class-settings-permissions-title">成员与权限</h3></div></header>
            <div className={styles.settingsSelectField}>
              <span><label htmlFor="class-settings-headmaster">班主任</label><FieldHelp label="班主任" text="从当前 active 教师成员中选择班级负责人。" /></span>
              <select id="class-settings-headmaster" aria-label="班主任" value={settingsDraft.headmasterId} disabled={!settingsCanConfigure || settingsTeacherCandidates.length === 0} onChange={(event) => updateSettingsDraft({ ...settingsDraft, headmasterId: event.target.value })}>
                {settingsTeacherCandidates.length === 0 ? <option value="">未设置</option> : settingsTeacherCandidates.map((member) => <option value={member.id} key={member.id}>{getClassMemberDisplayName(member)}</option>)}
              </select>
            </div>
            <section className={styles.settingsMemberSummary} aria-label="成员构成">
              <div><span><strong>班级成员</strong><FieldHelp label="班级成员" text="仅统计当前仍在班级中的 active 成员。" /></span><em>{settingsMemberCounts.total} 人</em></div>
              <div><span><strong>成员构成</strong><FieldHelp label="成员构成" text="由成员角色实时派生，需通过成员管理调整。" /></span><em>{settingsMemberCounts.teachers} 位教师 · {settingsMemberCounts.students} 位学习者</em></div>
              <button type="button" onClick={() => {
                const route = `/teacher/classes/${settingsClass.id}/members`;
                if (settingsDirty) {
                  setPendingSettingsRoute(route);
                  setPendingDialogClose(true);
                  return;
                }
                navigate(route);
              }}>管理成员<ArrowRight aria-hidden="true" size={15} /></button>
            </section>
            <div className={styles.settingsPermissionList}>
              <div className={styles.switchField}><span><strong>退出班级或课程结课后可查看内容</strong><FieldHelp label="退出班级或课程结课后可查看内容" text="成员离开班级或课程结课后仍可只读查看课程内容。" /></span><input type="checkbox" role="switch" aria-label="允许退出班级或课程结课后查看内容" checked={settingsDraft.allowViewAfterLeaveOrComplete} disabled={!settingsCanConfigure} onChange={(event) => updateSettingsDraft({ ...settingsDraft, allowViewAfterLeaveOrComplete: event.target.checked })} /></div>
              <div className={styles.switchField}><span><strong>协同教师可创建活动</strong><FieldHelp label="协同教师可创建活动" text="允许协同教师新建课堂和课程活动。" /></span><input type="checkbox" role="switch" aria-label="允许协同教师创建活动" checked={settingsDraft.allowTeacherCreateLesson} disabled={!settingsCanConfigure} onChange={(event) => updateSettingsDraft({ ...settingsDraft, allowTeacherCreateLesson: event.target.checked })} /></div>
            </div>
            <div className={styles.switchField}><span><strong>学生修改班级昵称</strong><FieldHelp label="学生修改班级昵称" text="仅影响当前班级内的显示名称。" /></span><input type="checkbox" role="switch" aria-label="允许学生修改班级昵称" checked={settingsDraft.allowStudentEditNickname} disabled={settingsClass.roleByAppRole.teacher !== 'headmaster'} onChange={(event) => updateSettingsDraft({ ...settingsDraft, allowStudentEditNickname: event.target.checked })} /></div>
          </aside>

          {settingsClass.roleByAppRole.teacher !== 'headmaster' ? (
            <section className={styles.settingsLifecycle}><div><strong>退出班级</strong><span>{settingsExitEligibility?.allowed ? '当前可退出；退出后将返回班级列表。' : getExitBlockedText(settingsExitEligibility?.reason)}</span></div><button type="button" disabled={!settingsExitEligibility?.allowed} onClick={() => setPendingSettingsAction('exit')}>退出班级</button></section>
          ) : null}

          {pendingDialogClose ? (
            <section className={styles.unsavedPrompt} role="alert">
              <div><strong>班级属性尚未保存</strong><span>{pendingSettingsRoute ? '前往成员管理后，本次修改将不会保留。' : '关闭后，本次修改将不会保留。'}</span></div>
              <div><button type="button" onClick={() => { setPendingDialogClose(false); setPendingSettingsRoute(null); }}>继续编辑</button><button className={styles.dangerButton} type="button" onClick={() => { if (pendingSettingsRoute) navigate(pendingSettingsRoute); else forceCloseDialog(); }}>{pendingSettingsRoute ? '放弃并前往' : '放弃修改'}</button></div>
            </section>
          ) : null}
          {pendingSettingsAction ? (
            <section className={styles.unsavedPrompt} role="alert">
              <div><strong>确认退出班级</strong><span>{`确认退出 ${settingsClass.name}？退出后将返回班级列表。`}</span></div>
              <div><button type="button" onClick={() => setPendingSettingsAction(null)}>取消</button><button className={styles.dangerButton} type="button" onClick={applySettingsAction}>确认退出</button></div>
            </section>
          ) : null}
          <footer><button type="button" onClick={closeDialog}>取消</button><button className={styles.primaryButton} type="submit" disabled={!settingsCanManage}>保存更改</button></footer>
        </form>
      </WorkspaceDialog>
    );
  };

  const renderActivityRows = (activities: ReadonlyArray<ClassActivity>, courseId: string, unitId: string | null) => {
    const filtered = activityFilter === 'lesson' ? activities.filter(({ type }) => type === 'lesson') : activities;
    return filtered.map((activity) => {
      const detail = { activity, courseId, unitId };
      const actions = getClassActivityActions('teacher', activity, CLASS_NOW);
      return (
        <div
          className={styles.activityRow}
          data-activity-id={activity.id}
          data-highlighted={requestedActivityId === activity.id}
          key={activity.id}
          role="listitem"
          tabIndex={requestedActivityId === activity.id ? -1 : undefined}
        >
          <span className={styles.activityIcon}><TeachingObjectIcon kind={getClassActivityTeachingObjectKind(activity.type)} size={16} /></span>
          <button
            type="button"
            className={styles.activityCopy}
            aria-label={`查看${activity.title}详情`}
            onClick={(event) => openActivityDetail(detail, event.currentTarget)}
          >
            <strong>{activity.title}</strong>
            <small>{activity.detail}</small>
          </button>
          <ClassActivityActionGroup activityTitle={activity.title} actions={actions} onAction={(action) => executeActivityAction(detail, action)} />
        </div>
      );
    });
  };

  if (!detailId) {
    return (
      <main className={styles.page} data-surface="list" aria-label="我的班级">
        <section className={styles.collection} aria-label="我的班级列表">
          <div className={styles.listToolbar}>
            <span className={styles.collectionCount}><strong>{visibleClasses.length}</strong> 个班级</span>
            <label className={styles.searchBox}><Search aria-hidden="true" size={15} /><span className={styles.srOnly}>搜索班级</span><input type="search" value={query} onChange={(event) => { const next = event.target.value; setQuery(next); updateListUrl(next, sortKey); }} placeholder="搜索班级" /></label>
            <label className={styles.sortControl} title="排序"><ArrowUpDown aria-hidden="true" size={15} /><span className={styles.srOnly}>排序</span><select aria-label="排序" value={sortKey} onChange={(event) => { const next = event.target.value as SortKey; setSortKey(next); updateListUrl(query, next); }}><option value="updated-desc">最近更新</option><option value="name-asc">班级名称</option></select></label>
            <button className={styles.primaryButton} type="button" onClick={() => openEditor({ kind: 'class', name: '' })}><Plus aria-hidden="true" size={16} />新建班级</button>
          </div>
          <div className={styles.classTable} role="table" aria-label="班级列表">
            <div className={styles.tableHeader} role="row"><span role="columnheader">班级名称</span><span role="columnheader">班主任</span><span role="columnheader">课程数</span><span role="columnheader">成员数</span><span role="columnheader">班级待办</span><span role="columnheader">最近更新</span><span role="columnheader">操作</span></div>
            {visibleClasses.map((record) => (
              <div className={styles.tableRow} role="row" key={record.id}>
                <div role="cell"><button type="button" className={styles.classRowLink} onClick={() => navigate(`/teacher/classes/${record.id}`)}><span className={styles.classMark} data-tone={record.coverTone}>{record.name.slice(0, 1)}</span><span><strong>{record.name}</strong><small>进入班级</small></span></button></div>
                <span role="cell">{getHeadmaster(record)}</span>
                <span role="cell">{record.courses.length}</span>
                <span role="cell">{record.memberCount}</span>
                <button role="cell" type="button" className={styles.pendingCell} onClick={() => navigate(`/teacher/tasks?class=${encodeURIComponent(record.id)}`)}>{record.pendingCountByRole.teacher ?? 0}</button>
                <time role="cell" dateTime={record.updatedAt}>{formatUpdatedAt(record.updatedAt)}</time>
                <span role="cell" className={styles.operationCell}>{canManageClass('teacher', record) ? <button type="button" className={styles.iconAction} aria-label={`编辑${record.name}`} title="编辑班级" onClick={(event) => openSettingsDialog(record, event.currentTarget)}><Pencil aria-hidden="true" size={15} /></button> : <span aria-label="不可编辑">-</span>}</span>
              </div>
            ))}
            {visibleClasses.length === 0 ? <div className={styles.emptyState}><Users aria-hidden="true" size={22} /><strong>{query ? '没有匹配的班级' : '还没有班级'}</strong><span>{query ? '清除搜索关键词' : '创建班级后即可组织课程与成员'}</span>{query ? <button type="button" onClick={() => { setQuery(''); updateListUrl('', sortKey); }}>清除搜索</button> : <button type="button" onClick={() => openEditor({ kind: 'class', name: '' })}>新建班级</button>}</div> : null}
          </div>
        </section>
        {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}
        {renderEditor()}
        {renderSettingsDialog()}
      </main>
    );
  }

  if (!selectedClass) {
    return <main className={styles.safeState}><h1 tabIndex={-1}>找不到这个内容</h1><p>班级不存在，或当前老师视角无权访问。</p><button type="button" onClick={() => navigate('/teacher/classes')}>返回我的班级</button></main>;
  }

  const activeMembers = getActiveClassMembers(selectedClass.members);
  const memberCounts = getClassMemberCounts(selectedClass.members);
  const classMessageUnread = messageThreads
    .find(({ category, classId, visibleTo }) => category === 'class' && classId === selectedClass.id && visibleTo.includes('teacher'))
    ?.unreadByRole.teacher ?? 0;
  const toggleRailSection = (section: RailSection) => setRailSections((current) => ({ ...current, [section]: !current[section] }));

  return (
    <main className={styles.page} data-surface="detail" aria-label="班级详情">
      <div className={styles.quickActions}>
        <label><TeachingObjectIcon kind="course" size={16} /><span>当前课程</span><select aria-label="当前课程" value={activeCourse?.id ?? ''} disabled={visibleCourses.length === 0} onChange={(event) => { const id = event.target.value; setSelectedCourseId(id); setSearchParams((current) => { const next = new URLSearchParams(current); next.set('course', id); return next; }, { replace: true }); }}>{visibleCourses.length === 0 ? <option value="">暂无课程</option> : visibleCourses.map((course) => <option value={course.id} key={course.id}>{course.name}</option>)}</select></label>
        {activeCourse ? <span className={styles.statusTag} data-status={activeCourse.status}>{CLASS_COURSE_LIFECYCLE_LABELS[activeCourse.status]}</span> : null}
        <button type="button" aria-label="班级群聊" onClick={() => openDialog('chat')}><MessageSquareText aria-hidden="true" size={16} /><span>班级群聊</span>{classMessageUnread > 0 ? <strong>{classMessageUnread}</strong> : null}</button>
        <button type="button" aria-label="公告" onClick={() => openDialog('announcements')}><Megaphone aria-hidden="true" size={16} /><span>公告</span>{selectedClass.announcements.length > 0 ? <strong>{selectedClass.announcements.length}</strong> : null}</button>
        <button type="button" aria-label="班级待办" onClick={() => navigate(`/teacher/tasks?class=${encodeURIComponent(selectedClass.id)}`)}><CheckCircle2 aria-hidden="true" size={16} /><span>班级待办</span>{(selectedClass.pendingCountByRole.teacher ?? 0) > 0 ? <strong>{selectedClass.pendingCountByRole.teacher}</strong> : null}</button>
        <button className={styles.classSettingsAction} type="button" onClick={() => openDialog('settings')}><Settings2 aria-hidden="true" size={16} />编辑班级</button>
      </div>

      <div className={styles.detailBody} data-rail-open={railOpen}>
        <section className={styles.courseMain} aria-labelledby="course-content-title">
          {activeCourse ? (
            <>
              <header className={styles.courseHeader}>
                <div><h2 id="course-content-title">课程目录</h2><small>{activeCourse.units.length} 个单元 · {countCourseActivities(activeCourse)} 项活动</small></div>
                {canManage ? (
                  <div className={styles.courseHeaderActions}>
                    <CompactActionMenu
                      label="新建内容"
                      trigger={<><Plus aria-hidden="true" size={15} /><span>新建</span><ChevronDown aria-hidden="true" size={14} /></>}
                      items={[
                        { label: '新建课程', icon: <TeachingObjectIcon kind="course" size={15} />, onSelect: () => openEditor({ kind: 'course', courseId: null, name: '' }) },
                        ...(canEditActiveCourse ? [
                          { label: '新建单元', icon: <TeachingObjectIcon kind="unit" size={15} />, onSelect: () => openEditor({ kind: 'unit', courseId: activeCourse.id, unitId: null, title: '', description: '', status: 'draft' }) },
                          { label: '新建活动', icon: <Plus aria-hidden="true" size={15} />, onSelect: () => openEditor({ kind: 'activity', courseId: activeCourse.id, unitId: null, activityType: 'lesson', title: '', startsAt: '' }) },
                        ] : []),
                      ]}
                    />
                    {canEditActiveCourse ? (
                      <CompactActionMenu
                        label={`课程操作 ${activeCourse.name}`}
                        iconOnly
                        trigger={<MoreHorizontal aria-hidden="true" size={17} />}
                        items={[
                          { label: '编辑课程', icon: <Settings2 aria-hidden="true" size={15} />, onSelect: () => openEditor({ kind: 'course', courseId: activeCourse.id, name: activeCourse.name }) },
                          { label: '结课', icon: <CheckCircle2 aria-hidden="true" size={15} />, disabled: !canCompleteClassCourse(activeCourse), disabledReason: '仍有未结束课堂', onSelect: () => setCourseToComplete(activeCourse) },
                          { label: '删除课程', icon: <Trash2 aria-hidden="true" size={15} />, tone: 'danger', onSelect: () => setDeleteTarget({ kind: 'course', courseId: activeCourse.id, label: activeCourse.name }) },
                        ]}
                      />
                    ) : null}
                  </div>
                ) : null}
              </header>
              <div className={styles.contentFilters}><button type="button" aria-pressed={activityFilter === 'all'} onClick={() => setActivityFilter('all')}>全部</button><button type="button" aria-pressed={activityFilter === 'lesson'} onClick={() => setActivityFilter('lesson')}>只看课堂</button></div>
              <div className={styles.unitList} role="list" aria-label={`${activeCourse.name}课程目录`}>
                {(activeCourse.activities?.length ?? 0) > 0 ? <section className={`${styles.unit} ${styles.unassignedUnit}`} role="listitem"><header><span className={styles.treeBranchIcon}><TeachingObjectIcon kind="unit" size={16} /></span><div className={styles.unitCopy}><strong>未归入单元</strong><p>直接归属于当前课程的活动</p></div></header><div className={styles.activityList} role="list">{renderActivityRows(activeCourse.activities ?? [], activeCourse.id, null)}</div></section> : null}
                {activeCourse.units.map((unit) => {
                  const collapsed = unit.id === requestedUnitId ? false : collapsedUnitIds.has(unit.id);
                  return (
                    <section className={styles.unit} key={unit.id} role="listitem">
                      <header>
                        <button type="button" className={styles.unitToggle} aria-expanded={!collapsed} onClick={() => setCollapsedUnitIds((current) => { const next = new Set(current); if (next.has(unit.id)) next.delete(unit.id); else next.add(unit.id); return next; })}><ChevronDown aria-hidden="true" size={16} /><span className={styles.srOnly}>{collapsed ? '展开' : '收起'}{unit.title}</span></button>
                        <div className={styles.unitCopy}><strong>{unit.title}</strong><span className={styles.unitStatus} data-status={unit.status}>{unit.status === 'published' ? '已发布' : '草稿'}</span><p>{unit.description || '暂无单元描述'}</p></div>
                        {canEditActiveCourse ? (
                          <CompactActionMenu
                            label={`单元操作 ${unit.title}`}
                            iconOnly
                            trigger={<MoreHorizontal aria-hidden="true" size={17} />}
                            items={[
                              { label: '编辑单元', icon: <Settings2 aria-hidden="true" size={15} />, onSelect: () => openEditor({ kind: 'unit', courseId: activeCourse.id, unitId: unit.id, title: unit.title, description: unit.description, status: unit.status }) },
                              { label: '新建活动', icon: <Plus aria-hidden="true" size={15} />, onSelect: () => openEditor({ kind: 'activity', courseId: activeCourse.id, unitId: unit.id, activityType: 'lesson', title: '', startsAt: '' }) },
                              { label: '删除单元', icon: <Trash2 aria-hidden="true" size={15} />, tone: 'danger', onSelect: () => setDeleteTarget({ kind: 'unit', courseId: activeCourse.id, unitId: unit.id, label: unit.title }) },
                            ]}
                          />
                        ) : null}
                      </header>
                      {!collapsed ? <div className={styles.activityList} role="list">{renderActivityRows(unit.activities, activeCourse.id, unit.id)}{unit.activities.length === 0 ? <p className={styles.compactEmpty}>这个单元还没有活动。</p> : null}</div> : null}
                    </section>
                  );
                })}
                {activeCourse.units.length === 0 && (activeCourse.activities?.length ?? 0) === 0 ? <div className={styles.emptyCourse}><TeachingObjectIcon kind="unit" size={22} /><strong>{activeCourse.status === 'completed' ? '这门课程没有目录内容' : '先创建第一个单元'}</strong><span>{activeCourse.status === 'completed' ? '已结课课程保持只读' : '课程内容会按单元和活动连续展示'}</span>{canEditActiveCourse ? <button type="button" onClick={() => openEditor({ kind: 'unit', courseId: activeCourse.id, unitId: null, title: '', description: '', status: 'draft' })}>创建单元</button> : null}</div> : null}
              </div>
            </>
          ) : (
            <div className={styles.emptyCourse}><TeachingObjectIcon kind="course" size={22} /><strong>先创建第一门课程</strong><span>课程是单元和活动的上层教学对象</span>{canManage ? <button type="button" onClick={() => openEditor({ kind: 'course', courseId: null, name: '' })}>创建课程</button> : null}</div>
          )}
        </section>

        <aside className={styles.contextRail} aria-label="班级辅助信息" data-collapsed={!railOpen}>
          {!railOpen ? (
            <button className={styles.collapsedRailButton} type="button" aria-label="展开右侧栏" aria-expanded="false" title="展开右侧栏" onClick={() => setRailOpen(true)}><PanelRightOpen aria-hidden="true" size={17} /></button>
          ) : <>
          <section>
            <header className={styles.primaryRailHeader}><button type="button" aria-expanded={railSections.members} onClick={() => toggleRailSection('members')}><span>成员</span><strong>{memberCounts.total}</strong><ChevronDown aria-hidden="true" size={15} /></button><button className={styles.railToggle} type="button" aria-expanded="true" aria-label="收起右侧栏" onClick={() => setRailOpen(false)} title="收起右侧栏"><PanelRightClose aria-hidden="true" size={17} /></button></header>
            {railSections.members ? <div className={styles.railContent}><div className={styles.memberStack}>{activeMembers.slice(0, 4).map((member) => <span className={styles.memberAvatar} key={member.id} title={getClassMemberDisplayName(member)}>{getClassMemberDisplayName(member).slice(0, 1)}</span>)}</div>{activeMembers.slice(0, 4).map((member) => <div className={styles.memberLine} key={member.id}><span>{getClassMemberDisplayName(member)}</span><small>{CLASS_MEMBER_ROLE_LABELS[member.role]}</small></div>)}<div className={styles.railActions}><button type="button" onClick={() => navigate(`/teacher/classes/${selectedClass.id}/members`)}>查看全部成员</button>{canManage ? <button className={styles.railIconAction} type="button" aria-label="邀请成员" onClick={() => setInviteOpen(true)} title="邀请成员"><UserPlus aria-hidden="true" size={15} /></button> : null}</div></div> : null}
          </section>
          <section>
            <header><button type="button" aria-expanded={railSections.cocreation} onClick={() => toggleRailSection('cocreation')}><span>共创</span><ChevronDown aria-hidden="true" size={15} /></button></header>
            {railSections.cocreation ? <div className={styles.railLinks}><button type="button" onClick={() => setBoundary('“这是共创页面!”为 Placeholder，未接入真实协作服务。')}><Sparkles aria-hidden="true" size={15} />这是共创页面!</button><button type="button" onClick={() => setBoundary('“回收站”为 Placeholder，未接入真实文档或回收站服务。')}><FolderArchive aria-hidden="true" size={15} />回收站</button></div> : null}
          </section>
          <section>
            <header><button type="button" aria-expanded={railSections.ai} onClick={() => toggleRailSection('ai')}><span>AI</span><ChevronDown aria-hidden="true" size={15} /></button></header>
            {railSections.ai ? <div className={styles.railLinks}><button type="button" onClick={() => setBoundary('“AI 助教”为 Placeholder，未接入真实 AI 服务。')}><Bot aria-hidden="true" size={15} />AI 助教</button><button type="button" onClick={() => setBoundary('“AI 学情”为 Placeholder，未生成真实学生分析。')}><Sparkles aria-hidden="true" size={15} />AI 学情</button><button type="button" onClick={() => setBoundary('“应用思路点拨”为 Placeholder，未接入真实 AI 服务。')}><PencilLine aria-hidden="true" size={15} />应用思路点拨</button></div> : null}
          </section>
          </>}
        </aside>
      </div>

      {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}
      {renderEditor()}
      {courseToComplete ? <WorkspaceDialog title="确认课程结课" description={`结课后，“${courseToComplete.name}”的目录和活动将转为只读。`} onClose={() => setCourseToComplete(null)}><div className={styles.confirmBody}><p>班级本身不会结课，其他课程、成员、公告和群聊不受影响。</p><div className={styles.confirmActions}><button type="button" onClick={() => setCourseToComplete(null)}>取消</button><button className={styles.primaryButton} type="button" onClick={confirmCourseCompletion}>确认结课</button></div></div></WorkspaceDialog> : null}
      {activityDetail ? (
        <HomeActivityDialog
          item={toActivityDialogItem(activityDetail, activityDialogAction ?? getClassActivityAction('teacher', activityDetail.activity, CLASS_NOW))}
          initialView={activityDialogView}
          onClose={closeActivityDetail}
          secondaryAction={canEditActiveCourse ? { label: '编辑名称', onSelect: () => {
            const detail = activityDetail;
            setActivityDetail(null);
            openEditor({ kind: 'activity-name', courseId: detail.courseId, unitId: detail.unitId, activityId: detail.activity.id, title: detail.activity.title });
          } } : undefined}
        />
      ) : null}

      {dialogKind === 'chat' ? <WorkspaceDialog title="班级群聊" description={selectedClass.name} onClose={closeDialog} wide><div className={styles.chatFrame}>{renderClassChat({ classId: selectedClass.id, readOnly: false })}</div></WorkspaceDialog> : null}
      {dialogKind === 'announcements' ? (
        <WorkspaceDialog title="公告" description={selectedClass.name + ' · ' + selectedClass.announcements.length + ' 条'} onClose={closeDialog} wide>
          <div className={styles.announcementWorkspace}>
            {canManage ? (
              <form onSubmit={(event) => {
                event.preventDefault();
                const title = announcementDraft.trim();
                if (!title) return;
                updateClass(selectedClass.id, (record) => ({
                  ...record,
                  announcements: [{
                    id: getNextId('announcement-local', record.announcements.map(({ id }) => id)),
                    title,
                    body: '公告正文已保留，本 Demo 不发送真实班级通知。',
                    createdAt: CLASS_NOW.toISOString(),
                    authorName: '王老师',
                    readByRole: { teacher: true, 'student-family': false },
                    confirmedMemberIds: [],
                    unconfirmedMemberIds: getActiveClassMembers(record.members).filter(({ role }) => role === 'student-family').map(({ id }) => id),
                  }, ...record.announcements],
                  updatedAt: CLASS_NOW.toISOString(),
                }));
                setAnnouncementDraft('');
                setPendingDialogClose(false);
                setFeedback('公告已在本地 Demo 中发布。');
              }}>
                <label>公告标题<input value={announcementDraft} onChange={(event) => { setAnnouncementDraft(event.target.value); setPendingDialogClose(false); }} placeholder="例如：周末学习提醒" /></label>
                <button className={styles.primaryButton} type="submit" disabled={!announcementDraft.trim()}>发布公告</button>
              </form>
            ) : null}
            {pendingDialogClose ? (
              <section className={styles.unsavedPrompt} role="alert">
                <div><strong>公告尚未发布</strong><span>关闭后，当前输入的公告标题将不会保留。</span></div>
                <div><button type="button" onClick={() => setPendingDialogClose(false)}>继续编辑</button><button className={styles.dangerButton} type="button" onClick={forceCloseDialog}>放弃修改</button></div>
              </section>
            ) : null}
            <div className={styles.announcementList}>
              {selectedClass.announcements.map((announcement) => <article key={announcement.id}><header><div><h3>{announcement.title}</h3><span>{formatUpdatedAt(announcement.createdAt)} · {announcement.authorName}</span></div><small>{announcement.readByRole.teacher ? '已读' : '未读'}</small></header><p>{announcement.body}</p></article>)}
              {selectedClass.announcements.length === 0 ? <div className={styles.emptyState}><Megaphone aria-hidden="true" size={20} /><strong>还没有公告</strong></div> : null}
            </div>
          </div>
        </WorkspaceDialog>
      ) : null}
      {renderSettingsDialog()}

      {deleteTarget ? <WorkspaceDialog title={`删除${deleteTarget.kind === 'course' ? '课程' : '单元'}？`} description={`“${deleteTarget.label}”及其现有内容将从本地 Demo 中移除。`} onClose={() => setDeleteTarget(null)}><div className={styles.confirmActions}><button type="button" onClick={() => setDeleteTarget(null)}>取消</button><button type="button" className={styles.dangerButton} onClick={confirmDelete}>确认删除</button></div></WorkspaceDialog> : null}
      {boundary ? <BoundaryDialog description={boundary} onClose={() => setBoundary(null)} /> : null}
      {inviteOpen ? <InviteMembersDialog classId={selectedClass.id} className={selectedClass.name} onClose={() => setInviteOpen(false)} /> : null}
    </main>
  );
}
