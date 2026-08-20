import type {
  PackageWritebackAdapter,
  PackageWritebackCandidate,
  PackageWritebackScenario,
  PackageWritebackScenarioController,
} from '@contracts/workbuddy/package-writeback';
import type { PackageExecutionReceipt, PackageReceiptItem } from '@domain/workbuddy/course-package';
import type { PackageApproval, PackageProposedAction } from '@domain/workbuddy/package-writeback';
import {
  assertPackageWritebackRequest, bindIdempotencyKey, cacheIdempotentReceipt, packageWritebackFingerprint, readIdempotentReceipt,
  type IdempotencyEntry,
} from './writeback-idempotency';

export class MockPackageWritebackAdapter implements PackageWritebackAdapter, PackageWritebackScenarioController {
  private readonly receipts = new Map<string, IdempotencyEntry<PackageExecutionReceipt>>();
  private readonly attempts = new Map<string, number>();
  private scenario: PackageWritebackScenario = 'partial_success';

  setScenario(scenario: PackageWritebackScenario) {
    this.scenario = scenario;
    this.reset();
  }

  getScenario() {
    return this.scenario;
  }

  execute(action: PackageProposedAction, approval: PackageApproval, candidates: readonly PackageWritebackCandidate[]): PackageExecutionReceipt {
    assertPackageWritebackRequest(action, approval, candidates);
    const fingerprint = packageWritebackFingerprint(action, approval, candidates);
    const existing = readIdempotentReceipt(this.receipts, action.idempotencyKey, fingerprint);
    if (existing) return existing;
    bindIdempotencyKey(this.receipts, action.idempotencyKey, fingerprint);

    if (this.scenario === 'permission_denied' || action.permission === 'denied') {
      return this.failure(action, approval, candidates, 'permission_denied', '当前教师无权写入所选课程单元。');
    }
    const currentTargetVersion = this.scenario === 'version_conflict' ? 'unit-momentum-1-v2' : 'unit-momentum-1-v1';
    if (action.target.expectedVersion !== currentTargetVersion) {
      return this.failure(action, approval, candidates, 'version_conflict', '课程单元版本已变化，需要比较并重新确认。', action.target.expectedVersion, currentTargetVersion);
    }
    if (this.scenario === 'recoverable_failure' || this.scenario === 'timeout') {
      const attempt = this.attempts.get(action.idempotencyKey) ?? 0;
      if (attempt === 0) {
        this.attempts.set(action.idempotencyKey, 1);
        return this.failure(action, approval, candidates, this.scenario, this.scenario === 'timeout' ? '请求超时，尚未产生可确认的副作用。' : '[模拟]写回接口暂时不可用，尚未产生副作用。');
      }
    }

    const selected = new Set(action.artifactRefs.map(({ id }) => id));
    const items: PackageReceiptItem[] = candidates.map((item) => {
      if (item.approvalState === 'waiting') return Object.freeze({ artifactId: item.id, result: 'waiting' });
      if (item.approvalState === 'written_back') return Object.freeze({ artifactId: item.id, result: 'not_executed' });
      if (item.approvalState === 'not_selected' || !selected.has(item.id)) return Object.freeze({ artifactId: item.id, result: 'not_executed' });
      if (this.scenario === 'partial_success' && item.kind === 'recording-script') return Object.freeze({ artifactId: item.id, result: 'failed' });
      return Object.freeze({ artifactId: item.id, result: 'succeeded', objectId: `classin-${item.id}` });
    });
    const common = {
      actionId: action.id,
      approvalId: approval.id,
      idempotencyKey: action.idempotencyKey,
      truthLabel: '[模拟]课程方案包执行回执',
    } as const;
    const receipt: PackageExecutionReceipt = items.every((item): item is Extract<PackageReceiptItem, { result: 'succeeded' | 'not_executed' }> => item.result === 'succeeded' || item.result === 'not_executed')
      ? Object.freeze({ ...common, id: 'receipt-package-success-1', status: 'success', items: Object.freeze(items), result: '已执行所有获批对象' })
      : Object.freeze({ ...common, id: 'receipt-package-partial-1', status: 'partial_success', items: Object.freeze(items), result: '部分对象执行失败或等待依赖，成功对象不会重复执行' });
    return cacheIdempotentReceipt(this.receipts, action.idempotencyKey, fingerprint, receipt);
  }

  private failure(
    action: PackageProposedAction,
    approval: PackageApproval,
    candidates: readonly PackageWritebackCandidate[],
    status: Extract<PackageExecutionReceipt['status'], 'permission_denied' | 'version_conflict' | 'recoverable_failure' | 'timeout'>,
    result: string,
    expectedVersion?: string,
    currentVersion?: string,
  ): PackageExecutionReceipt {
    const base = {
      id: `receipt-package-${status}-1`, actionId: action.id, approvalId: approval.id, idempotencyKey: action.idempotencyKey,
      result, items: Object.freeze(candidates.map(({ id, approvalState }) => Object.freeze({ artifactId: id, result: approvalState === 'waiting' ? 'waiting' as const : 'not_executed' as const }))),
      truthLabel: '[模拟]课程方案包执行回执',
    };
    if (status === 'permission_denied') return Object.freeze({ ...base, status, recovery: 'choose-another-target' as const });
    if (status === 'version_conflict') {
      if (!expectedVersion || !currentVersion) throw new Error('Version conflict receipts require expected and current versions.');
      return Object.freeze({ ...base, status, recovery: 'compare-and-reconfirm' as const, expectedVersion, currentVersion });
    }
    return Object.freeze({ ...base, status, recovery: 'retry' as const });
  }

  reset() {
    this.receipts.clear();
    this.attempts.clear();
  }
}
