import type { ClassInWritebackAdapter, WritebackScenario, WritebackScenarioController } from '@contracts/workbuddy/classin-writeback';
import type { Approval, ExecutionReceipt, FailedExecutionReceipt, ProposedAction, SuccessfulExecutionReceipt } from '@domain/workbuddy/writeback';

export class MockClassInWritebackAdapter implements ClassInWritebackAdapter, WritebackScenarioController {
  private readonly receipts = new Map<string, ExecutionReceipt>();
  private readonly attempts = new Map<string, number>();
  private scenario: WritebackScenario = 'success';

  setScenario(scenario: WritebackScenario) {
    this.scenario = scenario;
    this.reset();
  }

  getScenario() {
    return this.scenario;
  }

  private failure(action: ProposedAction, approval: Approval, receipt: Omit<FailedExecutionReceipt, 'actionId' | 'approvalId' | 'idempotencyKey' | 'executedAt' | 'unexecutedTarget'>): FailedExecutionReceipt {
    return Object.freeze({
      ...receipt,
      actionId: action.id,
      approvalId: approval.id,
      idempotencyKey: action.idempotencyKey,
      executedAt: '2026-08-20T10:06:00+08:00',
      unexecutedTarget: action.target.unitId,
    });
  }

  private success(action: ProposedAction, approval: Approval): SuccessfulExecutionReceipt {
    return Object.freeze({
      id: 'receipt-courseware-save-1', actionId: action.id, approvalId: approval.id, idempotencyKey: action.idempotencyKey,
      status: 'success', executedAt: '2026-08-20T10:06:00+08:00',
      object: Object.freeze({ id: 'classin-courseware-momentum-v1', version: 'v1', label: '动量守恒模型课件', returnUrl: '/teacher/classes/physics-3?course=course-momentum&unit=unit-momentum-1&activity=classin-courseware-momentum-v1&source=workbuddy' }),
      result: '课件已保存到 ClassIn 单元资料',
    });
  }

  execute(action: ProposedAction, approval: Approval): ExecutionReceipt {
    const existing = this.receipts.get(action.idempotencyKey);
    if (existing) return existing;
    if (action.status !== 'approved' || approval.decision !== 'approved' || approval.actionId !== action.id) {
      throw new Error('ClassInWritebackAdapter requires an approved action and matching approval.');
    }
    if (action.permission !== 'allowed' || this.scenario === 'permission_denied') {
      const denied = this.failure(action, approval, { id: 'receipt-courseware-permission-denied-1', status: 'permission_denied', result: '当前教师无权写入所选位置；隐藏对象详情不会显示。', recovery: 'choose-another-target' });
      this.receipts.set(action.idempotencyKey, denied);
      return denied;
    }
    const currentTargetVersion = this.scenario === 'version_conflict' ? 'unit-momentum-1-v2' : 'unit-momentum-1-v1';
    if (action.target.expectedVersion !== currentTargetVersion) {
      const conflict = this.failure(action, approval, { id: 'receipt-courseware-version-conflict-1', status: 'version_conflict', result: `目标版本已从 ${action.target.expectedVersion} 更新为 ${currentTargetVersion}`, recovery: 'compare-and-reconfirm', expectedVersion: action.target.expectedVersion, currentVersion: currentTargetVersion });
      this.receipts.set(action.idempotencyKey, conflict);
      return conflict;
    }
    if ((this.scenario === 'recoverable_failure' || this.scenario === 'timeout') && (this.attempts.get(action.idempotencyKey) ?? 0) === 0) {
      this.attempts.set(action.idempotencyKey, 1);
      return this.failure(action, approval, {
        id: `receipt-courseware-${this.scenario}-1`,
        status: this.scenario,
        result: this.scenario === 'timeout' ? '请求超时，尚未产生可确认的副作用。' : 'Mock ClassIn Adapter 暂时不可用，尚未产生副作用。',
        recovery: 'retry',
      });
    }

    const receipt = this.success(action, approval);
    this.receipts.set(action.idempotencyKey, receipt);
    return receipt;
  }

  reset() {
    this.receipts.clear();
    this.attempts.clear();
  }
}
