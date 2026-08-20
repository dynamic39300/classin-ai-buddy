import { describe, expect, it } from 'vitest';
import { approveAction, createCoursewareSaveAction, rejectAction } from './writeback';

describe('WorkBuddy writeback policy', () => {
  it('keeps proposal, approval and execution evidence distinct', () => {
    const proposed = createCoursewareSaveAction({ artifactId: 'artifact-1', artifactVersion: 'v1' });
    expect(proposed.status).toBe('proposed');
    const approved = approveAction(proposed, 'approval-1', '2026-08-20T10:05:00+08:00');
    if (!approved) throw new Error('Expected approved action');
    expect(approved.action.status).toBe('approved');
    expect(approved.approval.decision).toBe('approved');
    expect('receipt' in approved).toBe(false);
  });

  it('does not approve an action after it is rejected', () => {
    const rejected = rejectAction(createCoursewareSaveAction({ artifactId: 'artifact-1', artifactVersion: 'v1' }), 'approval-2', '2026-08-20T10:05:00+08:00');
    if (!rejected) throw new Error('Expected rejected action');
    expect(rejected.action.status).toBe('rejected');
    expect(approveAction(rejected.action, 'approval-3', '2026-08-20T10:06:00+08:00')).toBeNull();
  });
});
