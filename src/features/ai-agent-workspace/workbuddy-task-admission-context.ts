import { createContext, useContext } from 'react';
import type { WorkBuddyTaskType } from '@domain/workbuddy/core-context';

export type WorkBuddyTaskAdmission = Readonly<{
  quote: (taskType: WorkBuddyTaskType) => Readonly<{ label: string; amount: number }> | null;
  start: (input: Readonly<{
    taskType: WorkBuddyTaskType;
    goal: string;
    createRun: () => string | null;
  }>) =>
    | Readonly<{ ok: true; runId: string }>
    | Readonly<{ ok: false; reason: 'insufficient_credits' | 'run_not_created' | 'evidence_mismatch' }>;
}>;

export const WorkBuddyTaskAdmissionContext = createContext<WorkBuddyTaskAdmission | null>(null);

export function useWorkBuddyTaskAdmission(): WorkBuddyTaskAdmission | null {
  return useContext(WorkBuddyTaskAdmissionContext);
}
