import { describe, expect, it } from 'vitest';
import {
  approveTeacherInDraft,
  getTeacherInDraftLink,
  isTeacherInDraftCurrent,
  proposeTeacherInDraft,
  type TeacherInDraftReceipt,
} from './teacherin';

const action = proposeTeacherInDraft({
  runRef: 'run-courseware',
  artifactRef: { id: 'asset-courseware-pptx', version: 'v2' },
  spaceFileRef: { id: 'space-file-courseware-pptx', version: 'v2', pathLabel: '我的云盘 / WorkBuddy 产物' },
  title: '函数单调性智能课件',
  permission: 'allowed',
  proposedAt: '2026-08-22T10:10:00+08:00',
});

describe('TeacherIn draft domain module', () => {
  it('derives a stable idempotency key from the Artifact version', () => {
    expect(action).toMatchObject({
      kind: 'create-teacherin-draft',
      status: 'proposed',
      idempotencyKey: 'teacherin-draft:asset-courseware-pptx:v2',
    });
  });

  it('records explicit teacher approval before execution', () => {
    const result = approveTeacherInDraft(action, {
      approvalId: 'approval-teacherin-1',
      decidedBy: 'teacher-wang',
      decidedAt: '2026-08-22T10:10:01+08:00',
    });
    expect(result?.action.status).toBe('approved');
    expect(result?.approval).toMatchObject({ actionId: action.id, decision: 'approved' });
    expect(result && approveTeacherInDraft(result.action, {
      approvalId: 'approval-duplicate', decidedBy: 'teacher-wang', decidedAt: '2026-08-22T10:10:02+08:00',
    })).toBeNull();
  });

  it('distinguishes a current draft link from a stale Artifact version', () => {
    const receipt: TeacherInDraftReceipt = {
      id: 'receipt-teacherin-1', actionId: action.id, approvalId: 'approval-teacherin-1',
      idempotencyKey: action.idempotencyKey, executedAt: '2026-08-22T10:10:02+08:00',
      truthLabel: '[模拟] TeacherIn 草稿执行回执', result: '已创建草稿', status: 'success',
      draft: {
        id: 'teacherin-draft-courseware-pptx', status: 'draft', title: action.title,
        sourceArtifactRef: action.artifactRef, sourceSpaceFileRef: action.spaceFileRef,
        createdAt: '2026-08-22T10:10:02+08:00', editorPath: '/teacher/space/teacherin?draft=teacherin-draft-courseware-pptx',
      },
    };
    expect(getTeacherInDraftLink(receipt)?.id).toBe('teacherin-draft-courseware-pptx');
    expect(isTeacherInDraftCurrent(receipt, action.artifactRef)).toBe(true);
    expect(isTeacherInDraftCurrent(receipt, { ...action.artifactRef, version: 'v3' })).toBe(false);
  });
});

