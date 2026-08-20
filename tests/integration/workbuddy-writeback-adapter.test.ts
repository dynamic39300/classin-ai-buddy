import { describe, expect, it } from 'vitest';
import { approveAction, createCoursewareSaveAction } from '@domain/workbuddy/writeback';
import { MockClassInWritebackAdapter } from '@mocks/adapters/workbuddy-classin-writeback';
import { DeterministicTestWritebackAdapter } from '@mocks/adapters/deterministic-test-writeback';
import { WORKBUDDY_COURSEWARE_SAVE_ACTION, WORKBUDDY_RUNTIME_FIXTURE } from '@mocks/scenarios/workbuddy-course-production';

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
    ['Mock', () => new MockClassInWritebackAdapter()],
    ['deterministic test', () => new DeterministicTestWritebackAdapter()],
  ] as const)('%s Adapter returns the replanned target object instead of the superseded momentum object', (_name, createAdapter) => {
    const proposed = createCoursewareSaveAction({
      ...WORKBUDDY_COURSEWARE_SAVE_ACTION,
      id: 'action-courseware-wave-save-1',
      contextSnapshotId: WORKBUDDY_RUNTIME_FIXTURE.snapshot.replannedCoursewareId,
      artifactId: WORKBUDDY_RUNTIME_FIXTURE.replan.artifact.id,
      artifactVersion: WORKBUDDY_RUNTIME_FIXTURE.replan.artifact.version,
      target: WORKBUDDY_RUNTIME_FIXTURE.replan.target,
      idempotencyKey: 'workbuddy-courseware-wave-save-1',
    });
    const approved = approveAction(proposed, 'approval-courseware-wave-save-1', '2026-08-20T10:25:00+08:00', 'teacher-wang');
    if (!approved) throw new Error('Expected approved replanned action');

    expect(createAdapter().execute(approved.action, approved.approval)).toMatchObject({
      status: 'success',
      object: {
        id: 'classin-courseware-wave-v2',
        version: 'v2',
        returnUrl: expect.stringContaining('/teacher/classes/physics-1?course=course-physics-1&unit=unit-wave-1'),
      },
    });
  });

  it.each([
    ['Mock', () => new MockClassInWritebackAdapter(), 'permission_denied', 'choose-another-target'],
    ['test', () => new DeterministicTestWritebackAdapter(), 'permission_denied', 'choose-another-target'],
    ['Mock', () => new MockClassInWritebackAdapter(), 'version_conflict', 'compare-and-reconfirm'],
    ['test', () => new DeterministicTestWritebackAdapter(), 'version_conflict', 'compare-and-reconfirm'],
  ] as const)('%s Adapter normalizes the %s scenario', (_name, createAdapter, scenario, recovery) => {
    const adapter = createAdapter();
    adapter.setScenario(scenario);
    const approved = approvedAction();
    expect(adapter.execute(approved.action, approved.approval)).toMatchObject({ status: scenario, recovery, unexecutedTarget: 'unit-momentum-1' });
  });

  it.each([
    ['Mock', () => new MockClassInWritebackAdapter()],
    ['test', () => new DeterministicTestWritebackAdapter()],
  ] as const)('%s Adapter keeps approval and idempotency across a recoverable retry', (_name, createAdapter) => {
    const adapter = createAdapter();
    adapter.setScenario('recoverable_failure');
    const approved = approvedAction();
    const first = adapter.execute(approved.action, approved.approval);
    const retry = adapter.execute(approved.action, approved.approval);
    const replay = adapter.execute(approved.action, approved.approval);

    expect(first).toMatchObject({ status: 'recoverable_failure', recovery: 'retry', idempotencyKey: approved.action.idempotencyKey });
    expect(retry).toMatchObject({ status: 'success', actionId: approved.action.id, idempotencyKey: approved.action.idempotencyKey });
    expect(replay).toBe(retry);
  });

  it.each([
    ['Mock', () => new MockClassInWritebackAdapter()],
    ['test', () => new DeterministicTestWritebackAdapter()],
  ] as const)('%s Adapter normalizes timeout and allows a safe idempotent retry', (_name, createAdapter) => {
    const adapter = createAdapter();
    adapter.setScenario('timeout');
    const approved = approvedAction();
    expect(adapter.execute(approved.action, approved.approval)).toMatchObject({ status: 'timeout', recovery: 'retry' });
    expect(adapter.execute(approved.action, approved.approval)).toMatchObject({ status: 'success' });
  });
});
