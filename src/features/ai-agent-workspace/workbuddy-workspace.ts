import { createContext, useContext } from 'react';
import type { WorkBuddyRunViewModel } from '@contracts/workbuddy/workspace';
import type { WritebackScenario } from '@contracts/workbuddy/classin-writeback';
import type { ContextProposal, ContextSnapshot } from '@domain/workbuddy/core-context';
import type { ContextProjection, WorkBuddyTaskType } from '@domain/workbuddy/core-context';
import type { CoursewareBrief, SingleCoursewareRun } from '@domain/workbuddy/course-production';
import type { CoursePackageRun, PackageExecutionReceipt } from '@domain/workbuddy/course-package';
import type { Approval, ExecutionReceipt, ProposedAction } from '@domain/workbuddy/writeback';

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
  coursewareRun: SingleCoursewareRun | null;
  coursewareProjection: ContextProjection | null;
  createCoursewareTask: (goal: string) => string | null;
  updateCoursewareTaskBrief: (patch: Partial<CoursewareBrief>) => void;
  confirmCoursewareTaskBrief: () => void;
  reviseCoursewareTaskBrief: () => void;
  executeCoursewareTaskPlan: () => void;
  coursewareAction: ProposedAction | null;
  coursewareApproval: Approval | null;
  coursewareReceipt: ExecutionReceipt | null;
  proposeCoursewareSave: () => void;
  approveCoursewareSave: () => void;
  rejectCoursewareSave: () => void;
  executeApprovedCoursewareSave: () => void;
  writebackScenario: WritebackScenario;
  setWritebackScenario: (scenario: WritebackScenario) => void;
  taskType: WorkBuddyTaskType;
  setTaskType: (taskType: WorkBuddyTaskType) => void;
  packageRun: CoursePackageRun | null;
  packageReceipt: PackageExecutionReceipt | null;
  createPackageTask: (goal: string) => string | null;
  generatePackage: () => void;
  setPackageItemIncluded: (artifactId: string, included: boolean) => void;
  executePackageSave: () => void;
  retryPackageItem: (artifactId: string) => void;
  derivePackageFromCourseware: () => string | null;
  activeCoursewarePanel: 'artifact' | 'core_context' | 'process_detail' | 'action' | 'receipt' | 'replan' | 'none';
  setActiveCoursewarePanel: (panel: WorkBuddyWorkspace['activeCoursewarePanel']) => void;
  replanCoursewareToWaveContext: () => void;
};

export const WorkBuddyWorkspaceContext = createContext<WorkBuddyWorkspace | null>(null);

export function useWorkBuddyWorkspace() {
  const workspace = useContext(WorkBuddyWorkspaceContext);
  if (!workspace) throw new Error('useWorkBuddyWorkspace must be used inside WorkBuddyWorkspaceProvider');
  return workspace;
}
