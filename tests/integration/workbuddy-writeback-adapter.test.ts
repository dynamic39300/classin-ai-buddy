import { describe, expect, it } from 'vitest';
import { approveAction, createCoursewareSaveAction } from '@domain/workbuddy/writeback';
import { MockClassInWritebackAdapter } from '@mocks/adapters/workbuddy-classin-writeback';

describe('ClassIn writeback Adapter contract', () => {
  it('returns one stable success receipt for an idempotent approved action', () => {
    const adapter = new MockClassInWritebackAdapter();
    const proposed = createCoursewareSaveAction({ artifactId: 'artifact-courseware-momentum-v1', artifactVersion: 'v1' });
    const approved = approveAction(proposed, 'approval-courseware-save-1', '2026-08-20T10:05:00+08:00');
    if (!approved) throw new Error('Expected approved action');

    const first = adapter.execute(approved.action, approved.approval);
    const replay = adapter.execute(approved.action, approved.approval);

    expect(first).toBe(replay);
    expect(first).toMatchObject({ status: 'success', id: 'receipt-courseware-save-1', object: { id: 'classin-courseware-momentum-v1', version: 'v1' } });
  });
});
