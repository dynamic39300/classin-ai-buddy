import type {
  ConversationRunEvent,
  ConversationRunProgress,
  ConversationRunStatus,
} from './conversation-run';

export type WorkBuddyImTarget = Readonly<{
  kind?: 'class' | 'direct';
  classId: string;
  classLabel: string;
  threadId: string;
  memberCount?: number;
  recentMessages?: readonly Readonly<{ authorName: string; body: string }>[];
}>;

export type WorkBuddyImTaskId = 'homework-reminder' | 'weekly-preparation-notice';

export type WorkBuddyImRunPlanStep = Readonly<{
  id: string;
  title: string;
  capabilityId: string;
  capabilityLabel: string;
  purpose: string;
  inputSummary: string;
  expectedOutput: string;
  contextLabels: readonly string[];
}>;

export type WorkBuddyImRunProjection = Readonly<{
  runRef: string;
  taskId: WorkBuddyImTaskId;
  startedAt: number;
  title: string;
  goal: string;
  status: ConversationRunStatus;
  events: readonly ConversationRunEvent[];
  plan: readonly WorkBuddyImRunPlanStep[];
  progress: ConversationRunProgress;
  truthLabel: '[模拟] WorkBuddy IM Agent Run';
}>;

export interface WorkBuddyImExperienceScheduler {
  now(): number;
  wait(durationMs: number): Promise<void>;
}
