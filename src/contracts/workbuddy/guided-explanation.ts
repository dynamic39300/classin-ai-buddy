import type { GuidedExplanationApproval, GuidedExplanationArtifactRef, GuidedExplanationReceipt, PrepareGuidedExplanationInput, SendGuidedExplanationAction, prepareGuidedExplanation } from '@domain/workbuddy/guided-explanation';

export interface GuidedExplanationDistributionAdapter {
  executeGuidedExplanation(action: SendGuidedExplanationAction, approval: GuidedExplanationApproval, currentArtifactRef: GuidedExplanationArtifactRef): Promise<GuidedExplanationReceipt>;
}

export interface GuidedExplanationAdapter extends GuidedExplanationDistributionAdapter {
  generateGuidedExplanation(input: PrepareGuidedExplanationInput): Promise<ReturnType<typeof prepareGuidedExplanation>>;
}

export type GuidedExplanationScenario = 'success' | 'generation_failure' | 'permission_denied' | 'recoverable_failure' | 'evidence_mismatch';

export interface GuidedExplanationScenarioController {
  getScenario(): GuidedExplanationScenario;
  setScenario(scenario: GuidedExplanationScenario): void;
}
