import { describe, expect, it } from 'vitest';
import { approveAction, createCoursewareSaveAction } from '@domain/workbuddy/writeback';
import { MockClassInWritebackAdapter } from '@mocks/adapters/workbuddy-classin-writeback';
import { DeterministicTestWritebackAdapter } from '@mocks/adapters/deterministic-test-writeback';
import { WORKBUDDY_COURSEWARE_SAVE_ACTION } from '@mocks/scenarios/workbuddy-course-production';

describe('ClassIn writeback Adapter contract', () => {
  function approvedAction() {
    const proposed = createCoursewareSaveAction(WORKBUDDY_COURSEWARE_SAVE_ACTION);
    const approved = approveAction(proposed, 'approval-courseware-save-1', '2026-08-20T10:05:00+08:00', 'teacher-wang');
    if (!approved) throw new Error('Expected approved action');
    return approved;
  }

  it.each([
    ['Mock', () => new MockClassInWritebackAdapter()],
    ['deterministic test', () => new DeterministicTestWritebackAdapter()],
  ] as const)('returns one stable success receipt for an idempotent approved action through the %s Adapter', (_name, createAdapter) => {
    const adapter = createAdapter();
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

  it('normalizes timeout and allows a safe idempotent retry', () => {
    const adapter = new MockClassInWritebackAdapter();
    adapter.setScenario('timeout');
    const approved = approvedAction();
    expect(adapter.execute(approved.action, approved.approval)).toMatchObject({ status: 'timeout', recovery: 'retry' });
    expect(adapter.execute(approved.action, approved.approval)).toMatchObject({ status: 'success' });
  });
});
