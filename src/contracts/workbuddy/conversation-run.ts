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

export type ConversationRunActor = 'teacher' | 'agent' | 'system';

export type ConversationRunEventState = 'queued' | 'running' | 'requires_teacher_input' | 'completed' | 'failed' | 'cancelled' | 'superseded';
export type ConversationRunStatus = 'organizing' | 'needs_information' | 'awaiting_plan_confirmation' | 'running' | 'stopped' | 'completed_pending_review' | 'waiting_approval' | 'completed' | 'failed';
export type ConversationRunObjectType = 'context_snapshot' | 'artifact' | 'action' | 'approval' | 'receipt' | 'capability';

export type ConversationRunObjectRef = Readonly<{ type: ConversationRunObjectType; id: string; version?: string }>;

export type ConversationRunEventDetail = Readonly<{
  capabilityLabel: string;
  purpose: string;
  inputSummary: string;
  outputSummary: string;
  elapsedLabel: string;
  contextLabels: readonly string[];
  excludedSensitiveCount: number;
}>;

export type ConversationRunEvent = Readonly<{
  id: string;
  runRef: string;
  sequence: number;
  occurredAt: string;
  updatedAt: string;
  actor: ConversationRunActor;
  kind: ConversationRunEventKind;
  state: ConversationRunEventState;
  title: string;
  summary: string;
  stepRef?: string;
  objectRefs: readonly ConversationRunObjectRef[];
  allowedCommands: readonly ConversationRunCommandType[];
  detail?: ConversationRunEventDetail;
}>;

export type ConversationRunInspectorMode = 'context' | 'output';

export type ConversationRunProgress =
  | Readonly<{ status: 'organizing' }>
  | Readonly<{ status: 'idle' }>
  | Readonly<{ status: 'running'; activeIndex: number; completedCount: number; totalCount: number }>
  | Readonly<{ status: 'stopped'; completedCount: number; totalCount: number }>
  | Readonly<{ status: 'completed'; completedCount: number; totalCount: number }>;

export type ConversationRunPresentation = Readonly<{
  inspectorOpen: boolean;
  inspectorMode: ConversationRunInspectorMode;
  outputCount: number;
  unreadOutputCount: number;
  composerDraft: string;
  progress: ConversationRunProgress;
  executingAction: boolean;
  replanPending: boolean;
  contextExpandedIds: readonly string[] | null;
  contextQuery: string;
  contextScrollTop: number;
  artifactFocused: boolean;
  artifactEditing: boolean;
  artifactEditDraft: string;
  artifactSelectedBlock: string;
  artifactPreviewPage: number;
  artifactScrollTop: number;
  packageEditingArtifactId: string | null;
  packageEditDraft: string;
}>;

export type ConversationRunCommandInput =
  | Readonly<{ type: 'submit_clarification'; durationMinutes: number; teachingApproach: string }>
  | Readonly<{ type: 'confirm_clarification' }>
  | Readonly<{ type: 'revise_plan' }>
  | Readonly<{ type: 'start_plan' }>
  | Readonly<{ type: 'complete_generation' }>
  | Readonly<{ type: 'cancel' }>
  | Readonly<{ type: 'stop' }>
  | Readonly<{ type: 'resume' }>
  | Readonly<{ type: 'supplement'; text: string; materialScopeChange?: boolean }>
  | Readonly<{ type: 'confirm_replan' }>
  | Readonly<{ type: 'dismiss_replan' }>
  | Readonly<{ type: 'approve_artifact' }>
  | Readonly<{ type: 'revise_artifact'; instruction: string; changes: readonly string[] }>
  | Readonly<{ type: 'propose_action' }>
  | Readonly<{ type: 'approve_action' }>
  | Readonly<{ type: 'reject_action' }>
  | Readonly<{ type: 'execute_action' }>
  | Readonly<{ type: 'recover_action' }>
  | Readonly<{ type: 'derive_package' }>
  | Readonly<{ type: 'begin_package' }>
  | Readonly<{ type: 'set_package_item_included'; artifactId: string; included: boolean }>
  | Readonly<{ type: 'revise_package_artifact'; artifactId: string; instruction: string }>
  | Readonly<{ type: 'select_package_artifact'; artifactId: string }>
  | Readonly<{ type: 'retry_failed' }>
  | Readonly<{ type: 'set_scenario'; scenario: 'success' | 'permission_denied' | 'version_conflict' | 'recoverable_failure' | 'timeout' | 'partial_success' }>
  | Readonly<{ type: 'set_inspector'; open?: boolean; mode?: ConversationRunInspectorMode }>
  | Readonly<{ type: 'set_context_inspector_state'; expandedIds?: readonly string[]; query?: string; scrollTop?: number }>
  | Readonly<{ type: 'set_artifact_inspector_state'; focused?: boolean; editing?: boolean; editDraft?: string; selectedBlock?: string; previewPage?: number; scrollTop?: number; packageEditingArtifactId?: string | null; packageEditDraft?: string }>
  | Readonly<{ type: 'set_composer_draft'; text: string }>
  | Readonly<{ type: 'reset' }>;

export type ConversationRunCommandType = ConversationRunCommandInput['type'];
export type ConversationRunCommand = ConversationRunCommandInput & Readonly<{ id: string }>;

export type ConversationRunCommandReceipt = Readonly<{
  commandId: string;
  status: 'accepted' | 'duplicate' | 'rejected';
  cursor: string;
  reason?: string;
  resultRef?: string;
}>;

export type ConversationRunProjection = Readonly<{
  runRef: string;
  taskKind: 'courseware' | 'course_package';
  title: string;
  goal: string;
  status: ConversationRunStatus;
  events: readonly ConversationRunEvent[];
  cursor: string;
  allowedCommands: readonly ConversationRunCommandType[];
  presentation: ConversationRunPresentation;
}>;

export type ConversationRunListener = (events: readonly ConversationRunEvent[], projection: ConversationRunProjection) => void;

export interface ConversationRunModule {
  open(runRef: string): ConversationRunProjection | null;
  nextCommandId(runRef: string): string;
  dispatch(runRef: string, command: ConversationRunCommand): ConversationRunCommandReceipt;
  subscribe(runRef: string, cursor: string | null, listener: ConversationRunListener): () => void;
}
