import type { ClassInWritebackAdapter, WritebackScenario, WritebackScenarioController } from '@contracts/workbuddy/classin-writeback';
import type { PackageWritebackAdapter, PackageWritebackCandidate, PackageWritebackScenario, PackageWritebackScenarioController } from '@contracts/workbuddy/package-writeback';
import type { PackageExecutionReceipt } from '@domain/workbuddy/course-package';
import type { PackageApproval, PackageProposedAction } from '@domain/workbuddy/package-writeback';
import type { Approval, ExecutionReceipt, ProposedAction } from '@domain/workbuddy/writeback';

export class DeterministicTestWritebackAdapter implements ClassInWritebackAdapter, WritebackScenarioController {
  private scenario: WritebackScenario = 'success';
  private readonly receipts = new Map<string, ExecutionReceipt>();
  private readonly attempts = new Set<string>();

  execute(action: ProposedAction, approval: Approval): ExecutionReceipt {
    const replay = this.receipts.get(action.idempotencyKey);
    if (replay) return replay;
    if (action.status !== 'approved' || approval.decision !== 'approved' || approval.actionId !== action.id) throw new Error('approved action required');
    const base = { actionId: action.id, approvalId: approval.id, idempotencyKey: action.idempotencyKey, executedAt: '2026-08-20T10:06:00+08:00' };
    if (this.scenario === 'permission_denied') return Object.freeze({ ...base, id: 'receipt-courseware-permission-denied-1', status: 'permission_denied', result: 'denied', recovery: 'choose-another-target', unexecutedTarget: action.target.unitId });
    if (this.scenario === 'version_conflict' && action.target.expectedVersion !== 'unit-momentum-1-v2') return Object.freeze({ ...base, id: 'receipt-courseware-version-conflict-1', status: 'version_conflict', result: 'conflict', recovery: 'compare-and-reconfirm', unexecutedTarget: action.target.unitId, expectedVersion: action.target.expectedVersion, currentVersion: 'unit-momentum-1-v2' });
    if ((this.scenario === 'recoverable_failure' || this.scenario === 'timeout') && !this.attempts.has(action.idempotencyKey)) {
      this.attempts.add(action.idempotencyKey);
      return Object.freeze({ ...base, id: `receipt-courseware-${this.scenario}-1`, status: this.scenario, result: 'retryable', recovery: 'retry', unexecutedTarget: action.target.unitId });
    }
    const receipt = Object.freeze({ ...base, id: 'receipt-courseware-save-1', status: 'success' as const, object: Object.freeze({ id: 'classin-courseware-momentum-v1', version: 'v1', label: '动量守恒模型课件', returnUrl: '/teacher/classes/physics-3' }), result: '课件已保存到 ClassIn 单元资料' });
    this.receipts.set(action.idempotencyKey, receipt);
    return receipt;
  }

  setScenario(scenario: WritebackScenario) { this.scenario = scenario; this.reset(); }
  getScenario() { return this.scenario; }
  reset() { this.receipts.clear(); this.attempts.clear(); }
}

export class DeterministicTestPackageWritebackAdapter implements PackageWritebackAdapter, PackageWritebackScenarioController {
  private scenario: PackageWritebackScenario = 'partial_success';
  private readonly receipts = new Map<string, PackageExecutionReceipt>();
  private readonly attempts = new Set<string>();

  execute(action: PackageProposedAction, approval: PackageApproval, candidates: readonly PackageWritebackCandidate[]): PackageExecutionReceipt {
    const replay = this.receipts.get(action.idempotencyKey);
    if (replay) return replay;
    if (action.status !== 'approved' || approval.decision !== 'approved' || approval.actionId !== action.id) throw new Error('approved action required');
    const candidateMap = new Map(candidates.map((item) => [item.id, item]));
    if (candidates.some((candidate) => candidate.runRef !== action.runRef || candidate.contextSnapshotId !== action.contextSnapshotId)) throw new Error('foreign package candidate');
    const actionMatchesCandidates = action.artifactRefs.every((ref) => {
      const candidate = candidateMap.get(ref.id);
      return candidate?.version === ref.version
        && candidate.runRef === action.runRef
        && candidate.contextSnapshotId === action.contextSnapshotId
        && candidate.approvalState === 'approved';
    });
    if (!actionMatchesCandidates || candidates.filter(({ approvalState }) => approvalState === 'approved').length !== action.artifactRefs.length) throw new Error('stale package action');
    const base = { actionId: action.id, approvalId: approval.id, idempotencyKey: action.idempotencyKey, truthLabel: '[模拟]确定性测试执行回执' };
    const notExecuted = candidates.map(({ id }) => Object.freeze({ artifactId: id, result: 'not_executed' as const }));
    if (this.scenario === 'permission_denied') return Object.freeze({ ...base, id: 'receipt-package-permission_denied-1', status: 'permission_denied', recovery: 'choose-another-target', result: 'denied', items: Object.freeze(notExecuted) });
    if (this.scenario === 'version_conflict' && action.target.expectedVersion !== 'unit-momentum-1-v2') return Object.freeze({ ...base, id: 'receipt-package-version_conflict-1', status: 'version_conflict', recovery: 'compare-and-reconfirm', result: 'conflict', expectedVersion: action.target.expectedVersion, currentVersion: 'unit-momentum-1-v2', items: Object.freeze(notExecuted) });
    if ((this.scenario === 'recoverable_failure' || this.scenario === 'timeout') && !this.attempts.has(action.idempotencyKey)) {
      this.attempts.add(action.idempotencyKey);
      return Object.freeze({ ...base, id: `receipt-package-${this.scenario}-1`, status: this.scenario, recovery: 'retry', result: 'retryable', items: Object.freeze(notExecuted) });
    }
    const selected = new Set(action.artifactRefs.map(({ id }) => id));
    const items = candidates.map((candidate) => candidate.approvalState === 'written_back'
      ? Object.freeze({ artifactId: candidate.id, result: 'waiting' as const, objectId: `classin-${candidate.id}` })
      : candidate.approvalState === 'not_selected' || !selected.has(candidate.id)
        ? Object.freeze({ artifactId: candidate.id, result: 'not_executed' as const })
        : this.scenario === 'partial_success' && candidate.kind === 'recording-script'
          ? Object.freeze({ artifactId: candidate.id, result: 'failed' as const })
          : Object.freeze({ artifactId: candidate.id, result: 'succeeded' as const, objectId: `classin-${candidate.id}` }));
    const status = items.some(({ result }) => result === 'failed') ? 'partial_success' as const : 'success' as const;
    const receipt = Object.freeze({ ...base, id: status === 'success' ? 'receipt-package-success-1' : 'receipt-package-partial-1', status, result: status, items: Object.freeze(items) });
    this.receipts.set(action.idempotencyKey, receipt);
    return receipt;
  }

  setScenario(scenario: PackageWritebackScenario) { this.scenario = scenario; this.reset(); }
  getScenario() { return this.scenario; }
  reset() { this.receipts.clear(); this.attempts.clear(); }
}
