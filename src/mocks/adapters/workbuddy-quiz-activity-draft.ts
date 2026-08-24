import type { QuizActivityDraftAdapter, QuizActivityDraftScenario, QuizActivityDraftScenarioController, QuizActivityDraftTargetReader } from '@contracts/workbuddy/quiz-activity-draft';
import type { ClassActivity } from '@domain/class/class';
import type {
  CreateQuizActivityDraftAction,
  FailedQuizActivityDraftReceipt,
  QuizActivityDraftApproval,
  QuizActivityDraftReceipt,
  QuizActivityTarget,
  SuccessfulQuizActivityDraftReceipt,
} from '@domain/workbuddy/quiz-activity-creation';

type AdapterOptions = Readonly<{
  idempotencyScope?: string;
  onDraftCreated: (activity: ClassActivity, target: QuizActivityTarget) => void;
  targetReader: QuizActivityDraftTargetReader;
}>;

type IdempotencyEntry = Readonly<{ fingerprint: string; receipt?: QuizActivityDraftReceipt }>;

function requestFingerprint(action: CreateQuizActivityDraftAction, approval: QuizActivityDraftApproval): string {
  return JSON.stringify({
    id: action.id, kind: action.kind, runRef: action.runRef, contextSnapshotId: action.contextSnapshotId,
    artifactRef: action.artifactRef, paper: action.paper, target: action.target, settings: action.settings,
    publication: action.publication, permission: action.permission, idempotencyKey: action.idempotencyKey,
    approval,
  });
}

function assertRequest(action: CreateQuizActivityDraftAction, approval: QuizActivityDraftApproval): void {
  if (action.kind !== 'create-quiz-activity-draft' || action.status !== 'approved' || action.publication !== 'draft') throw new Error('测验活动写回只接受已批准的草稿创建动作');
  if (approval.decision !== 'approved' || approval.actionId !== action.id) throw new Error('教师审批与测验草稿动作不匹配');
  if (action.artifactRef.id !== action.paper.id || action.artifactRef.version !== action.paper.version) throw new Error('测验试卷与 Artifact 引用不匹配');
  if (!action.target.classId || !action.target.courseId || !action.target.unitId) throw new Error('测验草稿目标必须包含班级、课程和单元');
  if (action.paper.questions.length < 1 || action.paper.questions.reduce((sum, question) => sum + question.score, 0) !== action.paper.totalScore) throw new Error('测验试卷载荷校验失败');
}

export class MockQuizActivityDraftAdapter implements QuizActivityDraftAdapter, QuizActivityDraftScenarioController {
  private readonly entries = new Map<string, IdempotencyEntry>();
  private readonly transientFailures = new Set<string>();
  private readonly transientVersionConflicts = new Set<string>();
  private scenario: QuizActivityDraftScenario = 'success';

  constructor(private readonly options: AdapterOptions) {}

  setScenario(scenario: QuizActivityDraftScenario): void {
    this.scenario = scenario;
    this.reset();
  }

  getScenario(): QuizActivityDraftScenario {
    return this.scenario;
  }

  reset(): void {
    this.entries.clear();
    this.transientFailures.clear();
    this.transientVersionConflicts.clear();
  }

  execute(action: CreateQuizActivityDraftAction, approval: QuizActivityDraftApproval): QuizActivityDraftReceipt {
    assertRequest(action, approval);
    const fingerprint = requestFingerprint(action, approval);
    const existing = this.entries.get(action.idempotencyKey);
    if (existing && existing.fingerprint !== fingerprint) throw new Error('幂等键已绑定到不同的测验草稿请求');
    if (existing?.receipt) return existing.receipt;
    this.entries.set(action.idempotencyKey, Object.freeze({ fingerprint }));

    const authoritativeTarget = this.options.targetReader.read(action.target);
    if (!authoritativeTarget || !authoritativeTarget.canCreateDraft
      || authoritativeTarget.classId !== action.target.classId
      || authoritativeTarget.courseId !== action.target.courseId
      || authoritativeTarget.unitId !== action.target.unitId) {
      return this.cache(action, fingerprint, this.failure(action, approval, 'permission_denied'));
    }
    if (authoritativeTarget.version !== action.target.expectedVersion) {
      return this.cache(action, fingerprint, this.failure(action, approval, 'version_conflict', authoritativeTarget.version));
    }

    if (action.permission === 'denied' || this.scenario === 'permission_denied') return this.cache(action, fingerprint, this.failure(action, approval, 'permission_denied'));
    if (this.scenario === 'version_conflict' && !this.transientVersionConflicts.has(action.idempotencyKey)) {
      this.transientVersionConflicts.add(action.idempotencyKey);
      return this.failure(action, approval, 'version_conflict', authoritativeTarget.version);
    }
    if ((this.scenario === 'recoverable_failure' || this.scenario === 'timeout') && !this.transientFailures.has(action.idempotencyKey)) {
      this.transientFailures.add(action.idempotencyKey);
      return this.failure(action, approval, this.scenario);
    }

    const scope = this.options.idempotencyScope?.replace(/[^a-z0-9-]/gi, '-') ?? 'default';
    const activityId = `activity-${action.artifactRef.id.replace(/^artifact-/, '')}-${action.idempotencyKey}-${scope}`;
    const durationMinutes = action.settings.duration.kind === 'unlimited' ? null : action.settings.duration.minutes;
    const activity: ClassActivity = Object.freeze({
      id: activityId, type: 'quiz', title: action.settings.title, status: 'pending', publication: 'draft', scheduledAt: action.settings.startAt,
      detail: `测验 · 草稿 · ${action.paper.questions.length} 题 · ${action.paper.totalScore} 分`,
      quiz: Object.freeze({
        version: 'v1',
        paperArtifactId: action.paper.id, paperArtifactVersion: action.paper.version, questionCount: action.paper.questions.length, totalScore: action.paper.totalScore,
        description: action.settings.description, startAt: action.settings.startAt, endAt: action.settings.endAt, durationMinutes, scoring: action.settings.scoring,
        questions: Object.freeze(action.paper.questions.map((question) => Object.freeze({ ...question, options: question.options ? Object.freeze([...question.options]) : undefined }))),
      }),
    });
    this.options.onDraftCreated(activity, action.target);
    const receipt: SuccessfulQuizActivityDraftReceipt = Object.freeze({
      id: `receipt-${action.id}`, status: 'success', actionId: action.id, approvalId: approval.id, idempotencyKey: action.idempotencyKey,
      executedAt: '2026-08-24T17:45:01+08:00', truthLabel: '[模拟] 测验活动草稿执行回执', result: '测验活动草稿已创建，尚未发布。',
      object: Object.freeze({ id: activityId, version: 'v1', publication: 'draft', label: activity.title, returnUrl: `/teacher/classes/${action.target.classId}?course=${action.target.courseId}&unit=${action.target.unitId}&activity=${activityId}&source=workbuddy` }),
    });
    return this.cache(action, fingerprint, receipt);
  }

  private cache(action: CreateQuizActivityDraftAction, fingerprint: string, receipt: QuizActivityDraftReceipt): QuizActivityDraftReceipt {
    this.entries.set(action.idempotencyKey, Object.freeze({ fingerprint, receipt }));
    return receipt;
  }

  private failure(action: CreateQuizActivityDraftAction, approval: QuizActivityDraftApproval, status: Exclude<QuizActivityDraftScenario, 'success'>, currentVersion?: string): FailedQuizActivityDraftReceipt {
    const common = Object.freeze({
      id: `receipt-${action.id}-${status}`, actionId: action.id, approvalId: approval.id, idempotencyKey: action.idempotencyKey,
      executedAt: '2026-08-24T17:45:01+08:00', truthLabel: '[模拟] 测验活动草稿执行回执' as const,
    });
    if (status === 'permission_denied') return Object.freeze({ ...common, status, result: '当前教师无权在目标单元创建测验草稿。', recovery: 'choose-another-target', unexecutedTarget: action.target.unitId });
    if (status === 'version_conflict') return Object.freeze({ ...common, status, result: '目标单元版本已变化，请刷新后重新确认。', recovery: 'compare-and-reconfirm', unexecutedTarget: action.target.unitId, expectedVersion: action.target.expectedVersion, currentVersion: currentVersion ?? `${action.target.expectedVersion}-changed` });
    return Object.freeze({ ...common, status, result: status === 'timeout' ? '请求超时，尚未产生可确认副作用。' : '写回暂时失败，尚未产生副作用。', recovery: 'retry', unexecutedTarget: action.target.unitId });
  }
}
