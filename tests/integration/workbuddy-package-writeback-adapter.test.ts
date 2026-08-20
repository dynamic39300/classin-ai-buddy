import { describe, expect, it } from 'vitest';
import { createCoursePackageRun, generatePackageArtifacts, retryPackageArtifact } from '@domain/workbuddy/course-package';
import { createPackageSaveAction, decidePackageAction } from '@domain/workbuddy/package-writeback';
import { MockPackageWritebackAdapter } from '@mocks/adapters/workbuddy-package-writeback';
import { DeterministicTestPackageWritebackAdapter } from '@mocks/adapters/deterministic-test-writeback';
import { WORKBUDDY_COURSE_PACKAGE_DEFINITION, WORKBUDDY_PACKAGE_ACTION_INPUT } from '@mocks/scenarios/workbuddy-course-production';

function approvedPackage() {
  const run = retryPackageArtifact(generatePackageArtifacts(createCoursePackageRun(WORKBUDDY_COURSE_PACKAGE_DEFINITION, '动量课程方案包', 'snapshot-package-1'), ['package-recording']), 'package-recording');
  const action = createPackageSaveAction(run, WORKBUDDY_PACKAGE_ACTION_INPUT);
  if (!action) throw new Error('Expected package action');
  const approved = decidePackageAction(action, { id: 'approval-package-1', decidedBy: 'teacher-wang', decidedAt: '2026-08-20T10:15:00+08:00' }, 'approved');
  if (!approved) throw new Error('Expected package approval');
  return { run, ...approved };
}

describe('Package writeback Adapter contract', () => {
  it.each([
    ['Mock', () => new MockPackageWritebackAdapter()],
    ['deterministic test', () => new DeterministicTestPackageWritebackAdapter()],
  ] as const)('requires an approved action and normalizes object-level partial results through the %s Adapter', (_name, createAdapter) => {
    const input = approvedPackage();
    const receipt = createAdapter().execute(input.action, input.approval, input.run);
    expect(receipt.status).toBe('partial_success');
    expect(receipt.items.map(({ result }) => result)).toEqual(['succeeded', 'succeeded', 'succeeded', 'failed']);
  });

  it.each([
    ['permission_denied', 'choose-another-target'],
    ['version_conflict', 'compare-and-reconfirm'],
    ['recoverable_failure', 'retry'],
    ['timeout', 'retry'],
  ] as const)('normalizes %s without executing package items', (scenario, recovery) => {
    const adapter = new MockPackageWritebackAdapter();
    adapter.setScenario(scenario);
    const input = approvedPackage();
    expect(adapter.execute(input.action, input.approval, input.run)).toMatchObject({ status: scenario, recovery });
  });

  it('keeps successful execution idempotent', () => {
    const adapter = new MockPackageWritebackAdapter();
    adapter.setScenario('success');
    const input = approvedPackage();
    const first = adapter.execute(input.action, input.approval, input.run);
    expect(adapter.execute(input.action, input.approval, input.run)).toBe(first);
  });
});
