import type { GuidedExplanationAdapter, GuidedExplanationScenario, GuidedExplanationScenarioController } from '@contracts/workbuddy/guided-explanation';
import { GuidedExplanationModule, type GuidedExplanationApproval, type GuidedExplanationArtifactRef, type GuidedExplanationContentReference, type GuidedExplanationReceipt, type PrepareGuidedExplanationInput, type SendGuidedExplanationAction } from '@domain/workbuddy/guided-explanation';

type Dependencies = Readonly<{
  appendTeacherMessage: (message: Readonly<{ id: string; threadId: string; authorName: string; body: string; sentAt: string; contentReference: GuidedExplanationContentReference }>) => void;
  executedAt?: string;
}>;

export class MockGuidedExplanationDistributionAdapter implements GuidedExplanationAdapter, GuidedExplanationScenarioController {
  private scenario: GuidedExplanationScenario = 'success';
  private readonly successfulReceipts = new Map<string, Extract<GuidedExplanationReceipt, { status: 'success' }>>();
  private readonly requestFingerprints = new Map<string, string>();
  private readonly attempts = new Map<string, number>();

  constructor(private readonly dependencies: Dependencies) {}

  getScenario() { return this.scenario; }
  setScenario(scenario: GuidedExplanationScenario) { this.scenario = scenario; this.successfulReceipts.clear(); this.requestFingerprints.clear(); this.attempts.clear(); }

  async generateGuidedExplanation(input: PrepareGuidedExplanationInput) {
    await Promise.resolve();
    if (this.scenario === 'generation_failure') throw new Error('讲题内容生成暂时失败，请重试。');
    return GuidedExplanationModule.prepare(input);
  }

  async executeGuidedExplanation(action: SendGuidedExplanationAction, approval: GuidedExplanationApproval, currentArtifactRef: GuidedExplanationArtifactRef): Promise<GuidedExplanationReceipt> {
    await Promise.resolve();
    if (
      action.status !== 'approved'
      || approval.decision !== 'approved'
      || approval.actionId !== action.id
      || approval.decidedBy !== action.actor.teacherId
      || approval.artifactRef.id !== action.artifactRef.id
      || approval.artifactRef.version !== action.artifactRef.version
      || currentArtifactRef.id !== action.artifactRef.id
      || currentArtifactRef.version !== action.artifactRef.version
    ) throw new Error('讲题内容分发缺少与当前版本匹配的教师审批');
    const fingerprint = JSON.stringify({
      id: action.id,
      kind: action.kind,
      runRef: action.runRef,
      contextSnapshotId: action.contextSnapshotId,
      artifactRef: action.artifactRef,
      target: action.target,
      actor: action.actor,
      body: action.body,
      content: action.content,
      permission: action.permission,
      approval,
    });
    const previousFingerprint = this.requestFingerprints.get(action.idempotencyKey);
    if (previousFingerprint && previousFingerprint !== fingerprint) throw new Error('讲题分发幂等键与请求内容冲突，已停止执行');
    const cached = this.successfulReceipts.get(action.idempotencyKey);
    if (cached) return cached;
    this.requestFingerprints.set(action.idempotencyKey, fingerprint);
    const attempt = (this.attempts.get(action.idempotencyKey) ?? 0) + 1;
    this.attempts.set(action.idempotencyKey, attempt);
    const base = {
      id: `receipt-${action.id}-attempt-${attempt}`, actionId: action.id, approvalId: approval.id, idempotencyKey: action.idempotencyKey,
      runRef: action.runRef, contextSnapshotId: this.scenario === 'evidence_mismatch' ? `${action.contextSnapshotId}-mismatch` : action.contextSnapshotId,
      artifactRef: action.artifactRef, executedAt: this.dependencies.executedAt ?? '2026-08-09T10:02:00+08:00', truthLabel: '[模拟] ClassIn 讲题内容分发回执' as const,
    };
    if (this.scenario === 'permission_denied') return Object.freeze({ ...base, status: 'permission_denied', result: '当前教师没有向目标会话分发讲题内容的权限。', recovery: 'request-permission' });
    if (this.scenario === 'recoverable_failure' && attempt === 1) return Object.freeze({ ...base, status: 'recoverable_failure', result: '消息服务暂时不可用，尚未保存或发送讲题内容。', recovery: 'retry' });
    const messageId = `workbuddy-guided-explanation-${action.runRef}-v${action.artifactRef.version}`;
    const contentReference: GuidedExplanationContentReference = Object.freeze({
      ...action.content,
      evidence: Object.freeze({ runRef: action.runRef, contextSnapshotId: base.contextSnapshotId, artifactRef: action.artifactRef, actionId: action.id, approvalId: approval.id, receiptId: base.id }),
    });
    this.dependencies.appendTeacherMessage({ id: messageId, threadId: action.target.threadId, authorName: action.actor.teacherName, body: action.body, sentAt: base.executedAt, contentReference });
    const receipt = Object.freeze({ ...base, status: 'success' as const, artifactSaved: true as const, message: Object.freeze({ id: messageId, threadId: action.target.threadId, authorName: action.actor.teacherName }), result: '讲题 Artifact 已保存并分发到当前目标会话' });
    this.successfulReceipts.set(action.idempotencyKey, receipt);
    return receipt;
  }
}
