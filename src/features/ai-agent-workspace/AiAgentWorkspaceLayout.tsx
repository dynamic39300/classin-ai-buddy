import { useState, type Dispatch, type SetStateAction } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { getWorkBuddyCapabilityFromPathname } from './capability-registry';
import { WorkBuddyTaskBar } from './WorkBuddyTaskBar';
import styles from './AiAgentWorkspaceLayout.module.css';

export type WorkBuddyTaskLayoutContext = Readonly<{
  contextPanelOpen: boolean;
  setContextPanelOpen: Dispatch<SetStateAction<boolean>>;
}>;

export function AiAgentWorkspaceLayout() {
  const location = useLocation();
  const capabilityActive = Boolean(getWorkBuddyCapabilityFromPathname(location.pathname, { includeDormant: true }));
  const newTaskActive = location.pathname.endsWith('/new') || location.pathname === '/teacher/ai-agent';
  const contextAttached = (location.state as Readonly<{ intent?: string }> | null)?.intent === 'context-attached';
  const [contextPanelOverride, setContextPanelOverride] = useState<boolean | null>(null);
  const contextPanelOpen = contextPanelOverride ?? contextAttached;
  const setContextPanelOpen: Dispatch<SetStateAction<boolean>> = (next) => {
    setContextPanelOverride(typeof next === 'function' ? next(contextPanelOpen) : next);
  };

  return (
    <div className={styles.layout} data-task-navigation={capabilityActive ? undefined : 'true'} data-testid="ai-agent-workspace-layout">
      {capabilityActive ? null : (
        <WorkBuddyTaskBar
          contextPanel={newTaskActive ? { open: contextPanelOpen, onOpenChange: setContextPanelOpen } : undefined}
        />
      )}
      <section className={styles.surface} aria-label="Work Buddy 工作区">
        <Outlet context={{ contextPanelOpen, setContextPanelOpen } satisfies WorkBuddyTaskLayoutContext} />
      </section>
    </div>
  );
}
