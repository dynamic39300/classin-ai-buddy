import type {
  PackageWritebackAdapter,
  PackageWritebackScenario,
  PackageWritebackScenarioController,
} from '@contracts/workbuddy/package-writeback';
import type { CoursePackageRun, PackageExecutionReceipt, PackageReceiptItem } from '@domain/workbuddy/course-package';
import type { PackageApproval, PackageProposedAction } from '@domain/workbuddy/package-writeback';

export class MockPackageWritebackAdapter implements PackageWritebackAdapter, PackageWritebackScenarioController {
  private readonly receipts = new Map<string, PackageExecutionReceipt>();
  private readonly attempts = new Map<string, number>();
  private scenario: PackageWritebackScenario = 'partial_success';

  setScenario(scenario: PackageWritebackScenario) {
    this.scenario = scenario;
    this.reset();
  }

  getScenario() {
    return this.scenario;
  }

  execute(action: PackageProposedAction, approval: PackageApproval, run: CoursePackageRun): PackageExecutionReceipt {
    const existing = this.receipts.get(action.idempotencyKey);
    if (existing) return existing;
    if (action.status !== 'approved' || approval.decision !== 'approved' || approval.actionId !== action.id) {
      throw new Error('PackageWritebackAdapter requires an approved action and matching approval.');
    }

    if (this.scenario === 'permission_denied' || action.permission === 'denied') {
      return this.failure(action, approval, run, 'permission_denied', 'choose-another-target', '当前教师无权写入所选课程单元。');
    }
    if (this.scenario === 'version_conflict') {
      return this.failure(action, approval, run, 'version_conflict', 'compare-and-reconfirm', '课程单元版本已变化，需要比较并重新确认。');
    }
    if (this.scenario === 'recoverable_failure' || this.scenario === 'timeout') {
      const attempt = this.attempts.get(action.idempotencyKey) ?? 0;
      if (attempt === 0) {
        this.attempts.set(action.idempotencyKey, 1);
        return this.failure(action, approval, run, this.scenario, 'retry', this.scenario === 'timeout' ? '请求超时，尚未产生可确认的副作用。' : 'Mock Adapter 暂时不可用，尚未产生副作用。');
      }
    }

    const selected = new Set(action.artifactRefs.map(({ id }) => id));
    const items: PackageReceiptItem[] = run.artifacts.map((item) => {
      if (item.state === 'written_back') return Object.freeze({ artifactId: item.id, result: 'waiting', objectId: `classin-${item.id}` });
      if (!selected.has(item.id) || item.state === 'excluded') return Object.freeze({ artifactId: item.id, result: 'not_executed' });
      if (this.scenario === 'partial_success' && item.kind === 'recording-script') return Object.freeze({ artifactId: item.id, result: 'failed' });
      return Object.freeze({ artifactId: item.id, result: 'succeeded', objectId: `classin-${item.id}` });
    });
    const status = items.every(({ result }) => result === 'succeeded' || result === 'waiting' || result === 'not_executed') ? 'success' : 'partial_success';
    const receipt = Object.freeze({
      id: status === 'success' ? 'receipt-package-success-1' : 'receipt-package-partial-1',
      actionId: action.id,
      approvalId: approval.id,
      idempotencyKey: action.idempotencyKey,
      status,
      items: Object.freeze(items),
      result: status === 'success' ? '已执行所有获批对象' : '部分对象执行失败，成功对象不会重复执行',
      truthLabel: '固定 Mock Package ExecutionReceipt',
    } satisfies PackageExecutionReceipt);
    this.receipts.set(action.idempotencyKey, receipt);
    return receipt;
  }

  private failure(
    action: PackageProposedAction,
    approval: PackageApproval,
    run: CoursePackageRun,
    status: Extract<PackageExecutionReceipt['status'], 'permission_denied' | 'version_conflict' | 'recoverable_failure' | 'timeout'>,
    recovery: NonNullable<PackageExecutionReceipt['recovery']>,
    result: string,
  ): PackageExecutionReceipt {
    return Object.freeze({
      id: `receipt-package-${status}-1`, actionId: action.id, approvalId: approval.id, idempotencyKey: action.idempotencyKey,
      status, recovery, result,
      items: Object.freeze(run.artifacts.map(({ id }) => Object.freeze({ artifactId: id, result: 'not_executed' as const }))),
      truthLabel: '固定 Mock Package ExecutionReceipt',
    });
  }

  reset() {
    this.receipts.clear();
    this.attempts.clear();
  }
}
