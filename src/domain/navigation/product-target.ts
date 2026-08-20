import type { AppRole } from '@domain/account/role';
import type { MessageCategory } from '@domain/message/message';

export type ProductTarget =
  | { kind: 'class'; classId: string; courseId?: string; unitId?: string; activityId?: string; source?: 'home' }
  | { kind: 'class-chat'; classId: string; source?: 'home' }
  | { kind: 'open-course'; openCourseId: string; source?: 'home' }
  | {
      kind: 'homework';
      homeworkId: string;
      source: 'home' | 'teacher_home' | 'teacher_schedule' | 'task_center' | 'class_unit' | 'student_home' | 'student_schedule' | 'notification' | 'growth';
    }
  | { kind: 'schedule-event'; eventId: string }
  | { kind: 'task'; taskId: string; source?: 'home' }
  | { kind: 'message'; category: MessageCategory; threadId?: string; source?: 'home' }
  | { kind: 'insight'; classId?: string; studentId?: string; section?: 'diagnosis' | 'students' | 'homework'; source?: 'home' }
  | { kind: 'growth'; recordId?: string }
  | { kind: 'space'; surface?: 'my-drive' | 'organization-drive' | 'resource-center' | 'question-bank' };

function withSearch(path: string, entries: ReadonlyArray<readonly [string, string | undefined]>): string {
  const search = new URLSearchParams();
  for (const [key, value] of entries) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export function resolveProductTarget(role: AppRole, target: ProductTarget): string | null {
  const base = role === 'teacher' ? '/teacher' : '/student';

  switch (target.kind) {
    case 'class':
      return withSearch(`${base}/classes/${encodeURIComponent(target.classId)}`, [
        ['course', target.courseId],
        ['unit', target.unitId],
        ['activity', target.activityId],
        ['from', target.source],
      ]);
    case 'class-chat':
      return withSearch(`${base}/classes/${encodeURIComponent(target.classId)}/chat`, [['from', target.source]]);
    case 'open-course':
      return role === 'teacher'
        ? withSearch(`${base}/open-courses`, [
            ['dialog', 'detail'],
            ['course', target.openCourseId],
            ['source', target.source],
          ])
        : withSearch(`${base}/open-courses`, [
            ['dialog', 'detail'],
            ['course', target.openCourseId],
            ['source', target.source],
          ]);
    case 'homework':
      return withSearch(`${base}/homework/${encodeURIComponent(target.homeworkId)}`, [['source', target.source]]);
    case 'schedule-event':
      return withSearch(`${base}/schedule`, [['event', target.eventId]]);
    case 'task':
      return withSearch(
        role === 'teacher'
          ? `/teacher/tasks/${encodeURIComponent(target.taskId)}`
          : `/student/todos/${encodeURIComponent(target.taskId)}`,
        [['from', target.source]],
      );
    case 'message':
      return withSearch(`${base}/messages`, [['category', target.category], ['thread', target.threadId], ['source', target.source]]);
    case 'insight':
      return role === 'teacher'
        ? withSearch('/teacher/insights', [['class', target.classId], ['student', target.studentId], ['section', target.section], ['source', target.source]])
        : null;
    case 'growth':
      return role === 'student-family'
        ? withSearch('/student/growth', [['record', target.recordId]])
        : null;
    case 'space':
      if (role !== 'teacher') return null;
      return target.surface ? `/teacher/space/${target.surface}` : '/teacher/space';
  }
}
