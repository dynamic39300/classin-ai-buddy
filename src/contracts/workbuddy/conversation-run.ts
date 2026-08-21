export type ConversationRunEventKind =
  | 'teacher_message'
  | 'goal_understood'
  | 'clarification_request'
  | 'clarification_submitted'
  | 'context_confirmed'
  | 'plan'
  | 'process'
  | 'capability_call'
  | 'artifact'
  | 'proposed_action'
  | 'approval'
  | 'receipt'
  | 'error'
  | 'system';

export type ConversationRunEventState = 'queued' | 'running' | 'requires_teacher_input' | 'completed' | 'failed' | 'cancelled' | 'superseded';
export type ConversationRunStatus = 'needs_information' | 'awaiting_plan_confirmation' | 'running' | 'completed_pending_review' | 'waiting_approval' | 'completed' | 'failed';
export type ConversationRunObjectType = 'context_snapshot' | 'artifact' | 'action' | 'approval' | 'receipt' | 'capability';

export type ConversationRunObjectRef = Readonly<{ type: ConversationRunObjectType; id: string; version?: string }>;

export type ConversationRunEvent = Readonly<{
  id: string;
  runRef: string;
  sequence: number;
  occurredAt: string;
  kind: ConversationRunEventKind;
  state: ConversationRunEventState;
  title: string;
  summary: string;
  objectRefs: readonly ConversationRunObjectRef[];
}>;

export type ConversationRunCommand = Readonly<{
  id: string;
  type: 'supplement';
  text: string;
}>;

export type ConversationRunCommandReceipt = Readonly<{
  commandId: string;
  status: 'accepted' | 'duplicate' | 'rejected';
  cursor: string;
  reason?: string;
}>;

export type ConversationRunProjection = Readonly<{
  runRef: string;
  title: string;
  goal: string;
  status: ConversationRunStatus;
  events: readonly ConversationRunEvent[];
  cursor: string;
  allowedCommands: readonly ConversationRunCommand['type'][];
}>;

export type ConversationRunListener = (events: readonly ConversationRunEvent[], projection: ConversationRunProjection) => void;

export interface ConversationRunModule {
  open(runRef: string): ConversationRunProjection | null;
  dispatch(runRef: string, command: ConversationRunCommand): ConversationRunCommandReceipt;
  subscribe(runRef: string, cursor: string | null, listener: ConversationRunListener): () => void;
}
