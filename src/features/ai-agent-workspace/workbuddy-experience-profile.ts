import type { WorkBuddyTaskType } from '@domain/workbuddy/core-context';
import { STANDALONE_TEACHERIN_ROUTES } from '@contracts/workbuddy/product-brand';
import type { WorkBuddyCapability } from './capability-registry';

export type WorkBuddyExperienceProfileId = 'ideal-full' | 'classin-mvp' | 'standalone-teacher';
export type WorkBuddyCapabilityId = WorkBuddyCapability['id'];

export type WorkBuddyLaunchContext = Readonly<{
  kind: 'class-detail';
  classId: string;
  className: string;
  courseId?: string;
  courseName?: string;
}>;

export type WorkBuddyExperienceProfile = Readonly<{
  id: WorkBuddyExperienceProfileId;
  productBoundary: 'classin-integrated' | 'standalone-consumer';
  basePath: string;
  sessionNamespace: string;
  visibleTaskTypes: readonly WorkBuddyTaskType[];
  visibleCapabilityIds: readonly WorkBuddyCapabilityId[];
  navigationCapabilityIds: readonly WorkBuddyCapabilityId[];
  launchContext: WorkBuddyLaunchContext | null;
  returnTarget: Readonly<{ label: string; to: string }> | null;
  search: string;
}>;

export type WorkBuddyWorkspaceRoute = Readonly<{
  profileId: WorkBuddyExperienceProfileId;
  basePath: string;
  classId: string | null;
}>;

export function parseWorkBuddyWorkspaceRoute(pathname: string): WorkBuddyWorkspaceRoute | null {
  if (pathname === STANDALONE_TEACHERIN_ROUTES.app || pathname.startsWith(`${STANDALONE_TEACHERIN_ROUTES.app}/`)) {
    return Object.freeze({ profileId: 'standalone-teacher', basePath: STANDALONE_TEACHERIN_ROUTES.app, classId: null });
  }
  if (pathname === '/teacher/ai-agent' || pathname.startsWith('/teacher/ai-agent/')) {
    return Object.freeze({ profileId: 'ideal-full', basePath: '/teacher/ai-agent', classId: null });
  }
  const match = pathname.match(/^\/teacher\/classes\/([^/]+)\/workbuddy(?:\/|$)/);
  if (!match?.[1]) return null;
  try {
    const classId = decodeURIComponent(match[1]);
    return Object.freeze({
      profileId: 'classin-mvp',
      basePath: `/teacher/classes/${encodeURIComponent(classId)}/workbuddy`,
      classId,
    });
  } catch {
    return null;
  }
}

export function workBuddyNewTaskPath(profile: WorkBuddyExperienceProfile): string {
  return `${profile.basePath}/new${profile.search}`;
}

export function workBuddyRunPath(profile: WorkBuddyExperienceProfile, runId: string): string {
  return `${profile.basePath}/runs/${encodeURIComponent(runId)}${profile.search}`;
}

export function workBuddyCapabilityPath(profile: WorkBuddyExperienceProfile, capabilityId: WorkBuddyCapabilityId): string {
  return `${profile.basePath}/${capabilityId}${profile.search}`;
}

export function profileAllowsTaskType(profile: WorkBuddyExperienceProfile, taskType: WorkBuddyTaskType): boolean {
  return profile.visibleTaskTypes.includes(taskType);
}

export function profileAllowsCapability(profile: WorkBuddyExperienceProfile, capabilityId: string): boolean {
  return profile.visibleCapabilityIds.some((visibleId) => visibleId === capabilityId);
}
