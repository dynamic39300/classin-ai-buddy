import { CircleHelp, LogOut, Settings } from 'lucide-react';
import { useEffect, useRef, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoleSession } from '../model/role-session';
import styles from './AccountMenu.module.css';

type AccountMenuProps = {
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
};

export function AccountMenu({ open, onClose, triggerRef, onOpenSettings, onOpenHelp }: AccountMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { logout } = useRoleSession();

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open, triggerRef]);

  if (!open) return null;

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/select-role', { replace: true });
  };

  return (
    <div className={styles.menu} role="menu" ref={menuRef} aria-label="账户菜单">
      <button type="button" role="menuitem" onClick={onOpenSettings}>
        <Settings aria-hidden="true" size={17} />
        账号与设置
      </button>
      <button type="button" role="menuitem" onClick={onOpenHelp}>
        <CircleHelp aria-hidden="true" size={17} />
        帮助与反馈
      </button>
      <div className={styles.separator} />
      <button className={styles.danger} type="button" role="menuitem" onClick={handleLogout}>
        <LogOut aria-hidden="true" size={17} />
        退出登录
      </button>
    </div>
  );
}
