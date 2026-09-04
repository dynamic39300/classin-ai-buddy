import { useId, useLayoutEffect, useRef, type RefObject } from 'react';
import { Presentation, X } from 'lucide-react';
import type { GuidedExplanationStep } from '@domain/workbuddy/guided-explanation';
import styles from './GuidedExplanationPreviewDialog.module.css';

export type GuidedExplanationPreviewContent = Readonly<{
  title: string;
  question: string;
  steps: readonly GuidedExplanationStep[];
  finalAnswer: string;
}>;

export function GuidedExplanationPreviewDialog({
  content,
  onClose,
  returnFocusRef,
}: Readonly<{
  content: GuidedExplanationPreviewContent | null;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}>) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();

  useLayoutEffect(() => {
    if (!content) return;
    const dialog = dialogRef.current;
    const returnFocusElement = returnFocusRef?.current;
    if (!dialog) return;
    if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
    else dialog.setAttribute('open', '');
    dialog.querySelector<HTMLButtonElement>('[data-preview-close]')?.focus();
    return () => {
      if (dialog.open && typeof dialog.close === 'function') dialog.close();
      returnFocusElement?.focus();
    };
  }, [content, returnFocusRef]);

  if (!content) return null;
  return (
    <dialog
      aria-labelledby={titleId}
      className={styles.dialog}
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        onClose();
      }}
    >
      <article className={styles.viewer}>
        <header>
          <span><Presentation aria-hidden="true" size={18} /><small>分步讲解预览</small><h2 id={titleId}>{content.title}</h2></span>
          <button data-preview-close type="button" aria-label="关闭讲题内容" onClick={onClose}><X aria-hidden="true" size={18} /></button>
        </header>
        <section aria-label="讲题步骤与完整答案" tabIndex={0}>
          <p className={styles.question}><strong>题目</strong>{content.question}</p>
          <ol>{content.steps.map((step) => <li key={step.id}><strong>{step.title}</strong><p>{step.body}</p>{step.checkpoint ? <small>自检：{step.checkpoint}</small> : null}</li>)}</ol>
          <div className={styles.answer}><strong>完整答案</strong><p>{content.finalAnswer}</p></div>
        </section>
      </article>
    </dialog>
  );
}
