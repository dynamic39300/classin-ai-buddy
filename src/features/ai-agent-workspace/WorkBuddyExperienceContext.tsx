import type { ReactNode } from 'react';
import type { WorkBuddyExperienceProfile } from './workbuddy-experience-profile';
import { WorkBuddyExperienceContext } from './workbuddy-experience-context';

export function WorkBuddyExperienceProvider({ children, profile }: Readonly<{
  children: ReactNode;
  profile: WorkBuddyExperienceProfile;
}>) {
  return <WorkBuddyExperienceContext.Provider value={profile}>{children}</WorkBuddyExperienceContext.Provider>;
}
