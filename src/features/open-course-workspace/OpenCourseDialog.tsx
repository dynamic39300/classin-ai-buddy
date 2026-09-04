import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import styles from './OpenCourseWorkspace.module.css';

export function OpenCourseDialog({
  title,
  children,
  onClose,
  kind = 'dialog',
  wide = false,
  detail = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  kind?: 'dialog' | 'alertdialog';
  wide?: boolean;
  detail?: boolean;
}) {
  const titleId = `open-course-${kind}-title`;
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    queueMicrotask(() => dialog?.querySelector<HTMLElement>('input, textarea, select, button')?.focus());
    return () => {
      if (dialog?.open && typeof dialog.close === 'function') dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className={styles.dialogBackdrop} role="presentation">
      <dialog
        className={styles.dialog}
        data-wide={wide}
        data-detail={detail}
        ref={dialogRef}
        role={kind}
        aria-modal="true"
        aria-labelledby={titleId}
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
      >
        <button className={styles.iconButton} type="button" onClick={onClose} aria-label={`关闭${title}`}>
          <X aria-hidden="true" size={17} />
        </button>
        <h2 id={titleId}>{title}</h2>
        {children}
      </dialog>
    </div>
  );
}
