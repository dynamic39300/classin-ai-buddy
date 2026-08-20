import { CircleHelp, Settings, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import styles from './CapabilityDialog.module.css';

export type CapabilityKind = 'help' | 'settings';

type CapabilityDialogProps = {
  capability: CapabilityKind | null;
  onClose: () => void;
};

const CONTENT: Record<CapabilityKind, { title: string; description: string; Icon: typeof CircleHelp }> = {
  help: {
    title: '帮助与反馈',
    description: '帮助入口已保留。本 Demo 不连接在线客服或反馈服务。',
    Icon: CircleHelp,
  },
  settings: {
    title: '账号与设置',
    description: '账号设置入口已保留。本 Demo 只维护本地视角会话，不修改真实账户。',
    Icon: Settings,
  },
};

export function CapabilityDialog({ capability, onClose }: CapabilityDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (capability === null || dialog === null) return;

    if (!dialog.open) dialog.showModal();
    closeButtonRef.current?.focus();

    return () => {
      if (dialog.open) dialog.close();
    };
  }, [capability]);

  if (capability === null) return null;
  const { title, description, Icon } = CONTENT[capability];

  return (
    <dialog
      className={styles.dialog}
      ref={dialogRef}
      aria-labelledby="capability-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className={styles.content}>
        <div className={styles.icon}><Icon aria-hidden="true" size={20} /></div>
        <div className={styles.copy}>
          <h2 id="capability-title">{title}</h2>
          <p>{description}</p>
        </div>
        <button className={styles.close} type="button" onClick={onClose} ref={closeButtonRef} aria-label="关闭">
          <X aria-hidden="true" size={18} />
        </button>
      </div>
    </dialog>
  );
}
