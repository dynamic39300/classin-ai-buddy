import { describe, expect, it } from 'vitest';
import { getOpenCourseSource } from './open-course-view';

describe('open course source parsing', () => {
  it('preserves Home as the source for current and legacy deep links', () => {
    expect(getOpenCourseSource(new URLSearchParams('source=home'))).toBe('home');
    expect(getOpenCourseSource(new URLSearchParams('from=home'))).toBe('home');
  });

  it('defaults unknown or absent sources to the open-course list', () => {
    expect(getOpenCourseSource(new URLSearchParams())).toBe('list');
    expect(getOpenCourseSource(new URLSearchParams('source=schedule'))).toBe('list');
  });
});
