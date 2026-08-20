import type { ContextProjection } from '@domain/workbuddy/core-context';
import type { SingleCoursewareRun } from '@domain/workbuddy/course-production';
import type { CoursePackageRun, PackageExecutionReceipt } from '@domain/workbuddy/course-package';
import type { PackageProposedAction } from '@domain/workbuddy/package-writeback';
import type { ExecutionReceipt, ProposedAction } from '@domain/workbuddy/writeback';

type CoursewarePresentation = Readonly<{
  id: string; title: string; goal: string; contextSnapshotId: string; stage: SingleCoursewareRun['stage'];
  brief: SingleCoursewareRun['brief']; plan: SingleCoursewareRun['plan']; events: SingleCoursewareRun['events'];
  artifact: SingleCoursewareRun['artifact']; revision: number; supersededEvidence: SingleCoursewareRun['supersededEvidence'];
}>;
type PackagePresentation = Readonly<{
  id: string; title: string; goal: string; contextSnapshotId: string | null; stage: CoursePackageRun['stage'];
  artifacts: CoursePackageRun['artifacts']; parentRunRef?: string; sourceArtifactRef?: CoursePackageRun['sourceArtifactRef'];
}>;
type CoursewareActionPresentation = Pick<ProposedAction, 'id' | 'status' | 'artifactRef' | 'target' | 'difference' | 'impact' | 'risk' | 'reversible' | 'expiresAt' | 'idempotencyKey'>;
type PackageActionPresentation = Pick<PackageProposedAction, 'id' | 'status' | 'artifactRefs' | 'target' | 'difference' | 'impact' | 'risk' | 'reversible' | 'expiresAt' | 'idempotencyKey'>;
type CoursewareReceiptPresentation =
  | Readonly<{
    id: string; actionId: string; approvalId: string; idempotencyKey: string; executedAt: string;
    status: 'success'; result: string; object: Readonly<{ id: string; version: string; label: string; returnUrl: string }>;
  }>
  | Readonly<{
    id: string; actionId: string; approvalId: string; idempotencyKey: string; executedAt: string;
    status: 'permission_denied' | 'version_conflict' | 'recoverable_failure' | 'timeout'; result: string;
    recovery: 'choose-another-target' | 'compare-and-reconfirm' | 'retry'; unexecutedTarget: string;
    expectedVersion?: string; currentVersion?: string;
  }>;
type PackageReceiptPresentation = Readonly<{
  id: string; actionId: string; approvalId: string; idempotencyKey: string; status: PackageExecutionReceipt['status'];
  items: PackageExecutionReceipt['items']; truthLabel: string; recovery?: PackageExecutionReceipt['recovery']; result: string;
}>;

export type CoursewareRunView = Readonly<{
  run: CoursewarePresentation;
  projections: readonly ContextProjection[];
  action: CoursewareActionPresentation | null;
  receipt: CoursewareReceiptPresentation | null;
}>;

export type PackageRunView = Readonly<{
  run: PackagePresentation;
  action: PackageActionPresentation | null;
  receipt: PackageReceiptPresentation | null;
  contextConfirmed: boolean;
}>;

export function projectCoursewareRunView(
  run: SingleCoursewareRun | null,
  projections: readonly ContextProjection[],
  action: ProposedAction | null,
  receipt: ExecutionReceipt | null,
): CoursewareRunView | null {
  if (!run) return null;
  return Object.freeze({
    run: Object.freeze({
      id: run.id, title: run.title, goal: run.goal, contextSnapshotId: run.contextSnapshotId, stage: run.stage,
      brief: run.brief, plan: run.plan, events: run.events, artifact: run.artifact, revision: run.revision,
      supersededEvidence: run.supersededEvidence,
    }),
    projections,
    action: action ? Object.freeze({
      id: action.id, status: action.status, artifactRef: action.artifactRef, target: action.target,
      difference: action.difference, impact: action.impact, risk: action.risk, reversible: action.reversible,
      expiresAt: action.expiresAt, idempotencyKey: action.idempotencyKey,
    }) : null,
    receipt: receipt ? Object.freeze({ ...receipt }) : null,
  });
}

export function projectPackageRunView(
  run: CoursePackageRun | null,
  action: PackageProposedAction | null,
  receipt: PackageExecutionReceipt | null,
): PackageRunView | null {
  if (!run) return null;
  return Object.freeze({
    run: Object.freeze({
      id: run.id, title: run.title, goal: run.goal, contextSnapshotId: run.contextSnapshotId, stage: run.stage,
      artifacts: run.artifacts, parentRunRef: run.parentRunRef, sourceArtifactRef: run.sourceArtifactRef,
    }),
    action: action ? Object.freeze({
      id: action.id, status: action.status, artifactRefs: action.artifactRefs, target: action.target,
      difference: action.difference, impact: action.impact, risk: action.risk, reversible: action.reversible,
      expiresAt: action.expiresAt, idempotencyKey: action.idempotencyKey,
    }) : null,
    receipt: receipt ? Object.freeze({ ...receipt }) : null,
    contextConfirmed: run.contextSnapshotId !== null,
  });
}
