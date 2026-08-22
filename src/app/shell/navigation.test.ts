import { describe, expect, it } from 'vitest';
import { findActiveNavigationItem, getNavigation, isNavigationGroupActive } from './navigation';

describe('teacher navigation architecture', () => {
  it('keeps Home independent and exposes class management as a non-navigable group', () => {
    const navigation = getNavigation('teacher');

    expect(navigation.map(({ id }) => id)).toEqual([
      'teacher-home',
      'teacher-ai-agent',
      'teacher-class-management',
      'teacher-schedule',
      'teacher-tasks',
      'teacher-insights',
      'teacher-space',
      'teacher-messages',
      'teacher-blackboard',
      'teacher-casting',
    ]);

    const classManagement = navigation.find(({ id }) => id === 'teacher-class-management');
    expect(classManagement).toMatchObject({
      kind: 'collapsible',
      id: 'teacher-class-management',
      label: '班课管理',
    });

    if (!classManagement || classManagement.kind !== 'collapsible') throw new Error('Expected a collapsible navigation group.');
    expect(classManagement).not.toHaveProperty('to');
    expect(classManagement.children.map(({ label, to }) => ({ label, to }))).toEqual([
      { label: '我的班级', to: '/teacher/classes' },
      { label: '公开课', to: '/teacher/open-courses' },
    ]);
  });

  it('exposes Work Buddy only in the teacher tree and keeps every nested route active', () => {
    expect(getNavigation('teacher').find(({ id }) => id === 'teacher-ai-agent')).toMatchObject({ label: 'Work Buddy' });
    expect(findActiveNavigationItem('teacher', '/teacher/ai-agent/new')?.id).toBe('teacher-ai-agent');
    expect(findActiveNavigationItem('teacher', '/teacher/ai-agent/runs/run-courseware')?.id).toBe('teacher-ai-agent');
    expect(getNavigation('student-family').some(({ id }) => id.includes('ai-agent'))).toBe(false);
  });

  it.each([
    ['/teacher/classes', 'teacher-classes'],
    ['/teacher/classes/physics-3/settings', 'teacher-classes'],
    ['/teacher/open-courses', 'teacher-open-courses'],
    ['/teacher/open-courses/open-reading/edit', 'teacher-open-courses'],
  ])('resolves %s to its active child', (pathname, expectedId) => {
    expect(findActiveNavigationItem('teacher', pathname)?.id).toBe(expectedId);
    expect(isNavigationGroupActive('teacher', 'teacher-class-management', pathname)).toBe(true);
  });

  it('does not mark class management active for unrelated teacher routes', () => {
    expect(isNavigationGroupActive('teacher', 'teacher-class-management', '/teacher/home')).toBe(false);
    expect(isNavigationGroupActive('teacher', 'teacher-class-management', '/teacher/tasks')).toBe(false);
  });

  it('gives student/family the same class-management and instant-tool entry structure', () => {
    expect(getNavigation('student-family').map(({ id }) => id)).toEqual([
      'student-home',
      'student-class-management',
      'student-schedule',
      'student-todos',
      'student-growth',
      'student-messages',
      'student-blackboard',
      'student-casting',
    ]);

    const classManagement = getNavigation('student-family').find(({ id }) => id === 'student-class-management');
    expect(classManagement).toMatchObject({ kind: 'collapsible', label: '班课管理' });
    if (!classManagement || classManagement.kind !== 'collapsible') throw new Error('Expected a collapsible navigation group.');
    expect(classManagement.children.map(({ label, to }) => ({ label, to }))).toEqual([
      { label: '我的班级', to: '/student/classes' },
      { label: '公开课', to: '/student/open-courses' },
    ]);
  });

  it.each([
    ['/student/classes', 'student-classes'],
    ['/student/classes/physics-3/members', 'student-classes'],
    ['/student/open-courses', 'student-open-courses'],
    ['/student/open-courses/open-reading/preflight', 'student-open-courses'],
  ])('resolves student route %s to its active class-management child', (pathname, expectedId) => {
    expect(findActiveNavigationItem('student-family', pathname)?.id).toBe(expectedId);
    expect(isNavigationGroupActive('student-family', 'student-class-management', pathname)).toBe(true);
  });
});
