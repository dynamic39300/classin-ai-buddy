import { createContext, useContext } from 'react';
import type { WorkBuddyRunViewModel } from '@contracts/workbuddy/workspace';
import type { ContextProposal, ContextSnapshot } from '@domain/workbuddy/core-context';

export type WorkBuddyWorkspace = {
  runs: readonly WorkBuddyRunViewModel[];
  getRun: (runId: string) => WorkBuddyRunViewModel | undefined;
  renameRun: (runId: string, title: string) => void;
  togglePinRun: (runId: string) => void;
  removeRun: (runId: string) => void;
  contextProposal: ContextProposal;
  contextSnapshot: ContextSnapshot | null;
  applyRecommendedContext: () => void;
  confirmCoreContext: () => void;
  resetCoreContext: () => void;
};

export const WorkBuddyWorkspaceContext = createContext<WorkBuddyWorkspace | null>(null);

export function useWorkBuddyWorkspace() {
  const workspace = useContext(WorkBuddyWorkspaceContext);
  if (!workspace) throw new Error('useWorkBuddyWorkspace must be used inside WorkBuddyWorkspaceProvider');
  return workspace;
}
