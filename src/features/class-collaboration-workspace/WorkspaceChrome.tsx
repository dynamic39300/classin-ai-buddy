import { useEffect, useRef, type ReactNode } from 'react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import styles from './ClassCollaborationWorkspace.module.css';

export function ClassPageHeader({
  className,
  title,
  eyebrow,
  actions,
  onBack,
}: {
  className: string;
  title: string;
  eyebrow: string;
  actions?: ReactNode;
  onBack: () => void;
}) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.headerCopy}>
        <button className={styles.backButton} type="button" onClick={onBack}>
          <ArrowLeft aria-hidden="true" size={17} />返回班级
        </button>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{className}</p>
      </div>
      {actions ? <div className={styles.headerActions}>{actions}</div> : null}
    </header>
  );
}

export function SafeClassState({
  title = '无法访问这个班级内容',
  detail = '班级、成员或当前页面对象不存在，或当前角色没有访问权限。',
  onBack,
}: {
  title?: string;
  detail?: string;
  onBack: () => void;
}) {
  return (
    <main className={styles.safePage}>
      <section className={styles.safeState} aria-labelledby="safe-state-title">
        <AlertTriangle aria-hidden="true" size={22} />
        <h1 id="safe-state-title">{title}</h1>
        <p>{detail}</p>
        <button className={styles.secondaryButton} type="button" onClick={onBack}>
          <ArrowLeft aria-hidden="true" size={16} />安全返回
        </button>
      </section>
    </main>
  );
}

export function ConfirmDialog({
  title,
  detail,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  detail: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div className={styles.dialogBackdrop} role="presentation">
      <section className={styles.confirmDialog} role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-detail">
        <AlertTriangle aria-hidden="true" size={22} />
        <h2 id="confirm-dialog-title">{title}</h2>
        <p id="confirm-dialog-detail">{detail}</p>
        <footer>
          <button ref={cancelRef} className={styles.secondaryButton} type="button" onClick={onCancel}>取消</button>
          <button className={styles.dangerButton} type="button" onClick={onConfirm}>{confirmLabel}</button>
        </footer>
      </section>
    </div>
  );
}
