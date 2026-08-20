import { getPackageApprovableArtifactIds, type CoursePackageRun } from './course-package';
import { isActionExpired } from './action-time';

export type PackageProposedAction = Readonly<{
  id: string;
  kind: 'save-course-package-to-classin';
  runRef: string;
  contextSnapshotId: string;
  status: 'proposed' | 'approved' | 'rejected' | 'expired';
  artifactRefs: readonly Readonly<{ id: string; version: string }>[];
  target: Readonly<{ classId: string; courseId: string; unitId: string; expectedVersion: string; label: string }>;
  difference: string;
  impact: string;
  permission: 'allowed' | 'denied';
  risk: 'low' | 'medium' | 'high';
  reversible: boolean;
  expiresAt: string;
  idempotencyKey: string;
}>;

export type PackageApproval = Readonly<{
  id: string; actionId: string; decision: 'approved' | 'rejected'; decidedBy: string; decidedAt: string;
}>;

export type PackageActionInput = Omit<PackageProposedAction, 'kind' | 'status' | 'artifactRefs' | 'runRef' | 'contextSnapshotId'>;
export type PackageActionRenewal = Readonly<{ id: string; expiresAt: string; idempotencyKey: string }>;

export function createPackageSaveAction(run: CoursePackageRun, input: PackageActionInput): PackageProposedAction | null {
  if (!run.contextSnapshotId || (run.stage !== 'artifact_ready' && run.stage !== 'partial_success')) return null;
  const approvableIds = new Set(getPackageApprovableArtifactIds(run));
  const artifactRefs = run.artifacts
    .filter(({ id }) => approvableIds.has(id))
    .map(({ id, version }) => Object.freeze({ id, version }));
  if (!artifactRefs.length) return null;
  return Object.freeze({
    ...input,
    kind: 'save-course-package-to-classin',
    status: 'proposed',
    runRef: run.id,
    contextSnapshotId: run.contextSnapshotId,
    artifactRefs: Object.freeze(artifactRefs),
  });
}

export function renewPackageSaveAction(
  run: CoursePackageRun,
  action: PackageProposedAction,
  renewal: PackageActionRenewal,
): PackageProposedAction | null {
  return createPackageSaveAction(run, {
    ...renewal,
    target: action.target,
    difference: action.difference,
    impact: action.impact,
    permission: action.permission,
    risk: action.risk,
    reversible: action.reversible,
  });
}

export function decidePackageAction(
  action: PackageProposedAction,
  approval: Omit<PackageApproval, 'actionId' | 'decision'>,
  decision: PackageApproval['decision'],
): Readonly<{ action: PackageProposedAction; approval: PackageApproval }> | null {
  const current = expirePackageAction(action, approval.decidedAt);
  if (current.status !== 'proposed') return null;
  return Object.freeze({
    action: Object.freeze({ ...current, status: decision === 'approved' ? 'approved' : 'rejected' }),
    approval: Object.freeze({ ...approval, actionId: current.id, decision }),
  });
}

export function expirePackageAction(action: PackageProposedAction, at: string): PackageProposedAction {
  if (action.status === 'rejected' || action.status === 'expired') return action;
  return isActionExpired(action.expiresAt, at) ? Object.freeze({ ...action, status: 'expired' }) : action;
}
