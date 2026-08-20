import { describe, expect, it } from 'vitest';
import { getOtherRole, getRoleHomePath, isAppRole, parseAppRole } from './role';

describe('account role', () => {
  it('accepts only supported app roles', () => {
    expect(isAppRole('teacher')).toBe(true);
    expect(isAppRole('student-family')).toBe(true);
    expect(isAppRole('student')).toBe(false);
    expect(parseAppRole({ role: 'teacher' })).toBeNull();
  });

  it('maps the other role and home path', () => {
    expect(getOtherRole('teacher')).toBe('student-family');
    expect(getOtherRole('student-family')).toBe('teacher');
    expect(getRoleHomePath('teacher')).toBe('/teacher/home');
    expect(getRoleHomePath('student-family')).toBe('/student/home');
  });
});
