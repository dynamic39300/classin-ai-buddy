import { beforeEach, describe, expect, it } from 'vitest';
import { loadWorkBuddyWorkspaceSession } from './workbuddy-workspace-session';

const STORAGE_KEY = 'workbuddy:workspace-session:v2';

function validSession() {
  const teacher = {
    id: 'teacher-1', section: 'actor_organization', kind: 'teacher', label: '王老师', source: 'classin',
    sourceVersion: 'actor-v1', permission: 'read', sensitivity: 'organization', selection: 'locked', included: true,
  };
  return {
    version: 2,
    contextProposal: { taskType: 'single-courseware', status: 'needs_attention', items: [teacher] },
    contextSnapshot: null,
    snapshotsById: {},
    taskType: 'single-courseware',
    coursewareRun: null,
    coursewareAction: null,
    coursewareApproval: null,
    coursewareReceipt: null,
    writebackScenario: 'success',
    activeCoursewarePanel: 'none',
    packageRun: null,
    packageAction: null,
    packageApproval: null,
    packageReceipt: null,
    packageReceiptHistory: [],
    packageWritebackScenario: 'success',
    activePackagePanel: 'none',
    activePackageArtifactId: null,
    draftGoal: '',
  };
}

describe('WorkBuddy workspace session boundary', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('accepts a structurally valid empty workspace session', () => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(validSession()));
    expect(loadWorkBuddyWorkspaceSession()).toMatchObject({ version: 2, taskType: 'single-courseware' });
  });

  it('fails closed when a nested Context item is malformed', () => {
    const session = validSession();
    session.contextProposal.items[0]!.permission = 'write';
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    expect(loadWorkBuddyWorkspaceSession()).toBeNull();
  });

  it('fails closed when a discriminated execution Receipt is incomplete', () => {
    const session = { ...validSession(), coursewareReceipt: {
      id: 'receipt-1', actionId: 'action-1', approvalId: 'approval-1', idempotencyKey: 'key-1', executedAt: '2026-08-21T10:00:00+08:00',
      truthLabel: '[模拟]', result: '版本冲突', status: 'version_conflict', recovery: 'compare-and-reconfirm', unexecutedTarget: 'unit-1',
    } };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    expect(loadWorkBuddyWorkspaceSession()).toBeNull();
  });
});
