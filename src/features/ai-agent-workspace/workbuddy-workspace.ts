import { createContext, useContext } from 'react';
import type { WorkBuddyRunViewModel } from '@contracts/workbuddy/workspace';
import type { WritebackScenario } from '@contracts/workbuddy/classin-writeback';
import type { PackageWritebackScenario } from '@contracts/workbuddy/package-writeback';
import type { ContextProposal, ContextSnapshot } from '@domain/workbuddy/core-context';
import type { WorkBuddyTaskType } from '@domain/workbuddy/core-context';
import type { CoursewareBrief } from '@domain/workbuddy/course-production';
import type { CoursewareRunView, PackageRunView } from './workbuddy-course-production-view';

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
  coursewareView: CoursewareRunView | null;
  createCoursewareTask: (goal: string) => string | null;
  updateCoursewareTaskBrief: (patch: Partial<CoursewareBrief>) => void;
  confirmCoursewareTaskBrief: () => void;
  reviseCoursewareTaskBrief: () => void;
  executeCoursewareTaskPlan: () => void;
  proposeCoursewareSave: () => void;
  approveCoursewareSave: () => void;
  rejectCoursewareSave: () => void;
  executeApprovedCoursewareSave: () => void;
  recoverCoursewareSave: () => void;
  writebackScenario: WritebackScenario;
  setWritebackScenario: (scenario: WritebackScenario) => void;
  taskType: WorkBuddyTaskType;
  setTaskType: (taskType: WorkBuddyTaskType) => void;
  packageView: PackageRunView | null;
  packageWritebackScenario: PackageWritebackScenario;
  setPackageWritebackScenario: (scenario: PackageWritebackScenario) => void;
  createPackageTask: (goal: string) => string | null;
  generatePackage: () => void;
  setPackageItemIncluded: (artifactId: string, included: boolean) => void;
  proposePackageSave: () => void;
  approvePackageSave: () => void;
  rejectPackageSave: () => void;
  executeApprovedPackageSave: () => void;
  retryPackageItem: (artifactId: string) => void;
  derivePackageFromCourseware: () => string | null;
  activeCoursewarePanel: 'artifact' | 'core_context' | 'process_detail' | 'action' | 'receipt' | 'replan' | 'none';
  setActiveCoursewarePanel: (panel: WorkBuddyWorkspace['activeCoursewarePanel']) => void;
  activePackagePanel: 'navigator' | 'approval' | 'receipt' | 'core_context' | 'none';
  setActivePackagePanel: (panel: WorkBuddyWorkspace['activePackagePanel']) => void;
  replanCoursewareToWaveContext: () => void;
};

export const WorkBuddyWorkspaceContext = createContext<WorkBuddyWorkspace | null>(null);

export function useWorkBuddyWorkspace() {
  const workspace = useContext(WorkBuddyWorkspaceContext);
  if (!workspace) throw new Error('useWorkBuddyWorkspace must be used inside WorkBuddyWorkspaceProvider');
  return workspace;
}
