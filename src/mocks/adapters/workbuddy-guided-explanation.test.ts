import { describe, expect, it } from 'vitest';
import { GuidedExplanationModule } from '@domain/workbuddy/guided-explanation';
import { MockGuidedExplanationDistributionAdapter } from './workbuddy-guided-explanation';

function approvedFixture() {
  const prepared = GuidedExplanationModule.prepare({
    runRef: 'run-guided-direct-wang-li-1',
    classId: 'physics-3', classLabel: '高二物理 3 班', threadId: 'direct-wang-li', targetKind: 'direct', targetLabel: '李明',
    teacherId: 'teacher-001', teacherName: '王老师', question: '质量为 0.20 kg 的小球 A 以 5.0 m/s 向右运动，与静止的 0.30 kg 小球 B 正碰，碰后 A 以 1.0 m/s 向左反弹，求 B 碰后的速度大小和方向？', generatedAt: '2026-08-24T09:00:00+08:00',
  })!;
  return { prepared, approved: GuidedExplanationModule.approve(prepared, 'teacher-001', '2026-08-24T09:01:00+08:00')! };
}

describe('MockGuidedExplanationDistributionAdapter', () => {
  it('is idempotent after a successful save and distribution', async () => {
    const messages: string[] = [];
    const adapter = new MockGuidedExplanationDistributionAdapter({ appendTeacherMessage: ({ id }) => messages.push(id) });
    const { approved } = approvedFixture();
    const first = await adapter.executeGuidedExplanation(approved.action, approved.approval, approved.action.artifactRef);
    const second = await adapter.executeGuidedExplanation(approved.action, approved.approval, approved.action.artifactRef);
    expect(second.id).toBe(first.id);
    expect(messages).toHaveLength(1);
  });

  it('returns explicit permission, recoverable and evidence-mismatch receipts and can reset', async () => {
    const adapter = new MockGuidedExplanationDistributionAdapter({ appendTeacherMessage: () => undefined });
    const { approved } = approvedFixture();
    adapter.setScenario('permission_denied');
    expect((await adapter.executeGuidedExplanation(approved.action, approved.approval, approved.action.artifactRef)).status).toBe('permission_denied');
    adapter.setScenario('recoverable_failure');
    expect((await adapter.executeGuidedExplanation(approved.action, approved.approval, approved.action.artifactRef)).status).toBe('recoverable_failure');
    expect((await adapter.executeGuidedExplanation(approved.action, approved.approval, approved.action.artifactRef)).status).toBe('success');
    adapter.setScenario('evidence_mismatch');
    const mismatch = await adapter.executeGuidedExplanation(approved.action, approved.approval, approved.action.artifactRef);
    expect(mismatch.contextSnapshotId).not.toBe(approved.action.contextSnapshotId);
  });

  it('treats separate runs in the same thread as separate executions', async () => {
    const messages: string[] = [];
    const adapter = new MockGuidedExplanationDistributionAdapter({ appendTeacherMessage: ({ id }) => messages.push(id) });
    const first = approvedFixture().approved;
    const secondPrepared = await adapter.generateGuidedExplanation({
      runRef: 'run-guided-direct-wang-li-2', classId: 'physics-3', classLabel: '高二物理 3 班', threadId: 'direct-wang-li', targetKind: 'direct', targetLabel: '李明',
      teacherId: 'teacher-001', teacherName: '王老师', question: '动量第 6 题怎么求解？', generatedAt: '2026-08-24T09:05:00+08:00',
    });
    const second = GuidedExplanationModule.approve(secondPrepared!, 'teacher-001', '2026-08-24T09:06:00+08:00')!;
    await adapter.executeGuidedExplanation(first.action, first.approval, first.action.artifactRef);
    await adapter.executeGuidedExplanation(second.action, second.approval, second.action.artifactRef);
    expect(first.action.idempotencyKey).not.toBe(second.action.idempotencyKey);
    expect(messages).toHaveLength(2);
  });

  it('fails closed when an idempotency key is reused with different side-effect content', async () => {
    const adapter = new MockGuidedExplanationDistributionAdapter({ appendTeacherMessage: () => undefined });
    const { approved } = approvedFixture();
    await adapter.executeGuidedExplanation(approved.action, approved.approval, approved.action.artifactRef);
    const conflictingAction = {
      ...approved.action,
      content: Object.freeze({ ...approved.action.content, finalAnswer: '被篡改但正文未变化的答案' }),
    };
    await expect(adapter.executeGuidedExplanation(conflictingAction, approved.approval, conflictingAction.artifactRef)).rejects.toThrow(/幂等键与请求内容冲突/);
  });

  it('rejects an approval for a superseded artifact version', async () => {
    const adapter = new MockGuidedExplanationDistributionAdapter({ appendTeacherMessage: () => undefined });
    const { prepared, approved } = approvedFixture();
    const revised = GuidedExplanationModule.revise(prepared, { finalAnswer: `${prepared.artifact.finalAnswer}\n教师修订。` });
    await expect(adapter.executeGuidedExplanation(approved.action, approved.approval, revised.action.artifactRef)).rejects.toThrow(/当前版本匹配/);
  });

  it('exposes generation failure through the generation adapter seam', async () => {
    const adapter = new MockGuidedExplanationDistributionAdapter({ appendTeacherMessage: () => undefined });
    adapter.setScenario('generation_failure');
    await expect(adapter.generateGuidedExplanation({
      runRef: 'run-guided-failure-1', classId: 'physics-3', classLabel: '高二物理 3 班', threadId: 'class-physics-3', targetKind: 'class', targetLabel: '高二物理 3 班',
      teacherId: 'teacher-001', teacherName: '王老师', question: '第 5 题怎么判断？', generatedAt: '2026-08-24T09:00:00+08:00',
    })).rejects.toThrow(/生成暂时失败/);
  });
});
