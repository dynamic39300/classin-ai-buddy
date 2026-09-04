import type { AppRole } from '@domain/account/role';
import type { ClassMember, ClassRecord } from '@domain/class/class';

export type CollaborationRole = Extract<AppRole, 'teacher' | 'student-family'>;
export type CollaborationSource = 'home' | 'classes';

export const CLASS_COLLABORATION_DEMO_NOW_ISO = '2026-08-09T12:00:00+08:00';

export function normalizeCollaborationSource(value: string | null): CollaborationSource {
  return value === 'home' ? 'home' : 'classes';
}

export function getRolePath(role: CollaborationRole): 'teacher' | 'student' {
  return role === 'teacher' ? 'teacher' : 'student';
}

export function getClassDetailPath(
  role: CollaborationRole,
  classId: string,
  source: CollaborationSource,
): string {
  const suffix = source === 'home' ? '?from=home' : '';
  return `/${getRolePath(role)}/classes/${classId}${suffix}`;
}

export function getClassListReturnPath(role: CollaborationRole, source: CollaborationSource): string {
  return source === 'home' ? `/${getRolePath(role)}/home` : `/${getRolePath(role)}/classes`;
}

export function getVisibleClass(
  records: ReadonlyArray<ClassRecord>,
  classId: string | undefined,
  role: CollaborationRole,
): ClassRecord | undefined {
  if (!classId) return undefined;
  return records.find((record) => (
    record.id === classId
    && record.visibleTo.includes(role)
    && record.roleByAppRole[role] !== undefined
  ));
}

export function getCurrentClassMember(record: ClassRecord, role: CollaborationRole): ClassMember | undefined {
  return record.members.find((member) => (
    member.leftAt === null
    && member.isCurrentUser === true
    && (role === 'teacher'
      ? member.role === 'headmaster' || member.role === 'teacher'
      : member.role === 'student-family')
  ));
}

export function withSource(path: string, source: CollaborationSource): string {
  return source === 'home' ? `${path}?from=home` : path;
}
