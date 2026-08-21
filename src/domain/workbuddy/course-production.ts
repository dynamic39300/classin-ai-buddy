import type { ExecutionReceipt, ProposedAction } from './writeback';

export type CoursewareRunStage = 'needs_information' | 'awaiting_plan_confirmation' | 'artifact_ready';

export type CoursewareBrief = Readonly<{ durationMinutes: number; teachingApproach: string; expectedPages: number }>;
export type CoursewarePlanStep = Readonly<{ id: string; title: string; capability: string; capabilitySummary: string; expectedOutput: string }>;
export type CoursewareRunEvent = Readonly<{ id: string; title: string; summary: string; capability?: string; state: 'completed' }>;
export type CoursewareArtifactDraft = Readonly<{
  id: string; kind: 'courseware'; version: string; title: string; pageCount: number; sourceStepId: string;
  validationState: 'passed'; validationSummary: string; truthLabel: string;
  revisionInstruction?: string; changeSummary?: readonly string[];
}>;
type SingleCoursewareRunBase = Readonly<{
  fixtureVersion: 'workbuddy-m4-course-production-v1'; id: string; taskType: 'single-courseware'; title: string; goal: string; contextSnapshotId: string;
  brief: CoursewareBrief; plan: readonly CoursewarePlanStep[]; events: readonly CoursewareRunEvent[]; artifactHistory: readonly CoursewareArtifactDraft[]; revision: number;
  supersededEvidence: readonly Readonly<{
    snapshotId: string; artifact: CoursewareArtifactDraft | null; artifactHistory: readonly CoursewareArtifactDraft[]; plan: readonly CoursewarePlanStep[];
    events: readonly CoursewareRunEvent[]; action?: ProposedAction; receipt?: ExecutionReceipt; reason: string;
  }>[];
}>;
export type SingleCoursewareRun = SingleCoursewareRunBase & (
  | Readonly<{ stage: 'needs_information'; artifact: null; reviewStatus: 'not_available'; allowedCommands: readonly ['update-brief', 'confirm-brief']; recovery: 'complete-required-information' }>
  | Readonly<{ stage: 'awaiting_plan_confirmation'; artifact: null; reviewStatus: 'not_available'; allowedCommands: readonly ['revise-brief', 'execute-plan']; recovery: 'confirm-or-revise-plan' }>
  | Readonly<{ stage: 'artifact_ready'; artifact: CoursewareArtifactDraft; reviewStatus: 'pending'; allowedCommands: readonly ['review-artifact', 'revise-artifact', 'approve-artifact', 'replan']; recovery: null }>
  | Readonly<{ stage: 'artifact_ready'; artifact: CoursewareArtifactDraft; reviewStatus: 'approved'; allowedCommands: readonly ['review-artifact', 'revise-artifact', 'propose-save', 'derive-package', 'replan']; recovery: null }>
);
export type CoursewareRunDefinition = Readonly<{
  fixtureVersion: 'workbuddy-m4-course-production-v1'; id: string; title: string; initialBrief: CoursewareBrief; plan: readonly CoursewarePlanStep[];
}>;
export type CoursewareExecutionOutput = Readonly<{ events: readonly CoursewareRunEvent[]; artifact: CoursewareArtifactDraft }>;
export type CoursewareArtifactRevisionInput = Readonly<{ instruction: string; changes: readonly string[] }>;

function freezeRun(run: SingleCoursewareRun): SingleCoursewareRun {
  return Object.freeze({
    ...run,
    brief: Object.freeze({ ...run.brief }),
    plan: Object.freeze(run.plan.map((step) => Object.freeze({ ...step }))),
    events: Object.freeze(run.events.map((event) => Object.freeze({ ...event }))),
    artifactHistory: Object.freeze(run.artifactHistory.map((artifact) => Object.freeze({
      ...artifact,
      changeSummary: artifact.changeSummary ? Object.freeze([...artifact.changeSummary]) : undefined,
    }))),
    supersededEvidence: Object.freeze(run.supersededEvidence.map((evidence) => Object.freeze({
      ...evidence,
      plan: Object.freeze([...evidence.plan]),
      events: Object.freeze([...evidence.events]),
      artifactHistory: Object.freeze([...evidence.artifactHistory]),
    }))),
  });
}

export function createSingleCoursewareRun(definition: CoursewareRunDefinition, goal: string, contextSnapshotId: string): SingleCoursewareRun {
  return freezeRun({
    fixtureVersion: definition.fixtureVersion, id: definition.id, taskType: 'single-courseware', title: definition.title,
    goal: goal.trim(), contextSnapshotId, stage: 'needs_information', brief: definition.initialBrief, plan: definition.plan,
    events: Object.freeze([]), artifact: null, artifactHistory: Object.freeze([]), revision: 1, supersededEvidence: Object.freeze([]),
    reviewStatus: 'not_available',
    allowedCommands: Object.freeze(['update-brief', 'confirm-brief']), recovery: 'complete-required-information',
  });
}

export function replanCoursewareRun(
  run: SingleCoursewareRun,
  newContextSnapshotId: string,
  reason: string,
  replacement: Readonly<{ title: string; goal: string; plan: readonly CoursewarePlanStep[] }>,
  evidence?: Readonly<{ action?: ProposedAction; receipt?: ExecutionReceipt }>,
): SingleCoursewareRun {
  const superseded = Object.freeze({
    snapshotId: run.contextSnapshotId, artifact: run.artifact, artifactHistory: run.artifactHistory, plan: run.plan, events: run.events,
    action: evidence?.action, receipt: evidence?.receipt, reason,
  });
  return freezeRun({
    ...run, title: replacement.title.trim(), goal: replacement.goal.trim(), plan: replacement.plan, contextSnapshotId: newContextSnapshotId, stage: 'needs_information', events: Object.freeze([]), artifact: null, artifactHistory: Object.freeze([]),
    reviewStatus: 'not_available',
    allowedCommands: Object.freeze(['update-brief', 'confirm-brief']), recovery: 'complete-required-information',
    revision: run.revision + 1, supersededEvidence: Object.freeze([...run.supersededEvidence, superseded]),
  });
}

export function updateCoursewareBrief(run: SingleCoursewareRun, patch: Partial<CoursewareBrief>): SingleCoursewareRun {
  if (run.stage !== 'needs_information') return run;
  const brief = {
    ...run.brief, ...patch,
    durationMinutes: Math.max(10, Math.min(120, patch.durationMinutes ?? run.brief.durationMinutes)),
    expectedPages: Math.max(6, Math.min(40, patch.expectedPages ?? run.brief.expectedPages)),
  };
  return freezeRun({ ...run, brief });
}

export function confirmCoursewareBrief(run: SingleCoursewareRun): SingleCoursewareRun {
  return run.stage === 'needs_information' ? freezeRun({ ...run, stage: 'awaiting_plan_confirmation', reviewStatus: 'not_available', allowedCommands: Object.freeze(['revise-brief', 'execute-plan']), recovery: 'confirm-or-revise-plan' }) : run;
}

export function reviseCoursewareBrief(run: SingleCoursewareRun): SingleCoursewareRun {
  return run.stage === 'awaiting_plan_confirmation' ? freezeRun({ ...run, stage: 'needs_information', reviewStatus: 'not_available', allowedCommands: Object.freeze(['update-brief', 'confirm-brief']), recovery: 'complete-required-information' }) : run;
}

export function executeCoursewarePlan(run: SingleCoursewareRun, output: CoursewareExecutionOutput): SingleCoursewareRun {
  if (run.stage !== 'awaiting_plan_confirmation') return run;
  const artifact = Object.freeze({ ...output.artifact, pageCount: run.brief.expectedPages });
  return freezeRun({ ...run, stage: 'artifact_ready', events: output.events, artifact, artifactHistory: Object.freeze([artifact]), reviewStatus: 'pending', allowedCommands: Object.freeze(['review-artifact', 'revise-artifact', 'approve-artifact', 'replan']), recovery: null });
}

export function reviseCoursewareArtifact(
  run: SingleCoursewareRun,
  input: CoursewareArtifactRevisionInput,
): SingleCoursewareRun {
  if (run.stage !== 'artifact_ready' || !input.instruction.trim() || input.changes.length === 0) return run;
  const nextVersion = `v${run.artifactHistory.length + 1}`;
  const artifact = Object.freeze({
    ...run.artifact,
    version: nextVersion,
    pageCount: run.artifact.pageCount + 1,
    revisionInstruction: input.instruction.trim(),
    changeSummary: Object.freeze([...input.changes]),
    validationSummary: `${run.artifact.validationSummary}；AI 修改范围已复查`,
  });
  return freezeRun({
    ...run,
    artifact,
    artifactHistory: Object.freeze([...run.artifactHistory, artifact]),
    reviewStatus: 'pending',
    allowedCommands: Object.freeze(['review-artifact', 'revise-artifact', 'approve-artifact', 'replan']),
    recovery: null,
  });
}

export function approveCoursewareArtifact(run: SingleCoursewareRun): SingleCoursewareRun {
  if (run.stage !== 'artifact_ready' || run.reviewStatus !== 'pending') return run;
  return freezeRun({
    ...run,
    reviewStatus: 'approved',
    allowedCommands: Object.freeze(['review-artifact', 'revise-artifact', 'propose-save', 'derive-package', 'replan']),
  });
}
