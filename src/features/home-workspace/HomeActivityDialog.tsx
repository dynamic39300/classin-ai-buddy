import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { TeachingObjectIcon } from '@design-system/TeachingObjectIcon';
import type { TeachingObjectKind } from '@domain/teaching-object/teaching-object';
import styles from './HomeActivityDialog.module.css';

export type HomeActivityDialogItem = {
  id: string;
  title: string;
  kind: TeachingObjectKind;
  kindLabel: string;
  stateLabel: string;
  timeLabel: string;
  className?: string;
  courseName?: string;
  unitName?: string;
  actionLabel: string;
  actionPlaceholder?: string;
};

type HomeActivityDialogProps = {
  item: HomeActivityDialogItem;
  initialView: 'detail' | 'operation';
  onClose: () => void;
  secondaryAction?: { label: string; onSelect: () => void };
};

export function HomeActivityDialog({ item, initialView, onClose, secondaryAction }: HomeActivityDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [view, setView] = useState(initialView);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    closeButtonRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    };
  }, []);

  return (
    <dialog
      className={styles.backdrop}
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <article className={styles.surface} data-view={view}>
        <header className={styles.header}>
          <div className={styles.identity}>
            <span className={styles.kind}><TeachingObjectIcon kind={item.kind} size={15} />{item.kindLabel}<span>{item.stateLabel}</span></span>
            <h2 id={titleId}>{item.title}</h2>
            <p>{[item.className, item.unitName ?? item.courseName].filter(Boolean).join(' · ')}</p>
          </div>
          <button ref={closeButtonRef} className={styles.closeButton} type="button" onClick={onClose} aria-label={`关闭${item.title}弹窗`} title="关闭">
            <X aria-hidden="true" size={18} />
          </button>
        </header>

        {view === 'detail' ? (
          <div className={styles.detailBody}>
            <dl className={styles.facts} aria-label="教学活动信息">
              <div><dt>时间</dt><dd>{item.timeLabel || '暂未安排'}</dd></div>
              {item.className ? <div><dt>班级</dt><dd>{item.className}</dd></div> : null}
              {item.courseName ? <div><dt>所属课程</dt><dd>{item.courseName}</dd></div> : null}
              {item.unitName ? <div><dt>所属单元</dt><dd>{item.unitName}</dd></div> : null}
              <div><dt>状态</dt><dd>{item.stateLabel}</dd></div>
            </dl>
          </div>
        ) : (
          <div className={styles.operationBody}>
            <div>
              <span>当前操作</span>
              <h3>{item.actionLabel}</h3>
            </div>
            <p>{item.actionPlaceholder ?? `${item.actionLabel}为 Demo Placeholder，未连接真实教学服务。`}</p>
            <small>Demo Placeholder</small>
          </div>
        )}

        <footer className={styles.footer}>
          {view === 'operation' ? (
            <button className={styles.secondaryButton} type="button" onClick={() => setView('detail')}><ArrowLeft aria-hidden="true" size={16} />返回详情</button>
          ) : <span />}
          {view === 'detail' ? (
            <span>
              {secondaryAction ? <button className={styles.secondaryButton} type="button" onClick={secondaryAction.onSelect}>{secondaryAction.label}</button> : null}
              <button className={styles.primaryButton} type="button" onClick={() => setView('operation')}>{item.actionLabel}<ArrowRight aria-hidden="true" size={16} /></button>
            </span>
          ) : (
            <button className={styles.primaryButton} type="button" onClick={onClose}>完成查看</button>
          )}
        </footer>
      </article>
    </dialog>
  );
}
