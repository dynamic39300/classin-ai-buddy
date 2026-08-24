import type {
  HomeworkReminderApproval,
  HomeworkReminderExecutionReceipt,
  HomeworkReminderFacts,
  SendClassMessageProposedAction,
} from '@domain/workbuddy/im-homework-reminder';
import type { WeeklyPreparationNoticeFacts } from '@domain/workbuddy/im-weekly-preparation-notice';

export type HomeworkReminderQuery = Readonly<{
  classId: string;
  classLabel: string;
}>;

export interface ClassInHomeworkReminderAdapter {
  readFacts(query: HomeworkReminderQuery): Promise<HomeworkReminderFacts>;
  readWeeklyPreparationFacts(query: HomeworkReminderQuery): Promise<WeeklyPreparationNoticeFacts>;
  execute(
    action: SendClassMessageProposedAction,
    approval: HomeworkReminderApproval,
  ): Promise<HomeworkReminderExecutionReceipt>;
}

export type HomeworkReminderAdapterScenario =
  | 'success'
  | 'read_failure'
  | 'permission_denied'
  | 'stale_context'
  | 'recoverable_failure';

export interface HomeworkReminderAdapterScenarioController {
  getScenario(): HomeworkReminderAdapterScenario;
  setScenario(scenario: HomeworkReminderAdapterScenario): void;
}
