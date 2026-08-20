import type { Approval, ExecutionReceipt, ProposedAction } from '@domain/workbuddy/writeback';

export interface ClassInWritebackAdapter {
  execute(action: ProposedAction, approval: Approval): ExecutionReceipt;
  reset(): void;
}
