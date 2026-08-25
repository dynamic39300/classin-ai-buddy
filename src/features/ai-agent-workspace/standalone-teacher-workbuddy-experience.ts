import type { WorkBuddyTaskType } from '@domain/workbuddy/core-context';
import type { WorkBuddyCapabilityId, WorkBuddyExperienceProfile } from './workbuddy-experience-profile';

const STANDALONE_TASK_TYPES: readonly WorkBuddyTaskType[] = Object.freeze([
  'single-courseware',
  'course-package',
  'quiz-activity-creation',
]);

const STANDALONE_CAPABILITY_IDS: readonly WorkBuddyCapabilityId[] = Object.freeze([
  'skills',
  'tools',
  'content',
  'files',
  'schedules',
  'settings',
]);

export function createStandaloneTeacherWorkBuddyExperience(accountId?: string): WorkBuddyExperienceProfile {
  return Object.freeze({
    id: 'standalone-teacher',
    productBoundary: 'standalone-consumer',
    basePath: '/workbuddy/app',
    sessionNamespace: accountId ? `standalone-teacher:${accountId}` : 'standalone-teacher:anonymous',
    visibleTaskTypes: STANDALONE_TASK_TYPES,
    visibleCapabilityIds: STANDALONE_CAPABILITY_IDS,
    launchContext: null,
    returnTarget: Object.freeze({ label: '返回官网', to: '/workbuddy' }),
    search: '',
  });
}
