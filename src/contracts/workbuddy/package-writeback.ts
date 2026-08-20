import type { CoursePackageRun, PackageExecutionReceipt } from '@domain/workbuddy/course-package';
import type { PackageApproval, PackageProposedAction } from '@domain/workbuddy/package-writeback';

export type PackageWritebackScenario = 'partial_success' | 'success' | 'permission_denied' | 'version_conflict' | 'recoverable_failure' | 'timeout';

export interface PackageWritebackAdapter {
  execute(action: PackageProposedAction, approval: PackageApproval, run: CoursePackageRun): PackageExecutionReceipt;
  reset(): void;
}

export interface PackageWritebackScenarioController {
  setScenario(scenario: PackageWritebackScenario): void;
  getScenario(): PackageWritebackScenario;
}
