import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building2,
  Camera,
  CalendarClock,
  Copy,
  ExternalLink,
  Link2,
  QrCode,
  Share2,
  Sparkles,
  Trash2,
  UserRoundPlus,
  UserPlus,
  Video,
} from 'lucide-react';
import { usePageHeader } from '@app/shell/usePageHeader';
import { useClassWorkspaceStore } from '@features/class-workspace/class-workspace-store';
import {
  OPEN_COURSE_DURATIONS,
  OPEN_COURSE_PRESET_COVERS,
  OPEN_COURSE_STAGE_CAPACITIES,
  canDeleteOpenCourse,
  canEditOpenCourse,
  createOpenCourseRecord,
  openCourseRecordToInput,
  resolveOpenCourseStatus,
  toOpenCourseWorkspaceRecord,
  updateOpenCourseRecord,
  validateOpenCourseInput,
  type OpenCourseInput,
} from '@domain/open-course/open-course';
import { OpenCourseDialog } from './OpenCourseDialog';
import {
  formatOpenCourseDateTime,
  fromDemoDateTimeLocal,
  getNextOpenCourseId,
  getOpenCourseEnterState,
  getOpenCourseReturnPath,
  getOpenCourseSource,
  getOpenCourseStatusLabel,
  toDemoDateTimeLocal,
  withOpenCourseSource,
} from './open-course-view';
import styles from './OpenCourseWorkspace.module.css';

const DEFAULT_INPUT: OpenCourseInput = {
  title: '',
  coverId: 'cover-green',
  startsAt: '2026-08-08T16:00:00+08:00',
  durationMinutes: 40,
  classroom: {
    showSeats: true,
    autoStage: true,
    stageCapacity: '1V6',
    recordClassroom: false,
    recordScene: false,
  },
};

export function TeacherOpenCourseFormWorkspace({
  mode,
  courseId,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit';
  courseId?: string;
  onClose?: () => void;
  onSaved?: (courseId: string) => void;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const source = getOpenCourseSource(searchParams);
  const { openCourses, setOpenCourses } = useClassWorkspaceStore();
  const current = mode === 'edit' ? openCourses.find(({ id }) => id === courseId) : undefined;
  const [initialInput] = useState<OpenCourseInput>(() => current ? openCourseRecordToInput(current) : DEFAULT_INPUT);
  const [input, setInput] = useState<OpenCourseInput>(initialInput);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const dirty = JSON.stringify(input) !== JSON.stringify(initialInput);

  const getDetailSearch = (autoInvite = false) => {
    const params = new URLSearchParams(searchParams);
    params.delete('dialog');
    params.delete('course');
    params.set('source', source);
    if (autoInvite) params.set('autoInvite', '1');
    else params.delete('autoInvite');
    return params.toString();
  };

  const closeForm = () => {
    if (dirty) {
      setConfirmClose(true);
      return;
    }
    if (onClose) onClose();
    else navigate(getOpenCourseReturnPath('teacher', source, searchParams));
  };

  const discardForm = () => {
    setConfirmClose(false);
    if (onClose) onClose();
    else navigate(getOpenCourseReturnPath('teacher', source, searchParams));
  };

  const updateClassroom = (patch: Partial<OpenCourseInput['classroom']>) => {
    setInput((value) => {
      const classroom = { ...value.classroom, ...patch };
      if (patch.showSeats === false) classroom.autoStage = false;
      return { ...value, classroom };
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    const validation = validateOpenCourseInput(input);
    if (!validation.valid) {
      setErrors(validation.errors);
      setFeedback('请检查表单中的必填项和时间。');
      queueMicrotask(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setErrors({});
    setSubmitting(true);
    if (mode === 'edit') {
      if (!current) return;
      const updated = updateOpenCourseRecord(current, validation.value);
      setOpenCourses((records) => records.map((record) => record.id === current.id ? updated : record));
      if (onSaved) {
        onSaved(current.id);
        return;
      }
      navigate(`/teacher/open-courses/${current.id}?${getDetailSearch()}`, { replace: true });
      return;
    }

    const id = getNextOpenCourseId(openCourses);
    const created = createOpenCourseRecord(validation.value, id);
    setOpenCourses((records) => [created, ...records]);
    if (onSaved) {
      onSaved(id);
      return;
    }
    navigate(`/teacher/open-courses/${id}?${getDetailSearch(true)}`, { replace: true });
  };

  if (mode === 'edit' && !current) {
    return <MissingOpenCourse onBack={() => navigate(getOpenCourseReturnPath('teacher', source, searchParams))} />;
  }
  if (current && (!current.ownerRoles.includes('teacher') || !canEditOpenCourse(current))) {
    return (
      <SafeState
        title="当前公开课不可编辑"
        detail="只有创建者可以在开课前编辑公开课。"
        onBack={() => navigate(withOpenCourseSource(`/teacher/open-courses/${current.id}`, source))}
      />
    );
  }

  const supplement = current ?? {
    subject: '待设置',
    description: '公开课介绍待补充。',
    classroomSummary: '线上直播间',
  };

  return (
    <OpenCourseDialog title={mode === 'create' ? '新建公开课' : '编辑公开课'} wide onClose={closeForm}>
      <div className={styles.formDialogBody}>
      <header className={styles.dialogFormHeader}>
        <div>
          <span className={styles.eyebrow}>公开课 · 单次课堂</span>
          <p>完整填写已有字段，保存后回到公开课详情。</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.secondaryButton} type="button" onClick={() => setFeedback('组织切换为 Placeholder，当前 Demo 固定使用我的账号。')}><Building2 aria-hidden="true" size={16} />组织 · 我的账号</button>
          <button className={styles.primaryButton} type="submit" form="open-course-form" disabled={submitting}>{mode === 'create' ? '发布' : '保存'}</button>
        </div>
      </header>

      <section className={styles.upgradeBanner} aria-label="公开课权益提示">
        <span><Sparkles aria-hidden="true" size={17} /><strong>公开课权益</strong>当前账户按免费版课堂时长演示</span>
        <button type="button" onClick={() => setFeedback('立即升级为 Placeholder，未连接支付或套餐服务。')}>立即升级</button>
      </section>

      <form id="open-course-form" className={styles.formLayout} onSubmit={submit} noValidate>
        <section className={styles.formSection} aria-labelledby="basic-section-title">
          <div className={styles.sectionHeading}>
            <span>01</span><div><h2 id="basic-section-title">基本信息</h2><p>名称和预设封面会显示在公开课列表与详情。</p></div>
          </div>
          <label className={styles.field}>
            <span>公开课名称</span>
            <input
              aria-label="公开课名称"
              value={input.title}
              onChange={(event) => setInput((value) => ({ ...value, title: event.target.value }))}
              maxLength={50}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? 'title-error' : undefined}
              placeholder="输入公开课名称"
            />
            <small>{Array.from(input.title).length}/50</small>
            {errors.title ? <em id="title-error">{errors.title}</em> : null}
          </label>
          <fieldset className={styles.coverFieldset}>
            <legend>预设封面</legend>
            <div className={styles.coverOptions}>
              <button
                type="button"
                className={styles.coverOption}
                onClick={() => setFeedback('拍摄或从相册选择封面为 Placeholder，未访问设备媒体。')}
              >
                <span className={styles.cameraCover}><Camera aria-hidden="true" size={20} /></span>拍摄或相册
              </button>
              {OPEN_COURSE_PRESET_COVERS.map((cover) => (
                <button
                  key={cover.id}
                  type="button"
                  className={styles.coverOption}
                  data-cover={cover.tone}
                  aria-pressed={input.coverId === cover.id}
                  onClick={() => setInput((value) => ({ ...value, coverId: cover.id }))}
                >
                  <span aria-hidden="true" />{cover.label}
                </button>
              ))}
            </div>
          </fieldset>
        </section>

        <section className={styles.formSection} aria-labelledby="schedule-section-title">
          <div className={styles.sectionHeading}>
            <span>02</span><div><h2 id="schedule-section-title">课堂安排</h2><p>Demo 当前时间固定为 2026 年 8 月 8 日 14:15。</p></div>
          </div>
          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              <span>开始时间</span>
              <input
                aria-label="开始时间"
                type="datetime-local"
                min="2026-08-08T14:15"
                value={toDemoDateTimeLocal(input.startsAt)}
                onChange={(event) => setInput((value) => ({ ...value, startsAt: fromDemoDateTimeLocal(event.target.value) }))}
                aria-invalid={Boolean(errors.startsAt)}
              />
              {errors.startsAt ? <em>{errors.startsAt}</em> : null}
            </label>
            <label className={styles.field}>
              <span>课堂时长</span>
              <select
                aria-label="课堂时长"
                value={input.durationMinutes}
                onChange={(event) => setInput((value) => ({ ...value, durationMinutes: Number(event.target.value) as OpenCourseInput['durationMinutes'] }))}
              >
                {OPEN_COURSE_DURATIONS.map((duration) => <option key={duration} value={duration}>{duration} 分钟</option>)}
              </select>
            </label>
          </div>
          <label className={styles.field}>
            <span>授课教师</span>
            <input aria-label="授课教师" value={current?.instructorName ?? '王老师'} readOnly aria-readonly="true" />
          </label>
          <div className={styles.placeholderRow}>
            <span><strong>联席教师</strong><small>未添加</small></span>
            <button className={styles.secondaryButton} type="button" onClick={() => setFeedback('添加联席教师为 Placeholder，未连接联系人和席位服务。')}><UserRoundPlus aria-hidden="true" size={15} />添加</button>
          </div>
        </section>

        <section className={styles.formSection} aria-labelledby="classroom-section-title">
          <div className={styles.sectionHeading}>
            <span>03</span><div><h2 id="classroom-section-title">课堂配置</h2><p>配置只作用于本地公开课对象。</p></div>
          </div>
          <ToggleRow label="展示座位席" checked={input.classroom.showSeats} onChange={(checked) => updateClassroom({ showSeats: checked })} />
          <ToggleRow
            label="学生自动上台"
            checked={input.classroom.autoStage}
            disabled={!input.classroom.showSeats}
            onChange={(checked) => updateClassroom({ autoStage: checked })}
          />
          <label className={styles.field}>
            <span>台上人数</span>
            <select aria-label="台上人数" value={input.classroom.stageCapacity} onChange={(event) => updateClassroom({ stageCapacity: event.target.value as OpenCourseInput['classroom']['stageCapacity'] })}>
              {OPEN_COURSE_STAGE_CAPACITIES.map((capacity) => <option key={capacity}>{capacity}</option>)}
            </select>
          </label>
          <ToggleRow label="录制 ClassIn 教室（演示开关）" checked={input.classroom.recordClassroom} onChange={(checked) => updateClassroom({ recordClassroom: checked })} />
          <ToggleRow label="录制现场（演示开关）" checked={input.classroom.recordScene} onChange={(checked) => updateClassroom({ recordScene: checked })} />
        </section>

        <aside className={styles.supplement} aria-label="PC 展示补充">
          <span className={styles.eyebrow}>Existing PC fields</span>
          <dl><div><dt>学科</dt><dd>{supplement.subject}</dd></div><div><dt>课堂说明</dt><dd>{supplement.description}</dd></div><div><dt>课堂位置</dt><dd>{supplement.classroomSummary}</dd></div></dl>
          <p>这些字段仅保留展示，本表单不会改写。</p>
        </aside>
      </form>
      {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}
      {confirmClose ? <section className={styles.closeGuard} role="alert"><strong>公开课尚未保存</strong><span>关闭后当前修改不会保留。</span><div><button type="button" onClick={() => setConfirmClose(false)}>继续编辑</button><button type="button" onClick={discardForm}>放弃修改</button><button type="button" onClick={() => setConfirmClose(false)}>取消</button></div></section> : null}
      </div>
    </OpenCourseDialog>
  );
}

export function TeacherOpenCourseDetailWorkspace({ courseId }: { courseId: string }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const source = getOpenCourseSource(searchParams);
  const { openCourses, setOpenCourses } = useClassWorkspaceStore();
  const rawCourse = openCourses.find(({ id }) => id === courseId);
  const course = useMemo(
    () => rawCourse ? toOpenCourseWorkspaceRecord(rawCourse) : null,
    [rawCourse],
  );
  const [inviteOpen, setInviteOpen] = useState(searchParams.get('autoInvite') === '1');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const dialogTriggerRef = useRef<HTMLElement | null>(null);
  const pageHeader = useMemo(() => course ? {
    title: course.title,
    breadcrumbs: [{ label: '公开课', to: '/teacher/open-courses' }, { label: course.title }],
  } : { title: '公开课' }, [course]);
  usePageHeader(pageHeader);

  useEffect(() => {
    if (searchParams.get('autoInvite') !== '1') return;
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('autoInvite');
      return next;
    }, { replace: true });
  }, [searchParams, setSearchParams]);

  const getCollectionPath = () => {
    if (source === 'schedule') return getOpenCourseReturnPath('teacher', source, searchParams);
    if (source === 'home') return '/teacher/home';
    const params = new URLSearchParams(searchParams);
    for (const key of ['source', 'autoInvite', 'dialog', 'course']) params.delete(key);
    const query = params.toString();
    return `/teacher/open-courses${query ? `?${query}` : ''}`;
  };

  const closeInlineDialog = () => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('dialog');
      return next;
    }, { replace: true });
    requestAnimationFrame(() => dialogTriggerRef.current?.focus());
  };

  if (!course) return <MissingOpenCourse onBack={() => navigate(getCollectionPath())} />;
  const status = resolveOpenCourseStatus(course);
  const owner = course.ownerRoles.includes('teacher');
  const canEdit = owner && canEditOpenCourse(course);
  const canDelete = owner && canDeleteOpenCourse(course);
  const canInvite = owner && status !== 'ended';
  const enter = getOpenCourseEnterState(course);

  const remove = () => {
    setOpenCourses((records) => records.filter(({ id }) => id !== course.id));
    navigate(getCollectionPath(), { replace: true });
  };

  return (
    <main className={styles.page} aria-label={`${course.title}公开课详情`}>
      <section className={styles.teacherDetailIdentity}>
        <div><span className={styles.statusBadge} data-status={status}>{getOpenCourseStatusLabel(status)}</span><strong>{course.subject} · {course.instructorName}</strong><span><CalendarClock aria-hidden="true" size={16} />{formatOpenCourseDateTime(course.startsAt)} · {course.durationMinutes} 分钟</span></div>
        <div className={styles.headerActions}>
          {canInvite ? <button className={styles.secondaryButton} type="button" onClick={(event) => { dialogTriggerRef.current = event.currentTarget; setInviteOpen(true); }}><UserPlus aria-hidden="true" size={16} />邀请学生</button> : null}
          {canEdit ? <button className={styles.secondaryButton} type="button" onClick={(event) => { dialogTriggerRef.current = event.currentTarget; setSearchParams((current) => { const next = new URLSearchParams(current); next.set('dialog', 'edit'); return next; }, { replace: false }); }}>编辑</button> : null}
          {canDelete ? <button className={styles.dangerButton} type="button" onClick={(event) => { dialogTriggerRef.current = event.currentTarget; setDeleteOpen(true); }}><Trash2 aria-hidden="true" size={16} />删除</button> : null}
        </div>
      </section>

      <div className={styles.teacherDetailBody}>
        <section className={styles.detailSection} aria-labelledby="course-description-heading">
          <h2 id="course-description-heading">公开课说明</h2>
          <p>{course.description}</p>
        </section>
        <section className={styles.detailSection} aria-labelledby="course-detail-heading">
          <h2 id="course-detail-heading">课堂信息</h2>
          <dl className={styles.detailList}>
            <Detail label="授课教师" value={course.instructorName} />
            <Detail label="开始时间" value={formatOpenCourseDateTime(course.startsAt)} />
            <Detail label="课堂时长" value={`${course.durationMinutes} 分钟`} />
            <Detail label="课堂位置" value={course.classroomSummary} />
            <Detail label="报名人数" value={`${course.enrolledCount}/${course.maxSeats} 人`} />
          </dl>
        </section>
        <section className={styles.detailSection} aria-labelledby="course-config-heading">
          <h2 id="course-config-heading">课堂配置</h2>
          <dl className={styles.detailList}>
            <Detail label="座位席" value={course.classroom.showSeats ? '开启' : '关闭'} />
            <Detail label="自动上台" value={course.classroom.autoStage ? '开启' : '关闭'} />
            <Detail label="台上人数" value={course.classroom.stageCapacity} />
            <Detail label="录制教室" value={course.classroom.recordClassroom ? '演示开关已开启' : '关闭'} />
            <Detail label="录制现场" value={course.classroom.recordScene ? '演示开关已开启' : '关闭'} />
          </dl>
        </section>
        <section className={styles.detailSection} aria-labelledby="course-links-heading">
          <h2 id="course-links-heading">直播与回放</h2>
          <div className={styles.placeholderLinks}>
            <button type="button" onClick={() => setFeedback('网页直播链接为 Placeholder，未生成真实访问地址。')}><Link2 aria-hidden="true" size={16} />网页直播链接</button>
            <button type="button" onClick={() => setFeedback('网页回放链接为 Placeholder，未生成真实访问地址。')}><Link2 aria-hidden="true" size={16} />网页回放链接</button>
          </div>
        </section>
        <footer className={styles.actionBar}>
          <div><strong>{enter.label}</strong><span>{enter.hint}</span></div>
          {status !== 'ended' ? <button
            className={styles.primaryButton}
            type="button"
            disabled={enter.disabled}
            onClick={() => navigate(withOpenCourseSource(`/teacher/open-courses/${course.id}/preflight`, source))}
          ><Video aria-hidden="true" size={16} />{enter.label}</button> : null}
        </footer>
      </div>

      {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}

      {searchParams.get('dialog') === 'edit' ? <TeacherOpenCourseFormWorkspace mode="edit" courseId={course.id} onClose={closeInlineDialog} /> : null}
      {inviteOpen ? <InviteDialog course={course} onClose={() => { setInviteOpen(false); requestAnimationFrame(() => dialogTriggerRef.current?.focus()); }} /> : null}
      {deleteOpen ? (
        <OpenCourseDialog title="删除公开课？" kind="alertdialog" onClose={() => { setDeleteOpen(false); requestAnimationFrame(() => dialogTriggerRef.current?.focus()); }}>
          <p>删除后不可恢复，公开课将从本地列表移除。</p>
          <div className={styles.dialogActions}>
            <button className={styles.secondaryButton} type="button" onClick={() => { setDeleteOpen(false); requestAnimationFrame(() => dialogTriggerRef.current?.focus()); }}>取消</button>
            <button className={styles.dangerButton} type="button" onClick={remove}>确认删除</button>
          </div>
        </OpenCourseDialog>
      ) : null}
    </main>
  );
}

export function InviteDialog({ course, onClose }: { course: ReturnType<typeof toOpenCourseWorkspaceRecord>; onClose: () => void }) {
  const [feedback, setFeedback] = useState('');
  const placeholder = (label: string) => setFeedback(`${label}为 Demo Placeholder，未连接真实外部服务。`);
  return (
    <OpenCourseDialog title="邀请学生" onClose={onClose}>
      <div className={styles.inviteLayout}>
        <section className={styles.passcodePanel}>
          <span>In 口令</span><strong>{course.passcode}</strong>
          <button className={styles.secondaryButton} type="button" onClick={() => setFeedback(`口令 ${course.passcode} 已复制（演示）。`)}><Copy aria-hidden="true" size={15} />复制口令</button>
        </section>
        <section className={styles.qrPanel} aria-label="公开课二维码">
          <QrCode aria-hidden="true" size={72} /><strong>扫码加入公开课</strong><span>演示二维码</span>
          <div><button type="button" onClick={() => placeholder('保存二维码')}>保存图片</button><button type="button" onClick={() => placeholder('分享二维码')}><Share2 aria-hidden="true" size={14} />分享</button></div>
        </section>
      </div>
      <div className={styles.shareChannels} aria-label="外部邀请渠道">
        {['ClassIn', '微信', '朋友圈', '短信', 'QQ'].map((channel) => <button type="button" key={channel} onClick={() => placeholder(channel)}><ExternalLink aria-hidden="true" size={14} />{channel}</button>)}
      </div>
      {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}
    </OpenCourseDialog>
  );
}

function ToggleRow({ label, checked, disabled = false, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return <label className={styles.toggleRow}><span>{label}</span><input aria-label={label} type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} /></label>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function MissingOpenCourse({ onBack }: { onBack: () => void }) {
  return <SafeState title="未找到公开课" detail="该公开课不存在、已删除或当前角色不可见。" onBack={onBack} />;
}

function SafeState({ title, detail, onBack }: { title: string; detail: string; onBack: () => void }) {
  return <main className={styles.safeState}><h1>{title}</h1><p>{detail}</p><button className={styles.primaryButton} type="button" onClick={onBack}>安全返回</button></main>;
}
