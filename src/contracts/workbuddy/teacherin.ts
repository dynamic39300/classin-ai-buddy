import type {
  TeacherInDraftAction,
  TeacherInDraftApproval,
  TeacherInDraftReceipt,
  TeacherInResource,
} from '@domain/workbuddy/teacherin';

export interface TeacherInAdapter {
  searchResources(query: string): readonly TeacherInResource[];
  createDraft(action: TeacherInDraftAction, approval: TeacherInDraftApproval): TeacherInDraftReceipt;
}

export type TeacherInScenario = 'success' | 'permission_denied' | 'recoverable_failure';

export interface TeacherInScenarioController {
  setScenario(scenario: TeacherInScenario): void;
  getScenario(): TeacherInScenario;
}

