import { describe, expect, it } from 'vitest';
import { approveTeacherInDraft, proposeTeacherInDraft } from '@domain/workbuddy/teacherin';
import { MockTeacherInAdapter } from './workbuddy-teacherin';

function approvedDraft() {
  const proposed = proposeTeacherInDraft({
    runRef: 'run-courseware', artifactRef: { id: 'asset-courseware-pptx', version: 'v2' },
    spaceFileRef: { id: 'space-file-courseware-pptx', version: 'v2', pathLabel: '我的云盘 / WorkBuddy 产物' },
    title: '函数单调性智能课件', permission: 'allowed', proposedAt: '2026-08-22T10:10:00+08:00',
  });
  return approveTeacherInDraft(proposed, {
    approvalId: 'approval-teacherin-1', decidedBy: 'teacher-wang', decidedAt: '2026-08-22T10:10:01+08:00',
  })!;
}

describe('Mock TeacherIn Adapter', () => {
  it('searches deterministic TeacherIn resources', () => {
    const adapter = new MockTeacherInAdapter();
    expect(adapter.searchResources('函数').map(({ id }) => id)).toEqual([
      'teacherin-resource-monotonicity', 'teacherin-resource-inquiry',
    ]);
  });

  it('returns the same draft for a repeated idempotency key', () => {
    const adapter = new MockTeacherInAdapter();
    const { action, approval } = approvedDraft();
    expect(adapter.createDraft(action, approval)).toBe(adapter.createDraft(action, approval));
  });

  it.each(['permission_denied', 'recoverable_failure'] as const)('models %s without inventing review states', (scenario) => {
    const adapter = new MockTeacherInAdapter();
    adapter.setScenario(scenario);
    const { action, approval } = approvedDraft();
    expect(adapter.createDraft(action, approval).status).toBe(scenario);
  });
});

