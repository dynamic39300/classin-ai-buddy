import {
  Check,
  CircleAlert,
  FileCheck2,
  PencilLine,
  RotateCcw,
  SendHorizontal,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { WorkBuddyImTarget } from '@contracts/workbuddy/im-conversation-run';
import {
  hasHomeworkReminderScopeChanges,
  type HomeworkReminderPreparation,
} from '@domain/workbuddy/im-homework-reminder';
import { FocusedMessageEditor } from './FocusedMessageEditor';
import styles from './WorkBuddyImSidecar.module.css';

type ReadyPreparation = Extract<HomeworkReminderPreparation, { status: 'ready' }>;
type EditorState = 'editable' | 'editing' | 'modified' | 'saved';

type WorkBuddyReviewArtifactProps = Readonly<{
  preparation: ReadyPreparation;
  target: WorkBuddyImTarget;
  onRemoveStudent: (homeworkId: string, studentId: string) => void;
  onRemoveGroup: (homeworkId: string) => void;
  onRestoreChecklist: () => void;
  onEditBody: (body: string) => void;
  onApproveAndSend: (body: string) => Promise<void>;
}>;

const EDITOR_STATUS: Record<EditorState, string> = {
  editable: '可编辑',
  editing: '编辑中',
  modified: '有修改',
  saved: '已保存',
};

function formatDeadline(value: string): string {
  return `${new Date(value).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })} 截止`;
}

export function WorkBuddyReviewArtifact({
  preparation,
  target,
  onRemoveStudent,
  onRemoveGroup,
  onRestoreChecklist,
  onEditBody,
  onApproveAndSend,
}: WorkBuddyReviewArtifactProps) {
  const [body, setBody] = useState(preparation.draft.body);
  const [editorState, setEditorState] = useState<EditorState>('editable');
  const [scopeAnnouncement, setScopeAnnouncement] = useState('');
  const previousVersionRef = useRef(preparation.draft.version);
  const isEmpty = body.trim().length === 0;
  const canRestoreChecklist = hasHomeworkReminderScopeChanges(preparation.draft);
  const uniqueStudentCount = new Set(
    preparation.draft.groups.flatMap((group) => group.students.map((student) => student.id)),
  ).size;
  const memberVisibility = target.memberCount
    ? `${target.memberCount} 位群成员可见`
    : '所有群成员可见';

  useEffect(() => {
    if (previousVersionRef.current === preparation.draft.version) return;
    previousVersionRef.current = preparation.draft.version;
    setBody(preparation.draft.body);
    setEditorState('saved');
  }, [preparation.draft.body, preparation.draft.version]);

  const commitBody = () => {
    if (isEmpty) return;
    if (body.trim() !== preparation.draft.body) onEditBody(body);
    setEditorState('saved');
  };

  return (
    <section className={styles.reviewArtifact} aria-labelledby="workbuddy-review-title" data-review-artifact="true" data-testid="workbuddy-review-artifact">
      <header className={styles.reviewHeader} data-review-layer="status">
        <span className={styles.reviewIcon}><FileCheck2 aria-hidden="true" size={18} /></span>
        <div className={styles.reviewTitleLine}>
          <span className={styles.reviewEyebrow}><CircleAlert aria-hidden="true" size={13} />待你审阅</span>
          <h3 id="workbuddy-review-title">群消息草稿已生成</h3>
        </div>
        <span className={styles.unsentStatus} role="status">未发送</span>
      </header>

      <div className={styles.impactSummary} aria-label="发送影响摘要" data-review-layer="impact">
        <span>发送至 <strong>{target.classLabel}</strong></span>
        <span className={styles.impactTag} aria-label={`发送身份 ${preparation.action.actor.teacherName}`}>
          {preparation.action.actor.teacherName}
        </span>
        <span className={styles.impactTag} aria-label={memberVisibility}>
          {target.memberCount ? `${target.memberCount} 人可见` : memberVisibility}
        </span>
      </div>

      <div className={styles.reviewCore} data-review-layer="core">
        <div className={styles.reviewScope}>
          <div className={styles.reviewSectionHeading}>
            <div className={styles.reviewHeadingActions}>
              <strong>核对名单</strong>
              {canRestoreChecklist ? (
                <button
                  aria-label="还原名单至本次草稿最初生成的范围"
                  className={styles.restoreChecklistButton}
                  title="恢复本次草稿最初生成的名单，并重建正文"
                  type="button"
                  onClick={() => {
                    setScopeAnnouncement('名单和群消息正文已还原');
                    onRestoreChecklist();
                  }}
                >
                  <RotateCcw aria-hidden="true" size={13} />
                  还原名单
                </button>
              ) : null}
            </div>
            <div className={styles.reviewCounts}>
              <span>{preparation.draft.groups.length} 项作业</span>
              <span>{uniqueStudentCount} 位学生</span>
            </div>
            <span aria-live="polite" className={styles.srOnly} role="status">{scopeAnnouncement}</span>
          </div>
          <div className={styles.reviewGroups}>
            {preparation.draft.groups.map((group) => (
              <article className={styles.reviewGroup} key={group.homeworkId}>
                <header>
                  <div><strong>{group.title}</strong><time>{formatDeadline(group.dueAt)}</time></div>
                  <button type="button" onClick={() => onRemoveGroup(group.homeworkId)}>移除分组</button>
                </header>
                <div className={styles.students}>
                  {group.students.map((student) => (
                    <button
                      type="button"
                      key={student.id}
                      aria-label={`从${group.title}移除${student.name}`}
                      onClick={() => onRemoveStudent(group.homeworkId, student.id)}
                    >
                      @{student.name}<X aria-hidden="true" size={12} />
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className={styles.reviewEditor} data-editor-state={editorState}>
          <FocusedMessageEditor
            error={isEmpty ? '正文不能为空' : undefined}
            id="workbuddy-review-message"
            invalid={isEmpty}
            label="群消息正文"
            status={
              <span aria-live="polite" className={styles.editorStatus}>
                {editorState === 'saved' ? <Check aria-hidden="true" size={13} /> : <PencilLine aria-hidden="true" size={13} />}
                {EDITOR_STATUS[editorState]}
              </span>
            }
            value={body}
            onBlur={commitBody}
            onChange={(value) => {
              setBody(value);
              setEditorState('modified');
            }}
            onComplete={commitBody}
            onFocus={() => setEditorState('editing')}
          />
        </div>
      </div>

      <footer className={styles.reviewActions} data-review-layer="action">
        <p><ShieldCheck aria-hidden="true" size={16} /><span>发送前核验最新提交状态</span></p>
        <button
          aria-label={`确认并发送至${target.classLabel}`}
          className={styles.primaryButton}
          disabled={isEmpty}
          type="button"
          onClick={() => void onApproveAndSend(body)}
        >
          <SendHorizontal aria-hidden="true" size={15} />
          <span>确认并发送</span>
        </button>
      </footer>
    </section>
  );
}
