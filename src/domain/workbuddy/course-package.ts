export type PackageArtifactState = 'planned' | 'generating' | 'ready' | 'failed' | 'excluded' | 'approved' | 'written_back';
export type PackageArtifactKind = 'courseware' | 'homework' | 'quiz' | 'recording-script';
export type PackageArtifact = Readonly<{
  id: string; kind: PackageArtifactKind; title: string; dependsOn: readonly string[]; state: PackageArtifactState; version: string;
}>;
export type CoursePackageRun = Readonly<{
  id: string; fixtureVersion: string; taskType: 'course-package'; title: string; goal: string; contextSnapshotId: string | null;
  stage: 'awaiting_context' | 'configuring' | 'artifact_ready' | 'partial_success' | 'completed';
  artifacts: readonly PackageArtifact[]; parentRunRef?: string; sourceArtifactRef?: Readonly<{ id: string; version: string }>;
}>;
export type CoursePackageDefinition = Readonly<{
  id: string; fixtureVersion: string; title: string; artifacts: readonly PackageArtifact[];
}>;
export type PackageReceiptItem = Readonly<{
  artifactId: string; result: 'succeeded' | 'failed' | 'not_executed' | 'waiting'; objectId?: string;
}>;
export type PackageExecutionReceipt = Readonly<{
  id: string;
  actionId: string;
  approvalId: string;
  idempotencyKey: string;
  status: 'partial_success' | 'success' | 'permission_denied' | 'version_conflict' | 'recoverable_failure' | 'timeout';
  items: readonly PackageReceiptItem[];
  truthLabel: string;
  recovery?: 'choose-another-target' | 'compare-and-reconfirm' | 'retry';
  result: string;
}>;

function freezeRun(run: CoursePackageRun): CoursePackageRun {
  return Object.freeze({
    ...run,
    artifacts: Object.freeze(run.artifacts.map((item) => Object.freeze({ ...item, dependsOn: Object.freeze([...item.dependsOn]) }))),
  });
}

export function createCoursePackageRun(
  definition: CoursePackageDefinition,
  goal: string,
  contextSnapshotId: string | null,
  links?: Pick<CoursePackageRun, 'parentRunRef' | 'sourceArtifactRef'>,
): CoursePackageRun {
  return freezeRun({
    id: definition.id, fixtureVersion: definition.fixtureVersion, taskType: 'course-package', title: definition.title,
    goal: goal.trim(), contextSnapshotId, stage: contextSnapshotId ? 'configuring' : 'awaiting_context',
    artifacts: definition.artifacts, ...links,
  });
}

export function attachPackageContext(run: CoursePackageRun, contextSnapshotId: string): CoursePackageRun {
  return run.stage === 'awaiting_context' ? freezeRun({ ...run, contextSnapshotId, stage: 'configuring' }) : run;
}

export function generatePackageArtifacts(run: CoursePackageRun, failedArtifactIds: readonly string[]): CoursePackageRun {
  if (run.stage !== 'configuring') return run;
  const failures = new Set(failedArtifactIds);
  return freezeRun({
    ...run,
    stage: 'artifact_ready',
    artifacts: run.artifacts.map((item) => ({ ...item, state: failures.has(item.id) ? 'failed' : 'ready' })),
  });
}

export function setPackageArtifactIncluded(run: CoursePackageRun, artifactId: string, included: boolean): CoursePackageRun {
  return freezeRun({
    ...run,
    artifacts: run.artifacts.map((item) => {
      if (item.id !== artifactId || item.state === 'written_back' || item.state === 'failed') return item;
      return { ...item, state: included ? 'ready' : 'excluded' };
    }),
  });
}

export function retryPackageArtifact(run: CoursePackageRun, artifactId: string): CoursePackageRun {
  return freezeRun({
    ...run,
    stage: 'artifact_ready',
    artifacts: run.artifacts.map((item) => item.id === artifactId && item.state === 'failed' ? { ...item, state: 'ready' } : item),
  });
}

export function markPackageArtifactsApproved(run: CoursePackageRun, selectedArtifactIds: readonly string[]): CoursePackageRun {
  const selected = new Set(selectedArtifactIds);
  return freezeRun({
    ...run,
    artifacts: run.artifacts.map((item) => selected.has(item.id) && item.state === 'ready' ? { ...item, state: 'approved' } : item),
  });
}

export function applyPackageExecutionReceipt(run: CoursePackageRun, receipt: PackageExecutionReceipt): CoursePackageRun {
  const results = new Map(receipt.items.map((item) => [item.artifactId, item.result]));
  const artifacts = run.artifacts.map((item) => {
    const result = results.get(item.id);
    if (result === 'succeeded') return { ...item, state: 'written_back' as const };
    if (result === 'failed') return { ...item, state: 'failed' as const };
    if (result === 'not_executed' && item.state === 'approved') return { ...item, state: 'ready' as const };
    return item;
  });
  const stage = receipt.status === 'success' ? 'completed' : receipt.status === 'partial_success' ? 'partial_success' : run.stage;
  return freezeRun({ ...run, stage, artifacts });
}
