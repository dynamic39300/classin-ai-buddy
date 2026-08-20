import type { CoursePackageRun } from './course-package';

export type PackageProposedAction = Readonly<{
  id: string;
  kind: 'save-course-package-to-classin';
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

export type PackageActionInput = Omit<PackageProposedAction, 'kind' | 'status' | 'artifactRefs'>;

export function createPackageSaveAction(run: CoursePackageRun, input: PackageActionInput): PackageProposedAction | null {
  const artifactRefs = run.artifacts
    .filter(({ state }) => state === 'ready')
    .map(({ id, version }) => Object.freeze({ id, version }));
  if (!artifactRefs.length) return null;
  return Object.freeze({ ...input, kind: 'save-course-package-to-classin', status: 'proposed', artifactRefs: Object.freeze(artifactRefs) });
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
