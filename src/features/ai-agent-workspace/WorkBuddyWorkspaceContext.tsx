import { useMemo, useState, type ReactNode } from 'react';
import type { WorkBuddyRunViewModel } from '@contracts/workbuddy/workspace';
import { WorkBuddyWorkspaceContext, type WorkBuddyWorkspace } from './workbuddy-workspace';

export function WorkBuddyWorkspaceProvider({ initialRuns, children }: { initialRuns: readonly WorkBuddyRunViewModel[]; children: ReactNode }) {
  const [runs, setRuns] = useState<readonly WorkBuddyRunViewModel[]>(initialRuns);
  const value = useMemo<WorkBuddyWorkspace>(() => ({
    runs,
    getRun: (runId) => runs.find((run) => run.id === runId),
    renameRun: (runId, title) => setRuns((current) => current.map((run) => run.id === runId ? { ...run, title } : run)),
    togglePinRun: (runId) => setRuns((current) => current.map((run) => run.id === runId ? { ...run, pinned: !run.pinned } : run)),
    removeRun: (runId) => setRuns((current) => current.filter((run) => run.id !== runId)),
  }), [runs]);

  return <WorkBuddyWorkspaceContext.Provider value={value}>{children}</WorkBuddyWorkspaceContext.Provider>;
}
