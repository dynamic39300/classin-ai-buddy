import type { ClassInWritebackAdapter, WritebackScenario, WritebackScenarioController } from '@contracts/workbuddy/classin-writeback';
import type { PackageWritebackAdapter, PackageWritebackCandidate, PackageWritebackScenario, PackageWritebackScenarioController } from '@contracts/workbuddy/package-writeback';
import type { PackageExecutionReceipt, PackageReceiptItem } from '@domain/workbuddy/course-package';
import type { PackageApproval, PackageProposedAction } from '@domain/workbuddy/package-writeback';
import type { Approval, ExecutionReceipt, ProposedAction } from '@domain/workbuddy/writeback';
import {
  assertCoursewareWritebackRequest, assertPackageWritebackRequest, cacheIdempotentReceipt,
  coursewareWritebackFingerprint, packageWritebackFingerprint, readIdempotentReceipt, type IdempotencyEntry,
} from './writeback-idempotency';

export class DeterministicTestWritebackAdapter implements ClassInWritebackAdapter, WritebackScenarioController {
  private scenario: WritebackScenario = 'success';
  private readonly receipts = new Map<string, IdempotencyEntry<ExecutionReceipt>>();
  private readonly attempts = new Set<string>();

  execute(action: ProposedAction, approval: Approval): ExecutionReceipt {
    assertCoursewareWritebackRequest(action, approval);
    const fingerprint = coursewareWritebackFingerprint(action, approval);
    const replay = readIdempotentReceipt(this.receipts, action.idempotencyKey, fingerprint);
    if (replay) return replay;
    const base = { actionId: action.id, approvalId: approval.id, idempotencyKey: action.idempotencyKey, executedAt: '2026-08-20T10:06:00+08:00', truthLabel: '[模拟]确定性测试执行回执' };
    if (this.scenario === 'permission_denied') return Object.freeze({ ...base, id: 'receipt-courseware-permission-denied-1', status: 'permission_denied', result: 'denied', recovery: 'choose-another-target', unexecutedTarget: action.target.unitId });
    const currentVersion = this.scenario === 'version_conflict'
      ? action.target.expectedVersion.replace(/-v\d+$/, '-v2')
      : action.target.expectedVersion;
    if (action.target.expectedVersion !== currentVersion) return Object.freeze({ ...base, id: 'receipt-courseware-version-conflict-1', status: 'version_conflict', result: 'conflict', recovery: 'compare-and-reconfirm', unexecutedTarget: action.target.unitId, expectedVersion: action.target.expectedVersion, currentVersion });
    if ((this.scenario === 'recoverable_failure' || this.scenario === 'timeout') && !this.attempts.has(action.idempotencyKey)) {
      this.attempts.add(action.idempotencyKey);
      return Object.freeze({ ...base, id: `receipt-courseware-${this.scenario}-1`, status: this.scenario, result: 'retryable', recovery: 'retry', unexecutedTarget: action.target.unitId });
    }
    const objectId = action.artifactRef.id.replace(/^artifact-/, 'classin-');
    const receipt = Object.freeze({
      ...base,
      id: action.id.replace(/^action-/, 'receipt-'),
      status: 'success' as const,
      object: Object.freeze({
        id: objectId,
        version: action.artifactRef.version,
        label: `${action.target.label.split(' / ')[1] ?? '课程'}课件`,
        returnUrl: `/teacher/classes/${action.target.classId}?course=${action.target.courseId}&unit=${action.target.unitId}&activity=${objectId}`,
      }),
      result: '课件已保存到 ClassIn 单元资料',
    });
    return cacheIdempotentReceipt(this.receipts, action.idempotencyKey, fingerprint, receipt);
  }

  setScenario(scenario: WritebackScenario) { this.scenario = scenario; this.reset(); }
  getScenario() { return this.scenario; }
  reset() { this.receipts.clear(); this.attempts.clear(); }
}

export class DeterministicTestPackageWritebackAdapter implements PackageWritebackAdapter, PackageWritebackScenarioController {
  private scenario: PackageWritebackScenario = 'partial_success';
  private readonly receipts = new Map<string, IdempotencyEntry<PackageExecutionReceipt>>();
  private readonly attempts = new Set<string>();

  execute(action: PackageProposedAction, approval: PackageApproval, candidates: readonly PackageWritebackCandidate[]): PackageExecutionReceipt {
    assertPackageWritebackRequest(action, approval, candidates);
    const fingerprint = packageWritebackFingerprint(action, approval, candidates);
    const replay = readIdempotentReceipt(this.receipts, action.idempotencyKey, fingerprint);
    if (replay) return replay;
    const base = { actionId: action.id, approvalId: approval.id, idempotencyKey: action.idempotencyKey, truthLabel: '[模拟]确定性测试执行回执' };
    const notExecuted = candidates.map(({ id, approvalState }) => Object.freeze({ artifactId: id, result: approvalState === 'waiting' ? 'waiting' as const : 'not_executed' as const }));
    if (this.scenario === 'permission_denied') return Object.freeze({ ...base, id: 'receipt-package-permission_denied-1', status: 'permission_denied', recovery: 'choose-another-target', result: 'denied', items: Object.freeze(notExecuted) });
    if (this.scenario === 'version_conflict' && action.target.expectedVersion !== 'unit-momentum-1-v2') return Object.freeze({ ...base, id: 'receipt-package-version_conflict-1', status: 'version_conflict', recovery: 'compare-and-reconfirm', result: 'conflict', expectedVersion: action.target.expectedVersion, currentVersion: 'unit-momentum-1-v2', items: Object.freeze(notExecuted) });
    if ((this.scenario === 'recoverable_failure' || this.scenario === 'timeout') && !this.attempts.has(action.idempotencyKey)) {
      this.attempts.add(action.idempotencyKey);
      return Object.freeze({ ...base, id: `receipt-package-${this.scenario}-1`, status: this.scenario, recovery: 'retry', result: 'retryable', items: Object.freeze(notExecuted) });
    }
    const selected = new Set(action.artifactRefs.map(({ id }) => id));
    const items: PackageReceiptItem[] = candidates.map((candidate) => candidate.approvalState === 'waiting'
      ? Object.freeze({ artifactId: candidate.id, result: 'waiting' as const })
      : candidate.approvalState === 'written_back' || candidate.approvalState === 'not_selected' || !selected.has(candidate.id)
        ? Object.freeze({ artifactId: candidate.id, result: 'not_executed' as const })
        : this.scenario === 'partial_success' && candidate.kind === 'recording-script'
          ? Object.freeze({ artifactId: candidate.id, result: 'failed' as const })
          : Object.freeze({ artifactId: candidate.id, result: 'succeeded' as const, objectId: `classin-${candidate.id}` }));
    const receipt: PackageExecutionReceipt = items.every((item): item is Extract<PackageReceiptItem, { result: 'succeeded' | 'not_executed' }> => item.result === 'succeeded' || item.result === 'not_executed')
      ? Object.freeze({ ...base, id: 'receipt-package-success-1', status: 'success', result: 'success', items: Object.freeze(items) })
      : Object.freeze({ ...base, id: 'receipt-package-partial-1', status: 'partial_success', result: 'partial_success', items: Object.freeze(items) });
    return cacheIdempotentReceipt(this.receipts, action.idempotencyKey, fingerprint, receipt);
  }

  setScenario(scenario: PackageWritebackScenario) { this.scenario = scenario; this.reset(); }
  getScenario() { return this.scenario; }
  reset() { this.receipts.clear(); this.attempts.clear(); }
}
