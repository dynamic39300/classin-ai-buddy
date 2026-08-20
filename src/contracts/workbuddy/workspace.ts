import type { WorkBuddyRunState } from '@domain/workbuddy/run-state';

export type WorkBuddyRunStepViewModel = {
  title: string;
  summary: string;
  time: string;
  state: 'completed' | 'running' | 'waiting' | 'failed';
};

export type WorkBuddyArtifactViewModel = {
  title: string;
  version: string;
  progress: string;
  eyebrow: string;
  heading: string;
  summary: string;
  truthLabel: string;
};

export type WorkBuddyRunViewModel = {
  fixtureVersion: 'workbuddy-m3-v1' | 'workbuddy-m4-course-production-v1';
  id: string;
  title: string;
  relativeTime: string;
  runState: WorkBuddyRunState;
  pinned?: boolean;
  goal: string;
  contextLabels: readonly string[];
  steps: readonly WorkBuddyRunStepViewModel[];
  artifact: WorkBuddyArtifactViewModel;
};

export const WORKBUDDY_HISTORY_STATUS_LABELS: Record<WorkBuddyRunState['status'], string> = {
  running: '执行中',
  waiting: '待确认',
  completed: '已完成',
  failed: '可重试',
};
