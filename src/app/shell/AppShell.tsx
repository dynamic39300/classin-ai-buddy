import { useCallback, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { AppRole } from '@domain/account/role';
import { AgentSecondaryNav, getWorkBuddyCapabilityFromPathname } from '@features/ai-agent-workspace';
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
  const agentWorkspaceActive = role === 'teacher' && location.pathname.startsWith('/teacher/ai-agent');
  const agentCapability = agentWorkspaceActive ? getWorkBuddyCapabilityFromPathname(location.pathname, { includeDormant: true }) : undefined;
  const agentTaskWorkspaceActive = agentWorkspaceActive && !agentCapability;
  const pageTitle = agentCapability?.label ?? getPageTitle(role, location.pathname);
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
    <div
      className={styles.shell}
      data-contextual-navigation={agentWorkspaceActive ? 'true' : undefined}
      data-shell-mode="linear-workbench"
    >
      <Sidebar
        role={role}
        navigationExtension={role === 'teacher' ? {
          afterItemId: 'teacher-ai-agent',
          activePathPrefix: '/teacher/ai-agent',
          content: <AgentSecondaryNav />,
        } : undefined}
        onOpenSettings={() => navigate(`/${role === 'teacher' ? 'teacher' : 'student'}/settings/benefits`)}
        onOpenHelp={() => openCapability('help')}
      />
      <PageHeaderProvider fallback={pageHeaderFallback}>
        <div className={styles.stage} data-workbuddy-stage={agentTaskWorkspaceActive ? 'true' : undefined}>
          {agentTaskWorkspaceActive ? null : <Topbar />}
          <main className={styles.workspace} id="main-content">
            <Outlet />
          </main>
        </div>
        <CapabilityDialog capability={capability} onClose={closeCapability} />
      </PageHeaderProvider>
    </div>
  );
}
