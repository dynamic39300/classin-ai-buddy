export type PackageArtifactState = 'planned' | 'generating' | 'ready' | 'failed' | 'excluded' | 'approved' | 'written_back';
export type PackageArtifactKind = 'courseware' | 'homework' | 'quiz' | 'recording-script';
export type PackageArtifactCommand = 'generate' | 'wait' | 'review' | 'exclude' | 'include' | 'retry' | 'approve' | 'execute';
export type PackageArtifact = Readonly<{
  id: string; kind: PackageArtifactKind; title: string; dependsOn: readonly string[]; version: string;
  state: PackageArtifactState; allowedCommands: readonly PackageArtifactCommand[]; recovery: 'retry-or-exclude' | 'include' | null;
}>;
export type PackageArtifactDefinition = Omit<PackageArtifact, 'allowedCommands' | 'recovery'>;

type CoursePackageRunBase = Readonly<{
  id: string; fixtureVersion: 'workbuddy-m4-course-production-v1'; taskType: 'course-package'; title: string; goal: string;
  artifacts: readonly PackageArtifact[]; parentRunRef?: string; sourceArtifactRef?: Readonly<{ id: string; version: string }>;
}>;
export type CoursePackageRun = CoursePackageRunBase & (
  | Readonly<{ stage: 'awaiting_context'; contextSnapshotId: null; allowedCommands: readonly ['confirm-context']; recovery: 'confirm-context' }>
  | Readonly<{ stage: 'configuring'; contextSnapshotId: string; allowedCommands: readonly ['begin-generation']; recovery: 'confirm-package-scope' }>
  | Readonly<{ stage: 'generating'; contextSnapshotId: string; allowedCommands: readonly ['complete-generation']; recovery: 'wait-or-complete-fixture' }>
  | Readonly<{ stage: 'artifact_ready'; contextSnapshotId: string; allowedCommands: readonly ['review-artifacts', 'propose-save']; recovery: null }>
  | Readonly<{ stage: 'partial_success'; contextSnapshotId: string; allowedCommands: readonly ['review-receipt', 'retry-failed']; recovery: 'retry-failed-items' }>
  | Readonly<{ stage: 'completed'; contextSnapshotId: string; allowedCommands: readonly ['review-receipt']; recovery: null }>
);
export type CoursePackageDefinition = Readonly<{
  id: string; fixtureVersion: 'workbuddy-m4-course-production-v1'; title: string; artifacts: readonly PackageArtifactDefinition[];
}>;
export type PackageReceiptItem = Readonly<{
  artifactId: string; result: 'succeeded' | 'failed' | 'not_executed' | 'waiting'; objectId?: string;
}>;
type PackageReceiptBase = Readonly<{
  id: string; actionId: string; approvalId: string; idempotencyKey: string; items: readonly PackageReceiptItem[];
  truthLabel: string; result: string;
}>;
export type PackageExecutionReceipt =
  | PackageReceiptBase & Readonly<{ status: 'partial_success' | 'success'; recovery?: never; expectedVersion?: never; currentVersion?: never }>
  | PackageReceiptBase & Readonly<{ status: 'permission_denied'; recovery: 'choose-another-target'; expectedVersion?: never; currentVersion?: never }>
  | PackageReceiptBase & Readonly<{ status: 'version_conflict'; recovery: 'compare-and-reconfirm'; expectedVersion: string; currentVersion: string }>
  | PackageReceiptBase & Readonly<{ status: 'recoverable_failure' | 'timeout'; recovery: 'retry'; expectedVersion?: never; currentVersion?: never }>;

function artifactState(state: PackageArtifactState): Pick<PackageArtifact, 'allowedCommands' | 'recovery'> {
  switch (state) {
    case 'planned': return { allowedCommands: Object.freeze(['generate']), recovery: null };
    case 'generating': return { allowedCommands: Object.freeze(['wait']), recovery: null };
    case 'ready': return { allowedCommands: Object.freeze(['review', 'exclude', 'approve']), recovery: null };
    case 'failed': return { allowedCommands: Object.freeze(['retry', 'exclude']), recovery: 'retry-or-exclude' };
    case 'excluded': return { allowedCommands: Object.freeze(['include']), recovery: 'include' };
    case 'approved': return { allowedCommands: Object.freeze(['execute']), recovery: null };
    case 'written_back': return { allowedCommands: Object.freeze(['review']), recovery: null };
  }
}

function withArtifactState(item: PackageArtifact | PackageArtifactDefinition, state: PackageArtifactState): PackageArtifact {
  return Object.freeze({ ...item, state, ...artifactState(state), dependsOn: Object.freeze([...item.dependsOn]) });
}

function freezeRun(run: CoursePackageRun): CoursePackageRun {
  return Object.freeze({ ...run, artifacts: Object.freeze(run.artifacts.map((item) => withArtifactState(item, item.state))) });
}

export function createCoursePackageRun(
  definition: CoursePackageDefinition,
  goal: string,
  contextSnapshotId: string | null,
  links?: Pick<CoursePackageRunBase, 'parentRunRef' | 'sourceArtifactRef'>,
): CoursePackageRun {
  const artifacts = Object.freeze(definition.artifacts.map((item) => withArtifactState(item, item.state)));
  const common = { id: definition.id, fixtureVersion: definition.fixtureVersion, taskType: 'course-package' as const, title: definition.title, goal: goal.trim(), artifacts, ...links };
  return contextSnapshotId
    ? freezeRun({ ...common, contextSnapshotId, stage: 'configuring', allowedCommands: Object.freeze(['begin-generation']), recovery: 'confirm-package-scope' })
    : freezeRun({ ...common, contextSnapshotId: null, stage: 'awaiting_context', allowedCommands: Object.freeze(['confirm-context']), recovery: 'confirm-context' });
}

export function attachPackageContext(run: CoursePackageRun, contextSnapshotId: string): CoursePackageRun {
  return run.stage === 'awaiting_context'
    ? freezeRun({ ...run, contextSnapshotId, stage: 'configuring', allowedCommands: Object.freeze(['begin-generation']), recovery: 'confirm-package-scope' })
    : run;
}

export function beginPackageGeneration(run: CoursePackageRun): CoursePackageRun {
  if (run.stage !== 'configuring') return run;
  return freezeRun({ ...run, stage: 'generating', artifacts: run.artifacts.map((item) => withArtifactState(item, 'generating')), allowedCommands: Object.freeze(['complete-generation']), recovery: 'wait-or-complete-fixture' });
}

export function completePackageGeneration(run: CoursePackageRun, failedArtifactIds: readonly string[]): CoursePackageRun {
  if (run.stage !== 'generating') return run;
  const failures = new Set(failedArtifactIds);
  return freezeRun({ ...run, stage: 'artifact_ready', artifacts: run.artifacts.map((item) => withArtifactState(item, failures.has(item.id) ? 'failed' : 'ready')), allowedCommands: Object.freeze(['review-artifacts', 'propose-save']), recovery: null });
}

export function setPackageArtifactIncluded(run: CoursePackageRun, artifactId: string, included: boolean): CoursePackageRun {
  if (run.stage !== 'artifact_ready' && run.stage !== 'partial_success') return run;
  const target = run.artifacts.find(({ id }) => id === artifactId);
  if (!target || (included ? target.state !== 'excluded' : target.state !== 'ready')) return run;
  const byId = new Map(run.artifacts.map((item) => [item.id, item]));
  const dependsOn = (item: PackageArtifact, dependencyId: string): boolean => item.dependsOn.some((id) => id === dependencyId || Boolean(byId.get(id) && dependsOn(byId.get(id)!, dependencyId)));
  if (included && target.dependsOn.some((id) => !['ready', 'written_back'].includes(byId.get(id)?.state ?? 'failed'))) return run;
  return freezeRun({
    ...run,
    artifacts: run.artifacts.map((item) => item.id === artifactId || (!included && dependsOn(item, artifactId))
      ? withArtifactState(item, included ? 'ready' : 'excluded')
      : item),
  });
}

export function retryPackageArtifact(run: CoursePackageRun, artifactId: string): CoursePackageRun {
  if (run.stage !== 'artifact_ready' && run.stage !== 'partial_success') return run;
  return freezeRun({ ...run, stage: 'artifact_ready', artifacts: run.artifacts.map((item) => item.id === artifactId && item.state === 'failed' ? withArtifactState(item, 'ready') : item), allowedCommands: Object.freeze(['review-artifacts', 'propose-save']), recovery: null });
}

export function markPackageArtifactsApproved(run: CoursePackageRun, selectedArtifactIds: readonly string[]): CoursePackageRun {
  const selected = new Set(selectedArtifactIds);
  return freezeRun({ ...run, artifacts: run.artifacts.map((item) => selected.has(item.id) && item.state === 'ready' ? withArtifactState(item, 'approved') : item) });
}

export function reopenPackageArtifacts(run: CoursePackageRun): CoursePackageRun {
  return freezeRun({ ...run, artifacts: run.artifacts.map((item) => item.state === 'approved' ? withArtifactState(item, 'ready') : item) });
}

export function getPackageApprovableArtifactIds(run: CoursePackageRun): readonly string[] {
  if (run.stage !== 'artifact_ready' && run.stage !== 'partial_success') return Object.freeze([]);
  const byId = new Map(run.artifacts.map((item) => [item.id, item]));
  const canApprove = (item: PackageArtifact, visited = new Set<string>()): boolean => {
    if (visited.has(item.id)) return false;
    const nextVisited = new Set(visited).add(item.id);
    return item.state === 'ready' && item.dependsOn.every((dependencyId) => {
      const dependency = byId.get(dependencyId);
      return Boolean(dependency && (dependency.state === 'written_back' || canApprove(dependency, nextVisited)));
    });
  };
  return Object.freeze(run.artifacts.filter((item) => canApprove(item)).map(({ id }) => id));
}

export function applyPackageExecutionReceipt(run: CoursePackageRun, receipt: PackageExecutionReceipt): CoursePackageRun {
  if (run.stage !== 'artifact_ready' && run.stage !== 'partial_success') return run;
  const results = new Map(receipt.items.map((item) => [item.artifactId, item.result]));
  const artifacts = run.artifacts.map((item) => {
    const result = results.get(item.id);
    if (result === 'succeeded') return withArtifactState(item, 'written_back');
    if (result === 'failed') return withArtifactState(item, 'failed');
    if (result === 'not_executed' && item.state === 'approved') return withArtifactState(item, 'ready');
    return item;
  });
  if (receipt.status === 'success') return freezeRun({ ...run, stage: 'completed', artifacts, allowedCommands: Object.freeze(['review-receipt']), recovery: null });
  if (receipt.status === 'partial_success') return freezeRun({ ...run, stage: 'partial_success', artifacts, allowedCommands: Object.freeze(['review-receipt', 'retry-failed']), recovery: 'retry-failed-items' });
  return freezeRun({ ...run, artifacts });
}
