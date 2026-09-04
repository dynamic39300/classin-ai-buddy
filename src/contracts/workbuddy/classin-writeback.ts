import type { Approval, ExecutionReceipt, ProposedAction } from '@domain/workbuddy/writeback';

export interface ClassInWritebackAdapter {
  execute(action: ProposedAction, approval: Approval): ExecutionReceipt;
}

export type WritebackScenario = 'success' | 'permission_denied' | 'version_conflict' | 'recoverable_failure' | 'timeout';

export interface WritebackScenarioController {
  setScenario(scenario: WritebackScenario): void;
  getScenario(): WritebackScenario;
}
