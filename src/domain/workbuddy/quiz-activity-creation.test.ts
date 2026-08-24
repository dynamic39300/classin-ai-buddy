import { describe, expect, it } from 'vitest';
import {
  QuizActivityCreationModule,
  type QuizActivityDraftReceipt,
  type QuizPaperArtifact,
} from './quiz-activity-creation';

const artifact: QuizPaperArtifact = {
  id: 'artifact-momentum-quiz', version: 'v1', title: '动量守恒单元诊断测验', description: '检查动量、方向与守恒条件。',
  questions: [
    { id: 'q1', type: 'single-choice', prompt: '系统动量守恒的条件是？', options: ['合外力冲量可忽略', '机械能守恒', '速度相等', '质量相等'], answer: '合外力冲量可忽略', explanation: '动量守恒取决于系统所受合外力冲量。', difficulty: 'easy', score: 20 },
    { id: 'q2', type: 'multiple-choice', prompt: '描述动量的量包括？', options: ['质量', '速度大小', '速度方向', '加速度'], answer: '质量、速度大小、速度方向', explanation: '动量是质量与速度的乘积，是矢量。', difficulty: 'medium', score: 20 },
    { id: 'q3', type: 'judgement', prompt: '一维碰撞中可任意规定正方向。', answer: '正确', explanation: '正方向可自行规定，但列式必须前后一致。', difficulty: 'easy', score: 20 },
    { id: 'q4', type: 'fill-blank', prompt: '质量 0.2 kg 的球以 5 m/s 运动，动量为____。', answer: '1.0 kg·m/s', explanation: 'p=mv=0.2×5。', difficulty: 'medium', score: 20 },
    { id: 'q5', type: 'short-answer', prompt: '说明碰撞题中方向符号的处理步骤。', answer: '先规定正方向，再给每个速度带符号，最后按结果正负解释方向。', explanation: '符号必须来自同一正方向约定。', difficulty: 'medium', score: 20 },
  ],
  totalScore: 100,
  validation: { status: 'passed', summary: '题型、答案、解析与总分校验通过' },
  truthLabel: '[模拟] 测验试卷草稿',
};

describe('QuizActivityCreationModule', () => {
  it('creates a paper and an approved draft-only action through explicit states', () => {
    let run = QuizActivityCreationModule.create({
      runId: 'run-quiz-1', contextSnapshotId: 'context-quiz-1', goal: '生成动量守恒单元测验',
      target: { classId: 'physics-3', courseId: 'course-momentum', unitId: 'unit-momentum-1', expectedVersion: 'unit-momentum-1-v1', label: '高二物理 3 班 / 动量与碰撞 / 第一单元 受力与动量' },
      now: '2026-08-24T17:40:00+08:00',
    });
    expect(run.stage).toBe('needs_parameters');

    run = QuizActivityCreationModule.updatePaperBrief(run, { questionCount: 5, totalScore: 100 });
    run = QuizActivityCreationModule.confirmPaperBrief(run);
    expect(run.stage).toBe('plan_ready');
    run = QuizActivityCreationModule.beginGeneration(run);
    expect(run.stage).toBe('generating');
    run = QuizActivityCreationModule.generatePaper(run, artifact);
    expect(run.stage).toBe('awaiting_paper_review');
    expect(run.artifact?.totalScore).toBe(100);
    const notProposed = QuizActivityCreationModule.proposeDraft(run, { actionId: 'action-too-early', expiresAt: '2026-08-24T18:40:00+08:00', idempotencyKey: 'quiz-too-early' });
    expect(notProposed).toBe(run);
    run = QuizActivityCreationModule.approvePaper(run, { teacherId: 'teacher-wang', reviewedAt: '2026-08-24T17:44:00+08:00' });
    expect(run.stage).toBe('awaiting_activity_parameters');
    expect(run.paperReview).toMatchObject({ status: 'approved', artifactRef: { id: run.artifact?.id, version: 'v1' } });

    run = QuizActivityCreationModule.updateActivitySettings(run, {
      title: '动量守恒单元诊断测验', description: '完成后回顾方向与守恒条件。',
      startAt: '2026-08-25T09:00:00+08:00', endAt: '2026-08-26T22:00:00+08:00',
      duration: { kind: 'preset', minutes: 40 }, scoring: 'score',
    });
    run = QuizActivityCreationModule.proposeDraft(run, { actionId: 'action-quiz-1', expiresAt: '2026-08-24T18:40:00+08:00', idempotencyKey: 'quiz-draft-1' });
    expect(run.stage).toBe('awaiting_approval');
    expect(run.action).toMatchObject({ kind: 'create-quiz-activity-draft', status: 'proposed', publication: 'draft' });
    expect(run.action?.impact).toContain('不会发布');

    run = QuizActivityCreationModule.approveDraft(run, { approvalId: 'approval-quiz-1', teacherId: 'teacher-wang', decidedAt: '2026-08-24T17:45:00+08:00' });
    expect(run.stage).toBe('creating_draft');
    expect(run.action?.status).toBe('approved');

    const receipt: QuizActivityDraftReceipt = Object.freeze({
      id: 'receipt-quiz-1', status: 'success', actionId: 'action-quiz-1', approvalId: 'approval-quiz-1', idempotencyKey: 'quiz-draft-1', executedAt: '2026-08-24T17:45:01+08:00',
      truthLabel: '[模拟] 测验活动草稿执行回执', result: '测验活动草稿已创建，尚未发布。',
      object: Object.freeze({ id: 'activity-quiz-1', version: 'v1', publication: 'draft', label: '动量守恒单元诊断测验', returnUrl: '/teacher/classes/physics-3?course=course-momentum&unit=unit-momentum-1&activity=activity-quiz-1&source=workbuddy' }),
    });
    run = QuizActivityCreationModule.recordReceipt(run, receipt);
    expect(run.stage).toBe('draft_created');
    expect(run.receipt?.status).toBe('success');
    if (run.receipt?.status !== 'success') throw new Error('expected successful receipt');
    expect(run.receipt.object.publication).toBe('draft');
    expect(run.evaluation).toMatchObject({ signal: { outcome: 'adopted' }, receiptRef: 'receipt-quiz-1' });
    expect(run.allowedCommands).toEqual(['open-class-detail']);
  });

  it('fails closed when question totals or receipt evidence do not match', () => {
    const run = QuizActivityCreationModule.create({
      runId: 'run-quiz-2', contextSnapshotId: 'context-quiz-2', goal: '生成测验',
      target: { classId: 'physics-3', courseId: 'course-momentum', unitId: 'unit-momentum-1', expectedVersion: 'unit-v1', label: '目标单元' },
      now: '2026-08-24T17:40:00+08:00',
    });
    const generating = QuizActivityCreationModule.beginGeneration(QuizActivityCreationModule.confirmPaperBrief(run));
    expect(() => QuizActivityCreationModule.generatePaper(generating, { ...artifact, totalScore: 99 })).toThrow('试卷总分');
    expect(() => QuizActivityCreationModule.generatePaper(generating, {
      ...artifact,
      questions: artifact.questions.map((question) => question.id === 'q2' ? { ...question, answer: '不存在的选项' } : question),
    })).toThrow('多选题答案');
    expect(() => QuizActivityCreationModule.generatePaper(generating, {
      ...artifact,
      questions: artifact.questions.map((question) => question.id === 'q3' ? { ...question, answer: '大概正确' } : question),
    })).toThrow('判断题答案');

    const generated = QuizActivityCreationModule.approvePaper(QuizActivityCreationModule.generatePaper(generating, artifact), { teacherId: 'teacher-wang', reviewedAt: '2026-08-24T17:44:00+08:00' });
    expect(() => QuizActivityCreationModule.updateActivitySettings(generated, { startAt: 'not-a-date', endAt: 'also-not-a-date' })).toThrow('有效日期');
  });

  it('offers only state-valid recovery commands after writeback failures', () => {
    let run = QuizActivityCreationModule.create({
      runId: 'run-quiz-recovery', contextSnapshotId: 'context-quiz-recovery', goal: '生成测验',
      target: { classId: 'physics-3', courseId: 'course-momentum', unitId: 'unit-momentum-1', expectedVersion: 'unit-v1', label: '目标单元' },
      now: '2026-08-24T17:40:00+08:00',
    });
    run = QuizActivityCreationModule.approvePaper(QuizActivityCreationModule.generatePaper(QuizActivityCreationModule.beginGeneration(QuizActivityCreationModule.confirmPaperBrief(run)), artifact), { teacherId: 'teacher-wang', reviewedAt: '2026-08-24T17:44:00+08:00' });
    run = QuizActivityCreationModule.proposeDraft(run, { actionId: 'action-recovery-1', expiresAt: '2026-08-24T18:40:00+08:00', idempotencyKey: 'quiz-recovery-1' });
    run = QuizActivityCreationModule.approveDraft(run, { approvalId: 'approval-recovery-1', teacherId: 'teacher-wang', decidedAt: '2026-08-24T17:45:00+08:00' });

    run = QuizActivityCreationModule.recordReceipt(run, Object.freeze({
      id: 'receipt-recovery-1', status: 'recoverable_failure', actionId: 'action-recovery-1', approvalId: 'approval-recovery-1', idempotencyKey: 'quiz-recovery-1', executedAt: '2026-08-24T17:45:01+08:00',
      truthLabel: '[模拟] 测验活动草稿执行回执', result: '暂时失败', recovery: 'retry', unexecutedTarget: 'unit-momentum-1',
    }));
    expect(QuizActivityCreationModule.retryDraft(run)).toMatchObject({ stage: 'creating_draft', receipt: null, allowedCommands: ['execute-draft'] });

    let conflict = QuizActivityCreationModule.approveDraft(
      QuizActivityCreationModule.proposeDraft(
        QuizActivityCreationModule.approvePaper(QuizActivityCreationModule.generatePaper(QuizActivityCreationModule.beginGeneration(QuizActivityCreationModule.confirmPaperBrief(QuizActivityCreationModule.create({
          runId: 'run-quiz-conflict', contextSnapshotId: 'context-quiz-conflict', goal: '生成测验', target: run.target, now: run.createdAt,
        }))), artifact), { teacherId: 'teacher-wang', reviewedAt: '2026-08-24T17:44:00+08:00' }),
        { actionId: 'action-conflict-1', expiresAt: '2026-08-24T18:40:00+08:00', idempotencyKey: 'quiz-conflict-1' },
      ),
      { approvalId: 'approval-conflict-1', teacherId: 'teacher-wang', decidedAt: '2026-08-24T17:45:00+08:00' },
    );
    conflict = QuizActivityCreationModule.recordReceipt(conflict, Object.freeze({
      id: 'receipt-conflict-1', status: 'version_conflict', actionId: 'action-conflict-1', approvalId: 'approval-conflict-1', idempotencyKey: 'quiz-conflict-1', executedAt: '2026-08-24T17:45:01+08:00',
      truthLabel: '[模拟] 测验活动草稿执行回执', result: '版本冲突', recovery: 'compare-and-reconfirm', unexecutedTarget: 'unit-momentum-1', expectedVersion: 'unit-v1', currentVersion: 'unit-v2',
    }));
    const refreshed = QuizActivityCreationModule.refreshTarget(conflict);
    expect(refreshed).toMatchObject({ stage: 'awaiting_activity_parameters', target: { expectedVersion: 'unit-v2' }, action: null, approval: null, receipt: null });
  });
});
