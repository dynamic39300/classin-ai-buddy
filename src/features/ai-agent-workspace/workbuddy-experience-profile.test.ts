import { describe, expect, it } from 'vitest';
import { CLASS_RECORDS } from '@mocks/scenarios/classes';
import { createClassMvpWorkBuddyExperience, resolveClassMvpWorkBuddyExperience } from './classin-mvp-workbuddy-experience';
import { createIdealWorkBuddyExperience } from './ideal-workbuddy-experience';
import {
  parseWorkBuddyWorkspaceRoute,
  workBuddyCapabilityPath,
  workBuddyNewTaskPath,
  workBuddyRunPath,
} from './workbuddy-experience-profile';

describe('WorkBuddyExperienceProfileModule', () => {
  it('projects the ideal and MVP experiences onto different routes and data namespaces', () => {
    const ideal = createIdealWorkBuddyExperience();
    const mvp = createClassMvpWorkBuddyExperience({
      classId: 'physics-3',
      className: '高二物理 3 班',
      courseId: 'course-momentum',
      courseName: '动量与碰撞',
    });

    expect(ideal.sessionNamespace).toBe('ideal-full');
    expect(mvp.sessionNamespace).toBe('classin-mvp');
    expect(mvp.visibleTaskTypes).toEqual(ideal.visibleTaskTypes);
    expect(mvp.visibleCapabilityIds).toEqual(['skills', 'tools', 'files']);
    expect(mvp.visibleTaskTypes).not.toBe(ideal.visibleTaskTypes);
    expect(mvp.visibleCapabilityIds).not.toBe(ideal.visibleCapabilityIds);
    expect(workBuddyNewTaskPath(mvp)).toBe('/teacher/classes/physics-3/workbuddy/new?course=course-momentum');
    expect(workBuddyRunPath(mvp, 'run-1')).toBe('/teacher/classes/physics-3/workbuddy/runs/run-1?course=course-momentum');
    expect(workBuddyCapabilityPath(mvp, 'files')).toBe('/teacher/classes/physics-3/workbuddy/files?course=course-momentum');
    expect(mvp.returnTarget).toEqual({ label: '返回高二物理 3 班', to: '/teacher/classes/physics-3?course=course-momentum' });
  });

  it('parses both route families and fails closed for malformed or unrelated routes', () => {
    expect(parseWorkBuddyWorkspaceRoute('/teacher/ai-agent/runs/run-1')).toMatchObject({ profileId: 'ideal-full' });
    expect(parseWorkBuddyWorkspaceRoute('/teacher/classes/physics-3/workbuddy/settings')).toEqual({
      profileId: 'classin-mvp', basePath: '/teacher/classes/physics-3/workbuddy', classId: 'physics-3',
    });
    expect(parseWorkBuddyWorkspaceRoute('/student/classes/physics-3/workbuddy')).toBeNull();
    expect(parseWorkBuddyWorkspaceRoute('/teacher/classes/%E0%A4%A/workbuddy')).toBeNull();
  });

  it('resolves launch context only from teacher-visible ClassIn facts', () => {
    expect(resolveClassMvpWorkBuddyExperience({
      classId: 'physics-3',
      courseId: 'course-momentum',
      classes: CLASS_RECORDS,
    })?.launchContext).toMatchObject({
      classId: 'physics-3',
      className: '高二物理 3 班',
      courseId: 'course-momentum',
    });
    expect(resolveClassMvpWorkBuddyExperience({ classId: 'missing', classes: CLASS_RECORDS })).toBeNull();
    expect(resolveClassMvpWorkBuddyExperience({
      classId: 'physics-3',
      courseId: 'unknown-course',
      classes: CLASS_RECORDS,
    })).toBeNull();
  });
});
