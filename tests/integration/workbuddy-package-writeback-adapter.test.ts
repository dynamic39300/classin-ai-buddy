import { describe, expect, it } from 'vitest';
import { beginPackageGeneration, completePackageGeneration, createCoursePackageRun, markPackageArtifactsApproved, retryPackageArtifact } from '@domain/workbuddy/course-package';
import { createPackageSaveAction, decidePackageAction } from '@domain/workbuddy/package-writeback';
import { MockPackageWritebackAdapter } from '@mocks/adapters/workbuddy-package-writeback';
import { DeterministicTestPackageWritebackAdapter } from '@mocks/adapters/deterministic-test-writeback';
import { WORKBUDDY_COURSE_PACKAGE_DEFINITION, WORKBUDDY_PACKAGE_ACTION_INPUT } from '@mocks/scenarios/workbuddy-course-production';

function approvedPackage() {
  const created = createCoursePackageRun(WORKBUDDY_COURSE_PACKAGE_DEFINITION, '动量课程方案包', 'snapshot-package-1');
  const run = retryPackageArtifact(completePackageGeneration(beginPackageGeneration(created), ['package-recording']), 'package-recording');
  const action = createPackageSaveAction(run, WORKBUDDY_PACKAGE_ACTION_INPUT);
  if (!action) throw new Error('Expected package action');
  const approved = decidePackageAction(action, { id: 'approval-package-1', decidedBy: 'teacher-wang', decidedAt: '2026-08-20T10:15:00+08:00' }, 'approved');
  if (!approved) throw new Error('Expected package approval');
  const approvedRun = markPackageArtifactsApproved(run, approved.action.artifactRefs.map(({ id }) => id));
  const candidates = approvedRun.artifacts.map(({ id, kind, version, state }) => ({
    id, kind, version, runRef: approved.action.runRef, contextSnapshotId: approved.action.contextSnapshotId,
    approvalState: state === 'approved' || state === 'written_back' ? state : 'not_selected' as const,
  }));
  return { run: approvedRun, candidates, ...approved };
}

describe('Package writeback Adapter contract', () => {
  it.each([
    ['Mock', () => new MockPackageWritebackAdapter()],
    ['deterministic test', () => new DeterministicTestPackageWritebackAdapter()],
  ] as const)('requires an approved action and normalizes object-level partial results through the %s Adapter', (_name, createAdapter) => {
    const input = approvedPackage();
    const receipt = createAdapter().execute(input.action, input.approval, input.candidates);
    expect(receipt.status).toBe('partial_success');
    expect(receipt.items.map(({ result }) => result)).toEqual(['succeeded', 'succeeded', 'succeeded', 'failed']);
  });

  it.each([
    ['Mock', () => new MockPackageWritebackAdapter(), 'permission_denied', 'choose-another-target'],
    ['test', () => new DeterministicTestPackageWritebackAdapter(), 'permission_denied', 'choose-another-target'],
    ['Mock', () => new MockPackageWritebackAdapter(), 'version_conflict', 'compare-and-reconfirm'],
    ['test', () => new DeterministicTestPackageWritebackAdapter(), 'version_conflict', 'compare-and-reconfirm'],
    ['Mock', () => new MockPackageWritebackAdapter(), 'recoverable_failure', 'retry'],
    ['test', () => new DeterministicTestPackageWritebackAdapter(), 'recoverable_failure', 'retry'],
    ['Mock', () => new MockPackageWritebackAdapter(), 'timeout', 'retry'],
    ['test', () => new DeterministicTestPackageWritebackAdapter(), 'timeout', 'retry'],
  ] as const)('%s Adapter normalizes %s without executing package items', (_name, createAdapter, scenario, recovery) => {
    const adapter = createAdapter();
    adapter.setScenario(scenario);
    const input = approvedPackage();
    expect(adapter.execute(input.action, input.approval, input.candidates)).toMatchObject({ status: scenario, recovery });
  });

  it.each([
    ['Mock', () => new MockPackageWritebackAdapter()],
    ['test', () => new DeterministicTestPackageWritebackAdapter()],
  ] as const)('%s Adapter keeps successful execution idempotent', (_name, createAdapter) => {
    const adapter = createAdapter();
    adapter.setScenario('success');
    const input = approvedPackage();
    const first = adapter.execute(input.action, input.approval, input.candidates);
    expect(adapter.execute(input.action, input.approval, input.candidates)).toBe(first);
  });

  it.each([
    ['Mock', () => new MockPackageWritebackAdapter()],
    ['test', () => new DeterministicTestPackageWritebackAdapter()],
  ] as const)('%s Adapter rejects candidates owned by another run', (_name, createAdapter) => {
    const input = approvedPackage();
    const foreignCandidates = input.candidates.map((candidate) => ({ ...candidate, runRef: 'run-other' }));
    expect(() => createAdapter().execute(input.action, input.approval, foreignCandidates)).toThrow(/run|foreign/i);
  });

  it.each([
    ['Mock', () => new MockPackageWritebackAdapter()],
    ['test', () => new DeterministicTestPackageWritebackAdapter()],
  ] as const)('%s Adapter rejects stale artifact versions', (_name, createAdapter) => {
    const input = approvedPackage();
    const staleCandidates = input.candidates.map((candidate, index) => index === 0 ? { ...candidate, version: 'v0' } : candidate);
    expect(() => createAdapter().execute(input.action, input.approval, staleCandidates)).toThrow(/stale|unapproved/i);
  });
});
