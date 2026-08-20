import { useCallback, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { AppRole } from '@domain/account/role';
import { CapabilityDialog, type CapabilityKind } from './CapabilityDialog';
import { getPageTitle } from './navigation';
import { PageHeaderProvider } from './PageHeaderContext';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import styles from './AppShell.module.css';

type AppShellProps = {
  role: AppRole;
};

export function AppShell({ role }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [capability, setCapability] = useState<CapabilityKind | null>(null);
  const capabilityTriggerRef = useRef<HTMLElement | null>(null);
  const pageTitle = getPageTitle(role, location.pathname);
  const pageHeaderFallback = useMemo(() => ({ title: pageTitle }), [pageTitle]);

  const openCapability = useCallback((nextCapability: CapabilityKind) => {
    capabilityTriggerRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setCapability(nextCapability);
  }, []);

  const closeCapability = useCallback(() => {
    setCapability(null);
    window.requestAnimationFrame(() => capabilityTriggerRef.current?.focus());
  }, []);

  return (
    <div className={styles.shell} data-shell-mode="linear-workbench">
      <Sidebar
        role={role}
        onOpenSettings={() => navigate(`/${role === 'teacher' ? 'teacher' : 'student'}/settings/benefits`)}
        onOpenHelp={() => openCapability('help')}
      />
      <PageHeaderProvider fallback={pageHeaderFallback}>
        <div className={styles.stage}>
          <Topbar />
          <main className={styles.workspace} id="main-content">
            <Outlet />
          </main>
        </div>
        <CapabilityDialog capability={capability} onClose={closeCapability} />
      </PageHeaderProvider>
    </div>
  );
}
