import { describe, expect, it } from 'vitest';
import { EvaluationModule } from './evaluation';

const receipt = Object.freeze({
  id: 'receipt-1',
  actionId: 'action-1',
  approvalId: 'approval-1',
  status: 'success',
  executedAt: '2026-08-24T10:00:00+08:00',
});
const action = Object.freeze({
  id: 'action-1',
  runRef: 'run-1',
  contextSnapshotId: 'context-1',
  artifactRef: Object.freeze({ id: 'artifact-1', version: 'v2' }),
});
const approval = Object.freeze({ id: 'approval-1', actionId: 'action-1', decision: 'approved' as const });

describe('Evaluation Module', () => {
  it('records one adoption signal with the complete execution evidence chain', () => {
    expect(EvaluationModule.recordExecutionOutcome({
      runRef: 'run-1',
      contextSnapshotRef: 'context-1',
      artifactRef: { id: 'artifact-1', version: 'v2' },
      action,
      approval,
      receipt,
    })).toEqual({
      id: 'evaluation-receipt-1-artifact-1-success',
      runRef: 'run-1',
      contextSnapshotRef: 'context-1',
      artifactRef: { id: 'artifact-1', version: 'v2' },
      actionRef: 'action-1',
      approvalRef: 'approval-1',
      receiptRef: 'receipt-1',
      signal: { type: 'artifact_adoption', outcome: 'adopted', executionStatus: 'success' },
      observedAt: receipt.executedAt,
      evaluator: 'workbuddy-system',
      truthLabel: '[模拟] TeacherIn 评价事件',
    });
  });

  it('fails closed when action or approval references do not match the receipt', () => {
    expect(EvaluationModule.recordExecutionOutcome({
      runRef: 'run-1',
      contextSnapshotRef: 'context-1',
      artifactRef: { id: 'artifact-1', version: 'v1' },
      action: { ...action, id: 'another-action' },
      approval,
      receipt,
    })).toBeNull();
  });

  it('records a failed execution as not adopted without claiming teaching impact', () => {
    const evaluation = EvaluationModule.recordExecutionOutcome({
      runRef: 'run-1',
      contextSnapshotRef: 'context-1',
      artifactRef: { id: 'artifact-1', version: 'v2' },
      action,
      approval,
      receipt: { ...receipt, status: 'permission_denied' },
    });
    expect(evaluation?.signal).toEqual({
      type: 'artifact_adoption',
      outcome: 'not_adopted',
      executionStatus: 'permission_denied',
    });
  });

  it('fails closed when Run, Context, Artifact, Action, Approval, or Receipt evidence diverges', () => {
    const base = {
      runRef: 'run-1', contextSnapshotRef: 'context-1', artifactRef: { id: 'artifact-1', version: 'v2' },
      action, approval, receipt,
    } as const;
    expect(EvaluationModule.recordExecutionOutcome({ ...base, runRef: 'run-other' })).toBeNull();
    expect(EvaluationModule.recordExecutionOutcome({ ...base, contextSnapshotRef: 'context-other' })).toBeNull();
    expect(EvaluationModule.recordExecutionOutcome({ ...base, artifactRef: { id: 'artifact-other', version: 'v2' } })).toBeNull();
    expect(EvaluationModule.recordExecutionOutcome({ ...base, approval: { ...approval, actionId: 'action-other' } })).toBeNull();
    expect(EvaluationModule.recordExecutionOutcome({ ...base, receipt: { ...receipt, approvalId: 'approval-other' } })).toBeNull();
  });

  it('records package artifacts independently from an object-level receipt', () => {
    const packageAction = {
      id: 'package-action', runRef: 'package-run', contextSnapshotId: 'package-context',
      artifactRefs: [{ id: 'slides', version: 'v1' }, { id: 'quiz', version: 'v2' }],
    } as const;
    const packageApproval = { id: 'package-approval', actionId: 'package-action', decision: 'approved' as const };
    const packageReceipt = {
      id: 'package-receipt', actionId: 'package-action', approvalId: 'package-approval', status: 'partial_success',
      executedAt: receipt.executedAt, items: [{ artifactId: 'slides', result: 'succeeded' }, { artifactId: 'quiz', result: 'failed' }],
    } as const;
    expect(EvaluationModule.recordExecutionOutcome({
      runRef: 'package-run', contextSnapshotRef: 'package-context', artifactRef: { id: 'slides', version: 'v1' },
      action: packageAction, approval: packageApproval, receipt: packageReceipt,
    })?.signal.outcome).toBe('adopted');
    expect(EvaluationModule.recordExecutionOutcome({
      runRef: 'package-run', contextSnapshotRef: 'package-context', artifactRef: { id: 'quiz', version: 'v2' },
      action: packageAction, approval: packageApproval, receipt: packageReceipt,
    })?.signal.outcome).toBe('not_adopted');
  });
});
