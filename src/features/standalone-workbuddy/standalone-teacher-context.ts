import { createContext, useContext } from 'react';
import type { AiCreditViewModel, MembershipPlan, MembershipPlanId } from '@domain/standalone-workbuddy/commerce';
import type { IdentityState, LoginResult, RegisterResult } from '@domain/standalone-workbuddy/identity';
import type {
  PersonalContentReceipt,
  PublishPersonalContentInput,
  PublishPersonalContentResult,
  TeacherInCompatibleContentPackage,
} from '@domain/standalone-workbuddy/content';
import type { WorkBuddyTaskAdmission } from '@features/ai-agent-workspace';

export type StandalonePersonalContent = Readonly<{
  accountId: string;
  list: () => readonly TeacherInCompatibleContentPackage[];
  receiptForArtifact: (artifactId: string) => PersonalContentReceipt | null;
  publish: (input: Omit<PublishPersonalContentInput, 'accountId'>) => PublishPersonalContentResult;
}>;

export type StandaloneTeacherExperience = Readonly<{
  identity: IdentityState;
  register: (input: Readonly<{ name: string; email: string; password: string }>) => RegisterResult;
  login: (input: Readonly<{ email: string; password: string }>) => LoginResult;
  logout: () => void;
  creditView: AiCreditViewModel | null;
  membershipPlans: readonly MembershipPlan[];
  purchasePlan: (planId: MembershipPlanId) => Readonly<{ ok: true; grantedCredits: number }> | Readonly<{ ok: false }>;
  taskAdmission: WorkBuddyTaskAdmission;
  personalContent: StandalonePersonalContent | null;
}>;

export const StandaloneTeacherContext = createContext<StandaloneTeacherExperience | null>(null);

export function useStandaloneTeacher(): StandaloneTeacherExperience {
  const value = useContext(StandaloneTeacherContext);
  if (!value) throw new Error('useStandaloneTeacher must be used inside StandaloneTeacherProvider');
  return value;
}
