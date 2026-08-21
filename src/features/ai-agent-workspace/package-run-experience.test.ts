import { describe, expect, it } from 'vitest';
import { WORKBUDDY_COURSE_PACKAGE_DEFINITION } from '@mocks/scenarios/workbuddy-course-production';
import { createCoursePackageRun } from '@domain/workbuddy/course-package';
import {
  advancePackageExperience,
  createPackageExperience,
  projectPackageExperienceArtifacts,
  startPackageExperience,
} from './package-run-experience';

describe('deterministic package conversation experience', () => {
  it('shows the root, parallel children and dependent recording as observable running phases', () => {
    const run = createCoursePackageRun(WORKBUDDY_COURSE_PACKAGE_DEFINITION, '生成课程方案包', 'snapshot-1');
    let state = startPackageExperience(createPackageExperience());

    expect(projectPackageExperienceArtifacts(state, run.artifacts).map(({ state: itemState }) => itemState)).toEqual([
      'running', 'waiting', 'waiting', 'waiting',
    ]);
    state = advancePackageExperience(state);
    expect(projectPackageExperienceArtifacts(state, run.artifacts).map(({ state: itemState }) => itemState)).toEqual([
      'completed', 'running', 'running', 'waiting',
    ]);
    state = advancePackageExperience(state);
    expect(projectPackageExperienceArtifacts(state, run.artifacts).map(({ state: itemState }) => itemState)).toEqual([
      'completed', 'completed', 'completed', 'running',
    ]);
    state = advancePackageExperience(state);
    expect(state.status).toBe('completed');
    expect(projectPackageExperienceArtifacts(state, run.artifacts).every(({ state: itemState }) => itemState === 'completed')).toBe(true);
  });
});
