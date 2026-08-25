import type { ReactNode } from 'react';
import { WorkBuddyTaskAdmissionContext, type WorkBuddyTaskAdmission } from './workbuddy-task-admission-context';

export function WorkBuddyTaskAdmissionProvider({ admission, children }: Readonly<{
  admission: WorkBuddyTaskAdmission | null;
  children: ReactNode;
}>) {
  return <WorkBuddyTaskAdmissionContext.Provider value={admission}>{children}</WorkBuddyTaskAdmissionContext.Provider>;
}
