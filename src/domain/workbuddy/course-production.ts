export type CoursewareRunStage = 'needs_information' | 'awaiting_plan_confirmation' | 'artifact_ready';

export type CoursewareBrief = Readonly<{ durationMinutes: number; teachingApproach: string; expectedPages: number }>;
export type CoursewarePlanStep = Readonly<{ id: string; title: string; capability: string; expectedOutput: string }>;
export type CoursewareRunEvent = Readonly<{ id: string; title: string; summary: string; capability?: string; state: 'completed' }>;
export type CoursewareArtifactDraft = Readonly<{
  id: string; kind: 'courseware'; version: string; title: string; pageCount: number; sourceStepId: string;
  validationState: 'passed'; validationSummary: string; truthLabel: string;
}>;
export type SingleCoursewareRun = Readonly<{
  fixtureVersion: string; id: string; taskType: 'single-courseware'; title: string; goal: string; contextSnapshotId: string;
  stage: CoursewareRunStage; brief: CoursewareBrief; plan: readonly CoursewarePlanStep[]; events: readonly CoursewareRunEvent[];
  artifact: CoursewareArtifactDraft | null; revision: number;
  supersededEvidence: readonly Readonly<{
    snapshotId: string; artifact: CoursewareArtifactDraft | null; plan: readonly CoursewarePlanStep[];
    events: readonly CoursewareRunEvent[]; actionId?: string; receiptId?: string; reason: string;
  }>[];
}>;
export type CoursewareRunDefinition = Readonly<{
  fixtureVersion: string; id: string; title: string; initialBrief: CoursewareBrief; plan: readonly CoursewarePlanStep[];
}>;
export type CoursewareExecutionOutput = Readonly<{ events: readonly CoursewareRunEvent[]; artifact: CoursewareArtifactDraft }>;

function freezeRun(run: SingleCoursewareRun): SingleCoursewareRun {
  return Object.freeze({
    ...run,
    brief: Object.freeze({ ...run.brief }),
    plan: Object.freeze(run.plan.map((step) => Object.freeze({ ...step }))),
    events: Object.freeze(run.events.map((event) => Object.freeze({ ...event }))),
    supersededEvidence: Object.freeze(run.supersededEvidence.map((evidence) => Object.freeze({
      ...evidence,
      plan: Object.freeze([...evidence.plan]),
      events: Object.freeze([...evidence.events]),
    }))),
  });
}

export function createSingleCoursewareRun(definition: CoursewareRunDefinition, goal: string, contextSnapshotId: string): SingleCoursewareRun {
  return freezeRun({
    fixtureVersion: definition.fixtureVersion, id: definition.id, taskType: 'single-courseware', title: definition.title,
    goal: goal.trim(), contextSnapshotId, stage: 'needs_information', brief: definition.initialBrief, plan: definition.plan,
    events: Object.freeze([]), artifact: null, revision: 1, supersededEvidence: Object.freeze([]),
  });
}

export function replanCoursewareRun(
  run: SingleCoursewareRun,
  newContextSnapshotId: string,
  reason: string,
  evidence?: Readonly<{ actionId?: string; receiptId?: string }>,
): SingleCoursewareRun {
  const superseded = Object.freeze({
    snapshotId: run.contextSnapshotId, artifact: run.artifact, plan: run.plan, events: run.events,
    actionId: evidence?.actionId, receiptId: evidence?.receiptId, reason,
  });
  return freezeRun({
    ...run, contextSnapshotId: newContextSnapshotId, stage: 'needs_information', events: Object.freeze([]), artifact: null,
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
  return run.stage === 'needs_information' ? freezeRun({ ...run, stage: 'awaiting_plan_confirmation' }) : run;
}

export function reviseCoursewareBrief(run: SingleCoursewareRun): SingleCoursewareRun {
  return run.stage === 'awaiting_plan_confirmation' ? freezeRun({ ...run, stage: 'needs_information' }) : run;
}

export function executeCoursewarePlan(run: SingleCoursewareRun, output: CoursewareExecutionOutput): SingleCoursewareRun {
  if (run.stage !== 'awaiting_plan_confirmation') return run;
  const artifact = Object.freeze({ ...output.artifact, pageCount: run.brief.expectedPages });
  return freezeRun({ ...run, stage: 'artifact_ready', events: output.events, artifact });
}
