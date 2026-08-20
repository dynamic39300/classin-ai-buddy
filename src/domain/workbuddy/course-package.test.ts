import { describe, expect, it } from 'vitest';
import { WORKBUDDY_COURSE_PACKAGE_DEFINITION } from '@mocks/scenarios/workbuddy-course-production';
import {
  applyPackageExecutionReceipt, attachPackageContext, createCoursePackageRun, generatePackageArtifacts,
  markPackageArtifactsApproved, retryPackageArtifact, setPackageArtifactIncluded,
} from './course-package';

describe('course-package Artifact Graph', () => {
  it('requires independent Context confirmation for a derived Run', () => {
    const run = createCoursePackageRun(WORKBUDDY_COURSE_PACKAGE_DEFINITION, '生成动量单元课程方案包', null);
    expect(run.stage).toBe('awaiting_context');
    expect(attachPackageContext(run, 'snapshot-package-1')).toMatchObject({ stage: 'configuring', contextSnapshotId: 'snapshot-package-1' });
  });

  it('keeps selection, approval and receipt application as pure state transitions', () => {
    const created = createCoursePackageRun(WORKBUDDY_COURSE_PACKAGE_DEFINITION, '生成动量单元课程方案包', 'snapshot-package-1');
    const generated = generatePackageArtifacts(created, ['package-recording']);
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
      result: '部分成功', truthLabel: '固定 Mock Receipt',
    };
    const applied = applyPackageExecutionReceipt(approved, receipt);
    expect(applied.artifacts.map(({ state }) => state)).toEqual(['written_back', 'failed', 'excluded', 'failed']);
    expect(retryPackageArtifact(applied, 'package-homework').artifacts[1]?.state).toBe('ready');
  });
});
