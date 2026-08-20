export const APP_ROLES = ['teacher', 'student-family'] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  teacher: '老师视角',
  'student-family': '学生视角',
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && APP_ROLES.some((role) => role === value);
}

export function parseAppRole(value: unknown): AppRole | null {
  return isAppRole(value) ? value : null;
}

export function getOtherRole(role: AppRole): AppRole {
  return role === 'teacher' ? 'student-family' : 'teacher';
}

export function getRoleHomePath(role: AppRole): string {
  return role === 'teacher' ? '/teacher/home' : '/student/home';
}
