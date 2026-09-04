import { Info, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import styles from './CapabilityDialog.module.css';

type BoundaryDialogProps = {
  description: string | null;
  title?: string;
  onClose: () => void;
};

export function BoundaryDialog({ description, title = '能力边界说明', onClose }: BoundaryDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (description === null || dialog === null) return;
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    closeButtonRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    };
  }, [description]);

  if (description === null) return null;
  return (
    <dialog
      className={styles.dialog}
      ref={dialogRef}
      aria-labelledby="boundary-dialog-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.currentTarget === event.target) onClose(); }}
    >
      <div className={styles.content}>
        <div className={styles.icon}><Info aria-hidden="true" size={20} /></div>
        <div className={styles.copy}>
          <h2 id="boundary-dialog-title">{title}</h2>
          <p>{description}</p>
        </div>
        <button className={styles.close} type="button" onClick={onClose} ref={closeButtonRef} aria-label="关闭">
          <X aria-hidden="true" size={18} />
        </button>
      </div>
    </dialog>
  );
}
