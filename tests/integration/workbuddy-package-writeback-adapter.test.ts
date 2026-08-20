import { describe, expect, it } from 'vitest';
import { createCoursePackageRun, generatePackageArtifacts } from '@domain/workbuddy/course-package';
import { MockPackageWritebackAdapter } from '@mocks/adapters/workbuddy-package-writeback';

describe('Package writeback Adapter contract', () => {
  it('normalizes object-level partial results', () => {
    const run = generatePackageArtifacts(createCoursePackageRun('动量课程方案包', 'snapshot-package-1'));
    const result = new MockPackageWritebackAdapter().execute(run);
    expect(result.receipt.status).toBe('partial_success');
    expect(result.receipt.items.map(({ result: itemResult }) => itemResult)).toEqual(['succeeded', 'succeeded', 'succeeded', 'failed']);
  });
});
