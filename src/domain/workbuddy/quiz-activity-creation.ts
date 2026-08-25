import { EvaluationModule, type EvaluationEvent } from './evaluation';

export type QuizQuestionType = 'single-choice' | 'multiple-choice' | 'judgement' | 'fill-blank' | 'short-answer' | 'comprehensive';
export type QuizDifficulty = 'easy' | 'relatively-easy' | 'medium' | 'relatively-hard' | 'hard';
export type QuizScoringScheme = 'score' | 'percentage' | 'excellent-good' | 'abcd' | 'unscored';

export type QuizQuestion = Readonly<{
  id: string;
  type: QuizQuestionType;
  prompt: string;
  options?: readonly string[];
  answer: string;
  explanation: string;
  difficulty: QuizDifficulty;
  score: number;
}>;

export type QuizPaperArtifact = Readonly<{
  id: string;
  version: string;
  title: string;
  description: string;
  questions: readonly QuizQuestion[];
  totalScore: number;
  validation: Readonly<{ status: 'passed'; summary: string }>;
  truthLabel: '[模拟] 测验试卷草稿';
}>;

export type QuizPaperBrief = Readonly<{
  questionCount: number;
  totalScore: number;
  questionTypes: readonly QuizQuestionType[];
}>;

export type QuizPaperReview = Readonly<{
  artifactRef: Readonly<{ id: string; version: string }>;
  status: 'approved';
  reviewedBy: string;
  reviewedAt: string;
}>;

export type QuizDuration = Readonly<{ kind: 'unlimited' }> | Readonly<{ kind: 'preset' | 'custom'; minutes: number }>;
export type QuizActivitySettings = Readonly<{
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  duration: QuizDuration;
  scoring: QuizScoringScheme;
}>;

export type QuizActivityTarget = Readonly<{
  classId: string;
  courseId: string;
  unitId: string;
  expectedVersion: string;
  label: string;
}>;

export type CreateQuizActivityDraftAction = Readonly<{
  id: string;
  kind: 'create-quiz-activity-draft';
  runRef: string;
  contextSnapshotId: string;
  status: 'proposed' | 'approved';
  artifactRef: Readonly<{ id: string; version: string }>;
  paper: QuizPaperArtifact;
  target: QuizActivityTarget;
  settings: QuizActivitySettings;
  publication: 'draft';
  difference: string;
  impact: string;
  permission: 'allowed' | 'denied';
  risk: 'low';
  reversible: true;
  expiresAt: string;
  idempotencyKey: string;
}>;

export type QuizActivityDraftApproval = Readonly<{
  id: string;
  actionId: string;
  decision: 'approved';
  decidedBy: string;
  decidedAt: string;
}>;

type QuizReceiptBase = Readonly<{
  id: string;
  actionId: string;
  approvalId: string;
  idempotencyKey: string;
  executedAt: string;
  truthLabel: '[模拟] 测验活动草稿执行回执';
  result: string;
}>;

export type SuccessfulQuizActivityDraftReceipt = QuizReceiptBase & Readonly<{
  status: 'success';
  object: Readonly<{
    id: string;
    version: string;
    publication: 'draft';
    label: string;
    returnUrl: string;
  }>;
}>;

export type FailedQuizActivityDraftReceipt = QuizReceiptBase & (
  | Readonly<{ status: 'permission_denied'; recovery: 'choose-another-target'; unexecutedTarget: string }>
  | Readonly<{ status: 'version_conflict'; recovery: 'compare-and-reconfirm'; unexecutedTarget: string; expectedVersion: string; currentVersion: string }>
  | Readonly<{ status: 'recoverable_failure' | 'timeout'; recovery: 'retry'; unexecutedTarget: string }>
  | Readonly<{ status: 'evidence_mismatch'; recovery: 'manual-review'; retainedObjectId?: string }>
);

export type QuizActivityDraftReceipt = SuccessfulQuizActivityDraftReceipt | FailedQuizActivityDraftReceipt;
export type QuizActivityRunStage = 'needs_parameters' | 'plan_ready' | 'generating' | 'awaiting_paper_review' | 'awaiting_activity_parameters' | 'artifact_saved' | 'awaiting_approval' | 'creating_draft' | 'draft_created' | 'permission_denied' | 'version_conflict' | 'recoverable_failure' | 'timeout' | 'evidence_mismatch';

export type QuizActivityCreationRun = Readonly<{
  fixtureVersion: 'workbuddy-quiz-activity-v1';
  id: string;
  taskType: 'quiz-activity-creation';
  goal: string;
  contextSnapshotId: string;
  target: QuizActivityTarget;
  stage: QuizActivityRunStage;
  brief: QuizPaperBrief;
  artifact: QuizPaperArtifact | null;
  paperReview: QuizPaperReview | null;
  settings: QuizActivitySettings;
  settingsRevision: number;
  action: CreateQuizActivityDraftAction | null;
  approval: QuizActivityDraftApproval | null;
  receipt: QuizActivityDraftReceipt | null;
  evaluation: EvaluationEvent | null;
  allowedCommands: readonly string[];
  recovery: string | null;
  createdAt: string;
}>;

function freezeArtifact(artifact: QuizPaperArtifact): QuizPaperArtifact {
  return Object.freeze({
    ...artifact,
    questions: Object.freeze(artifact.questions.map((question) => Object.freeze({
      ...question,
      options: question.options ? Object.freeze([...question.options]) : undefined,
    }))),
    validation: Object.freeze({ ...artifact.validation }),
  });
}

function freezeRun(run: QuizActivityCreationRun): QuizActivityCreationRun {
  return Object.freeze({
    ...run,
    target: Object.freeze({ ...run.target }),
    brief: Object.freeze({ ...run.brief, questionTypes: Object.freeze([...run.brief.questionTypes]) }),
    settings: Object.freeze({ ...run.settings, duration: Object.freeze({ ...run.settings.duration }) }),
    artifact: run.artifact ? freezeArtifact(run.artifact) : null,
    paperReview: run.paperReview ? Object.freeze({ ...run.paperReview, artifactRef: Object.freeze({ ...run.paperReview.artifactRef }) }) : null,
    action: run.action ? Object.freeze({
      ...run.action,
      artifactRef: Object.freeze({ ...run.action.artifactRef }),
      paper: freezeArtifact(run.action.paper),
      target: Object.freeze({ ...run.action.target }),
      settings: Object.freeze({ ...run.action.settings, duration: Object.freeze({ ...run.action.settings.duration }) }),
    }) : null,
    approval: run.approval ? Object.freeze({ ...run.approval }) : null,
    receipt: run.receipt ? Object.freeze({ ...run.receipt }) : null,
    allowedCommands: Object.freeze([...run.allowedCommands]),
  });
}

function validateArtifact(artifact: QuizPaperArtifact): void {
  if (artifact.questions.length < 1 || artifact.questions.length > 200) throw new Error('试卷题数必须在 1 到 200 之间');
  const total = artifact.questions.reduce((sum, question) => sum + question.score, 0);
  if (artifact.totalScore !== total) throw new Error('试卷总分必须等于所有题目分值之和');
  if (artifact.questions.some((question) => !question.prompt.trim() || !question.answer.trim() || !question.explanation.trim() || question.score <= 0)) throw new Error('每道题必须包含题干、答案、解析和正分值');
  if (artifact.questions.some((question) => question.type === 'single-choice' && (!question.options?.length || !question.options.includes(question.answer)))) throw new Error('单选题必须包含有效选项与答案');
  if (artifact.questions.some((question) => {
    if (question.type !== 'multiple-choice') return false;
    if (!question.options?.length) return true;
    const answers = question.answer.split(/[、,，;；]/).map((answer) => answer.trim()).filter(Boolean);
    return answers.length < 2 || answers.some((answer) => !question.options!.includes(answer));
  })) throw new Error('多选题答案必须由两个或以上有效选项组成');
  if (artifact.questions.some((question) => question.type === 'judgement' && !['正确', '错误', 'true', 'false'].includes(question.answer.trim().toLocaleLowerCase()))) throw new Error('判断题答案必须是明确的正确或错误');
}

function validateSettings(settings: QuizActivitySettings): QuizActivitySettings {
  const title = settings.title.trim();
  if (!title) throw new Error('请输入测验活动标题');
  const startAt = new Date(settings.startAt).getTime();
  const endAt = new Date(settings.endAt).getTime();
  if (!Number.isFinite(startAt) || !Number.isFinite(endAt)) throw new Error('请输入有效日期');
  if (endAt <= startAt) throw new Error('测验截止时间必须晚于开始时间');
  if (settings.duration.kind !== 'unlimited' && (!Number.isInteger(settings.duration.minutes) || settings.duration.minutes <= 0)) throw new Error('答题限时必须为正整数');
  return Object.freeze({
    ...settings,
    title,
    description: settings.description.trim(),
    startAt: new Date(startAt).toISOString(),
    endAt: new Date(endAt).toISOString(),
    duration: Object.freeze({ ...settings.duration }),
  });
}

function create(input: Readonly<{ runId: string; contextSnapshotId: string; goal: string; target: QuizActivityTarget; now: string }>): QuizActivityCreationRun {
  if (!input.goal.trim()) throw new Error('请输入测验目标');
  if (!input.target.classId || !input.target.courseId || !input.target.unitId) throw new Error('创建测验草稿必须确认班级、课程和单元');
  return freezeRun({
    fixtureVersion: 'workbuddy-quiz-activity-v1', id: input.runId, taskType: 'quiz-activity-creation', goal: input.goal.trim(), contextSnapshotId: input.contextSnapshotId,
    target: input.target, stage: 'needs_parameters',
    brief: { questionCount: 5, totalScore: 100, questionTypes: ['single-choice', 'multiple-choice', 'judgement', 'fill-blank', 'short-answer'] },
    artifact: null, paperReview: null,
    settings: { title: '动量守恒单元诊断测验', description: '用于检查动量、方向与守恒条件。', startAt: '2026-08-25T09:00:00+08:00', endAt: '2026-08-26T22:00:00+08:00', duration: { kind: 'preset', minutes: 40 }, scoring: 'score' }, settingsRevision: 1,
    action: null, approval: null, receipt: null, evaluation: null,
    allowedCommands: ['update-paper-brief', 'generate-paper'], recovery: 'complete-paper-parameters', createdAt: input.now,
  });
}

function updatePaperBrief(run: QuizActivityCreationRun, patch: Partial<QuizPaperBrief>): QuizActivityCreationRun {
  if (run.stage !== 'needs_parameters') return run;
  const questionCount = Math.max(1, Math.min(200, patch.questionCount ?? run.brief.questionCount));
  const totalScore = Math.max(1, patch.totalScore ?? run.brief.totalScore);
  return freezeRun({ ...run, brief: { ...run.brief, ...patch, questionCount, totalScore }, action: null, approval: null, receipt: null, evaluation: null });
}

function confirmPaperBrief(run: QuizActivityCreationRun): QuizActivityCreationRun {
  if (run.stage !== 'needs_parameters') return run;
  return freezeRun({ ...run, stage: 'plan_ready', allowedCommands: ['begin-generation'], recovery: 'start-or-revise-paper-plan' });
}

function beginGeneration(run: QuizActivityCreationRun): QuizActivityCreationRun {
  if (run.stage !== 'plan_ready') return run;
  return freezeRun({ ...run, stage: 'generating', allowedCommands: ['complete-generation'], recovery: 'wait-for-generation' });
}

function generatePaper(run: QuizActivityCreationRun, artifact: QuizPaperArtifact): QuizActivityCreationRun {
  if (run.stage !== 'generating') return run;
  validateArtifact(artifact);
  if (artifact.questions.length !== run.brief.questionCount || artifact.totalScore !== run.brief.totalScore) throw new Error('生成试卷与已确认结构不一致');
  const runArtifact = freezeArtifact({ ...artifact, id: `${artifact.id}-${run.id}` });
  return freezeRun({ ...run, stage: 'awaiting_paper_review', artifact: runArtifact, paperReview: null, settings: { ...run.settings, title: runArtifact.title, description: runArtifact.description }, allowedCommands: ['approve-paper'], recovery: 'review-and-approve-paper' });
}

function approvePaper(run: QuizActivityCreationRun, input: Readonly<{ teacherId: string; reviewedAt: string }>): QuizActivityCreationRun {
  if (run.stage !== 'awaiting_paper_review' || !run.artifact) return run;
  const paperReview: QuizPaperReview = Object.freeze({
    artifactRef: Object.freeze({ id: run.artifact.id, version: run.artifact.version }),
    status: 'approved',
    reviewedBy: input.teacherId,
    reviewedAt: input.reviewedAt,
  });
  return freezeRun({ ...run, stage: 'awaiting_activity_parameters', paperReview, allowedCommands: ['update-activity-settings', 'propose-draft'], recovery: 'complete-activity-parameters' });
}

function recordArtifactSaved(run: QuizActivityCreationRun): QuizActivityCreationRun {
  if (run.stage !== 'awaiting_activity_parameters' || !run.artifact || !run.paperReview) return run;
  return freezeRun({ ...run, stage: 'artifact_saved', allowedCommands: ['open-personal-content'], recovery: null });
}

function updateActivitySettings(run: QuizActivityCreationRun, patch: Partial<QuizActivitySettings>): QuizActivityCreationRun {
  if (run.stage !== 'awaiting_activity_parameters' && run.stage !== 'awaiting_approval') return run;
  const settings = validateSettings({ ...run.settings, ...patch });
  const changed = JSON.stringify(settings) !== JSON.stringify(run.settings);
  return freezeRun({ ...run, stage: 'awaiting_activity_parameters', settings, settingsRevision: changed ? run.settingsRevision + 1 : run.settingsRevision, action: null, approval: null, receipt: null, evaluation: null, allowedCommands: ['update-activity-settings', 'propose-draft'], recovery: 'complete-activity-parameters' });
}

function proposeDraft(run: QuizActivityCreationRun, input: Readonly<{ actionId: string; expiresAt: string; idempotencyKey: string }>): QuizActivityCreationRun {
  if (run.stage !== 'awaiting_activity_parameters' || !run.artifact || !run.paperReview
    || run.paperReview.artifactRef.id !== run.artifact.id || run.paperReview.artifactRef.version !== run.artifact.version) return run;
  const settings = validateSettings(run.settings);
  const action: CreateQuizActivityDraftAction = Object.freeze({
    id: input.actionId, kind: 'create-quiz-activity-draft', runRef: run.id, contextSnapshotId: run.contextSnapshotId, status: 'proposed',
    artifactRef: Object.freeze({ id: run.artifact.id, version: run.artifact.version }), paper: freezeArtifact(run.artifact), target: Object.freeze({ ...run.target }), settings,
    publication: 'draft', difference: `在 ${run.target.label} 新增 1 个测验活动草稿（${run.artifact.questions.length} 题，${run.artifact.totalScore} 分）`,
    impact: '仅创建教师可见草稿，不会发布；需前往班级课程详情审阅后另行发布。', permission: 'allowed', risk: 'low', reversible: true,
    expiresAt: input.expiresAt, idempotencyKey: input.idempotencyKey,
  });
  return freezeRun({ ...run, stage: 'awaiting_approval', action, approval: null, receipt: null, evaluation: null, allowedCommands: ['approve-draft', 'update-activity-settings'], recovery: 'approve-or-revise-draft' });
}

function approveDraft(run: QuizActivityCreationRun, input: Readonly<{ approvalId: string; teacherId: string; decidedAt: string }>): QuizActivityCreationRun {
  if (run.stage !== 'awaiting_approval' || !run.action || run.action.status !== 'proposed') return run;
  const action = Object.freeze({ ...run.action, status: 'approved' as const });
  const approval = Object.freeze({ id: input.approvalId, actionId: action.id, decision: 'approved' as const, decidedBy: input.teacherId, decidedAt: input.decidedAt });
  return freezeRun({ ...run, stage: 'creating_draft', action, approval, allowedCommands: ['execute-draft'], recovery: 'execute-approved-draft' });
}

function recordReceipt(run: QuizActivityCreationRun, receipt: QuizActivityDraftReceipt): QuizActivityCreationRun {
  if (run.stage !== 'creating_draft' || !run.action || !run.approval) return run;
  const evidenceMatches = receipt.actionId === run.action.id && receipt.approvalId === run.approval.id && receipt.idempotencyKey === run.action.idempotencyKey;
  if (!evidenceMatches) return freezeRun({ ...run, stage: 'evidence_mismatch', receipt: Object.freeze({ ...receipt, status: 'evidence_mismatch', recovery: 'manual-review', result: '执行证据与当前批准不一致，需人工复查。' } as FailedQuizActivityDraftReceipt), allowedCommands: ['manual-review'], recovery: 'manual-review' });
  const evaluation = run.artifact ? EvaluationModule.recordExecutionOutcome({
    runRef: run.id, contextSnapshotRef: run.contextSnapshotId, artifactRef: { id: run.artifact.id, version: run.artifact.version },
    action: run.action, approval: run.approval, receipt,
  }) : null;
  if (receipt.status === 'success') return freezeRun({ ...run, stage: 'draft_created', receipt, evaluation, allowedCommands: ['open-class-detail'], recovery: null });
  const commands = receipt.status === 'permission_denied' ? ['close-and-request-permission'] : receipt.status === 'version_conflict' ? ['refresh-target'] : ['retry-draft'];
  return freezeRun({ ...run, stage: receipt.status, receipt, evaluation, allowedCommands: commands, recovery: receipt.recovery });
}

function retryDraft(run: QuizActivityCreationRun): QuizActivityCreationRun {
  if ((run.stage !== 'recoverable_failure' && run.stage !== 'timeout') || !run.action || !run.approval) return run;
  return freezeRun({ ...run, stage: 'creating_draft', receipt: null, evaluation: null, allowedCommands: ['execute-draft'], recovery: 'execute-approved-draft' });
}

function refreshTarget(run: QuizActivityCreationRun): QuizActivityCreationRun {
  if (run.stage !== 'version_conflict' || run.receipt?.status !== 'version_conflict') return run;
  return freezeRun({
    ...run,
    stage: 'awaiting_activity_parameters',
    target: { ...run.target, expectedVersion: run.receipt.currentVersion },
    action: null,
    approval: null,
    receipt: null,
    evaluation: null,
    allowedCommands: ['update-activity-settings', 'propose-draft'],
    recovery: 'reconfirm-refreshed-target',
  });
}

export const QuizActivityCreationModule = Object.freeze({ create, updatePaperBrief, confirmPaperBrief, beginGeneration, generatePaper, approvePaper, recordArtifactSaved, updateActivitySettings, proposeDraft, approveDraft, recordReceipt, retryDraft, refreshTarget });
