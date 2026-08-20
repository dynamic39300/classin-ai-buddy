import type { PackageWritebackCandidate } from '@contracts/workbuddy/package-writeback';
import type { PackageApproval, PackageProposedAction } from '@domain/workbuddy/package-writeback';
import type { Approval, ProposedAction } from '@domain/workbuddy/writeback';

export type IdempotencyEntry<T> = Readonly<{ fingerprint: string; receipt?: T }>;

export function assertCoursewareWritebackRequest(action: ProposedAction, approval: Approval): void {
  if (action.status !== 'approved' || approval.decision !== 'approved' || approval.actionId !== action.id) {
    throw new Error('ClassInWritebackAdapter requires an approved action and matching approval.');
  }
}

export function coursewareWritebackFingerprint(action: ProposedAction, approval: Approval): string {
  return JSON.stringify({
    action: {
      id: action.id, kind: action.kind, runRef: action.runRef, contextSnapshotId: action.contextSnapshotId, status: action.status,
      artifactRef: { id: action.artifactRef.id, version: action.artifactRef.version },
      target: {
        classId: action.target.classId, courseId: action.target.courseId, unitId: action.target.unitId,
        expectedVersion: action.target.expectedVersion, label: action.target.label,
      },
      difference: action.difference, impact: action.impact, permission: action.permission, risk: action.risk,
      reversible: action.reversible, expiresAt: action.expiresAt, idempotencyKey: action.idempotencyKey,
    },
    approval: {
      id: approval.id, actionId: approval.actionId, decision: approval.decision,
      decidedBy: approval.decidedBy, decidedAt: approval.decidedAt,
    },
  });
}

export function assertPackageWritebackRequest(
  action: PackageProposedAction,
  approval: PackageApproval,
  candidates: readonly PackageWritebackCandidate[],
): void {
  if (action.status !== 'approved' || approval.decision !== 'approved' || approval.actionId !== action.id) {
    throw new Error('PackageWritebackAdapter requires an approved action and matching approval.');
  }
  const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  if (candidates.some((candidate) => candidate.runRef !== action.runRef || candidate.contextSnapshotId !== action.contextSnapshotId)) {
    throw new Error('PackageWritebackAdapter rejected candidates owned by another run or context snapshot.');
  }
  const actionMatchesCandidates = action.artifactRefs.every((reference) => {
    const candidate = candidatesById.get(reference.id);
    return candidate?.version === reference.version
      && candidate.runRef === action.runRef
      && candidate.contextSnapshotId === action.contextSnapshotId
      && candidate.approvalState === 'approved';
  });
  const approvedCount = candidates.filter(({ approvalState }) => approvalState === 'approved').length;
  if (!actionMatchesCandidates || approvedCount !== action.artifactRefs.length) {
    throw new Error('PackageWritebackAdapter rejected stale or unapproved artifact references.');
  }
}

export function packageWritebackFingerprint(
  action: PackageProposedAction,
  approval: PackageApproval,
  candidates: readonly PackageWritebackCandidate[],
): string {
  const artifactRefs = [...action.artifactRefs]
    .map(({ id, version }) => ({ id, version }))
    .sort((left, right) => left.id.localeCompare(right.id) || left.version.localeCompare(right.version));
  const canonicalCandidates = [...candidates]
    .map(({ id, kind, version, runRef, contextSnapshotId, approvalState }) => ({ id, kind, version, runRef, contextSnapshotId, approvalState }))
    .sort((left, right) => left.id.localeCompare(right.id));
  return JSON.stringify({
    action: {
      id: action.id, kind: action.kind, runRef: action.runRef, contextSnapshotId: action.contextSnapshotId, status: action.status,
      artifactRefs,
      target: {
        classId: action.target.classId, courseId: action.target.courseId, unitId: action.target.unitId,
        expectedVersion: action.target.expectedVersion, label: action.target.label,
      },
      difference: action.difference, impact: action.impact, permission: action.permission, risk: action.risk,
      reversible: action.reversible, expiresAt: action.expiresAt, idempotencyKey: action.idempotencyKey,
    },
    approval: {
      id: approval.id, actionId: approval.actionId, decision: approval.decision,
      decidedBy: approval.decidedBy, decidedAt: approval.decidedAt,
    },
    candidates: canonicalCandidates,
  });
}

export function readIdempotentReceipt<T>(
  entries: ReadonlyMap<string, IdempotencyEntry<T>>,
  key: string,
  fingerprint: string,
): T | undefined {
  const existing = entries.get(key);
  if (!existing) return undefined;
  if (existing.fingerprint !== fingerprint) throw new Error('Idempotency key was reused for a different writeback request.');
  return existing.receipt;
}

export function bindIdempotencyKey<T>(
  entries: Map<string, IdempotencyEntry<T>>,
  key: string,
  fingerprint: string,
): void {
  const existing = entries.get(key);
  if (existing && existing.fingerprint !== fingerprint) throw new Error('Idempotency key was reused for a different writeback request.');
  if (!existing) entries.set(key, Object.freeze({ fingerprint }));
}

export function cacheIdempotentReceipt<T>(
  entries: Map<string, IdempotencyEntry<T>>,
  key: string,
  fingerprint: string,
  receipt: T,
): T {
  bindIdempotencyKey(entries, key, fingerprint);
  entries.set(key, Object.freeze({ fingerprint, receipt }));
  return receipt;
}
