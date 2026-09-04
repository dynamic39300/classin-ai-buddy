import type {
  CreateQuizActivityDraftAction,
  QuizActivityDraftApproval,
  QuizActivityDraftReceipt,
  QuizActivityTarget,
} from '@domain/workbuddy/quiz-activity-creation';

export type QuizActivityDraftScenario = 'success' | 'permission_denied' | 'version_conflict' | 'recoverable_failure' | 'timeout';

export interface QuizActivityDraftAdapter {
  execute(action: CreateQuizActivityDraftAction, approval: QuizActivityDraftApproval): QuizActivityDraftReceipt;
}

export type QuizActivityDraftTargetSnapshot = Readonly<{
  classId: string;
  courseId: string;
  unitId: string;
  version: string;
  canCreateDraft: boolean;
}>;

export interface QuizActivityDraftTargetReader {
  read(target: QuizActivityTarget): QuizActivityDraftTargetSnapshot | null;
}

export interface QuizActivityDraftScenarioController {
  setScenario(scenario: QuizActivityDraftScenario): void;
  getScenario(): QuizActivityDraftScenario;
  reset(): void;
}
