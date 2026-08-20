import {
  ArrowLeft,
  Bell,
  Bot,
  CheckCircle2,
  ChevronRight,
  Download,
  FileQuestion,
  FileText,
  Mic2,
  Paperclip,
  Save,
  Search,
  Send,
  Sparkles,
  Star,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BoundaryDialog } from '@app/shell/BoundaryDialog';
import { useOperationGuard } from '@app/shell/use-operation-guard';
import {
  calculateHomeworkStatistics,
  EMPTY_HOMEWORK_FORM,
  getSubmissionGroup,
  groupSubmissions,
  homeworkToFormValues,
  resolveHomeworkStatus,
  validateHomeworkForm,
  type HomeworkClassOption,
  type HomeworkFormErrors,
  type HomeworkFormValues,
  type TeacherSubmissionGroup,
} from '@domain/homework/homework';
import { HOMEWORK_CONTEXT_OPTIONS } from '@mocks/scenarios/homework';
import {
  selectHomeworkSubmissions,
  useHomeworkWorkspace,
} from './homework-workspace-store';
import styles from './HomeworkWorkspace.module.css';

const GROUP_LABELS: Record<TeacherSubmissionGroup, string> = {
  not_submitted: '未交',
  pending: '待批',
  returned: '打回',
  graded: '已批',
};

const STATUS_LABELS = { draft: '草稿', scheduled: '待开始', active: '进行中', ended: '已结束' } as const;

function formatDateTime(value: string | null): string {
  if (!value) return '未设置';
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(value));
}

function toDateTimeLocal(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

type PlaceholderButtonProps = {
  label: string;
  children: React.ReactNode;
  onActivate: (message: string) => void;
};

function PlaceholderButton({ label, children, onActivate }: PlaceholderButtonProps) {
  return (
    <button type="button" onClick={() => onActivate(`${label}为本地 Demo 占位，不连接真实服务。`)}>
      {children}
      {label}
    </button>
  );
}

export type TeacherHomeworkEditorWorkspaceProps = {
  homeworkId?: string;
  classOptions?: readonly HomeworkClassOption[];
  initialValues?: Pick<HomeworkFormValues, 'classId' | 'courseId' | 'unitId'>;
  onBack?: () => void;
  onComplete?: (homeworkId: string) => void;
};

export function TeacherHomeworkEditorWorkspace({
  homeworkId,
  classOptions = HOMEWORK_CONTEXT_OPTIONS,
  initialValues,
  onBack,
  onComplete,
}: TeacherHomeworkEditorWorkspaceProps) {
  const { homeworks, saveHomeworkDraft, publishHomework } = useHomeworkWorkspace();
  const existing = homeworkId ? homeworks.find(({ id }) => id === homeworkId) : undefined;
  const initial = useMemo(
    () => existing ? homeworkToFormValues(existing) : { ...EMPTY_HOMEWORK_FORM, ...initialValues },
    [existing, initialValues],
  );
  const [values, setValues] = useState<HomeworkFormValues>(initial);
  const [baseline, setBaseline] = useState<HomeworkFormValues>(initial);
  const [errors, setErrors] = useState<HomeworkFormErrors>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [placeholderDialog, setPlaceholderDialog] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const { registerGuard } = useOperationGuard();
  const isDirty = JSON.stringify(values) !== JSON.stringify(baseline);
  const selectedClass = classOptions.find(({ id }) => id === values.classId);
  const selectedCourse = selectedClass?.courses.find(({ id }) => id === values.courseId);

  useEffect(() => {
    registerGuard({
      context: isDirty ? { kind: 'unsaved-edit' } : { kind: 'idle' },
      resolveUnsaved: (resolution) => {
        if (resolution === 'save') {
          const result = saveHomeworkDraft(values, homeworkId);
          if (result.ok) setBaseline(values);
        } else {
          setValues(baseline);
        }
      },
    });
    return () => registerGuard({ context: { kind: 'idle' } });
  }, [baseline, homeworkId, isDirty, registerGuard, saveHomeworkDraft, values]);

  if (homeworkId && !existing) {
    return <MissingState title="找不到这份作业" onBack={onBack} />;
  }

  const update = <K extends keyof HomeworkFormValues>(field: K, value: HomeworkFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFeedback(null);
  };

  const focusFirstError = () => {
    window.requestAnimationFrame(() => {
      const field = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
      field?.focus();
    });
  };

  const handleSaveDraft = () => {
    const result = saveHomeworkDraft(values, homeworkId);
    if (!result.ok) {
      setFeedback(result.error.message);
      return;
    }
    setBaseline(values);
    setFeedback('作业草稿已保存到本地 Demo。');
    onComplete?.(result.value);
  };

  const handlePublish = () => {
    const nextErrors = validateHomeworkForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFeedback('请先完善必填信息。');
      focusFirstError();
      return;
    }
    const result = publishHomework(values, homeworkId);
    if (!result.ok) {
      setFeedback(result.error.message);
      focusFirstError();
      return;
    }
    setBaseline(values);
    setFeedback('作业已发布，学生端与教师看板已同步。');
    onComplete?.(result.value);
  };

  return (
    <main className={styles.page} aria-labelledby="homework-editor-title">
      <header className={styles.pageHeader}>
        <button className={styles.backButton} type="button" onClick={onBack} aria-label="返回">
          <ArrowLeft aria-hidden="true" size={18} />
        </button>
        <div>
          <span className={styles.eyebrow}>班级内容 · 作业</span>
          <h1 id="homework-editor-title">{existing ? '编辑作业' : '新建作业'}</h1>
          <p>面向一个完整班级发布，满分固定为 100 分。</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.secondaryButton} type="button" onClick={handleSaveDraft}>
            <Save aria-hidden="true" size={16} />保存草稿
          </button>
          <button className={styles.primaryButton} type="button" onClick={handlePublish}>
            <Send aria-hidden="true" size={16} />发布
          </button>
        </div>
      </header>

      <form className={styles.editorLayout} ref={formRef} onSubmit={(event) => event.preventDefault()}>
        <section className={styles.formMain} aria-label="作业基础信息">
          <div className={styles.formSection}>
            <header><span>01</span><div><h2>作业内容</h2><p>标题与要求将完整展示给学生。</p></div></header>
            <label>
              <span>作业标题 <em>必填</em></span>
              <input
                autoFocus
                aria-invalid={Boolean(errors.title)}
                value={values.title}
                onChange={(event) => update('title', event.target.value)}
                placeholder="输入作业标题"
              />
              {errors.title ? <small role="alert">{errors.title}</small> : null}
            </label>
            <label>
              <span>作业要求 <em>必填</em></span>
              <textarea
                aria-invalid={Boolean(errors.instructions)}
                value={values.instructions}
                onChange={(event) => update('instructions', event.target.value)}
                placeholder="说明作答要求和提交内容"
                rows={7}
              />
              {errors.instructions ? <small role="alert">{errors.instructions}</small> : null}
            </label>
            <div className={styles.placeholderTools} aria-label="作业资源工具">
              <PlaceholderButton label="添加附件" onActivate={setPlaceholderDialog}><Paperclip aria-hidden="true" size={16} /></PlaceholderButton>
              <PlaceholderButton label="加载原题" onActivate={setPlaceholderDialog}><FileQuestion aria-hidden="true" size={16} /></PlaceholderButton>
              <PlaceholderButton label="标准答案" onActivate={setPlaceholderDialog}><CheckCircle2 aria-hidden="true" size={16} /></PlaceholderButton>
              <PlaceholderButton label="AI 辅助" onActivate={setPlaceholderDialog}><Sparkles aria-hidden="true" size={16} /></PlaceholderButton>
            </div>
          </div>

          <div className={styles.formSection}>
            <header><span>02</span><div><h2>发布范围</h2><p>本阶段只支持一个完整班级，不选择部分学生。</p></div></header>
            <div className={styles.fieldGrid}>
              <label>
                <span>班级 <em>必填</em></span>
                <select
                  aria-invalid={Boolean(errors.classId)}
                  value={values.classId ?? ''}
                  onChange={(event) => {
                    const classId = event.target.value || null;
                    const firstCourse = classOptions.find(({ id }) => id === classId)?.courses[0];
                    setValues((current) => ({ ...current, classId, courseId: firstCourse?.id ?? null, unitId: null }));
                    setErrors((current) => ({ ...current, classId: undefined, courseId: undefined }));
                  }}
                >
                  <option value="">请选择班级</option>
                  {classOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
                {errors.classId ? <small role="alert">{errors.classId}</small> : null}
              </label>
              <label>
                <span>课程 <em>必填</em></span>
                <select
                  aria-invalid={Boolean(errors.courseId)}
                  value={values.courseId ?? ''}
                  onChange={(event) => {
                    update('courseId', event.target.value || null);
                    update('unitId', null);
                  }}
                  disabled={!selectedClass}
                >
                  <option value="">请选择课程</option>
                  {selectedClass?.courses.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
                {errors.courseId ? <small role="alert">{errors.courseId}</small> : null}
              </label>
              <label>
                <span>单元 <i>选填</i></span>
                <select
                  value={values.unitId ?? ''}
                  onChange={(event) => update('unitId', event.target.value || null)}
                  disabled={!selectedCourse}
                >
                  <option value="">不限单元</option>
                  {selectedCourse?.units.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className={styles.formSection}>
            <header><span>03</span><div><h2>提交时间</h2><p>作业状态由开始和截止时间自动派生。</p></div></header>
            <div className={styles.fieldGrid}>
              <label>
                <span>开始时间 <em>必填</em></span>
                <input
                  type="datetime-local"
                  aria-invalid={Boolean(errors.startsAt)}
                  value={toDateTimeLocal(values.startsAt)}
                  onChange={(event) => update('startsAt', fromDateTimeLocal(event.target.value))}
                />
                {errors.startsAt ? <small role="alert">{errors.startsAt}</small> : null}
              </label>
              <label>
                <span>截止时间 <em>必填</em></span>
                <input
                  type="datetime-local"
                  aria-invalid={Boolean(errors.dueAt)}
                  value={toDateTimeLocal(values.dueAt)}
                  onChange={(event) => update('dueAt', fromDateTimeLocal(event.target.value))}
                />
                {errors.dueAt ? <small role="alert">{errors.dueAt}</small> : null}
              </label>
            </div>
            <label className={styles.checkboxField}>
              <input
                type="checkbox"
                checked={values.allowLateSubmission}
                onChange={(event) => update('allowLateSubmission', event.target.checked)}
              />
              <span><strong>允许补交</strong><small>截止后，未交学生仍可提交并标记为补交。</small></span>
            </label>
          </div>
        </section>

        <aside className={styles.editorSummary} aria-label="发布摘要">
          <span className={styles.eyebrow}>发布摘要</span>
          <dl>
            <div><dt>班级</dt><dd>{selectedClass?.name ?? '未选择'}</dd></div>
            <div><dt>课程</dt><dd>{selectedCourse?.name ?? '未选择'}</dd></div>
            <div><dt>范围</dt><dd>{selectedCourse?.units.find(({ id }) => id === values.unitId)?.name ?? '不限单元'}</dd></div>
            <div><dt>满分</dt><dd>100 分</dd></div>
            <div><dt>开始</dt><dd>{formatDateTime(values.startsAt)}</dd></div>
            <div><dt>截止</dt><dd>{formatDateTime(values.dueAt)}</dd></div>
          </dl>
          <p>附件、多班级和部分学生发布仅保留边界，不写入 Core 数据。</p>
        </aside>
      </form>
      {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}
      <BoundaryDialog description={placeholderDialog} onClose={() => setPlaceholderDialog(null)} />
    </main>
  );
}

export type TeacherHomeworkDetailWorkspaceProps = {
  homeworkId: string;
  initialGroup?: TeacherSubmissionGroup;
  backLabel?: string;
  onBack?: () => void;
  onReview?: (submissionId: string) => void;
  onEdit?: (homeworkId: string) => void;
};

export function TeacherHomeworkDetailWorkspace({
  homeworkId,
  initialGroup = 'pending',
  backLabel = '返回',
  onBack,
  onReview,
  onEdit,
}: TeacherHomeworkDetailWorkspaceProps) {
  const { homeworks, submissions, students, now } = useHomeworkWorkspace();
  const homework = homeworks.find(({ id }) => id === homeworkId);
  const homeworkSubmissions = selectHomeworkSubmissions(submissions, homeworkId);
  const [group, setGroup] = useState<TeacherSubmissionGroup>(initialGroup);
  const [query, setQuery] = useState('');
  const [placeholderDialog, setPlaceholderDialog] = useState<string | null>(null);

  if (!homework) return <MissingState title="找不到这份作业" onBack={onBack} />;

  const groups = groupSubmissions(homework, homeworkSubmissions);
  const statistics = calculateHomeworkStatistics(homework, homeworkSubmissions);
  const status = resolveHomeworkStatus(homework, now);
  const visibleStudents = groups[group]
    .map((studentId) => students.find(({ id }) => id === studentId))
    .filter((student) => student !== undefined)
    .filter(({ name }) => name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));

  return (
    <main className={styles.page} aria-labelledby="teacher-homework-title">
      <header className={styles.pageHeader}>
        <button className={styles.backButton} type="button" onClick={onBack} aria-label={backLabel}>
          <ArrowLeft aria-hidden="true" size={18} />
        </button>
        <div>
          <span className={styles.eyebrow}>作业看板</span>
          <h1 id="teacher-homework-title">{homework.title}</h1>
          <p>{formatDateTime(homework.dueAt)} 截止 · {homework.maxScore} 分制</p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.statusTag} data-status={status}>{STATUS_LABELS[status]}</span>
          <button className={styles.secondaryButton} type="button" onClick={() => onEdit?.(homework.id)}>编辑</button>
        </div>
      </header>

      <div className={styles.detailLayout}>
        <section className={styles.dashboard}>
          <div className={styles.instructionsBand}>
            <span>作业要求</span>
            <p>{homework.instructions || '尚未填写作业要求。'}</p>
          </div>
          <dl className={styles.metrics} aria-label="作业统计">
            <Metric label="提交率" value={`${statistics.submissionRate}%`} detail={`${statistics.submittedCount}/${statistics.totalCount}`} />
            <Metric label="最高分" value={statistics.highestScore === null ? '--' : String(statistics.highestScore)} />
            <Metric label="平均分" value={statistics.averageScore === null ? '--' : String(statistics.averageScore)} />
            <Metric label="优秀数" value="--" detail="Placeholder" />
          </dl>
          <div className={styles.placeholderTools} aria-label="作业管理工具">
            <PlaceholderButton label="提醒未交" onActivate={setPlaceholderDialog}><Bell aria-hidden="true" size={16} /></PlaceholderButton>
            <PlaceholderButton label="详细数据" onActivate={setPlaceholderDialog}><FileText aria-hidden="true" size={16} /></PlaceholderButton>
            <PlaceholderButton label="导出" onActivate={setPlaceholderDialog}><Download aria-hidden="true" size={16} /></PlaceholderButton>
            <PlaceholderButton label="复制作业" onActivate={setPlaceholderDialog}><FileQuestion aria-hidden="true" size={16} /></PlaceholderButton>
          </div>

          <div className={styles.boardToolbar}>
            <div className={styles.segmented} role="tablist" aria-label="提交状态">
              {(Object.keys(GROUP_LABELS) as TeacherSubmissionGroup[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={group === value}
                  onClick={() => setGroup(value)}
                >
                  {GROUP_LABELS[value]} <span>{groups[value].length}</span>
                </button>
              ))}
            </div>
            <label className={styles.searchBox}>
              <Search aria-hidden="true" size={16} />
              <span className={styles.srOnly}>搜索学生</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索学生" />
            </label>
          </div>

          <div className={styles.studentList} aria-live="polite">
            {visibleStudents.length === 0 ? (
              <div className={styles.emptyState}><strong>当前分组暂无学生</strong><span>切换状态或调整搜索条件。</span></div>
            ) : visibleStudents.map((student) => {
              const submission = homeworkSubmissions.find(({ studentId }) => studentId === student.id);
              const rowGroup = getSubmissionGroup(submission);
              return (
                <button
                  className={styles.studentRow}
                  type="button"
                  key={student.id}
                  disabled={!submission || submission.status === 'draft'}
                  onClick={() => submission && onReview?.(submission.id)}
                  aria-label={`${student.name}，${GROUP_LABELS[rowGroup]}`}
                >
                  <span className={styles.avatar}>{student.avatarInitial}</span>
                  <span className={styles.studentCopy}>
                    <strong>{student.name}</strong>
                    <small>{submission?.submittedAt ? `${formatDateTime(submission.submittedAt)}${submission.isLate ? ' · 补交' : ''}` : '尚未提交'}</small>
                  </span>
                  <span className={styles.groupTag} data-group={rowGroup}>{GROUP_LABELS[rowGroup]}</span>
                  {submission && submission.status !== 'draft' ? <ChevronRight aria-hidden="true" size={16} /> : null}
                </button>
              );
            })}
          </div>
        </section>
        <aside className={styles.contextRail}>
          <span className={styles.eyebrow}>发布信息</span>
          <dl>
            <div><dt>班级</dt><dd>{HOMEWORK_CONTEXT_OPTIONS.find(({ id }) => id === homework.classId)?.name ?? homework.classId ?? '未设置'}</dd></div>
            <div><dt>开始</dt><dd>{formatDateTime(homework.startsAt)}</dd></div>
            <div><dt>截止</dt><dd>{formatDateTime(homework.dueAt)}</dd></div>
            <div><dt>补交</dt><dd>{homework.allowLateSubmission ? '允许' : '不允许'}</dd></div>
          </dl>
        </aside>
      </div>
      <BoundaryDialog description={placeholderDialog} onClose={() => setPlaceholderDialog(null)} />
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd>{detail ? <small>{detail}</small> : null}</div>;
}

export type TeacherHomeworkReviewWorkspaceProps = {
  homeworkId: string;
  submissionId: string;
  onBack?: () => void;
  onComplete?: (homeworkId: string) => void;
};

export function TeacherHomeworkReviewWorkspace({
  homeworkId,
  submissionId,
  onBack,
  onComplete,
}: TeacherHomeworkReviewWorkspaceProps) {
  const { homeworks, submissions, students, gradeSubmission, returnSubmission } = useHomeworkWorkspace();
  const homework = homeworks.find(({ id }) => id === homeworkId);
  const submission = submissions.find(
    ({ id, homeworkId: targetHomeworkId }) => id === submissionId && targetHomeworkId === homeworkId,
  );
  const student = submission ? students.find(({ id }) => id === submission.studentId) : undefined;
  const [score, setScore] = useState(submission?.feedback?.decision === 'graded' ? String(submission.feedback.score) : '');
  const [comment, setComment] = useState(submission?.feedback?.comment ?? '');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [placeholderDialog, setPlaceholderDialog] = useState<string | null>(null);
  const readOnly = submission?.status === 'graded' || submission?.status === 'returned';

  if (!homework || !submission || !student) return <MissingState title="找不到这份学生提交" onBack={onBack} />;

  const handleGrade = () => {
    const result = gradeSubmission(submission.id, score.trim() === '' ? Number.NaN : Number(score), comment);
    if (!result.ok) {
      setFeedback(result.error.message);
      return;
    }
    setFeedback('批阅已完成，学生结果与教师统计已同步。');
    onComplete?.(homework.id);
  };

  const handleReturn = () => {
    const result = returnSubmission(submission.id, comment);
    if (!result.ok) {
      setFeedback(result.error.message);
      return;
    }
    setFeedback('已打回订正，学生可从同一作业继续提交。');
    onComplete?.(homework.id);
  };

  return (
    <main className={styles.page} aria-labelledby="homework-review-title">
      <header className={styles.pageHeader}>
        <button className={styles.backButton} type="button" onClick={onBack} aria-label="返回">
          <ArrowLeft aria-hidden="true" size={18} />
        </button>
        <div>
          <span className={styles.eyebrow}>{readOnly ? '批阅回看' : '逐份批阅'}</span>
          <h1 id="homework-review-title">{student.name} · {homework.title}</h1>
          <p>第 {submission.revision} 次提交{submission.isLate ? ' · 补交' : ''}</p>
        </div>
        <span className={styles.statusTag} data-status={submission.status}>{GROUP_LABELS[getSubmissionGroup(submission)]}</span>
      </header>

      <div className={styles.reviewLayout}>
        <article className={styles.answerDocument}>
          <header><FileText aria-hidden="true" size={18} /><div><span>学生答案</span><small>{formatDateTime(submission.submittedAt)}</small></div></header>
          <p>{submission.answerText}</p>
          <div className={styles.placeholderTools} aria-label="答案辅助工具">
            <PlaceholderButton label="查看原题" onActivate={setPlaceholderDialog}><FileQuestion aria-hidden="true" size={16} /></PlaceholderButton>
            <PlaceholderButton label="查看标准答案" onActivate={setPlaceholderDialog}><CheckCircle2 aria-hidden="true" size={16} /></PlaceholderButton>
          </div>
        </article>

        <aside className={styles.reviewPanel} aria-label="批阅操作">
          <div>
            <span className={styles.eyebrow}>批阅意见</span>
            <h2>{readOnly ? '批阅结果' : '评分与反馈'}</h2>
          </div>
          <label>
            <span>分数 <small>0-100 整数</small></span>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={score}
              onChange={(event) => setScore(event.target.value)}
              disabled={readOnly}
            />
          </label>
          <label>
            <span>文字评语</span>
            <textarea
              rows={8}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              disabled={readOnly}
              placeholder="完成批阅可选；打回订正时必填"
            />
          </label>
          <div className={styles.placeholderTools} aria-label="评语辅助工具">
            <PlaceholderButton label="AI 批阅" onActivate={setPlaceholderDialog}><Bot aria-hidden="true" size={16} /></PlaceholderButton>
            <PlaceholderButton label="快捷评语" onActivate={setPlaceholderDialog}><Sparkles aria-hidden="true" size={16} /></PlaceholderButton>
            <PlaceholderButton label="语音评语" onActivate={setPlaceholderDialog}><Mic2 aria-hidden="true" size={16} /></PlaceholderButton>
            <PlaceholderButton label="标记优秀" onActivate={setPlaceholderDialog}><Star aria-hidden="true" size={16} /></PlaceholderButton>
          </div>
          {readOnly ? (
            <button className={styles.secondaryButton} type="button" onClick={onBack}>返回作业看板</button>
          ) : (
            <div className={styles.reviewActions}>
              <button className={styles.secondaryButton} type="button" onClick={handleReturn}>打回订正</button>
              <button className={styles.primaryButton} type="button" onClick={handleGrade}>完成批阅</button>
            </div>
          )}
        </aside>
      </div>
      {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}
      <BoundaryDialog description={placeholderDialog} onClose={() => setPlaceholderDialog(null)} />
    </main>
  );
}

function MissingState({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <main className={styles.page}>
      <div className={styles.missingState}>
        <FileText aria-hidden="true" size={28} />
        <h1>{title}</h1>
        <p>该对象不存在，或当前页面参数已失效。</p>
        <button className={styles.secondaryButton} type="button" onClick={onBack}>返回</button>
      </div>
    </main>
  );
}
