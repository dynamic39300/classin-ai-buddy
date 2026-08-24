import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { AppRole } from '@domain/account/role';
import { AgentSecondaryNav, getWorkBuddyCapabilityFromPathname } from '@features/ai-agent-workspace';
import { CapabilityDialog, type CapabilityKind } from './CapabilityDialog';
import { getPageTitle } from './navigation';
import { PageHeaderProvider } from './PageHeaderContext';
import {
  MESSAGE_WORKSPACE_SHELL_TRANSITION_MS,
  MessageWorkspaceShellProvider,
  type MessageWorkspaceShellMode,
} from './MessageWorkspaceShellContext';
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
  const messageWorkspaceActive = (
    role === 'teacher' && location.pathname === '/teacher/messages'
  ) || /^\/(?:teacher|student)\/classes\/[^/]+\/chat$/.test(location.pathname);
  const [messageShellMode, setMessageShellMode] = useState<MessageWorkspaceShellMode>(
    messageWorkspaceActive ? 'immersive' : 'standard',
  );
  const previousMessageWorkspaceActiveRef = useRef(messageWorkspaceActive);
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

  const enterMessageImmersive = useCallback(() => {
    if (!messageWorkspaceActive) return;
    setMessageShellMode((current) => current === 'immersive' || current === 'entering' ? current : 'entering');
  }, [messageWorkspaceActive]);

  const exitMessageImmersive = useCallback(() => {
    setMessageShellMode((current) => current === 'standard' || current === 'exiting' ? current : 'exiting');
  }, []);

  useEffect(() => {
    const wasActive = previousMessageWorkspaceActiveRef.current;
    previousMessageWorkspaceActiveRef.current = messageWorkspaceActive;
    const nextMode: MessageWorkspaceShellMode | null = !messageWorkspaceActive
      ? 'standard'
      : !wasActive
        ? 'entering'
        : null;
    if (nextMode === null) return undefined;
    const frame = window.requestAnimationFrame(() => setMessageShellMode(nextMode));
    return () => window.cancelAnimationFrame(frame);
  }, [messageWorkspaceActive]);

  useEffect(() => {
    if (messageShellMode !== 'entering' && messageShellMode !== 'exiting') return undefined;
    const targetMode = messageShellMode === 'entering' ? 'immersive' : 'standard';
    const timer = window.setTimeout(() => setMessageShellMode(targetMode), MESSAGE_WORKSPACE_SHELL_TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [messageShellMode]);

  const renderedMessageShellMode: MessageWorkspaceShellMode = messageWorkspaceActive ? messageShellMode : 'standard';
  const messageWorkspaceShell = useMemo(() => ({
    available: messageWorkspaceActive,
    mode: renderedMessageShellMode,
    immersive: renderedMessageShellMode === 'entering' || renderedMessageShellMode === 'immersive',
    enterImmersive: enterMessageImmersive,
    exitImmersive: exitMessageImmersive,
  }), [enterMessageImmersive, exitMessageImmersive, renderedMessageShellMode, messageWorkspaceActive]);
  const messageShellInactive = renderedMessageShellMode !== 'standard';

  return (
    <div
      className={styles.shell}
      data-contextual-navigation={agentWorkspaceActive ? 'true' : undefined}
      data-message-shell-mode={renderedMessageShellMode}
      data-shell-mode="linear-workbench"
    >
      <Sidebar
        inactive={messageShellInactive}
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
          {agentTaskWorkspaceActive ? null : <Topbar inactive={messageShellInactive} />}
          <main className={styles.workspace} id="main-content">
            <MessageWorkspaceShellProvider value={messageWorkspaceShell}>
              <Outlet />
            </MessageWorkspaceShellProvider>
          </main>
        </div>
        <CapabilityDialog capability={capability} onClose={closeCapability} />
      </PageHeaderProvider>
    </div>
  );
}
