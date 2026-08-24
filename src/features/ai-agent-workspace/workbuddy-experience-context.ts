import { createContext, useContext } from 'react';
import { createIdealWorkBuddyExperience } from './ideal-workbuddy-experience';
import type { WorkBuddyExperienceProfile } from './workbuddy-experience-profile';

export const WorkBuddyExperienceContext = createContext<WorkBuddyExperienceProfile>(createIdealWorkBuddyExperience());

export function useWorkBuddyExperience(): WorkBuddyExperienceProfile {
  return useContext(WorkBuddyExperienceContext);
}
