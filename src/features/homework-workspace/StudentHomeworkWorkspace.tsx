import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  Image,
  Paperclip,
  Save,
  Share2,
  Upload,
  Volume2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useOperationGuard } from '@app/shell/use-operation-guard';
import { BoundaryDialog } from '@app/shell/BoundaryDialog';
import {
  canStudentAccessHomework,
  resolveHomeworkStatus,
  resolveStudentHomeworkAction,
  type HomeworkEditorMode,
  type StudentHomeworkAction,
} from '@domain/homework/homework';
import { HOMEWORK_CONTEXT_OPTIONS } from '@mocks/scenarios/homework';
import {
  selectStudentSubmission,
  useHomeworkWorkspace,
} from './homework-workspace-store';
import styles from './HomeworkWorkspace.module.css';

const STATUS_LABELS = { scheduled: '待开始', active: '进行中', ended: '已截止', draft: '草稿' } as const;
const MODE_LABELS: Record<HomeworkEditorMode, string> = {
  first: '作答', late: '补交作业', modify: '修改作业', correction: '订正作业',
};

function formatDateTime(value: string | null): string {
  if (!value) return '未设置';
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(value));
}

function resolveContextName(classId: string | null, courseId: string | null, unitId: string | null): string {
  const classOption = HOMEWORK_CONTEXT_OPTIONS.find(({ id }) => id === classId);
  const course = classOption?.courses.find(({ id }) => id === courseId);
  const unit = course?.units.find(({ id }) => id === unitId);
  return [classOption?.name, course?.name, unit?.name].filter(Boolean).join(' · ');
}

function activateAction(
  action: StudentHomeworkAction,
  callbacks: {
    onEdit?: (mode: HomeworkEditorMode) => void;
    onSubmission?: () => void;
    onResult?: () => void;
  },
) {
  if (action.kind === 'edit') callbacks.onEdit?.(action.mode);
  if (action.kind === 'submission') callbacks.onSubmission?.();
  if (action.kind === 'result') callbacks.onResult?.();
}

export type StudentHomeworkDetailWorkspaceProps = {
  homeworkId: string;
  submissionToast?: boolean;
  onBack?: () => void;
  onEdit?: (mode: HomeworkEditorMode) => void;
  onSubmission?: () => void;
  onResult?: () => void;
};

export function StudentHomeworkDetailWorkspace({
  homeworkId,
  submissionToast = false,
  onBack,
  onEdit,
  onSubmission,
  onResult,
}: StudentHomeworkDetailWorkspaceProps) {
  const { homeworks, submissions, currentStudentId, now } = useHomeworkWorkspace();
  const homework = homeworks.find(({ id }) => id === homeworkId);
  const submission = selectStudentSubmission(submissions, homeworkId, currentStudentId);
  const [placeholderDialog, setPlaceholderDialog] = useState<string | null>(null);

  if (!homework || !canStudentAccessHomework(homework, currentStudentId)) return <MissingStudentHomework onBack={onBack} />;
  const status = resolveHomeworkStatus(homework, now);
  const action = resolveStudentHomeworkAction(homework, submission, now);

  return (
    <main className={styles.page} aria-labelledby="student-homework-title">
      <header className={styles.pageHeader}>
        <button className={styles.backButton} type="button" onClick={onBack} aria-label="返回">
          <ArrowLeft aria-hidden="true" size={18} />
        </button>
        <div>
          <span className={styles.eyebrow}>作业详情</span>
          <h1 id="student-homework-title">{homework.title}</h1>
          <p>{resolveContextName(homework.classId, homework.courseId, homework.unitId)}</p>
        </div>
        <button className={styles.iconButton} type="button" onClick={() => setPlaceholderDialog('分享作业为本地 Demo 占位，不打开外部分享。')} aria-label="分享作业">
          <Share2 aria-hidden="true" size={18} />
        </button>
      </header>

      <div className={styles.studentDetailLayout}>
        <article className={styles.studentDocument}>
          <div className={styles.studentHero}>
            <span className={styles.statusTag} data-status={status}>{STATUS_LABELS[status]}</span>
            <h2>{homework.title}</h2>
            <div><Clock3 aria-hidden="true" size={16} /><span>{formatDateTime(homework.dueAt)} 截止{homework.allowLateSubmission ? ' · 允许补交' : ''}</span></div>
          </div>
          <section className={styles.readingSection}>
            <span>作业要求</span>
            <p>{homework.instructions}</p>
          </section>
          <button className={styles.resourceRow} type="button" onClick={() => setPlaceholderDialog('老师附件为本地 Demo 占位，不下载真实文件。')}>
            <Paperclip aria-hidden="true" size={18} />
            <span><strong>老师附件</strong><small>附件入口 · Placeholder</small></span>
          </button>
          {submission?.status === 'returned' ? (
            <section className={styles.returnNotice}>
              <strong>老师请你订正</strong>
              <p>{submission.feedback?.comment}</p>
            </section>
          ) : null}
        </article>

        <aside className={styles.studentActionRail}>
          <span className={styles.eyebrow}>当前状态</span>
          <h2>{submission ? {
            draft: '草稿已保存', submitted: '已提交', returned: '待订正', resubmitted: '已重新提交', graded: '已批阅',
          }[submission.status] : '尚未提交'}</h2>
          <p>{submission?.submittedAt ? `${formatDateTime(submission.submittedAt)} · 第 ${submission.revision} 次提交` : '完成作答后将直接提交给老师。'}</p>
          <button
            className={styles.primaryButton}
            type="button"
            disabled={action.kind === 'disabled'}
            onClick={() => activateAction(action, { onEdit, onSubmission, onResult })}
          >
            {action.label}
          </button>
        </aside>
      </div>
      {submissionToast ? <p className={styles.feedback} role="status">作业已提交。</p> : null}
      <BoundaryDialog description={placeholderDialog} onClose={() => setPlaceholderDialog(null)} />
    </main>
  );
}

export type StudentHomeworkEditorWorkspaceProps = {
  homeworkId: string;
  mode: HomeworkEditorMode;
  onBack?: () => void;
  onSubmitted?: () => void;
};

export function StudentHomeworkEditorWorkspace({
  homeworkId,
  mode,
  onBack,
  onSubmitted,
}: StudentHomeworkEditorWorkspaceProps) {
  const {
    homeworks,
    submissions,
    currentStudentId,
    saveAnswerDraft,
    submitAnswer,
  } = useHomeworkWorkspace();
  const homework = homeworks.find(({ id }) => id === homeworkId);
  const submission = selectStudentSubmission(submissions, homeworkId, currentStudentId);
  const initialAnswer = submission?.answerText ?? '';
  const [answer, setAnswer] = useState(initialAnswer);
  const [baseline, setBaseline] = useState(initialAnswer);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [placeholderDialog, setPlaceholderDialog] = useState<string | null>(null);
  const { registerGuard } = useOperationGuard();
  const isDirty = answer !== baseline;

  useEffect(() => {
    registerGuard({
      context: isDirty ? { kind: 'unsaved-edit' } : { kind: 'idle' },
      resolveUnsaved: (resolution) => {
        if (resolution === 'save') {
          const result = saveAnswerDraft(homeworkId, answer);
          if (result.ok) setBaseline(answer);
        } else {
          setAnswer(baseline);
        }
      },
    });
    return () => registerGuard({ context: { kind: 'idle' } });
  }, [answer, baseline, homeworkId, isDirty, registerGuard, saveAnswerDraft]);

  if (!homework || !canStudentAccessHomework(homework, currentStudentId)) return <MissingStudentHomework onBack={onBack} />;

  const handleSave = () => {
    const result = saveAnswerDraft(homework.id, answer);
    if (!result.ok) {
      setFeedback(result.error.message);
      return;
    }
    setBaseline(answer);
    setFeedback('草稿已保存到本地 Demo。');
  };

  const handleSubmit = () => {
    const result = submitAnswer(homework.id, answer, mode);
    if (!result.ok) {
      setFeedback(result.error.message);
      return;
    }
    setBaseline(answer);
    setFeedback(mode === 'correction' ? '订正已重新提交。' : mode === 'late' ? '作业已补交。' : '作业已提交。');
    onSubmitted?.();
  };

  return (
    <main className={styles.page} aria-labelledby="student-editor-title">
      <header className={styles.pageHeader}>
        <button className={styles.backButton} type="button" onClick={onBack} aria-label="返回">
          <ArrowLeft aria-hidden="true" size={18} />
        </button>
        <div>
          <span className={styles.eyebrow}>学生作答</span>
          <h1 id="student-editor-title">{MODE_LABELS[mode]}</h1>
          <p>{homework.title}</p>
        </div>
        <button className={styles.secondaryButton} type="button" onClick={handleSave}>
          <Save aria-hidden="true" size={16} />保存草稿
        </button>
      </header>

      <div className={styles.answerEditorLayout}>
        <section className={styles.answerPrompt}>
          <span>作业要求</span>
          <h2>{homework.title}</h2>
          <p>{homework.instructions}</p>
          {mode === 'correction' ? (
            <div className={styles.returnNotice}>
              <strong>老师评语</strong>
              <p>{submission?.feedback?.comment}</p>
            </div>
          ) : null}
        </section>

        <section className={styles.answerCanvas}>
          <label htmlFor="student-answer">我的答案</label>
          <textarea
            id="student-answer"
            autoFocus
            value={answer}
            onChange={(event) => {
              setAnswer(event.target.value);
              setFeedback(null);
            }}
            placeholder="在这里输入答案和解题过程"
            maxLength={1000}
          />
          <div className={styles.answerFooter}>
            <div className={styles.placeholderTools} aria-label="作答工具">
              <button type="button" onClick={() => setPlaceholderDialog('上传图片为本地 Demo 占位，不上传真实文件。')}><Image aria-hidden="true" size={16} />图片</button>
              <button type="button" onClick={() => setPlaceholderDialog('上传文件为本地 Demo 占位，不上传真实文件。')}><Upload aria-hidden="true" size={16} />文件</button>
              <button type="button" onClick={() => setPlaceholderDialog('语音作答为本地 Demo 占位，不采集音频。')}><Volume2 aria-hidden="true" size={16} />语音</button>
            </div>
            <span>{answer.length}/1000</span>
          </div>
        </section>
      </div>
      <footer className={styles.stickyActions}>
        <span>提交后直接进入成功状态，老师批阅前仍可修改。</span>
        <button className={styles.primaryButton} type="button" onClick={handleSubmit}>
          {mode === 'correction' ? '重新提交' : mode === 'late' ? '提交补交' : '提交作业'}
        </button>
      </footer>
      {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}
      <BoundaryDialog description={placeholderDialog} onClose={() => setPlaceholderDialog(null)} />
    </main>
  );
}

export type StudentHomeworkSubmissionWorkspaceProps = {
  homeworkId: string;
  onBack?: () => void;
  onModify?: () => void;
};

export function StudentHomeworkSubmissionWorkspace({
  homeworkId,
  onBack,
  onModify,
}: StudentHomeworkSubmissionWorkspaceProps) {
  const { homeworks, submissions, currentStudentId } = useHomeworkWorkspace();
  const homework = homeworks.find(({ id }) => id === homeworkId);
  const submission = selectStudentSubmission(submissions, homeworkId, currentStudentId);
  if (!homework || !canStudentAccessHomework(homework, currentStudentId) || !submission) return <MissingStudentHomework onBack={onBack} />;
  const canModify = submission.status === 'submitted' || submission.status === 'resubmitted';

  return (
    <main className={styles.page} aria-labelledby="student-submission-title">
      <header className={styles.pageHeader}>
        <button className={styles.backButton} type="button" onClick={onBack} aria-label="返回">
          <ArrowLeft aria-hidden="true" size={18} />
        </button>
        <div><span className={styles.eyebrow}>我的提交</span><h1 id="student-submission-title">{homework.title}</h1></div>
      </header>
      <div className={styles.centeredDocument}>
        <section className={styles.successBand}>
          <CheckCircle2 aria-hidden="true" size={32} />
          <div><h2>已提交，等待老师批阅</h2><p>第 {submission.revision} 次提交{submission.isLate ? ' · 逾期补交' : ''}</p></div>
        </section>
        <section className={styles.readingSection}>
          <span>我的答案</span>
          <p>{submission.answerText}</p>
        </section>
        {canModify ? <button className={styles.secondaryButton} type="button" onClick={onModify}>修改后重新提交</button> : null}
      </div>
    </main>
  );
}

export type StudentHomeworkResultWorkspaceProps = {
  homeworkId: string;
  onBack?: () => void;
};

export function StudentHomeworkResultWorkspace({ homeworkId, onBack }: StudentHomeworkResultWorkspaceProps) {
  const { homeworks, submissions, currentStudentId } = useHomeworkWorkspace();
  const homework = homeworks.find(({ id }) => id === homeworkId);
  const submission = selectStudentSubmission(submissions, homeworkId, currentStudentId);
  const [feedback, setFeedback] = useState<string | null>(null);
  if (!homework || !canStudentAccessHomework(homework, currentStudentId) || !submission || submission.feedback?.decision !== 'graded') return <MissingStudentHomework onBack={onBack} />;

  return (
    <main className={styles.page} aria-labelledby="student-result-title">
      <header className={styles.pageHeader}>
        <button className={styles.backButton} type="button" onClick={onBack} aria-label="返回"><ArrowLeft aria-hidden="true" size={18} /></button>
        <div><span className={styles.eyebrow}>作业结果</span><h1 id="student-result-title">{homework.title}</h1></div>
        <button className={styles.iconButton} type="button" aria-label="分享作业结果" onClick={() => setFeedback('分享结果为本地 Demo 占位，不打开外部分享。')}><Share2 aria-hidden="true" size={18} /></button>
      </header>
      <div className={styles.centeredDocument}>
        <section className={styles.scoreBand}>
          <span>老师已批阅</span>
          <strong>{submission.feedback.score}<small> / 100</small></strong>
        </section>
        <section className={styles.readingSection}><span>老师评语</span><p>{submission.feedback.comment || '暂无评语'}</p></section>
        <section className={styles.readingSection}><span>我的答案</span><p>{submission.answerText}</p></section>
        <button className={styles.secondaryButton} type="button" onClick={() => setFeedback('同学优秀作业为本地 Demo 占位，不打开作品库。')}>查看同学优秀作业</button>
      </div>
      {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}
    </main>
  );
}

function MissingStudentHomework({ onBack }: { onBack?: () => void }) {
  return (
    <main className={styles.page}>
      <div className={styles.missingState}>
        <FileText aria-hidden="true" size={28} />
        <h1>找不到这份作业</h1>
        <p>作业不存在、尚未发布，或当前学生没有访问权限。</p>
        <button className={styles.secondaryButton} type="button" onClick={onBack}>返回</button>
      </div>
    </main>
  );
}
