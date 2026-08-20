import { getPackageApprovableArtifactIds, type CoursePackageRun } from './course-package';

export type PackageProposedAction = Readonly<{
  id: string;
  kind: 'save-course-package-to-classin';
  runRef: string;
  contextSnapshotId: string;
  status: 'proposed' | 'approved' | 'rejected';
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

export function decidePackageAction(
  action: PackageProposedAction,
  approval: Omit<PackageApproval, 'actionId' | 'decision'>,
  decision: PackageApproval['decision'],
): Readonly<{ action: PackageProposedAction; approval: PackageApproval }> | null {
  if (action.status !== 'proposed') return null;
  return Object.freeze({
    action: Object.freeze({ ...action, status: decision === 'approved' ? 'approved' : 'rejected' }),
    approval: Object.freeze({ ...approval, actionId: action.id, decision }),
  });
}
