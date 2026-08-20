export type TeachingQuickActionId =
  | 'attend-class'
  | 'prepare-class'
  | 'view-class-preparation'
  | 'view-class-report'
  | 'view-class-record'
  | 'watch-replay'
  | 'do-homework'
  | 'continue-homework'
  | 'view-submission'
  | 'correct-homework'
  | 'view-result'
  | 'review-submissions'
  | 'continue-review'
  | 'view-homework-data'
  | 'remind-submission'
  | 'manage-recording'
  | 'view-recording-data'
  | 'watch-recording'
  | 'continue-recording'
  | 'manage-open-course'
  | 'view-open-course'
  | 'view-open-course-report'
  | 'view-announcement'
  | 'participate'
  | 'answer'
  | 'check-in'
  | 'learn'
  | 'view'
  | 'read-aloud';

export type TeachingQuickActionKind =
  | 'operation-dialog'
  | 'placeholder-dialog'
  | 'confirm-dialog'
  | 'detail-dialog'
  | 'open-course-dialog';

export type TeachingQuickAction = {
  id: TeachingQuickActionId;
  label: string;
  priority: 'primary' | 'secondary';
  kind: TeachingQuickActionKind;
  feedback?: string;
  disabled?: boolean;
  hint?: string;
};

export type TeachingQuickActionSet = {
  primary: TeachingQuickAction;
  secondary?: TeachingQuickAction;
};

export function asPrimary(action: Omit<TeachingQuickAction, 'priority'>): TeachingQuickAction {
  return { ...action, priority: 'primary' };
}

export function asSecondary(action: Omit<TeachingQuickAction, 'priority'>): TeachingQuickAction {
  return { ...action, priority: 'secondary' };
}

export function isCompactTeachingActionLabel(label: string): boolean {
  return Array.from(label).length <= 4;
}
