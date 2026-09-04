import { createContext, useContext } from 'react';
import type {
  HomeworkReminderApproval,
  HomeworkReminderExecutionReceipt,
  HomeworkReminderPreparation,
} from '@domain/workbuddy/im-homework-reminder';
import type { WeeklyPreparationNoticePreparation } from '@domain/workbuddy/im-weekly-preparation-notice';
import { WORKBUDDY_IM_TASKS } from '@domain/workbuddy/im-task-catalog';
import type { WorkBuddyImRunProjection, WorkBuddyImTarget } from '@contracts/workbuddy/im-conversation-run';
import type { EvaluationEvent } from '@domain/workbuddy/evaluation';
import type { GuidedExplanationApproval, GuidedExplanationArtifact, GuidedExplanationReceipt, GuidedExplanationRevision, SendGuidedExplanationAction } from '@domain/workbuddy/guided-explanation';

export { WORKBUDDY_IM_TASKS };
export const WORKBUDDY_IM_REFERENCE_TASK = WORKBUDDY_IM_TASKS[0].prompt;
export const WORKBUDDY_IM_WEEKLY_PREPARATION_TASK = WORKBUDDY_IM_TASKS[1].prompt;
export const WORKBUDDY_IM_GUIDED_EXPLANATION_TASK = WORKBUDDY_IM_TASKS[2].prompt;
export const WORKBUDDY_IM_DIRECT_REFERENCE_TASK = '结合当前对话，帮我拟一条清晰、专业且简洁的回复。';

type ReadyHomeworkReminder = Extract<HomeworkReminderPreparation, { status: 'ready' }>;
type EmptyHomeworkReminder = Extract<HomeworkReminderPreparation, { status: 'empty' }>;
type ReadyWeeklyPreparation = Extract<WeeklyPreparationNoticePreparation, { status: 'ready' }>;
type EmptyWeeklyPreparation = Extract<WeeklyPreparationNoticePreparation, { status: 'empty' }>;
export type ReadyWorkBuddyImPreparation = ReadyHomeworkReminder | ReadyWeeklyPreparation;
export type EmptyWorkBuddyImPreparation = EmptyHomeworkReminder | EmptyWeeklyPreparation;

export type WorkBuddyDirectReplyDraft = Readonly<{
  body: string;
  goal: string;
  version: number;
  truthLabel: '[模拟] TeacherIn 私聊回复建议';
}>;

export type WorkBuddyImRunState =
  | Readonly<{ status: 'ready' }>
  | Readonly<{ status: 'generating' }>
  | Readonly<{ status: 'direct-draft-ready'; draft: WorkBuddyDirectReplyDraft }>
  | Readonly<{ status: 'explanation-needs-input'; message: string }>
  | Readonly<{ status: 'explanation-generation-failure'; message: string; goal: string }>
  | Readonly<{ status: 'explanation-draft-ready'; artifact: GuidedExplanationArtifact; action: SendGuidedExplanationAction }>
  | Readonly<{ status: 'explanation-sending'; artifact: GuidedExplanationArtifact; action: SendGuidedExplanationAction; approval: GuidedExplanationApproval }>
  | Readonly<{ status: 'explanation-sent'; artifact: GuidedExplanationArtifact; action: SendGuidedExplanationAction; approval: GuidedExplanationApproval; receipt: Extract<GuidedExplanationReceipt, { status: 'success' }>; evaluation: EvaluationEvent }>
  | Readonly<{
    status: 'explanation-failure';
    kind: 'permission_denied' | 'recoverable_failure' | 'evidence_mismatch';
    message: string;
    artifact: GuidedExplanationArtifact;
    action: SendGuidedExplanationAction;
    approval: GuidedExplanationApproval;
    receipt?: GuidedExplanationReceipt;
    evaluation?: EvaluationEvent;
  }>
  | Readonly<{ status: 'empty'; preparation: EmptyWorkBuddyImPreparation }>
  | Readonly<{ status: 'draft-ready'; preparation: ReadyWorkBuddyImPreparation }>
  | Readonly<{
    status: 'sending';
    preparation: ReadyWorkBuddyImPreparation;
    approval: HomeworkReminderApproval;
  }>
  | Readonly<{
    status: 'sent';
    preparation: ReadyWorkBuddyImPreparation;
    approval: HomeworkReminderApproval;
    receipt: Extract<HomeworkReminderExecutionReceipt, { status: 'success' }>;
    evaluation: EvaluationEvent;
  }>
  | Readonly<{
    status: 'failure';
    kind: 'read_failure' | 'stale_context' | 'permission_denied' | 'recoverable_failure' | 'approval_expired' | 'evidence_mismatch';
    message: string;
    preparation?: ReadyWorkBuddyImPreparation;
    receipt?: HomeworkReminderExecutionReceipt;
    evaluation?: EvaluationEvent;
  }>;

export type WorkBuddyImState = Readonly<{
  isOpen: boolean;
  target: WorkBuddyImTarget | null;
  run: WorkBuddyImRunState;
  conversation: WorkBuddyImRunProjection | null;
  composerDraft: string;
  receiptHistory: readonly (HomeworkReminderExecutionReceipt | GuidedExplanationReceipt)[];
  evaluationHistory: readonly EvaluationEvent[];
}>;

export type WorkBuddyImActions = Readonly<{
  open: (target: WorkBuddyImTarget) => void;
  close: () => void;
  editComposerDraft: (text: string) => void;
  generate: (goal: string) => Promise<void>;
  supplement: (text: string) => void;
  removeStudent: (homeworkId: string, studentId: string) => void;
  removeGroup: (homeworkId: string) => void;
  restoreChecklist: () => void;
  editBody: (body: string) => void;
  reviseExplanation: (revision: GuidedExplanationRevision) => void;
  retryExplanation: () => Promise<void>;
  approveAndSend: (body?: string) => Promise<void>;
}>;

export type WorkBuddyImStore = Readonly<{ state: WorkBuddyImState; actions: WorkBuddyImActions }>;

export const WorkBuddyImContext = createContext<WorkBuddyImStore | null>(null);

export function useOptionalWorkBuddyIm(): WorkBuddyImStore | null {
  return useContext(WorkBuddyImContext);
}

export function useWorkBuddyIm(): WorkBuddyImStore {
  const value = useOptionalWorkBuddyIm();
  if (!value) throw new Error('useWorkBuddyIm must be used within WorkBuddyImProvider');
  return value;
}
