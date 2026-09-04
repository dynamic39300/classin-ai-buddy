import type { TeacherInAdapter, TeacherInScenario, TeacherInScenarioController } from '@contracts/workbuddy/teacherin';
import type { TeacherInDraftAction, TeacherInDraftApproval, TeacherInDraftReceipt, TeacherInResource } from '@domain/workbuddy/teacherin';
import { TEACHERIN_RESOURCES } from '@mocks/scenarios/teacherin';

function assertExecutable(action: TeacherInDraftAction, approval: TeacherInDraftApproval): void {
  if (action.status !== 'approved') throw new Error('TeacherIn draft action must be approved before execution.');
  if (approval.actionId !== action.id || approval.decision !== 'approved') throw new Error('TeacherIn approval does not match the action.');
}

export class MockTeacherInAdapter implements TeacherInAdapter, TeacherInScenarioController {
  private readonly receipts = new Map<string, TeacherInDraftReceipt>();
  private scenario: TeacherInScenario = 'success';

  searchResources(query: string): readonly TeacherInResource[] {
    const needle = query.trim().toLocaleLowerCase('zh-CN');
    return TEACHERIN_RESOURCES.filter((resource) => !needle || [
      resource.title, resource.stage, resource.subject, resource.author, resource.licenseLabel,
    ].join(' ').toLocaleLowerCase('zh-CN').includes(needle));
  }

  createDraft(action: TeacherInDraftAction, approval: TeacherInDraftApproval): TeacherInDraftReceipt {
    assertExecutable(action, approval);
    const existing = this.receipts.get(action.idempotencyKey);
    if (existing) return existing;
    const common = {
      id: action.id.replace(/^action-/, 'receipt-'), actionId: action.id, approvalId: approval.id,
      idempotencyKey: action.idempotencyKey, executedAt: '2026-08-22T10:10:02+08:00' as const,
      truthLabel: '[模拟] TeacherIn 草稿执行回执' as const,
    };
    if (action.permission === 'denied' || this.scenario === 'permission_denied') {
      const receipt: TeacherInDraftReceipt = Object.freeze({
        ...common, status: 'permission_denied', recovery: 'open-teacherin-permissions',
        unexecutedArtifactRef: action.artifactRef, result: '当前账号无权在 TeacherIn 创建作品草稿。',
      });
      this.receipts.set(action.idempotencyKey, receipt);
      return receipt;
    }
    if (this.scenario === 'recoverable_failure') {
      return Object.freeze({
        ...common, status: 'recoverable_failure', recovery: 'retry', unexecutedArtifactRef: action.artifactRef,
        result: 'TeacherIn 暂时不可用，未产生可确认的草稿。',
      });
    }
    const draftId = `teacherin-draft-${action.artifactRef.id.replace(/^asset-/, '')}`;
    const editorQuery = new URLSearchParams({ draft: draftId, source: 'workbuddy', title: action.title });
    const receipt: TeacherInDraftReceipt = Object.freeze({
      ...common,
      status: 'success',
      result: '已在 TeacherIn 创建草稿。',
      draft: Object.freeze({
        id: draftId, status: 'draft', title: action.title, sourceArtifactRef: action.artifactRef,
        sourceSpaceFileRef: action.spaceFileRef, createdAt: common.executedAt,
        editorPath: `/teacher/space/teacherin?${editorQuery.toString()}`,
      }),
    });
    this.receipts.set(action.idempotencyKey, receipt);
    return receipt;
  }

  setScenario(scenario: TeacherInScenario): void {
    this.scenario = scenario;
    this.receipts.clear();
  }

  getScenario(): TeacherInScenario {
    return this.scenario;
  }
}
