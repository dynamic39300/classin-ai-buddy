import { useState, type Dispatch, type SetStateAction } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TEACHERIN_BRAND } from '@contracts/workbuddy/product-brand';
import { getWorkBuddyCapabilityFromPathname } from './capability-registry';
import { WorkBuddyExperienceProvider } from './WorkBuddyExperienceContext';
import type { WorkBuddyExperienceProfile } from './workbuddy-experience-profile';
import { WorkBuddyTaskBar } from './WorkBuddyTaskBar';
import styles from './AiAgentWorkspaceLayout.module.css';

export type WorkBuddyTaskLayoutContext = Readonly<{
  contextPanelOpen: boolean;
  setContextPanelOpen: Dispatch<SetStateAction<boolean>>;
}>;

export function AiAgentWorkspaceLayout({ profile, showTaskBarReturn = true }: Readonly<{
  profile: WorkBuddyExperienceProfile;
  showTaskBarReturn?: boolean;
}>) {
  const location = useLocation();
  const capabilityActive = Boolean(getWorkBuddyCapabilityFromPathname(location.pathname, { includeDormant: true }));
  const taskChromeActive = !capabilityActive;
  const newTaskActive = location.pathname.endsWith('/new') || location.pathname === profile.basePath;
  const contextAttached = (location.state as Readonly<{ intent?: string }> | null)?.intent === 'context-attached';
  const [contextPanelOverride, setContextPanelOverride] = useState<boolean | null>(null);
  const coreContextControlsVisible = !(profile.productBoundary === 'classin-integrated' && newTaskActive);
  const contextPanelOpen = coreContextControlsVisible && (contextPanelOverride ?? contextAttached);
  const setContextPanelOpen: Dispatch<SetStateAction<boolean>> = (next) => {
    setContextPanelOverride(typeof next === 'function' ? next(contextPanelOpen) : next);
  };

  return (
    <WorkBuddyExperienceProvider profile={profile}>
    <div className={styles.layout} data-experience-profile={profile.id} data-task-navigation={taskChromeActive ? 'true' : undefined} data-testid="ai-agent-workspace-layout">
      {taskChromeActive ? (
        <WorkBuddyTaskBar
          contextPanel={newTaskActive && coreContextControlsVisible ? { open: contextPanelOpen, onOpenChange: setContextPanelOpen } : undefined}
          showReturnCommand={showTaskBarReturn}
        />
      ) : null}
      <section className={styles.surface} aria-label={`${TEACHERIN_BRAND.shortName} 工作区`}>
        <Outlet context={{ contextPanelOpen, setContextPanelOpen } satisfies WorkBuddyTaskLayoutContext} />
      </section>
    </div>
    </WorkBuddyExperienceProvider>
  );
}
