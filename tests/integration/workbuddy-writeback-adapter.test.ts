import { describe, expect, it } from 'vitest';
import { approveAction, createCoursewareSaveAction } from '@domain/workbuddy/writeback';
import { MockClassInWritebackAdapter } from '@mocks/adapters/workbuddy-classin-writeback';

describe('ClassIn writeback Adapter contract', () => {
  function approvedAction() {
    const proposed = createCoursewareSaveAction({ artifactId: 'artifact-courseware-momentum-v1', artifactVersion: 'v1' });
    const approved = approveAction(proposed, 'approval-courseware-save-1', '2026-08-20T10:05:00+08:00');
    if (!approved) throw new Error('Expected approved action');
    return approved;
  }

  it('returns one stable success receipt for an idempotent approved action', () => {
    const adapter = new MockClassInWritebackAdapter();
    const approved = approvedAction();

    const first = adapter.execute(approved.action, approved.approval);
    const replay = adapter.execute(approved.action, approved.approval);

    expect(first).toBe(replay);
    expect(first).toMatchObject({ status: 'success', id: 'receipt-courseware-save-1', object: { id: 'classin-courseware-momentum-v1', version: 'v1' } });
  });

  it.each([
    ['permission_denied', 'permission_denied', 'choose-another-target'],
    ['version_conflict', 'version_conflict', 'compare-and-reconfirm'],
  ] as const)('normalizes the %s scenario', (scenario, status, recovery) => {
    const adapter = new MockClassInWritebackAdapter();
    adapter.setScenario(scenario);
    const approved = approvedAction();
    expect(adapter.execute(approved.action, approved.approval)).toMatchObject({ status, recovery, unexecutedTarget: 'unit-momentum-1' });
  });

  it('keeps approval and idempotency across a recoverable retry', () => {
    const adapter = new MockClassInWritebackAdapter();
    adapter.setScenario('recoverable_failure');
    const approved = approvedAction();
    const first = adapter.execute(approved.action, approved.approval);
    const retry = adapter.execute(approved.action, approved.approval);
    const replay = adapter.execute(approved.action, approved.approval);

    expect(first).toMatchObject({ status: 'recoverable_failure', recovery: 'retry', idempotencyKey: approved.action.idempotencyKey });
    expect(retry).toMatchObject({ status: 'success', actionId: approved.action.id, idempotencyKey: approved.action.idempotencyKey });
    expect(replay).toBe(retry);
  });
});
