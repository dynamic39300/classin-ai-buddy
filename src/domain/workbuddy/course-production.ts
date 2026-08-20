export type CoursewareRunStage = 'needs_information' | 'awaiting_plan_confirmation' | 'artifact_ready';

export type CoursewareBrief = Readonly<{
  durationMinutes: number;
  teachingApproach: string;
  expectedPages: number;
}>;

export type CoursewarePlanStep = Readonly<{
  id: string;
  title: string;
  capability: string;
  expectedOutput: string;
}>;

export type CoursewareRunEvent = Readonly<{
  id: string;
  title: string;
  summary: string;
  capability?: string;
  state: 'completed';
}>;

export type CoursewareArtifactDraft = Readonly<{
  id: 'artifact-courseware-momentum-v1';
  kind: 'courseware';
  version: 'v1';
  title: string;
  pageCount: number;
  sourceStepId: 'step-generate-courseware';
  validationState: 'passed';
  validationSummary: string;
  truthLabel: '固定 Mock ArtifactDraft · 未写入 ClassIn';
}>;

export type SingleCoursewareRun = Readonly<{
  fixtureVersion: 'workbuddy-m4-course-production-v1';
  id: 'run-m4-courseware';
  taskType: 'single-courseware';
  title: '生成动量守恒模型课件';
  goal: string;
  contextSnapshotId: string;
  stage: CoursewareRunStage;
  brief: CoursewareBrief;
  plan: readonly CoursewarePlanStep[];
  events: readonly CoursewareRunEvent[];
  artifact: CoursewareArtifactDraft | null;
  revision: number;
  supersededEvidence: readonly Readonly<{ snapshotId: string; artifact: CoursewareArtifactDraft | null; actionId?: string; receiptId?: string; reason: string }>[];
}>;

const PLAN: readonly CoursewarePlanStep[] = Object.freeze([
  Object.freeze({ id: 'step-analyze-goal', title: '理解教学目标', capability: 'goal-interpreter', expectedOutput: '目标与课时约束' }),
  Object.freeze({ id: 'step-design-structure', title: '设计教学结构', capability: 'lesson-structure', expectedOutput: '导入、建模、例题与练习结构' }),
  Object.freeze({ id: 'step-generate-courseware', title: '组装课件初稿', capability: 'courseware-renderer', expectedOutput: '可审阅课件 ArtifactDraft' }),
  Object.freeze({ id: 'step-validate-courseware', title: '检查教学与内容质量', capability: 'courseware-quality-check', expectedOutput: '验证结果与修改建议' }),
]);

const EVENTS: readonly CoursewareRunEvent[] = Object.freeze([
  Object.freeze({ id: 'event-context', title: 'ContextSnapshot 已载入', summary: '冻结的教学范围与资源引用已校验。', state: 'completed' as const }),
  Object.freeze({ id: 'event-plan', title: '任务计划已确认', summary: '教师确认四步执行计划与课件交付物。', state: 'completed' as const }),
  Object.freeze({ id: 'event-structure', title: '教学结构已生成', summary: '从碰撞实验进入动量守恒模型，再进入例题与练习。', capability: 'lesson-structure', state: 'completed' as const }),
  Object.freeze({ id: 'event-draft', title: '课件草稿已组装', summary: '固定 Mock 课件页面与讲解结构已形成。', capability: 'courseware-renderer', state: 'completed' as const }),
  Object.freeze({ id: 'event-validation', title: '质量检查通过', summary: '目标、结构、术语与练习覆盖检查通过。', capability: 'courseware-quality-check', state: 'completed' as const }),
]);

function freezeRun(run: Omit<SingleCoursewareRun, 'brief'> & { brief: CoursewareBrief }): SingleCoursewareRun {
  return Object.freeze({ ...run, brief: Object.freeze({ ...run.brief }) });
}

export function createSingleCoursewareRun(goal: string, contextSnapshotId: string): SingleCoursewareRun {
  return freezeRun({
    fixtureVersion: 'workbuddy-m4-course-production-v1',
    id: 'run-m4-courseware',
    taskType: 'single-courseware',
    title: '生成动量守恒模型课件',
    goal: goal.trim(),
    contextSnapshotId,
    stage: 'needs_information',
    brief: { durationMinutes: 45, teachingApproach: '实验探究', expectedPages: 18 },
    plan: PLAN,
    events: Object.freeze([]),
    artifact: null,
    revision: 1,
    supersededEvidence: Object.freeze([]),
  });
}

export function replanCoursewareRun(run: SingleCoursewareRun, newContextSnapshotId: string, evidence?: Readonly<{ actionId?: string; receiptId?: string }>): SingleCoursewareRun {
  const superseded = Object.freeze({ snapshotId: run.contextSnapshotId, artifact: run.artifact, actionId: evidence?.actionId, receiptId: evidence?.receiptId, reason: '主教学范围从高二物理 3 班调整为高二物理 1 班' });
  return freezeRun({ ...run, contextSnapshotId: newContextSnapshotId, stage: 'needs_information', events: Object.freeze([]), artifact: null, revision: run.revision + 1, supersededEvidence: Object.freeze([...run.supersededEvidence, superseded]) });
}

export function updateCoursewareBrief(run: SingleCoursewareRun, patch: Partial<CoursewareBrief>): SingleCoursewareRun {
  if (run.stage !== 'needs_information') return run;
  const brief = {
    ...run.brief,
    ...patch,
    durationMinutes: Math.max(10, Math.min(120, patch.durationMinutes ?? run.brief.durationMinutes)),
    expectedPages: Math.max(6, Math.min(40, patch.expectedPages ?? run.brief.expectedPages)),
  };
  return freezeRun({ ...run, brief });
}

export function confirmCoursewareBrief(run: SingleCoursewareRun): SingleCoursewareRun {
  if (run.stage !== 'needs_information') return run;
  return freezeRun({ ...run, stage: 'awaiting_plan_confirmation' });
}

export function reviseCoursewareBrief(run: SingleCoursewareRun): SingleCoursewareRun {
  if (run.stage !== 'awaiting_plan_confirmation') return run;
  return freezeRun({ ...run, stage: 'needs_information' });
}

export function executeCoursewarePlan(run: SingleCoursewareRun): SingleCoursewareRun {
  if (run.stage !== 'awaiting_plan_confirmation') return run;
  const artifact: CoursewareArtifactDraft = Object.freeze({
    id: 'artifact-courseware-momentum-v1',
    kind: 'courseware',
    version: 'v1',
    title: '动量守恒模型：从碰撞实验到守恒定律',
    pageCount: run.brief.expectedPages,
    sourceStepId: 'step-generate-courseware',
    validationState: 'passed',
    validationSummary: '教学目标、内容结构、术语与课堂练习覆盖检查通过',
    truthLabel: '固定 Mock ArtifactDraft · 未写入 ClassIn',
  });
  return freezeRun({ ...run, stage: 'artifact_ready', events: EVENTS, artifact });
}
