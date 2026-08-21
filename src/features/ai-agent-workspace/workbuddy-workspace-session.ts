import type { WritebackScenario } from '@contracts/workbuddy/classin-writeback';
import type { PackageWritebackScenario } from '@contracts/workbuddy/package-writeback';
import type { ContextProposal, ContextSnapshot, WorkBuddyTaskType } from '@domain/workbuddy/core-context';
import type { SingleCoursewareRun } from '@domain/workbuddy/course-production';
import type { CoursePackageRun, PackageExecutionReceipt } from '@domain/workbuddy/course-package';
import type { PackageApproval, PackageProposedAction } from '@domain/workbuddy/package-writeback';
import type { Approval, ExecutionReceipt, ProposedAction } from '@domain/workbuddy/writeback';
import type { CoursewarePanel, PackagePanel } from './workbuddy-workspace';

const STORAGE_KEY = 'workbuddy:workspace-session:v2';

export type WorkBuddyWorkspaceSession = Readonly<{
  version: 2;
  contextProposal: ContextProposal;
  contextSnapshot: ContextSnapshot | null;
  snapshotsById: Readonly<Record<string, ContextSnapshot>>;
  taskType: WorkBuddyTaskType;
  coursewareRun: SingleCoursewareRun | null;
  coursewareAction: ProposedAction | null;
  coursewareApproval: Approval | null;
  coursewareReceipt: ExecutionReceipt | null;
  writebackScenario: WritebackScenario;
  activeCoursewarePanel: CoursewarePanel;
  packageRun: CoursePackageRun | null;
  packageAction: PackageProposedAction | null;
  packageApproval: PackageApproval | null;
  packageReceipt: PackageExecutionReceipt | null;
  packageReceiptHistory: readonly PackageExecutionReceipt[];
  packageWritebackScenario: PackageWritebackScenario;
  activePackagePanel: PackagePanel;
  activePackageArtifactId: string | null;
  draftGoal: string;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNullableRecord(value: unknown): boolean {
  return value === null || isRecord(value);
}

function isWorkspaceSession(value: unknown): value is WorkBuddyWorkspaceSession {
  if (!isRecord(value) || value.version !== 2) return false;
  return isRecord(value.contextProposal)
    && isNullableRecord(value.contextSnapshot)
    && isRecord(value.snapshotsById)
    && (value.taskType === 'single-courseware' || value.taskType === 'course-package')
    && isNullableRecord(value.coursewareRun)
    && isNullableRecord(value.coursewareAction)
    && isNullableRecord(value.coursewareApproval)
    && isNullableRecord(value.coursewareReceipt)
    && ['success', 'permission_denied', 'version_conflict', 'recoverable_failure', 'timeout'].includes(String(value.writebackScenario))
    && ['artifact', 'core_context', 'process_detail', 'action', 'receipt', 'replan', 'none'].includes(String(value.activeCoursewarePanel))
    && isNullableRecord(value.packageRun)
    && isNullableRecord(value.packageAction)
    && isNullableRecord(value.packageApproval)
    && isNullableRecord(value.packageReceipt)
    && Array.isArray(value.packageReceiptHistory)
    && ['success', 'partial_success'].includes(String(value.packageWritebackScenario))
    && ['navigator', 'approval', 'receipt', 'core_context', 'none'].includes(String(value.activePackagePanel))
    && (value.activePackageArtifactId === null || typeof value.activePackageArtifactId === 'string')
    && typeof value.draftGoal === 'string';
}

export function loadWorkBuddyWorkspaceSession(): WorkBuddyWorkspaceSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const value: unknown = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? 'null');
    return isWorkspaceSession(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveWorkBuddyWorkspaceSession(session: WorkBuddyWorkspaceSession): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearWorkBuddyWorkspaceSession(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}
