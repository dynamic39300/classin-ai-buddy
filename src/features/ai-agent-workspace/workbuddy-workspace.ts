import { createContext, useContext } from 'react';
import type { WorkBuddyRunViewModel } from '@contracts/workbuddy/workspace';
import type { WritebackScenario } from '@contracts/workbuddy/classin-writeback';
import type { PackageWritebackScenario } from '@contracts/workbuddy/package-writeback';
import type { WorkBuddyTaskType } from '@domain/workbuddy/core-context';
import type { CoursewareArtifactRevisionInput, CoursewareBrief } from '@domain/workbuddy/course-production';
import type { CoreContextView, CoursewareRunView, PackageRunView } from './workbuddy-course-production-view';

export type CoursewarePanel = 'artifact' | 'core_context' | 'process_detail' | 'action' | 'receipt' | 'replan' | 'none';
export type PackagePanel = 'navigator' | 'approval' | 'receipt' | 'core_context' | 'none';

export type WorkBuddyHistory = Readonly<{
  runs: readonly WorkBuddyRunViewModel[];
  getRun: (runId: string) => WorkBuddyRunViewModel | undefined;
  renameRun: (runId: string, title: string) => void;
  togglePinRun: (runId: string) => void;
  removeRun: (runId: string) => void;
}>;

export type WorkBuddyTaskDraft = Readonly<{
  goal: string;
  setGoal: (goal: string) => void;
  clear: () => void;
}>;

export type WorkBuddyContext = Readonly<{
  contextView: CoreContextView;
  coursewareContextView: CoreContextView | null;
  applyRecommendedContext: () => void;
  toggleCoreContextItem: (itemId: string) => void;
  confirmCoreContext: () => void;
  resetCoreContext: () => void;
  taskType: WorkBuddyTaskType;
  setTaskType: (taskType: WorkBuddyTaskType) => void;
}>;

export type WorkBuddyCourseware = Readonly<{
  coursewareView: CoursewareRunView | null;
  createCoursewareTask: (goal: string) => string | null;
  updateCoursewareTaskBrief: (patch: Partial<CoursewareBrief>) => void;
  confirmCoursewareTaskBrief: () => void;
  reviseCoursewareTaskBrief: () => void;
  executeCoursewareTaskPlan: () => void;
  approveCoursewareArtifact: () => void;
  reviseCoursewareArtifact: (input: CoursewareArtifactRevisionInput) => void;
  proposeCoursewareSave: () => void;
  approveCoursewareSave: () => void;
  rejectCoursewareSave: () => void;
  executeApprovedCoursewareSave: () => void;
  recoverCoursewareSave: () => void;
  writebackScenario: WritebackScenario;
  setWritebackScenario: (scenario: WritebackScenario) => void;
  activePanel: CoursewarePanel;
  setActivePanel: (panel: CoursewarePanel) => void;
  replanScope: Readonly<{ previousLabel: string; nextLabel: string }>;
  replanToWaveContext: () => void;
}>;

export type WorkBuddyCoursePackage = Readonly<{
  packageView: PackageRunView | null;
  packageWritebackScenario: PackageWritebackScenario;
  setPackageWritebackScenario: (scenario: PackageWritebackScenario) => void;
  createPackageTask: (goal: string) => string | null;
  beginPackageGeneration: () => void;
  completePackageGeneration: () => void;
  setPackageItemIncluded: (artifactId: string, included: boolean) => void;
  proposePackageSave: () => void;
  approvePackageSave: () => void;
  rejectPackageSave: () => void;
  executeApprovedPackageSave: () => void;
  recoverPackageSave: () => void;
  retryFailedPackageItems: () => void;
  derivePackageFromCourseware: () => string | null;
  activePanel: PackagePanel;
  setActivePanel: (panel: PackagePanel) => void;
  activePackageArtifactId: string | null;
  setActivePackageArtifactId: (artifactId: string) => void;
}>;

export type WorkBuddyWorkspace = Readonly<{
  history: WorkBuddyHistory;
  taskDraft: WorkBuddyTaskDraft;
  context: WorkBuddyContext;
  courseware: WorkBuddyCourseware;
  coursePackage: WorkBuddyCoursePackage;
}>;

export const WorkBuddyWorkspaceContext = createContext<WorkBuddyWorkspace | null>(null);

export function useWorkBuddyWorkspace() {
  const workspace = useContext(WorkBuddyWorkspaceContext);
  if (!workspace) throw new Error('useWorkBuddyWorkspace must be used inside WorkBuddyWorkspaceProvider');
  return workspace;
}
