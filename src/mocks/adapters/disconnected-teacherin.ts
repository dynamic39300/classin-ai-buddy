import type { TeacherInAdapter } from '@contracts/workbuddy/teacherin';
import type { TeacherInDraftAction, TeacherInDraftApproval, TeacherInDraftReceipt, TeacherInResource } from '@domain/workbuddy/teacherin';

/** Standalone product Adapter: TeacherIn is not connected and exposes no business objects. */
export class DisconnectedTeacherInAdapter implements TeacherInAdapter {
  searchResources(): readonly TeacherInResource[] {
    return Object.freeze([]);
  }

  createDraft(action: TeacherInDraftAction, approval: TeacherInDraftApproval): TeacherInDraftReceipt {
    if (action.status !== 'approved' || approval.actionId !== action.id || approval.decision !== 'approved') {
      throw new Error('TeacherIn evidence does not match the disconnected write request.');
    }
    return Object.freeze({
      id: action.id.replace(/^action-/, 'receipt-'),
      actionId: action.id,
      approvalId: approval.id,
      idempotencyKey: action.idempotencyKey,
      executedAt: '2026-08-25T10:40:00+08:00',
      truthLabel: '[模拟] TeacherIn 草稿执行回执',
      status: 'permission_denied',
      recovery: 'open-teacherin-permissions',
      unexecutedArtifactRef: action.artifactRef,
      result: '当前独立账号尚未连接 ClassIn，未读取或写入 TeacherIn。',
    });
  }
}
