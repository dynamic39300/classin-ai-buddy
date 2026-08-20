import { describe, expect, it } from 'vitest';
import { approveAction, createCoursewareSaveAction, rejectAction } from './writeback';

const ACTION_INPUT = {
  id: 'action-1', runRef: 'run-1', contextSnapshotId: 'snapshot-1', artifactId: 'artifact-1', artifactVersion: 'v1',
  target: { classId: 'class-1', courseId: 'course-1', unitId: 'unit-1', expectedVersion: 'v1', label: '目标单元' },
  difference: '新增课件', impact: '教师可见', permission: 'allowed' as const, risk: 'low' as const,
  reversible: true, expiresAt: '2026-08-21T10:05:00+08:00', idempotencyKey: 'key-1',
};

describe('WorkBuddy writeback policy', () => {
  it('keeps proposal, approval and execution evidence distinct', () => {
    const proposed = createCoursewareSaveAction(ACTION_INPUT);
    expect(proposed.status).toBe('proposed');
    const approved = approveAction(proposed, 'approval-1', '2026-08-20T10:05:00+08:00', 'teacher-1');
    if (!approved) throw new Error('Expected approved action');
    expect(approved.action.status).toBe('approved');
    expect(approved.approval.decision).toBe('approved');
    expect('receipt' in approved).toBe(false);
  });

  it('does not approve an action after it is rejected', () => {
    const rejected = rejectAction(createCoursewareSaveAction(ACTION_INPUT), 'approval-2', '2026-08-20T10:05:00+08:00', 'teacher-1');
    if (!rejected) throw new Error('Expected rejected action');
    expect(rejected.action.status).toBe('rejected');
    expect(approveAction(rejected.action, 'approval-3', '2026-08-20T10:06:00+08:00', 'teacher-1')).toBeNull();
  });
});
