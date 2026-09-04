import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateQuizActivityDraftAction, QuizActivityDraftApproval } from '@domain/workbuddy/quiz-activity-creation';
import { MockQuizActivityDraftAdapter } from './workbuddy-quiz-activity-draft';

const action: CreateQuizActivityDraftAction = Object.freeze({
  id: 'action-quiz-1', kind: 'create-quiz-activity-draft', runRef: 'run-quiz-1', contextSnapshotId: 'context-quiz-1', status: 'approved',
  artifactRef: Object.freeze({ id: 'artifact-quiz-1', version: 'v1' }),
  paper: Object.freeze({
    id: 'artifact-quiz-1', version: 'v1', title: '动量守恒单元诊断测验', description: '检查动量与方向。', totalScore: 100,
    questions: Object.freeze(Array.from({ length: 5 }, (_, index) => Object.freeze({ id: `q${index + 1}`, type: 'short-answer' as const, prompt: `题目 ${index + 1}`, answer: '答案', explanation: '解析', difficulty: 'medium' as const, score: 20 }))),
    validation: Object.freeze({ status: 'passed' as const, summary: '校验通过' }), truthLabel: '[模拟] 测验试卷草稿' as const,
  }),
  target: Object.freeze({ classId: 'physics-3', courseId: 'course-momentum', unitId: 'unit-momentum-1', expectedVersion: 'unit-momentum-1-v1', label: '高二物理 3 班 / 动量与碰撞 / 第一单元 受力与动量' }),
  settings: Object.freeze({ title: '动量守恒单元诊断测验', description: '检查动量与方向。', startAt: '2026-08-25T09:00:00+08:00', endAt: '2026-08-26T22:00:00+08:00', duration: Object.freeze({ kind: 'preset', minutes: 40 }), scoring: 'score' }),
  publication: 'draft', difference: '新增测验活动草稿', impact: '仅创建教师可见草稿，不会发布。', permission: 'allowed', risk: 'low', reversible: true,
  expiresAt: '2026-08-24T18:40:00+08:00', idempotencyKey: 'quiz-draft-1',
});
const approval: QuizActivityDraftApproval = Object.freeze({ id: 'approval-quiz-1', actionId: action.id, decision: 'approved', decidedBy: 'teacher-wang', decidedAt: '2026-08-24T17:45:00+08:00' });

describe('MockQuizActivityDraftAdapter', () => {
  const onDraftCreated = vi.fn();
  let adapter: MockQuizActivityDraftAdapter;

  beforeEach(() => {
    onDraftCreated.mockReset();
    adapter = new MockQuizActivityDraftAdapter({
      onDraftCreated,
      targetReader: { read: (target) => ({ classId: target.classId, courseId: target.courseId, unitId: target.unitId, version: target.expectedVersion, canCreateDraft: true }) },
    });
  });

  it('creates exactly one draft and replays the same receipt for the same request', () => {
    const first = adapter.execute(action, approval);
    const replay = adapter.execute(action, approval);
    expect(first).toEqual(replay);
    expect(first).toMatchObject({ status: 'success', object: { publication: 'draft' } });
    expect(onDraftCreated).toHaveBeenCalledTimes(1);
    expect(onDraftCreated).toHaveBeenCalledWith(expect.objectContaining({ publication: 'draft', type: 'quiz', title: '动量守恒单元诊断测验' }), action.target);
  });

  it('creates different business objects for different idempotency keys', () => {
    const first = adapter.execute(action, approval);
    const secondAction = Object.freeze({ ...action, id: 'action-quiz-2', runRef: 'run-quiz-2', idempotencyKey: 'quiz-draft-2' });
    const secondApproval = Object.freeze({ ...approval, id: 'approval-quiz-2', actionId: secondAction.id });
    const second = adapter.execute(secondAction, secondApproval);
    expect(first.status).toBe('success');
    expect(second.status).toBe('success');
    if (first.status === 'success' && second.status === 'success') expect(second.object.id).not.toBe(first.object.id);
    expect(onDraftCreated).toHaveBeenCalledTimes(2);
  });

  it('keeps identical demo request IDs distinct across WorkBuddy experience scopes', () => {
    const createScoped = (idempotencyScope: string) => new MockQuizActivityDraftAdapter({
      idempotencyScope,
      onDraftCreated,
      targetReader: { read: (target) => ({ classId: target.classId, courseId: target.courseId, unitId: target.unitId, version: target.expectedVersion, canCreateDraft: true }) },
    });
    const ideal = createScoped('ideal-full').execute(action, approval);
    const mvp = createScoped('classin-mvp').execute(action, approval);

    expect(ideal.status).toBe('success');
    expect(mvp.status).toBe('success');
    if (ideal.status === 'success' && mvp.status === 'success') expect(mvp.object.id).not.toBe(ideal.object.id);
  });

  it('fails closed when an idempotency key is reused with a changed side-effect payload', () => {
    adapter.execute(action, approval);
    expect(() => adapter.execute({ ...action, settings: { ...action.settings, title: '被篡改的标题' } }, approval)).toThrow('幂等键');
    expect(onDraftCreated).toHaveBeenCalledTimes(1);
  });

  it.each(['permission_denied', 'version_conflict', 'recoverable_failure', 'timeout'] as const)('returns an explicit %s receipt without a draft side effect', (scenario) => {
    adapter.setScenario(scenario);
    const receipt = adapter.execute(action, approval);
    expect(receipt.status).toBe(scenario);
    expect(onDraftCreated).not.toHaveBeenCalled();
  });

  it.each(['recoverable_failure', 'timeout'] as const)('retries %s with the same request and creates exactly one draft', (scenario) => {
    adapter.setScenario(scenario);
    expect(adapter.execute(action, approval).status).toBe(scenario);
    expect(adapter.execute(action, approval).status).toBe('success');
    expect(onDraftCreated).toHaveBeenCalledTimes(1);
    expect(adapter.execute(action, approval).status).toBe('success');
    expect(onDraftCreated).toHaveBeenCalledTimes(1);
  });

  it('allows version refresh and reconfirmation after a simulated conflict', () => {
    adapter.setScenario('version_conflict');
    expect(adapter.execute(action, approval).status).toBe('version_conflict');
    expect(adapter.execute(action, approval).status).toBe('success');
    expect(onDraftCreated).toHaveBeenCalledTimes(1);
  });

  it('fails closed when the authoritative target is missing or stale', () => {
    const missing = new MockQuizActivityDraftAdapter({ onDraftCreated, targetReader: { read: () => null } });
    expect(missing.execute(action, approval)).toMatchObject({ status: 'permission_denied' });

    const stale = new MockQuizActivityDraftAdapter({
      onDraftCreated,
      targetReader: { read: (target) => ({ classId: target.classId, courseId: target.courseId, unitId: target.unitId, version: 'unit-momentum-1-v2', canCreateDraft: true }) },
    });
    expect(stale.execute(action, approval)).toMatchObject({ status: 'version_conflict', expectedVersion: 'unit-momentum-1-v1', currentVersion: 'unit-momentum-1-v2' });
    expect(onDraftCreated).not.toHaveBeenCalled();
  });
});
