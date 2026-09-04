import type { WorkBuddyTaskType } from '@domain/workbuddy/core-context';
import type { WorkBuddyCapabilityId, WorkBuddyExperienceProfile } from './workbuddy-experience-profile';

const IDEAL_TASK_TYPES: readonly WorkBuddyTaskType[] = Object.freeze([
  'single-courseware',
  'course-package',
  'quiz-activity-creation',
]);

const IDEAL_CAPABILITY_IDS: readonly WorkBuddyCapabilityId[] = Object.freeze([
  'agentin',
  'skills',
  'tools',
  'content',
  'files',
  'schedules',
]);

const IDEAL_NAVIGATION_CAPABILITY_IDS: readonly WorkBuddyCapabilityId[] = Object.freeze([
  'skills',
  'agentin',
  'files',
]);

export function createIdealWorkBuddyExperience(): WorkBuddyExperienceProfile {
  return Object.freeze({
    id: 'ideal-full',
    productBoundary: 'classin-integrated',
    basePath: '/teacher/ai-agent',
    sessionNamespace: 'ideal-full',
    visibleTaskTypes: IDEAL_TASK_TYPES,
    visibleCapabilityIds: IDEAL_CAPABILITY_IDS,
    navigationCapabilityIds: IDEAL_NAVIGATION_CAPABILITY_IDS,
    launchContext: null,
    returnTarget: null,
    search: '',
  });
}
