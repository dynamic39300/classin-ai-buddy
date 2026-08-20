import { describe, expect, it } from 'vitest';
import { WORKBUDDY_COURSE_PACKAGE_DEFINITION, WORKBUDDY_PACKAGE_ACTION_INPUT } from '@mocks/scenarios/workbuddy-course-production';
import { createPackageSaveAction } from './package-writeback';
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
    expect(setPackageArtifactIncluded(configuring, 'package-courseware', false)).toBe(configuring);

    const generated = completePackageGeneration(beginPackageGeneration(configuring), []);
    const excludedRoot = setPackageArtifactIncluded(generated, 'package-courseware', false);
    expect(excludedRoot.artifacts.every(({ state }) => state === 'excluded')).toBe(true);
    expect(createPackageSaveAction(excludedRoot, WORKBUDDY_PACKAGE_ACTION_INPUT)).toBeNull();

    const failedRoot = completePackageGeneration(beginPackageGeneration(configuring), ['package-courseware']);
    expect(createPackageSaveAction(failedRoot, WORKBUDDY_PACKAGE_ACTION_INPUT)).toBeNull();
  });

  it('keeps selection, approval and receipt application as pure state transitions', () => {
    const created = createCoursePackageRun(WORKBUDDY_COURSE_PACKAGE_DEFINITION, '生成动量单元课程方案包', 'snapshot-package-1');
    const generating = beginPackageGeneration(created);
    expect(generating).toMatchObject({ stage: 'generating', recovery: 'wait-or-complete-fixture' });
    expect(generating.artifacts.every(({ state }) => state === 'generating')).toBe(true);
    const generated = completePackageGeneration(generating, ['package-recording']);
    const selected = setPackageArtifactIncluded(generated, 'package-quiz', false);
    const approved = markPackageArtifactsApproved(selected, ['package-courseware', 'package-homework']);
    const receipt = {
      id: 'receipt-1', actionId: 'action-1', approvalId: 'approval-1', idempotencyKey: 'key-1', status: 'partial_success' as const,
      items: [
        { artifactId: 'package-courseware', result: 'succeeded' as const, objectId: 'object-1' },
        { artifactId: 'package-homework', result: 'failed' as const },
        { artifactId: 'package-quiz', result: 'not_executed' as const },
        { artifactId: 'package-recording', result: 'not_executed' as const },
      ],
      result: '部分成功', truthLabel: '[模拟]课程方案包执行回执',
    };
    const applied = applyPackageExecutionReceipt(approved, receipt);
    expect(applied.artifacts.map(({ state }) => state)).toEqual(['written_back', 'failed', 'excluded', 'failed']);
    expect(retryPackageArtifact(applied, 'package-homework').artifacts[1]?.state).toBe('ready');
  });
});
