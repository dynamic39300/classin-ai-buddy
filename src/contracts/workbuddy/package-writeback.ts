import type { PackageArtifactKind, PackageExecutionReceipt } from '@domain/workbuddy/course-package';
import type { PackageApproval, PackageProposedAction } from '@domain/workbuddy/package-writeback';

export type PackageWritebackScenario = 'partial_success' | 'success' | 'permission_denied' | 'version_conflict' | 'recoverable_failure' | 'timeout';
export type PackageWritebackCandidate = Readonly<{
  id: string;
  kind: PackageArtifactKind;
  version: string;
  runRef: string;
  contextSnapshotId: string;
  approvalState: 'approved' | 'written_back' | 'not_selected';
}>;

export interface PackageWritebackAdapter {
  execute(action: PackageProposedAction, approval: PackageApproval, candidates: readonly PackageWritebackCandidate[]): PackageExecutionReceipt;
  reset(): void;
}

export interface PackageWritebackScenarioController {
  setScenario(scenario: PackageWritebackScenario): void;
  getScenario(): PackageWritebackScenario;
}
