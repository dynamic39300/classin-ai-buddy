import { AlertCircle, Clock3, Copy, Eye, FolderOpen, MoreHorizontal, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { SpaceItemAction } from '@domain/space/space';
import styles from './SpaceWorkspace.module.css';

type SpaceActionMenuProps = {
  itemName: string;
  actions: ReadonlyArray<SpaceItemAction>;
  onAction: (action: SpaceItemAction) => void;
};

function actionIcon(id: SpaceItemAction['id']): ReactNode {
  if (id === 'open') return <FolderOpen aria-hidden="true" size={15} />;
  if (id === 'preview') return <Eye aria-hidden="true" size={15} />;
  if (id === 'view-status') return <Clock3 aria-hidden="true" size={15} />;
  if (id === 'view-failure') return <AlertCircle aria-hidden="true" size={15} />;
  if (id === 'transfer') return <Copy aria-hidden="true" size={15} />;
  return <Trash2 aria-hidden="true" size={15} />;
}

export function SpaceActionMenu({ itemName, actions, onAction }: SpaceActionMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (open) firstItemRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) close();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  return (
    <div className={styles.actionMenuWrap} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.iconButton}
        aria-label={`${itemName}更多操作`}
        title="更多操作"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal aria-hidden="true" size={17} />
      </button>
      {open ? (
        <div
          className={styles.actionMenu}
          role="menu"
          aria-label={`${itemName}操作`}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              close();
            }
          }}
        >
          {actions.map((action, index) => (
            <button
              key={action.id}
              ref={index === 0 ? firstItemRef : undefined}
              type="button"
              role="menuitem"
              aria-label={action.label}
              className={styles.actionMenuItem}
              data-disabled={!action.enabled}
              aria-disabled={!action.enabled}
              title={action.enabled ? undefined : action.disabledReason}
              onClick={() => {
                onAction(action);
                close();
              }}
            >
              {actionIcon(action.id)}
              <span>{action.label}</span>
              {!action.enabled ? <small>{action.disabledReason}</small> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
