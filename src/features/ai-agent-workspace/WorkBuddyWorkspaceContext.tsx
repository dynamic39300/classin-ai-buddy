import { useMemo, useState, type ReactNode } from 'react';
import type { WorkBuddyRunViewModel } from '@contracts/workbuddy/workspace';
import {
  confirmContext,
  createContextProposal,
  selectContextItems,
  type ContextSnapshot,
  type CoreContextItem,
} from '@domain/workbuddy/core-context';
import { WorkBuddyWorkspaceContext, type WorkBuddyWorkspace } from './workbuddy-workspace';

type WorkBuddyWorkspaceProviderProps = Readonly<{
  initialRuns: readonly WorkBuddyRunViewModel[];
  initialContextItems: readonly CoreContextItem[];
  recommendedContextItemIds: readonly string[];
  children: ReactNode;
}>;

export function WorkBuddyWorkspaceProvider({ initialRuns, initialContextItems, recommendedContextItemIds, children }: WorkBuddyWorkspaceProviderProps) {
  const [runs, setRuns] = useState<readonly WorkBuddyRunViewModel[]>(initialRuns);
  const [contextProposal, setContextProposal] = useState(() => createContextProposal(initialContextItems, 'single-courseware'));
  const [contextSnapshot, setContextSnapshot] = useState<ContextSnapshot | null>(null);
  const value = useMemo<WorkBuddyWorkspace>(() => ({
    runs,
    getRun: (runId) => runs.find((run) => run.id === runId),
    renameRun: (runId, title) => setRuns((current) => current.map((run) => run.id === runId ? { ...run, title } : run)),
    togglePinRun: (runId) => setRuns((current) => current.map((run) => run.id === runId ? { ...run, pinned: !run.pinned } : run)),
    removeRun: (runId) => setRuns((current) => current.filter((run) => run.id !== runId)),
    contextProposal,
    contextSnapshot,
    applyRecommendedContext: () => {
      setContextSnapshot(null);
      setContextProposal((current) => selectContextItems(current, recommendedContextItemIds));
    },
    confirmCoreContext: () => {
      const result = confirmContext(contextProposal, {
        snapshotId: 'context-snapshot-courseware-1',
        confirmedAt: '2026-08-20T10:00:00+08:00',
      });
      if (result.ok) setContextSnapshot(result.snapshot);
    },
    resetCoreContext: () => {
      setContextSnapshot(null);
      setContextProposal(createContextProposal(initialContextItems, 'single-courseware'));
    },
  }), [contextProposal, contextSnapshot, initialContextItems, recommendedContextItemIds, runs]);

  return <WorkBuddyWorkspaceContext.Provider value={value}>{children}</WorkBuddyWorkspaceContext.Provider>;
}
