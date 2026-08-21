import { describe, expect, it } from 'vitest';
import { WORKBUDDY_COURSE_PACKAGE_DEFINITION, WORKBUDDY_PACKAGE_ACTION_INPUT } from '@mocks/scenarios/workbuddy-course-production';
import { createPackageSaveAction, decidePackageAction, expirePackageAction, renewPackageSaveAction } from './package-writeback';
import type { PackageExecutionReceipt } from './course-package';
import {
  applyPackageExecutionReceipt, attachPackageContext, beginPackageGeneration, completePackageGeneration, createCoursePackageRun,
  markPackageArtifactsApproved, retryPackageArtifact, setPackageArtifactIncluded,
} from './course-package';

describe('course-package Artifact Graph', () => {
  it('requires independent Context confirmation for a derived Run', () => {
    const run = createCoursePackageRun(WORKBUDDY_COURSE_PACKAGE_DEFINITION, '生成动量单元课程方案包', null);
    expect(run.stage).toBe('awaiting_context');
    expect(attachPackageContext(run, 'snapshot-package-1')).toMatchObject({ stage: 'configuring', contextSnapshotId: 'snapshot-package-1' });
  });

  it('guards selection commands and prevents dependent writeback when the root artifact is unavailable', () => {
    const configuring = createCoursePackageRun(WORKBUDDY_COURSE_PACKAGE_DEFINITION, '生成动量单元课程方案包', 'snapshot-package-1');
    const withoutQuiz = setPackageArtifactIncluded(configuring, 'package-quiz', false);
    expect(withoutQuiz.artifacts.find(({ id }) => id === 'package-quiz')?.state).toBe('excluded');
    expect(beginPackageGeneration(withoutQuiz).artifacts.find(({ id }) => id === 'package-quiz')?.state).toBe('excluded');
    expect(setPackageArtifactIncluded(withoutQuiz, 'package-quiz', true).artifacts.find(({ id }) => id === 'package-quiz')?.state).toBe('planned');

    const generated = completePackageGeneration(beginPackageGeneration(configuring), []);
    const excludedRoot = setPackageArtifactIncluded(generated, 'package-courseware', false);
    expect(excludedRoot.artifacts.every(({ state }) => state === 'excluded')).toBe(true);
    expect(createPackageSaveAction(excludedRoot, WORKBUDDY_PACKAGE_ACTION_INPUT)).toBeNull();

    const failedRoot = completePackageGeneration(beginPackageGeneration(configuring), ['package-courseware']);
    expect(failedRoot.artifacts.map(({ state }) => state)).toEqual(['failed', 'waiting', 'waiting', 'waiting']);
    expect(createPackageSaveAction(failedRoot, WORKBUDDY_PACKAGE_ACTION_INPUT)).toBeNull();
    expect(retryPackageArtifact(failedRoot, 'package-courseware').artifacts.map(({ state }) => state)).toEqual(['ready', 'ready', 'ready', 'ready']);
  });

  it('keeps selection, approval and receipt application as pure state transitions', () => {
    const created = createCoursePackageRun(WORKBUDDY_COURSE_PACKAGE_DEFINITION, '生成动量单元课程方案包', 'snapshot-package-1');
    const generating = beginPackageGeneration(created);
    expect(generating).toMatchObject({ stage: 'generating', recovery: 'wait-or-complete-fixture' });
    expect(generating.artifacts.every(({ state }) => state === 'generating')).toBe(true);
    const generated = completePackageGeneration(generating, ['package-recording']);
    const selected = setPackageArtifactIncluded(generated, 'package-quiz', false);
    const action = createPackageSaveAction(selected, WORKBUDDY_PACKAGE_ACTION_INPUT);
    if (!action) throw new Error('Expected action');
    expect(expirePackageAction(action, action.expiresAt)).toMatchObject({ status: 'expired' });
    expect(decidePackageAction(action, { id: 'approval-late', decidedBy: 'teacher-1', decidedAt: action.expiresAt }, 'approved')).toBeNull();
    const decision = decidePackageAction(action, { id: 'approval-1', decidedBy: 'teacher-1', decidedAt: '2026-08-20T10:00:00+08:00' }, 'approved');
    if (!decision) throw new Error('Expected approval');
    const approved = markPackageArtifactsApproved(selected, decision.action.artifactRefs.map(({ id }) => id));
    const receipt = {
      id: 'receipt-1', actionId: decision.action.id, approvalId: decision.approval.id, idempotencyKey: decision.action.idempotencyKey, status: 'partial_success' as const,
      items: [
        { artifactId: 'package-courseware', result: 'succeeded' as const, objectId: 'object-1' },
        { artifactId: 'package-homework', result: 'failed' as const },
        { artifactId: 'package-quiz', result: 'not_executed' as const },
        { artifactId: 'package-recording', result: 'not_executed' as const },
      ],
      result: '部分成功', truthLabel: '[模拟]课程方案包执行回执',
    };
    const applied = applyPackageExecutionReceipt(approved, decision.action, decision.approval, receipt);
    expect(applied.accepted).toBe(true);
    if (!applied.accepted) throw new Error('Expected accepted receipt');
    expect(applied.run.artifacts.map(({ state }) => state)).toEqual(['written_back', 'failed', 'excluded', 'excluded']);
    expect(retryPackageArtifact(applied.run, 'package-homework').artifacts[1]?.state).toBe('ready');
    expect(applyPackageExecutionReceipt(approved, { ...decision.action, runRef: 'foreign-run' }, decision.approval, receipt)).toMatchObject({ accepted: false, run: approved });

    const contradictorySuccess = { ...receipt, status: 'success', items: receipt.items } as unknown as PackageExecutionReceipt;
    expect(applyPackageExecutionReceipt(approved, decision.action, decision.approval, contradictorySuccess)).toMatchObject({ accepted: false, run: approved });

    const recoverable = {
      ...receipt,
      status: 'recoverable_failure',
      recovery: 'retry',
      items: approved.artifacts.map(({ id, state }) => ({ artifactId: id, result: state === 'waiting' ? 'waiting' : 'not_executed' })),
    } as unknown as PackageExecutionReceipt;
    expect(applyPackageExecutionReceipt(approved, decision.action, decision.approval, recoverable)).toEqual({ accepted: true, run: approved });
  });

  it('validates the Artifact DAG and resolves legal out-of-order dependencies', () => {
    const outOfOrderDefinition = {
      ...WORKBUDDY_COURSE_PACKAGE_DEFINITION,
      artifacts: Object.freeze([...WORKBUDDY_COURSE_PACKAGE_DEFINITION.artifacts].reverse()),
    };
    const generated = completePackageGeneration(
      beginPackageGeneration(createCoursePackageRun(outOfOrderDefinition, '乱序但合法的课程方案包', 'snapshot-package-1')),
      [],
    );
    expect(generated.artifacts.every(({ state }) => state === 'ready')).toBe(true);

    const root = WORKBUDDY_COURSE_PACKAGE_DEFINITION.artifacts[0]!;
    expect(() => createCoursePackageRun({
      ...WORKBUDDY_COURSE_PACKAGE_DEFINITION,
      artifacts: [{ ...root, dependsOn: ['missing-artifact'] }],
    }, '缺失依赖', 'snapshot-package-1')).toThrow(/Unknown dependency/);
    expect(() => createCoursePackageRun({
      ...WORKBUDDY_COURSE_PACKAGE_DEFINITION,
      artifacts: [
        { ...root, id: 'artifact-a', dependsOn: ['artifact-b'] },
        { ...root, id: 'artifact-b', dependsOn: ['artifact-a'] },
      ],
    }, '循环依赖', 'snapshot-package-1')).toThrow(/Cyclic/);
  });

  it('fails closed on invalid expiry and preserves a recovered target during renewal', () => {
    const created = createCoursePackageRun(WORKBUDDY_COURSE_PACKAGE_DEFINITION, '生成动量单元课程方案包', 'snapshot-package-1');
    const generated = completePackageGeneration(beginPackageGeneration(created), []);
    const action = createPackageSaveAction(generated, {
      ...WORKBUDDY_PACKAGE_ACTION_INPUT,
      target: { ...WORKBUDDY_PACKAGE_ACTION_INPUT.target, unitId: 'unit-fallback', expectedVersion: 'v4', label: '已确认替代位置' },
    });
    if (!action) throw new Error('Expected action');
    expect(expirePackageAction({ ...action, expiresAt: 'invalid' }, '2026-08-20T10:05:00+08:00')).toMatchObject({ status: 'expired' });
    const renewed = renewPackageSaveAction(generated, expirePackageAction(action, action.expiresAt), {
      id: 'package-action-renewed', expiresAt: '2026-08-21T11:05:00+08:00', idempotencyKey: 'package-key-renewed',
    });
    expect(renewed).toMatchObject({
      id: 'package-action-renewed', status: 'proposed', idempotencyKey: 'package-key-renewed',
      target: { unitId: 'unit-fallback', expectedVersion: 'v4', label: '已确认替代位置' },
    });
  });
});
