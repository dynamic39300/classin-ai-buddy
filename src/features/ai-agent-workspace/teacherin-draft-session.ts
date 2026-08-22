import type { TeacherInDraftReceipt } from '@domain/workbuddy/teacherin';

const STORAGE_KEY = 'workbuddy:teacherin-draft-receipts:v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isObjectRef(value: unknown): boolean {
  return isRecord(value) && typeof value.id === 'string' && typeof value.version === 'string';
}

function isReceipt(value: unknown): value is TeacherInDraftReceipt {
  if (!isRecord(value)
    || !['success', 'permission_denied', 'recoverable_failure'].includes(String(value.status))
    || typeof value.id !== 'string' || typeof value.actionId !== 'string' || typeof value.approvalId !== 'string'
    || typeof value.idempotencyKey !== 'string' || typeof value.executedAt !== 'string' || typeof value.result !== 'string'
    || value.truthLabel !== '[模拟] TeacherIn 草稿执行回执') return false;
  if (value.status === 'success') {
    return isRecord(value.draft) && value.draft.status === 'draft'
      && typeof value.draft.id === 'string' && typeof value.draft.title === 'string'
      && typeof value.draft.createdAt === 'string' && typeof value.draft.editorPath === 'string'
      && isObjectRef(value.draft.sourceArtifactRef)
      && isRecord(value.draft.sourceSpaceFileRef) && isObjectRef(value.draft.sourceSpaceFileRef)
      && typeof value.draft.sourceSpaceFileRef.pathLabel === 'string';
  }
  return isObjectRef(value.unexecutedArtifactRef)
    && (value.status === 'permission_denied'
      ? value.recovery === 'open-teacherin-permissions'
      : value.recovery === 'retry');
}

export function loadTeacherInDraftReceipts(): Readonly<Record<string, TeacherInDraftReceipt>> {
  if (typeof window === 'undefined') return {};
  try {
    const value: unknown = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? '{}');
    if (!isRecord(value) || !Object.values(value).every(isReceipt)) return {};
    return value as Readonly<Record<string, TeacherInDraftReceipt>>;
  } catch {
    return {};
  }
}

export function saveTeacherInDraftReceipts(receipts: Readonly<Record<string, TeacherInDraftReceipt>>): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(receipts));
}

export function clearTeacherInDraftReceipts(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}

