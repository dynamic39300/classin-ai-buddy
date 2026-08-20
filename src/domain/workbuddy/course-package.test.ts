import { describe, expect, it } from 'vitest';
import { createCoursePackageRun, executePackageWriteback, generatePackageArtifacts, retryPackageArtifact, setPackageArtifactIncluded } from './course-package';

describe('course-package Artifact Graph', () => {
  it('keeps item states and partial writeback results independent', () => {
    const generated = generatePackageArtifacts(createCoursePackageRun('生成动量单元课程方案包', 'snapshot-package-1'));
    expect(generated.artifacts.map(({ state }) => state)).toEqual(['ready', 'ready', 'ready', 'failed']);

    const withoutQuiz = setPackageArtifactIncluded(generated, 'package-quiz', false);
    const first = executePackageWriteback(withoutQuiz);
    expect(first.receipt.status).toBe('partial_success');
    expect(first.receipt.items.map(({ result }) => result)).toEqual(['succeeded', 'succeeded', 'not_executed', 'failed']);

    const retried = retryPackageArtifact(first.run, 'package-recording');
    const second = executePackageWriteback(retried);
    expect(second.receipt.items.find(({ artifactId }) => artifactId === 'package-courseware')?.result).toBe('waiting');
    expect(second.receipt.items.find(({ artifactId }) => artifactId === 'package-recording')?.result).toBe('succeeded');
  });
});
