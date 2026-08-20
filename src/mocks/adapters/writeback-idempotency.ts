import type { PackageWritebackCandidate } from '@contracts/workbuddy/package-writeback';
import type { PackageApproval, PackageProposedAction } from '@domain/workbuddy/package-writeback';
import type { Approval, ProposedAction } from '@domain/workbuddy/writeback';

export type IdempotencyEntry<T> = Readonly<{ fingerprint: string; receipt: T }>;

export function assertCoursewareWritebackRequest(action: ProposedAction, approval: Approval): void {
  if (action.status !== 'approved' || approval.decision !== 'approved' || approval.actionId !== action.id) {
    throw new Error('ClassInWritebackAdapter requires an approved action and matching approval.');
  }
}

export function coursewareWritebackFingerprint(action: ProposedAction, approval: Approval): string {
  return JSON.stringify({ action, approval });
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
  return JSON.stringify({ action, approval, candidates });
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

export function cacheIdempotentReceipt<T>(
  entries: Map<string, IdempotencyEntry<T>>,
  key: string,
  fingerprint: string,
  receipt: T,
): T {
  entries.set(key, Object.freeze({ fingerprint, receipt }));
  return receipt;
}
