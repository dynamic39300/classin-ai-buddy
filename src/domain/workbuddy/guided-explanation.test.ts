import { describe, expect, it } from 'vitest';
import { EvaluationModule } from './evaluation';
import { GuidedExplanationModule } from './guided-explanation';

const INPUT = {
  runRef: 'run-guided-direct-wang-li-1',
  classId: 'physics-3', classLabel: '高二物理 3 班', threadId: 'direct-wang-li', targetKind: 'direct' as const,
  targetLabel: '李明', teacherId: 'teacher-001', teacherName: '王老师',
  question: '王老师，质量为 0.20 kg 的小球 A 以 5.0 m/s 向右运动，与静止的 0.30 kg 小球 B 正碰。碰后 A 以 1.0 m/s 向左反弹，忽略外力，怎么求 B 碰后的速度大小和方向？', generatedAt: '2026-08-24T09:00:00+08:00',
};

describe('GuidedExplanationModule', () => {
  it('keeps the artifact format-neutral while projecting an interactive presentation', () => {
    const prepared = GuidedExplanationModule.prepare(INPUT);
    expect(prepared).not.toBeNull();
    expect(prepared?.artifact.presentation).toEqual({ kind: 'interactive', preferredAdapter: 'html-h5' });
    expect(prepared?.artifact).not.toHaveProperty('extension');
    expect(prepared?.artifact.steps).toHaveLength(4);
    expect(prepared?.artifact.question).toContain('0.20 kg');
    expect(prepared?.artifact.steps.map(({ body }) => body).join(' ')).toContain("m_Av_A + m_Bv_B = m_Av'_A + m_Bv'_B");
    expect(prepared?.artifact.finalAnswer).toContain('4.0 m/s');
    expect(prepared?.artifact.delivery.body).toContain('练习单第 5 题');
    expect(prepared?.action.body).toBe(prepared?.artifact.delivery.body);
    expect(prepared?.action.content.linkLabel).toBe('查看分步讲解');
    expect(prepared?.action.target).toMatchObject({ kind: 'direct', threadId: 'direct-wang-li' });
    expect(prepared?.action.runRef).toBe(INPUT.runRef);
    expect(prepared?.artifact.id).toContain(INPUT.runRef);
  });

  it('requests input instead of inventing a question from unrelated conversation text', () => {
    expect(GuidedExplanationModule.prepare({ ...INPUT, question: '练习单已经准备好了。' })).toBeNull();
  });

  it('atomically revises the question, process and final answer into one new version', () => {
    const prepared = GuidedExplanationModule.prepare(INPUT)!;
    const revised = GuidedExplanationModule.revise(prepared, {
      title: '教师修订版讲题',
      messageBody: '李明，第 5 题的分步讲解已经整理好，请打开链接查看。',
      question: `${prepared.artifact.question}（已核对题干）`,
      steps: prepared.artifact.steps.map((step, index) => index === 2 ? { ...step, title: '教师修订后的计算步骤', body: `${step.body} 教师补充：先移项再除以质量。`, checkpoint: '单位和有效数字是否正确？' } : step),
      finalAnswer: `${prepared.artifact.finalAnswer}\n教师结论：B 向右。`,
    });
    expect(revised.artifact.version).toBe(2);
    expect(revised.artifact.question).toContain('已核对题干');
    expect(revised.artifact.steps[2]?.body).toContain('教师补充');
    expect(revised.artifact.steps[2]?.title).toBe('教师修订后的计算步骤');
    expect(revised.artifact.steps[2]?.checkpoint).toBe('单位和有效数字是否正确？');
    expect(revised.artifact.finalAnswer).toContain('教师结论');
    expect(revised.artifact.delivery.body).toContain('请打开链接查看');
    expect(revised.action.body).toBe(revised.artifact.delivery.body);
    expect(revised.action.id).not.toBe(prepared.action.id);
    expect(revised.action.content.artifactRef.version).toBe('v2');
    expect(revised.action.content.steps[2]?.body).toContain('教师补充');
    expect(GuidedExplanationModule.approve(prepared, 'different-teacher', INPUT.generatedAt)).toBeNull();
  });

  it('does not create a version for a no-op and falls back from invalid blank required fields', () => {
    const prepared = GuidedExplanationModule.prepare(INPUT)!;
    expect(GuidedExplanationModule.revise(prepared, {})).toBe(prepared);
    expect(GuidedExplanationModule.revise(prepared, {
      title: '   ', question: '', finalAnswer: ' ',
      steps: prepared.artifact.steps.map((step) => ({ ...step, title: '', body: '' })),
    })).toBe(prepared);
  });

  it('creates an evaluation only for a correlated approval and receipt', () => {
    const prepared = GuidedExplanationModule.prepare(INPUT)!;
    const approved = GuidedExplanationModule.approve(prepared, INPUT.teacherId, INPUT.generatedAt)!;
    const receipt = {
      id: 'receipt-guided', actionId: approved.action.id, approvalId: approved.approval.id,
      idempotencyKey: approved.action.idempotencyKey, status: 'success' as const, executedAt: INPUT.generatedAt,
      runRef: approved.action.runRef, contextSnapshotId: approved.action.contextSnapshotId, artifactRef: approved.action.artifactRef, artifactSaved: true as const,
      message: { id: 'message-guided', threadId: INPUT.threadId, authorName: INPUT.teacherName },
      result: 'saved and sent',
      truthLabel: '[模拟] ClassIn 讲题内容分发回执' as const,
    };
    const evaluation = EvaluationModule.recordExecutionOutcome({
      runRef: approved.action.runRef, contextSnapshotRef: approved.action.contextSnapshotId,
      artifactRef: { id: prepared.artifact.id, version: 'v1' }, action: approved.action, approval: approved.approval, receipt,
    });
    expect(evaluation?.signal.outcome).toBe('adopted');
    expect(evaluation?.artifactRef).toEqual({ id: prepared.artifact.id, version: 'v1' });
  });
});
