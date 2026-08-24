import { Check, CircleAlert, FileCheck2, PencilLine, SendHorizontal, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { WorkBuddyImTarget } from '@contracts/workbuddy/im-conversation-run';
import type { WeeklyPreparationNoticePreparation } from '@domain/workbuddy/im-weekly-preparation-notice';
import styles from './WorkBuddyImSidecar.module.css';

type ReadyPreparation = Extract<WeeklyPreparationNoticePreparation, { status: 'ready' }>;
type EditorState = 'editable' | 'editing' | 'modified' | 'saved';

type Props = Readonly<{
  preparation: ReadyPreparation;
  target: WorkBuddyImTarget;
  onEditBody: (body: string) => void;
  onApproveAndSend: (body: string) => Promise<void>;
}>;

const EDITOR_STATUS: Record<EditorState, string> = {
  editable: '可编辑', editing: '编辑中', modified: '有修改', saved: '已保存',
};

function formatSchedule(value: string): string {
  return new Date(value).toLocaleString('zh-CN', {
    month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export function WorkBuddyWeeklyPlanReviewArtifact({ preparation, target, onEditBody, onApproveAndSend }: Props) {
  const [body, setBody] = useState(preparation.draft.body);
  const [editorState, setEditorState] = useState<EditorState>('editable');
  const previousVersionRef = useRef(preparation.draft.version);
  const isEmpty = body.trim().length === 0;
  const preparationCount = preparation.draft.planItems.reduce((total, item) => total + item.preparations.length, 0);
  const memberVisibility = target.memberCount ? `${target.memberCount} 位群成员可见` : '所有群成员可见';

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
    <section className={styles.reviewArtifact} aria-labelledby="workbuddy-weekly-review-title" data-review-artifact="true" data-testid="workbuddy-weekly-review-artifact">
      <header className={styles.reviewHeader} data-review-layer="status">
        <span className={styles.reviewIcon}><FileCheck2 aria-hidden="true" size={18} /></span>
        <div className={styles.reviewTitleLine}>
          <span className={styles.reviewEyebrow}><CircleAlert aria-hidden="true" size={13} />待你审阅</span>
          <h3 id="workbuddy-weekly-review-title">课前准备通知已生成</h3>
        </div>
        <span className={styles.unsentStatus} role="status">未发送</span>
      </header>

      <div className={styles.impactSummary} aria-label="发送影响摘要" data-review-layer="impact">
        <span>发送至 <strong>{target.classLabel}</strong></span>
        <span className={styles.impactTag} aria-label={`发送身份 ${preparation.action.actor.teacherName}`}>{preparation.action.actor.teacherName}</span>
        <span className={styles.impactTag} aria-label={memberVisibility}>{target.memberCount ? `${target.memberCount} 人可见` : memberVisibility}</span>
      </div>

      <div className={styles.reviewCore} data-review-layer="core">
        <div className={styles.reviewScope}>
          <div className={styles.reviewSectionHeading}>
            <div className={styles.reviewHeadingActions}>
              <strong>本周教学安排</strong>
              <small>{preparation.draft.courseLabel}</small>
            </div>
            <div className={styles.reviewCounts}>
              <span>{preparation.draft.planItems.length} 节课</span>
              <span>{preparationCount} 项准备</span>
            </div>
          </div>
          <div className={styles.weeklyPlanItems}>
            {preparation.draft.planItems.map((item) => (
              <article className={styles.weeklyPlanItem} key={item.id}>
                <header><time>{formatSchedule(item.startsAt)}</time><strong>{item.topic}</strong></header>
                <ul>{item.preparations.map((text) => <li key={text}>{text}</li>)}</ul>
              </article>
            ))}
          </div>
        </div>

        <div className={styles.reviewEditor} data-editor-state={editorState}>
          <div className={styles.editorHeading}>
            <label htmlFor="workbuddy-weekly-review-message">群通知正文</label>
            <span aria-live="polite">
              {editorState === 'saved' ? <Check aria-hidden="true" size={13} /> : <PencilLine aria-hidden="true" size={13} />}
              {EDITOR_STATUS[editorState]}
            </span>
          </div>
          <textarea
            id="workbuddy-weekly-review-message"
            aria-describedby={isEmpty ? 'workbuddy-weekly-review-error' : undefined}
            aria-invalid={isEmpty}
            onBlur={commitBody}
            onChange={(event) => { setBody(event.target.value); setEditorState('modified'); }}
            onFocus={() => setEditorState('editing')}
            rows={5}
            value={body}
          />
          {isEmpty ? <strong className={styles.editorError} id="workbuddy-weekly-review-error">正文不能为空</strong> : null}
        </div>
      </div>

      <footer className={styles.reviewActions} data-review-layer="action">
        <p><ShieldCheck aria-hidden="true" size={16} /><span>发送前核验最新教学计划</span></p>
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
