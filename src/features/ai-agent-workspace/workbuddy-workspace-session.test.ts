import { beforeEach, describe, expect, it } from 'vitest';
import { beginPackageGeneration, completePackageGeneration, createCoursePackageRun } from '@domain/workbuddy/course-package';
import { WORKBUDDY_COURSE_PACKAGE_DEFINITION } from '@mocks/scenarios/workbuddy-course-production';
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

  it('fails closed when a stored Snapshot key does not match its object identity', () => {
    const session = validSession();
    const snapshot = {
      id: 'context-snapshot-1',
      version: 'workbuddy-m4-context-v1',
      taskType: 'single-courseware',
      confirmedAt: '2026-08-21T10:00:00+08:00',
      items: session.contextProposal.items,
    };
    Object.assign(session, { contextSnapshot: snapshot, snapshotsById: { 'wrong-snapshot-key': snapshot } });
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    expect(loadWorkBuddyWorkspaceSession()).toBeNull();
  });

  it('fails closed when a historical package Receipt references an artifact outside its Run', () => {
    const session = validSession();
    const snapshot = {
      id: 'context-package-1', version: 'workbuddy-m4-context-v1', taskType: 'course-package',
      confirmedAt: '2026-08-21T10:00:00+08:00', items: session.contextProposal.items,
    };
    const packageRun = completePackageGeneration(beginPackageGeneration(createCoursePackageRun(
      WORKBUDDY_COURSE_PACKAGE_DEFINITION, '生成函数单调性课程方案包', snapshot.id,
    )), []);
    const unrelatedReceipt = {
      id: 'receipt-package-foreign', actionId: 'action-package-old', approvalId: 'approval-package-old',
      idempotencyKey: 'package-old-key', truthLabel: '[模拟]课程方案包执行回执', result: '历史执行成功', status: 'success',
      items: [{ artifactId: 'foreign-artifact', result: 'succeeded', objectId: 'foreign-object' }],
    };
    Object.assign(session, { snapshotsById: { [snapshot.id]: snapshot }, packageRun, packageReceiptHistory: [unrelatedReceipt] });
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    expect(loadWorkBuddyWorkspaceSession()).toBeNull();
  });
});
