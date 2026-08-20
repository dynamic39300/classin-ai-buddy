import {
  ArrowLeft,
  ArrowRight,
  BookCopy,
  BrainCircuit,
  CheckCircle2,
  ClipboardList,
  FolderInput,
  FolderTree,
  LayoutList,
  Megaphone,
  MessageSquareText,
  Pencil,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { AppRole } from '@domain/account/role';
import { BoundaryDialog } from '@app/shell/BoundaryDialog';
import { useOperationGuard } from '@app/shell/use-operation-guard';
import { TeachingObjectIcon } from '@design-system/TeachingObjectIcon';
import { useOpenCourseSession } from '@features/open-course-workspace';
import {
  addClassActivity,
  canManageClass,
  canManageOpenCourse,
  CLASS_ACTIVITY_TYPE_LABELS,
  createClassCourse,
  deleteClassCourse,
  deleteClassUnit,
  filterClassRecords,
  filterOpenCourses,
  formatClassDate,
  getClassActivityAction,
  getVisibleClassCourses,
  OPEN_COURSE_STATUS_LABELS,
  renameClassCourse,
  saveClassUnit,
  validateCourseName,
  validateUnitInput,
  type ClassActivity,
  type ClassActivityType,
  type ClassAnnouncement,
  type ClassCourse,
  type ClassRecord,
  type ClassUnit,
  type ClassUnitStatus,
  type OpenCourseRecord,
  type OpenCourseStatus,
} from '@domain/class/class';
import { getClassActivityTeachingObjectKind } from '@domain/teaching-object/teaching-object';
import { CLASS_NOW } from '@mocks/scenarios/classes';
import { useClassWorkspaceStore } from './class-workspace-store';
import styles from './ClassWorkspace.module.css';

type ClassWorkspaceProps = {
  role: AppRole;
  surface: 'classes' | 'open-courses';
  detailId?: string;
};

type DetailTab = 'course' | 'announcements' | 'members';
type StudentContentView = 'learning-plan' | 'directory';
type EditorState =
  | { kind: 'class'; value: string }
  | { kind: 'open-course'; value: string }
  | { kind: 'announcement'; value: string }
  | { kind: 'course'; courseId: string | null; name: string }
  | { kind: 'unit'; courseId: string; unitId: string | null; title: string; description: string; status: ClassUnitStatus }
  | { kind: 'activity'; courseId: string; unitId: string | null; activityType: ClassActivityType; title: string; startsAt: string };
type DeleteTarget =
  | { kind: 'course'; courseId: string; label: string }
  | { kind: 'unit'; courseId: string; unitId: string; label: string };

const ACTIVITY_TYPES = Object.keys(CLASS_ACTIVITY_TYPE_LABELS) as ClassActivityType[];

function formatDuration(minutes: number): string {
  return `${minutes} 分钟`;
}

function formatNextActivity(activity: NonNullable<ClassRecord['nextActivity']>): string {
  return `${formatClassDate(activity.startsAt, CLASS_NOW)} · ${activity.detail} · ${activity.title}`;
}

function getRoleLabel(role: AppRole): string {
  return role === 'teacher' ? '老师视角' : '学生视角';
}

function getScheduleReturnPath(role: AppRole, searchParams: URLSearchParams): string {
  const params = new URLSearchParams();
  for (const key of ['date', 'view', 'event']) {
    const value = searchParams.get(key);
    if (value) params.set(key, value);
  }
  const root = role === 'teacher' ? 'teacher' : 'student';
  return `/${root}/schedule${params.size ? `?${params.toString()}` : ''}`;
}

function getNextId(prefix: string, ids: ReadonlyArray<string>): string {
  let index = ids.length + 1;
  while (ids.includes(`${prefix}-${index}`)) index += 1;
  return `${prefix}-${index}`;
}

function countCourseActivities(course: ClassCourse): number {
  return (course.activities?.length ?? 0) + course.units.reduce((count, unit) => count + unit.activities.length, 0);
}

export function ClassWorkspace({ role, surface, detailId }: ClassWorkspaceProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { registerGuard } = useOperationGuard();
  const { classes, openCourses, setClasses, setOpenCourses } = useClassWorkspaceStore();
  const { joinedCourseIds, joinCourse } = useOpenCourseSession();
  const [query, setQuery] = useState('');
  const [openStatus, setOpenStatus] = useState<OpenCourseStatus | 'all'>('all');
  const [detailTab, setDetailTab] = useState<DetailTab>('course');
  const [studentContentView, setStudentContentView] = useState<StudentContentView>(() => searchParams.get('view') === 'directory' ? 'directory' : 'learning-plan');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(() => searchParams.get('course'));
  const [editor, setEditor] = useState<EditorState | null>(() => {
    if (role !== 'teacher' || detailId) return null;
    const create = searchParams.get('create');
    if (surface === 'classes' && create === 'class') return { kind: 'class', value: '' };
    if (surface === 'open-courses' && create === 'open-course') return { kind: 'open-course', value: '' };
    return null;
  });
  const [initialEditor, setInitialEditor] = useState<EditorState | null>(editor);
  const [editorErrors, setEditorErrors] = useState<Record<string, string>>({});
  const [confirmEditorClose, setConfirmEditorClose] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editorTrigger, setEditorTrigger] = useState<HTMLElement | null>(null);
  const [placeholderDialog, setPlaceholderDialog] = useState<string | null>(null);
  const returnToHome = searchParams.get('from') === 'home';
  const returnToSchedule = searchParams.get('source') === 'teacher_schedule' || searchParams.get('source') === 'student_schedule';
  const requestedActivityId = searchParams.get('activity');

  const visibleClasses = useMemo(() => filterClassRecords(role, classes, query), [classes, query, role]);
  const visibleOpenCourses = useMemo(() => filterOpenCourses(role, openCourses, query, openStatus)
    .filter(({ id }) => role === 'teacher' || joinedCourseIds.has(id)), [joinedCourseIds, openCourses, openStatus, query, role]);
  const selectedClass = detailId ? classes.find(({ id, visibleTo }) => id === detailId && visibleTo.includes(role)) ?? null : null;
  const selectedOpenCourse = detailId ? openCourses.find(({ id, visibleTo }) => id === detailId && visibleTo.includes(role)) ?? null : null;
  const canManageSelectedClass = selectedClass ? canManageClass(role, selectedClass) : false;
  const canManageSelectedOpenCourse = selectedOpenCourse ? canManageOpenCourse(role, selectedOpenCourse) : false;
  const editorDirty = editor !== null && JSON.stringify(editor) !== JSON.stringify(initialEditor);

  const openList = () => navigate(returnToSchedule
    ? getScheduleReturnPath(role, searchParams)
    : returnToHome
      ? `/${role === 'teacher' ? 'teacher' : 'student'}/home`
      : `/${role === 'teacher' ? 'teacher' : 'student'}/${surface}`);
  const openSurface = (nextSurface: 'classes' | 'open-courses') => navigate(`/${role === 'teacher' ? 'teacher' : 'student'}/${nextSurface}`);
  const openClassDetail = (id: string) => navigate(`/${role === 'teacher' ? 'teacher' : 'student'}/classes/${id}`);
  const openCourseDetail = (id: string) => navigate(`/${role === 'teacher' ? 'teacher' : 'student'}/open-courses/${id}`);

  const closeEditorState = useCallback(() => {
    setEditor(null);
    setInitialEditor(null);
    setEditorErrors({});
    setConfirmEditorClose(false);
    queueMicrotask(() => editorTrigger?.focus());
  }, [editorTrigger]);

  const finalizeEditorClose = useCallback(() => {
    closeEditorState();
    if (searchParams.has('create')) {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.delete('create');
        return next;
      }, { replace: true });
    }
  }, [closeEditorState, searchParams, setSearchParams]);

  const closeEditor = useCallback(() => {
    if (editorDirty) {
      setConfirmEditorClose(true);
      return;
    }
    finalizeEditorClose();
  }, [editorDirty, finalizeEditorClose]);

  useEffect(() => {
    if (!editor) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeEditor();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeEditor, editor]);

  const openEditor = (nextEditor: EditorState) => {
    setEditorTrigger(document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setEditor(nextEditor);
    setInitialEditor(nextEditor);
    setEditorErrors({});
    setConfirmEditorClose(false);
    setFeedback(null);
  };

  const updateClassCourses = useCallback((classId: string, update: (courses: ReadonlyArray<ClassCourse>) => ClassCourse[]) => {
    setClasses((current) => current.map((record) => record.id === classId
      ? { ...record, courses: update(record.courses), updatedAt: CLASS_NOW.toISOString() }
      : record));
  }, [setClasses]);

  const commitEditor = useCallback((unitStatus?: ClassUnitStatus) => {
    if (!editor) return;
    if (editor.kind === 'class') {
      const value = editor.value.trim();
      if (!value) return setEditorErrors({ value: '请输入班级名称。' });
      if (selectedClass) {
        setClasses((current) => current.map((record) => record.id === selectedClass.id ? { ...record, name: value, updatedAt: CLASS_NOW.toISOString() } : record));
        setFeedback('班级信息已在本地 Demo 中更新。');
      } else {
        const id = getNextId('class-local', classes.map(({ id: recordId }) => recordId));
        const record: ClassRecord = {
          id, name: value, visibleTo: ['teacher'], roleByAppRole: { teacher: 'headmaster' }, memberCount: 1,
          pendingCountByRole: { teacher: 0 }, unreadCountByRole: { teacher: 0 }, coverTone: 'green', updatedAt: CLASS_NOW.toISOString(), courses: [], announcements: [],
          members: [{ id: `${id}-headmaster`, name: '王老师', role: 'headmaster', plan: 'free', relationship: '班主任', joinedAt: '2026-08-08', leftAt: null, isCurrentUser: true }],
          settings: { allowStudentInvite: false, allowViewAfterLeaveOrComplete: true, allowTeacherCreateLesson: true, allowStudentEditNickname: true, classIntro: '', coverColor: '#0FAD7C' },
        };
        setClasses((current) => [record, ...current]);
        setFeedback('班级已创建，继续创建第一门课程。');
        navigate(`/teacher/classes/${id}`);
      }
      closeEditorState();
      return;
    }
    if (editor.kind === 'open-course') {
      const value = editor.value.trim();
      if (!value) return setEditorErrors({ value: '请输入公开课名称。' });
      if (selectedOpenCourse) {
        setOpenCourses((current) => current.map((course) => course.id === selectedOpenCourse.id ? { ...course, title: value } : course));
        setFeedback('公开课信息已在本地 Demo 中更新。');
      } else {
        const id = getNextId('open-local', openCourses.map(({ id: courseId }) => courseId));
        setOpenCourses((current) => [{ id, title: value, subject: '待设置', instructorName: '王老师', startsAt: '2026-08-09T16:00:00+08:00', durationMinutes: 40, status: 'scheduled', visibleTo: ['teacher'], ownerRoles: ['teacher'], enrolledCount: 0, maxSeats: 30, description: '公开课介绍待补充。', classroomSummary: '线上直播间' }, ...current]);
        setFeedback('公开课已创建，继续补充开课参数即可。');
        navigate(`/teacher/open-courses/${id}`);
      }
      closeEditorState();
      return;
    }
    if (editor.kind === 'announcement' && selectedClass) {
      const value = editor.value.trim();
      if (!value) return setEditorErrors({ value: '请输入公告标题。' });
      const announcement: ClassAnnouncement = { id: getNextId('announcement-local', selectedClass.announcements.map(({ id }) => id)), title: value, body: '公告正文已保留，本 Demo 不发送真实班级通知。', createdAt: CLASS_NOW.toISOString(), authorName: '王老师', readByRole: { teacher: true, 'student-family': false }, confirmedMemberIds: [], unconfirmedMemberIds: selectedClass.members.filter(({ role, leftAt }) => role === 'student-family' && leftAt === null).map(({ id }) => id) };
      setClasses((current) => current.map((record) => record.id === selectedClass.id ? { ...record, announcements: [announcement, ...record.announcements], updatedAt: CLASS_NOW.toISOString() } : record));
      closeEditorState();
      setFeedback('公告已在本地 Demo 中发布。');
      return;
    }
    if (!selectedClass) return;
    if (editor.kind === 'course') {
      const validation = validateCourseName(editor.name);
      if (!validation.valid) return setEditorErrors({ name: validation.error });
      if (editor.courseId) {
        updateClassCourses(selectedClass.id, (courses) => renameClassCourse(courses, editor.courseId!, validation.value));
        setFeedback('课程名称已更新。');
      } else {
        const id = getNextId('course-local', selectedClass.courses.map(({ id: courseId }) => courseId));
        updateClassCourses(selectedClass.id, (courses) => createClassCourse(courses, { id, name: validation.value, description: '', status: 'active', units: [], activities: [] }));
        setSelectedCourseId(id);
        setFeedback('课程已创建，可以继续创建单元或课程级活动。');
      }
      closeEditorState();
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
      setFeedback(status === 'published' ? '单元已发布，学生课程目录现在可见。' : '单元草稿已保存，仅老师可见。');
      closeEditorState();
      return;
    }
    if (editor.kind === 'activity') {
      if (editor.activityType === 'homework') {
        const params = new URLSearchParams({ class: selectedClass.id, course: editor.courseId, source: 'class_unit' });
        if (editor.unitId) params.set('unit', editor.unitId);
        closeEditorState();
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
        detail: editor.activityType === 'lesson' && editor.startsAt ? `课堂 · ${formatClassDate(editor.startsAt, CLASS_NOW)}` : '待开始',
      };
      updateClassCourses(selectedClass.id, (courses) => addClassActivity(courses, editor.courseId, editor.unitId, activity));
      setFeedback(`${CLASS_ACTIVITY_TYPE_LABELS[editor.activityType]}已创建，状态为待开始。`);
      closeEditorState();
    }
  }, [classes, closeEditorState, editor, navigate, openCourses, selectedClass, selectedOpenCourse, setClasses, setOpenCourses, updateClassCourses]);

  useEffect(() => {
    if (!editor || !editorDirty) {
      registerGuard({ context: { kind: 'idle' } });
      return () => registerGuard({ context: { kind: 'idle' } });
    }
    registerGuard({
      context: { kind: 'unsaved-edit' },
      resolveUnsaved: (resolution) => {
        if (resolution === 'save') commitEditor(editor.kind === 'unit' ? 'draft' : undefined);
        else finalizeEditorClose();
      },
    });
    return () => registerGuard({ context: { kind: 'idle' } });
  }, [commitEditor, editor, editorDirty, finalizeEditorClose, registerGuard]);

  const submitEditor = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    commitEditor();
  };

  const confirmDelete = () => {
    if (!deleteTarget || !selectedClass) return;
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

  const renderEditor = () => {
    if (!editor) return null;
    const editorTitle = editor.kind === 'class' ? '班级名称'
      : editor.kind === 'open-course' ? '公开课名称'
        : editor.kind === 'announcement' ? '公告标题'
          : editor.kind === 'course' ? (editor.courseId ? '重命名课程' : '创建课程')
            : editor.kind === 'unit' ? (editor.unitId ? '编辑单元' : '创建单元')
              : '创建活动';
    const simpleEditor = editor.kind === 'class' || editor.kind === 'open-course' || editor.kind === 'announcement';
    return (
      <aside className={styles.editor} aria-label="编辑工作面板">
        <header><div><span>班级内容</span><h2>{editorTitle}</h2></div><button type="button" onClick={closeEditor} aria-label="关闭编辑面板"><X aria-hidden="true" size={17} /></button></header>
        <form onSubmit={submitEditor}>
          {simpleEditor ? <label>{editorTitle}<input autoFocus value={editor.value} aria-invalid={Boolean(editorErrors.value)} aria-describedby={editorErrors.value ? 'editor-value-error' : undefined} onChange={(event) => setEditor({ ...editor, value: event.target.value })} placeholder={editor.kind === 'announcement' ? '例如：周末学习提醒' : `输入${editorTitle}`} />{editorErrors.value ? <span className={styles.fieldError} id="editor-value-error">{editorErrors.value}</span> : null}</label> : null}
          {editor.kind === 'course' ? <label>课程名称<input aria-label="课程名称" autoFocus value={editor.name} maxLength={50} aria-invalid={Boolean(editorErrors.name)} aria-describedby={editorErrors.name ? 'course-name-error' : undefined} onChange={(event) => setEditor({ ...editor, name: event.target.value })} placeholder="例如：动量与碰撞" /><span className={styles.fieldMeta}>{editor.name.length}/50</span>{editorErrors.name ? <span className={styles.fieldError} id="course-name-error">{editorErrors.name}</span> : null}</label> : null}
          {editor.kind === 'unit' ? <>
            <div className={styles.readOnlyContext}><span>所属课程</span><strong>{selectedClass?.courses.find(({ id }) => id === editor.courseId)?.name}</strong></div>
            <label>单元名称<input aria-label="单元名称" autoFocus value={editor.title} maxLength={100} aria-invalid={Boolean(editorErrors.title)} aria-describedby={editorErrors.title ? 'unit-title-error' : undefined} onChange={(event) => setEditor({ ...editor, title: event.target.value })} placeholder="例如：第一单元 受力与动量" /><span className={styles.fieldMeta}>{editor.title.length}/100</span>{editorErrors.title ? <span className={styles.fieldError} id="unit-title-error">{editorErrors.title}</span> : null}</label>
            <label>单元介绍<textarea aria-label="单元介绍" value={editor.description} maxLength={300} aria-invalid={Boolean(editorErrors.description)} aria-describedby={editorErrors.description ? 'unit-description-error' : undefined} onChange={(event) => setEditor({ ...editor, description: event.target.value })} placeholder="选填，说明本单元的学习内容" /><span className={styles.fieldMeta}>{editor.description.length}/300</span>{editorErrors.description ? <span className={styles.fieldError} id="unit-description-error">{editorErrors.description}</span> : null}</label>
          </> : null}
          {editor.kind === 'activity' ? <>
            <div className={styles.contextGrid}><div className={styles.readOnlyContext}><span>班级</span><strong>{selectedClass?.name}</strong></div><div className={styles.readOnlyContext}><span>课程</span><strong>{selectedClass?.courses.find(({ id }) => id === editor.courseId)?.name}</strong></div></div>
            <fieldset className={styles.activityTypeField}><legend>活动类型</legend><div className={styles.activityTypeGrid} role="radiogroup" aria-label="活动类型">{ACTIVITY_TYPES.map((type) => <button type="button" role="radio" aria-checked={editor.activityType === type} key={type} onClick={() => setEditor({ ...editor, activityType: type })}><TeachingObjectIcon kind={getClassActivityTeachingObjectKind(type)} size={17} /><span>{CLASS_ACTIVITY_TYPE_LABELS[type]}</span></button>)}</div></fieldset>
            <label>所属单元<select value={editor.unitId ?? ''} onChange={(event) => setEditor({ ...editor, unitId: event.target.value || null })}><option value="">不限单元</option>{selectedClass?.courses.find(({ id }) => id === editor.courseId)?.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.title}{unit.status === 'draft' ? '（草稿）' : ''}</option>)}</select></label>
            {editor.activityType === 'homework' ? <p className={styles.editorNote}>将携带当前班级、课程和单元进入作业编辑器，作业由作业模块创建。</p> : <label>活动标题<input aria-label="活动标题" autoFocus value={editor.title} aria-invalid={Boolean(editorErrors.title)} aria-describedby={editorErrors.title ? 'activity-title-error' : undefined} onChange={(event) => setEditor({ ...editor, title: event.target.value })} placeholder={`输入${CLASS_ACTIVITY_TYPE_LABELS[editor.activityType]}标题`} />{editorErrors.title ? <span className={styles.fieldError} id="activity-title-error">{editorErrors.title}</span> : null}</label>}
            {editor.activityType === 'lesson' ? <label>开始时间（选填）<input type="datetime-local" value={editor.startsAt} onChange={(event) => setEditor({ ...editor, startsAt: event.target.value })} /></label> : null}
          </> : null}
          {editor.kind === 'open-course' ? <p className={styles.editorNote}>开始时间、课时与教室参数将在公开课设置中继续补充。</p> : null}
          {editor.kind === 'class' ? <p className={styles.editorNote}>班级创建后可在详情中继续添加课程、单元和活动。</p> : null}
          {editor.kind === 'announcement' ? <p className={styles.editorNote}>正文和真实推送服务使用可信 Placeholder。</p> : null}
          {confirmEditorClose ? <div className={styles.closeGuard} role="alert"><p>有尚未保存的修改。</p><div><button type="button" onClick={() => setConfirmEditorClose(false)}>继续编辑</button><button type="button" onClick={finalizeEditorClose}>放弃修改</button></div></div> : null}
          <footer>
            <button type="button" onClick={closeEditor}>取消</button>
            {editor.kind === 'unit' ? <><button type="button" onClick={() => commitEditor('draft')}>保存草稿</button><button className={styles.primaryButton} type="button" onClick={() => commitEditor('published')}>发布</button></> : <button className={styles.primaryButton} type="submit">{editor.kind === 'activity' && editor.activityType === 'homework' ? '进入作业编辑器' : '保存'}</button>}
          </footer>
        </form>
      </aside>
    );
  };

  const renderDeleteDialog = () => deleteTarget ? (
    <div className={styles.dialogBackdrop}>
      <section className={styles.confirmDialog} role="alertdialog" aria-modal="true" aria-labelledby="delete-dialog-title">
        <Trash2 aria-hidden="true" size={20} />
        <h2 id="delete-dialog-title">删除{deleteTarget.kind === 'course' ? '课程' : '单元'}？</h2>
        <p>“{deleteTarget.label}”及其下的课程内容将从本地 Demo 中删除，此操作不可撤销。</p>
        <footer><button type="button" onClick={() => setDeleteTarget(null)}>取消</button><button className={styles.dangerButton} type="button" onClick={confirmDelete}>确认删除</button></footer>
      </section>
    </div>
  ) : null;

  const renderClassList = () => (
    <section className={styles.listView} aria-label="班级列表">
      {role === 'teacher' ? <header className={styles.pageHeader}><button className={styles.primaryButton} type="button" onClick={() => openEditor({ kind: 'class', value: '' })}><Plus aria-hidden="true" size={16} />新建班级</button></header> : null}
      <div className={styles.surfaceTabs} role="tablist" aria-label="班级与公开课"><button type="button" role="tab" aria-selected={surface === 'classes'} onClick={() => openSurface('classes')}>我的班级</button><button type="button" role="tab" aria-selected={surface === 'open-courses'} onClick={() => openSurface('open-courses')}>公开课</button></div>
      <div className={styles.listToolbar}><label className={styles.searchBox}><Search aria-hidden="true" size={15} /><span className={styles.srOnly}>搜索班级</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索班级名称" /></label></div>
      <div className={styles.objectList}>{visibleClasses.map((record) => <button className={styles.objectRow} type="button" key={record.id} onClick={() => openClassDetail(record.id)}><span className={styles.objectMark} data-tone={record.coverTone}>{record.name.slice(0, 1)}</span><span className={styles.objectCopy}><span><strong>{record.name}</strong></span><span>{record.memberCount} 位成员</span><small>{record.nextActivity ? formatNextActivity(record.nextActivity) : '暂无近期安排'}</small></span><span className={styles.objectMeta}><strong>{record.memberCount}</strong><small>成员</small>{(record.pendingCountByRole[role] ?? 0) > 0 ? <em>{record.pendingCountByRole[role]} 项待处理</em> : null}</span><ArrowRight aria-hidden="true" size={17} /></button>)}{visibleClasses.length === 0 ? <div className={styles.emptyState}><Users aria-hidden="true" size={22} /><strong>没有匹配的班级</strong><span>调整搜索关键词</span></div> : null}</div>
      {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}
    </section>
  );

  const renderOpenCourseList = () => (
    <section className={styles.listView} aria-label="公开课列表">
      <header className={styles.pageHeader}><div><p>{role === 'teacher' ? '创建一次性课程，管理开课参数与进入课堂。' : '查看已加入或可进入的公开课。'}</p></div>{role === 'teacher' ? <button className={styles.primaryButton} type="button" onClick={() => navigate('/teacher/open-courses/new')}><Plus aria-hidden="true" size={16} />新建公开课</button> : role === 'student-family' ? <button className={styles.primaryButton} type="button" onClick={() => navigate('/student/open-courses/join')}><Plus aria-hidden="true" size={16} />加入公开课</button> : null}</header>
      <div className={styles.surfaceTabs} role="tablist" aria-label="班级与公开课"><button type="button" role="tab" aria-selected={surface === 'classes'} onClick={() => openSurface('classes')}>我的班级</button><button type="button" role="tab" aria-selected={surface === 'open-courses'} onClick={() => openSurface('open-courses')}>公开课</button></div>
      <div className={styles.listToolbar}><label className={styles.searchBox}><Search aria-hidden="true" size={15} /><span className={styles.srOnly}>搜索公开课</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索课程、学科或老师" /></label><div className={styles.segmented} role="group" aria-label="公开课状态"><button type="button" aria-pressed={openStatus === 'all'} onClick={() => setOpenStatus('all')}>全部</button><button type="button" aria-pressed={openStatus === 'scheduled'} onClick={() => setOpenStatus('scheduled')}>待开始</button><button type="button" aria-pressed={openStatus === 'ended'} onClick={() => setOpenStatus('ended')}>已结束</button></div></div>
      <div className={styles.objectList}>{visibleOpenCourses.map((course) => <button className={styles.objectRow} type="button" key={course.id} onClick={() => openCourseDetail(course.id)}><span className={styles.objectMark} data-tone="blue">{course.title.slice(0, 1)}</span><span className={styles.objectCopy}><span><strong>{course.title}</strong><small data-state={course.status}>{OPEN_COURSE_STATUS_LABELS[course.status]}</small></span><span>{course.subject} · {course.instructorName}</span><small>{formatClassDate(course.startsAt, CLASS_NOW)} · {formatDuration(course.durationMinutes)} · {course.classroomSummary}</small></span><span className={styles.objectMeta}><strong>{course.enrolledCount}/{course.maxSeats}</strong><small>已报名</small></span><ArrowRight aria-hidden="true" size={17} /></button>)}{visibleOpenCourses.length === 0 ? <div className={styles.emptyState}><TeachingObjectIcon kind="open-course" size={22} /><strong>没有匹配的公开课</strong><span>调整搜索或状态筛选</span></div> : null}</div>
      {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}
    </section>
  );

  const renderActivityRows = (activities: ReadonlyArray<ClassActivity>, courseId: string) => <div className={styles.activityList}>{activities.map((activity) => { const action = getClassActivityAction(role, activity, CLASS_NOW); return <div className={styles.activityRow} data-highlighted={activity.id === requestedActivityId} key={activity.id}><span className={styles.activityIcon}><TeachingObjectIcon kind={getClassActivityTeachingObjectKind(activity.type)} size={16} /></span><span className={styles.activityCopy}><strong>{activity.title}</strong><small>{activity.detail}</small></span><button type="button" onClick={() => {
    if (activity.type === 'homework' && activity.homeworkId && selectedClass) {
      const prefix = role === 'teacher' ? '/teacher' : '/student';
      const params = new URLSearchParams({ source: 'class_unit', class: selectedClass.id, view: 'directory' });
      params.set('course', courseId);
      navigate(`${prefix}/homework/${activity.homeworkId}?${params.toString()}`);
      return;
    }
    setPlaceholderDialog(action.feedback);
  }}>{action.label}<ArrowRight aria-hidden="true" size={14} /></button></div>; })}</div>;

  const renderCourseDirectory = (record: ClassRecord, activeCourse?: ClassCourse) => {
    if (record.courses.length === 0) return <div className={styles.emptyState}><TeachingObjectIcon kind="course" size={22} /><strong>先创建第一门课程</strong><span>课程创建后，可以继续添加单元和教学活动。</span>{canManageSelectedClass ? <button className={styles.primaryButton} type="button" onClick={() => openEditor({ kind: 'course', courseId: null, name: '' })}><Plus aria-hidden="true" size={15} />创建课程</button> : null}</div>;
    if (!activeCourse) return null;
    return <>
      <div className={styles.courseTabs} role="tablist" aria-label="课程目录">{record.courses.map((course) => <button type="button" role="tab" aria-selected={activeCourse.id === course.id} key={course.id} onClick={() => setSelectedCourseId(course.id)}>{course.name}<small>{course.units.length} 个单元 · {countCourseActivities(course)} 项活动</small></button>)}</div>
      {canManageSelectedClass ? <div className={styles.courseToolbar}><div><strong>{activeCourse.name}</strong><span>课程内容管理</span></div><button type="button" onClick={() => openEditor({ kind: 'course', courseId: activeCourse.id, name: activeCourse.name })}><Pencil aria-hidden="true" size={14} />重命名</button><button type="button" onClick={() => setDeleteTarget({ kind: 'course', courseId: activeCourse.id, label: activeCourse.name })}><Trash2 aria-hidden="true" size={14} />删除</button><button type="button" onClick={() => openEditor({ kind: 'unit', courseId: activeCourse.id, unitId: null, title: '', description: '', status: 'draft' })}><Plus aria-hidden="true" size={14} />新建单元</button></div> : null}
      {(activeCourse.activities?.length ?? 0) > 0 ? <section className={styles.unit}><header><div><LayoutList aria-hidden="true" size={16} /><div><h3>不限单元</h3><p>直接归属于当前课程的活动</p></div></div><small>{activeCourse.activities?.length} 项活动</small></header>{renderActivityRows(activeCourse.activities ?? [], activeCourse.id)}</section> : null}
      <div className={styles.unitList}>{activeCourse.units.map((unit) => <section className={styles.unit} key={unit.id}><header><div><FolderTree aria-hidden="true" size={16} /><div><h3>{unit.title}<small className={styles.statusTag} data-status={unit.status}>{unit.status === 'published' ? '已发布' : '草稿'}</small></h3><p>{unit.description || '暂无单元介绍'}</p></div></div><div className={styles.unitActions}><small>{unit.activities.length} 项活动</small>{canManageSelectedClass ? <><button type="button" aria-label={`编辑单元 ${unit.title}`} onClick={() => openEditor({ kind: 'unit', courseId: activeCourse.id, unitId: unit.id, title: unit.title, description: unit.description, status: unit.status })}><Pencil aria-hidden="true" size={14} /></button><button type="button" aria-label={`删除单元 ${unit.title}`} onClick={() => setDeleteTarget({ kind: 'unit', courseId: activeCourse.id, unitId: unit.id, label: unit.title })}><Trash2 aria-hidden="true" size={14} /></button><button type="button" aria-label={`在 ${unit.title} 中新建活动`} onClick={() => openEditor({ kind: 'activity', courseId: activeCourse.id, unitId: unit.id, activityType: 'lesson', title: '', startsAt: '' })}><Plus aria-hidden="true" size={14} />活动</button></> : null}</div></header>{renderActivityRows(unit.activities, activeCourse.id)}{unit.activities.length === 0 ? <div className={styles.compactEmpty}>这个单元还没有活动</div> : null}</section>)}</div>
      {activeCourse.units.length === 0 ? <div className={styles.emptyState}><FolderTree aria-hidden="true" size={22} /><strong>这门课程还没有单元</strong><span>可以创建单元，也可以先添加不限单元的活动。</span></div> : null}
      {canManageSelectedClass ? <button type="button" className={styles.addRow} onClick={() => openEditor({ kind: 'activity', courseId: activeCourse.id, unitId: null, activityType: 'lesson', title: '', startsAt: '' })}><Plus aria-hidden="true" size={16} />新建活动</button> : null}
    </>;
  };

  const renderPlaceholders = () => canManageSelectedClass ? <section className={styles.placeholderSection} aria-labelledby="content-tools-title"><header><span className={styles.eyebrow}>扩展入口</span><h3 id="content-tools-title">课程协作与方案</h3></header><div className={styles.placeholderActions}><button type="button" onClick={() => setPlaceholderDialog('共创入口为 Placeholder，未接入真实协作服务。')}><BookCopy aria-hidden="true" size={17} /><span><strong>共创</strong><small>Placeholder</small></span></button><button type="button" onClick={() => setPlaceholderDialog('AI 入口为 Placeholder，未接入真实 AI 服务。')}><BrainCircuit aria-hidden="true" size={17} /><span><strong>AI</strong><small>Placeholder</small></span></button><button type="button" onClick={() => setPlaceholderDialog('教学方案入口为 Placeholder，未创建真实方案。')}><ClipboardList aria-hidden="true" size={17} /><span><strong>教学方案</strong><small>Placeholder</small></span></button><button type="button" onClick={() => setPlaceholderDialog('学习方案入口为 Placeholder，未创建真实方案。')}><Sparkles aria-hidden="true" size={17} /><span><strong>学习方案</strong><small>Placeholder</small></span></button><button type="button" onClick={() => setPlaceholderDialog('从其他班级导入为 Placeholder，未复制任何课程内容。')}><FolderInput aria-hidden="true" size={17} /><span><strong>从其他班级导入</strong><small>Placeholder</small></span></button></div></section> : null;

  const renderClassDetail = (sourceRecord: ClassRecord) => {
    const record = { ...sourceRecord, courses: getVisibleClassCourses(role, sourceRecord.courses) };
    const anchoredCourse = requestedActivityId ? record.courses.find((course) => [...(course.activities ?? []), ...course.units.flatMap(({ activities }) => activities)].some(({ id }) => id === requestedActivityId)) : undefined;
    const activeCourse = anchoredCourse ?? record.courses.find(({ id }) => id === selectedCourseId) ?? record.courses[0];
    const allActivities = record.courses.flatMap((course) => [...(course.activities ?? []), ...course.units.flatMap(({ activities }) => activities)]);
    const showDirectory = role === 'teacher' || studentContentView === 'directory';
    return (
      <section className={styles.detailView} aria-labelledby="class-detail-title">
        <header className={styles.detailHeader}><button type="button" className={styles.backButton} onClick={openList}><ArrowLeft aria-hidden="true" size={17} />{returnToHome ? '首页' : '我的班级'}</button><div className={styles.detailTitle}><span className={styles.eyebrow}>{record.memberCount} 位成员</span><h1 id="class-detail-title">{record.name}</h1><p>班级内容与教学关系</p></div><div className={styles.detailActions}>{canManageSelectedClass ? <><button type="button" onClick={() => openEditor({ kind: 'class', value: record.name })}><Pencil aria-hidden="true" size={15} />编辑班级</button><button type="button" onClick={() => setFeedback('邀请成员入口已保留，本 Demo 不发送真实邀请。')}><UserPlus aria-hidden="true" size={15} />邀请成员</button></> : null}<button type="button" onClick={() => navigate(`/${role === 'teacher' ? 'teacher' : 'student'}/classes/${record.id}/chat${returnToHome ? '?from=home' : ''}`)}><MessageSquareText aria-hidden="true" size={15} />班级消息</button></div></header>
        <div className={styles.detailLayout}>
          <aside className={styles.detailRail}><div className={styles.railSummary}><span className={styles.objectMark} data-tone={record.coverTone}>{record.name.slice(0, 1)}</span><strong>{record.memberCount} 位成员</strong><small>{record.pendingCountByRole[role] ?? 0} 项待处理</small></div><nav aria-label="班级快捷入口">
            <button type="button" onClick={() => navigate(`/${role === 'teacher' ? 'teacher' : 'student'}/classes/${record.id}/chat${returnToHome ? '?from=home' : ''}`)}><MessageSquareText aria-hidden="true" size={16} />群聊</button>
            <button type="button" aria-current={detailTab === 'course' ? 'page' : undefined} onClick={() => setDetailTab('course')}><LayoutList aria-hidden="true" size={16} />目录</button>
            <button type="button" onClick={() => navigate(`/${role === 'teacher' ? 'teacher' : 'student'}/classes/${record.id}/members${returnToHome ? '?source=home' : ''}`)}><Users aria-hidden="true" size={16} />成员</button>
            <button type="button" aria-current={detailTab === 'announcements' ? 'page' : undefined} onClick={() => setDetailTab('announcements')}><Megaphone aria-hidden="true" size={16} />公告<span>{record.announcements.filter(({ readByRole }) => readByRole[role] === false).length || ''}</span></button>
            <button type="button" onClick={() => setPlaceholderDialog('共创入口为 Placeholder，未接入真实协作服务。')}><BookCopy aria-hidden="true" size={16} />共创</button>
            <button type="button" onClick={() => setPlaceholderDialog('AI 入口为 Placeholder，未接入真实 AI 服务。')}><BrainCircuit aria-hidden="true" size={16} />AI</button>
            <button type="button" onClick={() => navigate(`/${role === 'teacher' ? 'teacher' : 'student'}/classes/${record.id}/settings${returnToHome ? '?source=home' : ''}`)}><Settings2 aria-hidden="true" size={16} />设置</button>
          </nav></aside>
          <main className={styles.detailMain}>
            {detailTab === 'course' ? <>
              <header className={styles.contentHeader}><div><span className={styles.eyebrow}>{showDirectory ? '课程目录' : '学习计划'}</span><h2>{showDirectory ? '按课程和单元查看教学活动' : '我的学习计划'}</h2></div>{role === 'student-family' ? <div className={styles.segmented} role="group" aria-label="班级学习视图"><button type="button" aria-pressed={studentContentView === 'learning-plan'} onClick={() => setStudentContentView('learning-plan')}>学习计划</button><button type="button" aria-pressed={studentContentView === 'directory'} onClick={() => setStudentContentView('directory')}>课程目录</button></div> : <button className={styles.secondaryButton} type="button" onClick={() => openEditor({ kind: 'course', courseId: null, name: '' })}><Plus aria-hidden="true" size={15} />新课程</button>}</header>
              {showDirectory ? renderCourseDirectory(record, activeCourse) : <div className={styles.learningPlanEmpty}><ClipboardList aria-hidden="true" size={24} /><strong>暂无学习计划</strong><p>当前移动端基线没有可投影的学习计划内容。</p><button type="button" onClick={() => setStudentContentView('directory')}>查看课程目录<ArrowRight aria-hidden="true" size={14} /></button></div>}
              {renderPlaceholders()}
            </> : null}
            {detailTab === 'announcements' ? <><header className={styles.contentHeader}><div><span className={styles.eyebrow}>班级通知</span><h2>公告与学习提醒</h2></div>{canManageSelectedClass ? <button className={styles.secondaryButton} type="button" onClick={() => openEditor({ kind: 'announcement', value: '' })}><Plus aria-hidden="true" size={15} />发布公告</button> : null}</header><div className={styles.announcementList}>{record.announcements.map((announcement) => <article className={styles.announcementRow} key={announcement.id}><div><span>{announcement.authorName} · {formatClassDate(announcement.createdAt, CLASS_NOW)}</span><h3>{announcement.title}</h3><p>{announcement.body}</p></div><small data-read={announcement.readByRole[role] !== false}>{announcement.readByRole[role] === false ? '未读' : '已读'}</small><button type="button" onClick={() => navigate(`/${role === 'teacher' ? 'teacher' : 'student'}/classes/${record.id}/announcements/${announcement.id}?source=class`)}>查看公告<ArrowRight aria-hidden="true" size={14} /></button></article>)}{record.announcements.length === 0 ? <div className={styles.emptyState}><Megaphone aria-hidden="true" size={22} /><strong>还没有班级公告</strong><span>新的提醒会在这里显示</span></div> : null}</div></> : null}
            {detailTab === 'members' ? <><header className={styles.contentHeader}><div><span className={styles.eyebrow}>班级成员</span><h2>老师与学生</h2></div>{canManageSelectedClass ? <button className={styles.secondaryButton} type="button" onClick={() => navigate(`/teacher/classes/${record.id}/members`)}><UserPlus aria-hidden="true" size={15} />管理成员</button> : null}</header><div className={styles.memberList}>{record.members.filter(({ leftAt }) => leftAt === null).map((member) => <div className={styles.memberRow} key={member.id}><span className={styles.memberAvatar}>{member.name.slice(0, 1)}</span><span><strong>{member.classNickname || member.name}{member.isCurrentUser ? '（当前）' : ''}</strong><small>{member.relationship}</small></span><em>{member.role === 'headmaster' ? '班主任' : member.role === 'teacher' ? '老师' : '学生'}</em></div>)}</div></> : null}
          </main>
          <aside className={styles.detailAside}><section><span>下一项安排</span><strong>{record.nextActivity?.title ?? '暂无近期安排'}</strong><small>{record.nextActivity ? `${formatClassDate(record.nextActivity.startsAt, CLASS_NOW)} · ${record.nextActivity.detail}` : '可以从课程内容继续浏览历史记录'}</small></section><section><span>班级节奏</span><div className={styles.asideMetric}><strong>{record.pendingCountByRole[role] ?? 0}</strong><small>项待处理</small></div><div className={styles.asideMetric}><strong>{allActivities.length}</strong><small>项课程活动</small></div></section><section><span>上下文入口</span><button type="button" onClick={() => navigate(role === 'teacher' ? '/teacher/tasks' : '/student/todos')}><CheckCircle2 aria-hidden="true" size={15} />查看待办</button><button type="button" onClick={() => navigate(role === 'teacher' ? '/teacher/space/resource-center' : `/student/classes/${record.id}/resources`)}><FolderTree aria-hidden="true" size={15} />查看关联资源</button></section></aside>
        </div>
        {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}
        <BoundaryDialog description={placeholderDialog} onClose={() => setPlaceholderDialog(null)} />
      </section>
    );
  };

  const renderOpenCourseDetail = (course: OpenCourseRecord) => {
    const joined = joinedCourseIds.has(course.id);
    const enterLabel = course.status === 'live' ? '进入公开课' : joined ? '查看公开课' : '加入公开课';
    return <section className={styles.detailView} aria-labelledby="open-course-detail-title"><header className={styles.detailHeader}><button type="button" className={styles.backButton} onClick={openList}><ArrowLeft aria-hidden="true" size={17} />{returnToHome ? '首页' : '公开课'}</button><div className={styles.detailTitle}><span className={styles.eyebrow}>{course.subject} · {OPEN_COURSE_STATUS_LABELS[course.status]}</span><h1 id="open-course-detail-title">{course.title}</h1><p>{course.instructorName} · {course.classroomSummary}</p></div><div className={styles.detailActions}>{canManageSelectedOpenCourse ? <button type="button" onClick={() => openEditor({ kind: 'open-course', value: course.title })}><Pencil aria-hidden="true" size={15} />编辑公开课</button> : null}<button className={styles.primaryButton} type="button" onClick={() => { if (role === 'student-family' && !joined) { joinCourse(course.id); setFeedback('已加入公开课。'); } else setFeedback(course.status === 'live' ? '课堂入口已保留，本 Demo 不连接真实课堂引擎。' : '公开课详情入口已保留。'); }}>{enterLabel}<ArrowRight aria-hidden="true" size={15} /></button></div></header><div className={styles.openCourseLayout}><main className={styles.openCourseMain}><div className={styles.openCourseHero} data-status={course.status}><span>{course.subject}</span><strong>{course.title.slice(0, 1)}</strong></div><section className={styles.articleSection}><span className={styles.eyebrow}>课程介绍</span><h2>一次聚焦一个主题的公开课堂</h2><p>{course.description}</p></section><dl className={styles.infoGrid}><div><dt>开始时间</dt><dd>{formatClassDate(course.startsAt, CLASS_NOW)}</dd></div><div><dt>课时</dt><dd>{formatDuration(course.durationMinutes)}</dd></div><div><dt>授课老师</dt><dd>{course.instructorName}</dd></div><div><dt>已报名</dt><dd>{course.enrolledCount}/{course.maxSeats} 人</dd></div></dl><section className={styles.boundaryNotice}><TeachingObjectIcon kind="open-course" size={17} /><span>公开课报名、设备连接与真实课堂服务使用本地状态演示。</span></section></main><aside className={styles.detailAside}><section><span>课堂状态</span><strong>{OPEN_COURSE_STATUS_LABELS[course.status]}</strong><small>{course.classroomSummary}</small></section><section><span>适用视角</span><strong>{getRoleLabel(role)}</strong><small>{role === 'teacher' ? '可管理本人创建的待开始公开课。' : '可查看老师公开的课程并加入。'}</small></section></aside></div>{feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}</section>;
  };

  const view = detailId ? (surface === 'classes' && selectedClass ? renderClassDetail(selectedClass) : surface === 'open-courses' && selectedOpenCourse ? renderOpenCourseDetail(selectedOpenCourse) : <div className={styles.emptyState}><strong>找不到这个内容</strong><button type="button" onClick={openList}>返回列表</button></div>) : surface === 'classes' ? renderClassList() : renderOpenCourseList();
  return <div className={styles.page}>{view}{renderEditor()}{renderDeleteDialog()}</div>;
}
