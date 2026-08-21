import { useEffect, useRef, type ReactNode } from 'react';

type WorkBuddyModalDialogProps = Readonly<{
  labelledBy: string;
  className?: string;
  onClose: () => void;
  children: ReactNode;
}>;

export function WorkBuddyModalDialog({ labelledBy, className, onClose, children }: WorkBuddyModalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      window.requestAnimationFrame(() => triggerRef.current?.isConnected && triggerRef.current.focus());
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={className}
      aria-labelledby={labelledBy}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      {children}
    </dialog>
  );
}
