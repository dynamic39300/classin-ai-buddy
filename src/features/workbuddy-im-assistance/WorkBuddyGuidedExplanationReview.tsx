import { useMemo, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, Link2, MessageSquareText } from 'lucide-react';
import type { GuidedExplanationArtifact, GuidedExplanationRevision, GuidedExplanationStep } from '@domain/workbuddy/guided-explanation';
import { FocusedMessageEditor } from './FocusedMessageEditor';
import { GuidedExplanationPreviewDialog } from './GuidedExplanationPreviewDialog';
import styles from './WorkBuddyGuidedExplanationReview.module.css';

type GuidedExplanationReviewDraft = Readonly<{
  messageBody: string;
  title: string;
  summary: string;
  question: string;
  steps: readonly GuidedExplanationStep[];
  finalAnswer: string;
}>;

function draftFromArtifact(artifact: GuidedExplanationArtifact): GuidedExplanationReviewDraft {
  return Object.freeze({
    messageBody: artifact.delivery.body,
    title: artifact.title,
    summary: artifact.summary,
    question: artifact.question,
    steps: Object.freeze(artifact.steps.map((step) => Object.freeze({ ...step }))),
    finalAnswer: artifact.finalAnswer,
  });
}

export function WorkBuddyGuidedExplanationReview({
  artifact, targetLabel, onRevise, onApprove,
}: Readonly<{
  artifact: GuidedExplanationArtifact;
  targetLabel: string;
  onRevise: (revision: GuidedExplanationRevision) => void;
  onApprove: () => void;
}>) {
  const [draft, setDraft] = useState<GuidedExplanationReviewDraft>(() => draftFromArtifact(artifact));
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewTriggerRef = useRef<HTMLButtonElement | null>(null);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(draftFromArtifact(artifact)), [artifact, draft]);
  const updateStep = (stepId: string, update: Partial<Pick<GuidedExplanationStep, 'title' | 'body' | 'checkpoint'>>) => {
    setDraft((current) => Object.freeze({
      ...current,
      steps: Object.freeze(current.steps.map((step) => step.id === stepId ? Object.freeze({ ...step, ...update }) : step)),
    }));
  };
  const applyRevision = () => {
    onRevise(draft);
    setDraft(draftFromArtifact(artifact));
  };
  return (
    <>
      <section className={styles.card} data-review-artifact="true" aria-label="单题交互讲解待审核">
        <header><span><MessageSquareText aria-hidden="true" size={16} />待确认发送内容</span><strong>v{artifact.version} · 未发送</strong></header>
        <section className={styles.delivery} aria-label="最终发送内容">
          <FocusedMessageEditor
            description="老师可以直接修改下面这段消息"
            id="workbuddy-guided-delivery-message"
            label="最终发送话术"
            rows={5}
            status={<span className={styles.deliveryTarget}>发送到：{targetLabel}</span>}
            value={draft.messageBody}
            onChange={(value) => setDraft((current) => Object.freeze({ ...current, messageBody: value }))}
          />
          <div className={styles.messagePreview} aria-label="消息发送效果预览">
            <p>{draft.messageBody}</p>
            <button ref={previewTriggerRef} type="button" onClick={() => setPreviewOpen(true)}><Link2 aria-hidden="true" size={15} />{artifact.delivery.linkLabel}</button>
          </div>
        </section>
        <details className={styles.contentEditor} open>
          <summary><span>编辑链接中的讲解内容</span><small>题目、步骤、检查点和答案</small><ChevronDown aria-hidden="true" size={16} /></summary>
          <div className={styles.contentFields}>
            <label><span>标题</span><input aria-label="讲题内容标题" value={draft.title} onChange={(event) => setDraft((current) => Object.freeze({ ...current, title: event.target.value }))} /></label>
            <label><span>导读</span><textarea aria-label="讲题内容导读" value={draft.summary} onChange={(event) => setDraft((current) => Object.freeze({ ...current, summary: event.target.value }))} /></label>
            <label><span>作业题目</span><textarea className={styles.questionEditor} aria-label="学生题目" value={draft.question} onChange={(event) => setDraft((current) => Object.freeze({ ...current, question: event.target.value }))} /></label>
            <fieldset className={styles.stepsEditor}>
              <legend>解题过程 · 可逐步修改</legend>
              {draft.steps.map((step, index) => (
                <section className={styles.stepEditor} key={step.id} aria-label={`第 ${index + 1} 步`}>
                  <label><span>第 {index + 1} 步标题</span><input aria-label={`第 ${index + 1} 步标题`} value={step.title} onChange={(event) => updateStep(step.id, { title: event.target.value })} /></label>
                  <label><span>讲解、公式与计算</span><textarea aria-label={`第 ${index + 1} 步讲解`} value={step.body} onChange={(event) => updateStep(step.id, { body: event.target.value })} /></label>
                  <label><span>检查点</span><input aria-label={`第 ${index + 1} 步检查点`} value={step.checkpoint ?? ''} onChange={(event) => updateStep(step.id, { checkpoint: event.target.value })} /></label>
                </section>
              ))}
            </fieldset>
            <label className={styles.answerEditor}><span><CheckCircle2 aria-hidden="true" size={15} />教师审核版完整答案</span><textarea aria-label="教师审核版完整答案" value={draft.finalAnswer} onChange={(event) => setDraft((current) => Object.freeze({ ...current, finalAnswer: event.target.value }))} /></label>
          </div>
        </details>
        <footer>
          <span>{dirty ? '有未应用的修改。应用后会生成新版本，再确认发送。' : '当前展示的就是学生将收到的消息和链接。'}</span>
          <div className={styles.actions}><button className={styles.secondaryButton} type="button" disabled={!dirty} onClick={applyRevision}>应用修改</button><button type="button" disabled={dirty} onClick={onApprove}>确认保存并发送</button></div>
        </footer>
      </section>
      <GuidedExplanationPreviewDialog content={previewOpen ? draft : null} onClose={() => setPreviewOpen(false)} returnFocusRef={previewTriggerRef} />
    </>
  );
}
