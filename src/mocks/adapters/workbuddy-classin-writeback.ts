import type { ClassInWritebackAdapter } from '@contracts/workbuddy/classin-writeback';
import type { Approval, ExecutionReceipt, ProposedAction, SuccessfulExecutionReceipt } from '@domain/workbuddy/writeback';

export class MockClassInWritebackAdapter implements ClassInWritebackAdapter {
  private readonly receipts = new Map<string, ExecutionReceipt>();
  private readonly currentTargetVersion = 'unit-momentum-1-v1';

  execute(action: ProposedAction, approval: Approval): ExecutionReceipt {
    const existing = this.receipts.get(action.idempotencyKey);
    if (existing) return existing;
    if (action.status !== 'approved' || approval.decision !== 'approved' || approval.actionId !== action.id) {
      throw new Error('ClassInWritebackAdapter requires an approved action and matching approval.');
    }
    if (action.permission !== 'allowed') {
      const denied = Object.freeze({ id: 'receipt-courseware-permission-denied-1', actionId: action.id, approvalId: approval.id, idempotencyKey: action.idempotencyKey, executedAt: '2026-08-20T10:06:00+08:00', status: 'permission_denied' as const, result: '当前教师无权写入目标单元', recovery: 'choose-another-target' as const });
      this.receipts.set(action.idempotencyKey, denied);
      return denied;
    }
    if (action.target.expectedVersion !== this.currentTargetVersion) {
      const conflict = Object.freeze({ id: 'receipt-courseware-version-conflict-1', actionId: action.id, approvalId: approval.id, idempotencyKey: action.idempotencyKey, executedAt: '2026-08-20T10:06:00+08:00', status: 'version_conflict' as const, result: `目标版本已从 ${action.target.expectedVersion} 更新为 ${this.currentTargetVersion}`, recovery: 'compare-and-reconfirm' as const });
      this.receipts.set(action.idempotencyKey, conflict);
      return conflict;
    }

    const receipt: SuccessfulExecutionReceipt = Object.freeze({
      id: 'receipt-courseware-save-1',
      actionId: action.id,
      approvalId: approval.id,
      idempotencyKey: action.idempotencyKey,
      status: 'success',
      executedAt: '2026-08-20T10:06:00+08:00',
      object: Object.freeze({
        id: 'classin-courseware-momentum-v1',
        version: 'v1',
        label: '动量守恒模型课件',
        returnUrl: '/teacher/classes/physics-3?course=course-momentum&unit=unit-momentum-1&activity=classin-courseware-momentum-v1&source=workbuddy',
      }),
      result: '课件已保存到 ClassIn 单元资料',
    });
    this.receipts.set(action.idempotencyKey, receipt);
    return receipt;
  }

  reset() {
    this.receipts.clear();
  }
}
