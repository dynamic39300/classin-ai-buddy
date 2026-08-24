import { AiAgentWorkspaceLayout, createIdealWorkBuddyExperience } from '@features/ai-agent-workspace';

const IDEAL_WORKBUDDY_EXPERIENCE = createIdealWorkBuddyExperience();

export function IdealWorkBuddyLayout() {
  return <AiAgentWorkspaceLayout profile={IDEAL_WORKBUDDY_EXPERIENCE} />;
}
