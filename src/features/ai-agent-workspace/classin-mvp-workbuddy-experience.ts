import type { ClassRecord } from '@domain/class/class';
import type { WorkBuddyTaskType } from '@domain/workbuddy/core-context';
import type { WorkBuddyCapabilityId, WorkBuddyExperienceProfile } from './workbuddy-experience-profile';

const CLASSIN_MVP_TASK_TYPES: readonly WorkBuddyTaskType[] = Object.freeze([
  'single-courseware',
  'course-package',
  'quiz-activity-creation',
]);

const CLASSIN_MVP_CAPABILITY_IDS: readonly WorkBuddyCapabilityId[] = Object.freeze([
  'skills',
  'tools',
  'files',
]);

function safeSearch(courseId?: string): string {
  return courseId ? `?course=${encodeURIComponent(courseId)}` : '';
}

export function createClassMvpWorkBuddyExperience(input: Readonly<{
  classId: string;
  className: string;
  courseId?: string;
  courseName?: string;
}>): WorkBuddyExperienceProfile {
  const search = safeSearch(input.courseId);
  return Object.freeze({
    id: 'classin-mvp',
    productBoundary: 'classin-integrated',
    basePath: `/teacher/classes/${encodeURIComponent(input.classId)}/workbuddy`,
    sessionNamespace: 'classin-mvp',
    visibleTaskTypes: CLASSIN_MVP_TASK_TYPES,
    visibleCapabilityIds: CLASSIN_MVP_CAPABILITY_IDS,
    launchContext: Object.freeze({ kind: 'class-detail', ...input }),
    returnTarget: Object.freeze({
      label: `返回${input.className}`,
      to: `/teacher/classes/${encodeURIComponent(input.classId)}${search}`,
    }),
    search,
  });
}

export function resolveClassMvpWorkBuddyExperience(input: Readonly<{
  classId: string | undefined;
  courseId?: string;
  classes: readonly ClassRecord[];
}>): WorkBuddyExperienceProfile | null {
  const selectedClass = input.classes.find((record) => (
    record.id === input.classId && record.visibleTo.includes('teacher')
  ));
  if (!selectedClass) return null;
  const course = input.courseId
    ? selectedClass.courses.find(({ id }) => id === input.courseId)
    : undefined;
  if (input.courseId && !course) return null;
  return createClassMvpWorkBuddyExperience({
    classId: selectedClass.id,
    className: selectedClass.name,
    courseId: course?.id,
    courseName: course?.name,
  });
}
