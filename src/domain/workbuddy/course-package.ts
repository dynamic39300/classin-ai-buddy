import type { PackageApproval, PackageProposedAction } from './package-writeback';

export type PackageArtifactState = 'planned' | 'generating' | 'waiting' | 'ready' | 'failed' | 'excluded' | 'approved' | 'written_back';
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
type PackageSucceededReceiptItem = Readonly<{ artifactId: string; result: 'succeeded'; objectId: string }>;
type PackageFailedReceiptItem = Readonly<{ artifactId: string; result: 'failed'; objectId?: never }>;
type PackageNotExecutedReceiptItem = Readonly<{ artifactId: string; result: 'not_executed'; objectId?: never }>;
type PackageWaitingReceiptItem = Readonly<{ artifactId: string; result: 'waiting'; objectId?: never }>;
export type PackageReceiptItem = PackageSucceededReceiptItem | PackageFailedReceiptItem | PackageNotExecutedReceiptItem | PackageWaitingReceiptItem;
type PackageReceiptBase = Readonly<{
  id: string; actionId: string; approvalId: string; idempotencyKey: string; truthLabel: string; result: string;
}>;
export type PackageExecutionReceipt =
  | PackageReceiptBase & Readonly<{ status: 'success'; items: readonly (PackageSucceededReceiptItem | PackageNotExecutedReceiptItem)[]; recovery?: never; expectedVersion?: never; currentVersion?: never }>
  | PackageReceiptBase & Readonly<{ status: 'partial_success'; items: readonly PackageReceiptItem[]; recovery?: never; expectedVersion?: never; currentVersion?: never }>
  | PackageReceiptBase & Readonly<{ status: 'permission_denied'; items: readonly (PackageNotExecutedReceiptItem | PackageWaitingReceiptItem)[]; recovery: 'choose-another-target'; expectedVersion?: never; currentVersion?: never }>
  | PackageReceiptBase & Readonly<{ status: 'version_conflict'; items: readonly (PackageNotExecutedReceiptItem | PackageWaitingReceiptItem)[]; recovery: 'compare-and-reconfirm'; expectedVersion: string; currentVersion: string }>
  | PackageReceiptBase & Readonly<{ status: 'recoverable_failure' | 'timeout'; items: readonly (PackageNotExecutedReceiptItem | PackageWaitingReceiptItem)[]; recovery: 'retry'; expectedVersion?: never; currentVersion?: never }>;
export type PackageReceiptApplication =
  | Readonly<{ accepted: true; run: CoursePackageRun }>
  | Readonly<{ accepted: false; run: CoursePackageRun; reason: string }>;

function artifactState(state: PackageArtifactState): Pick<PackageArtifact, 'allowedCommands' | 'recovery'> {
  switch (state) {
    case 'planned': return { allowedCommands: Object.freeze(['generate']), recovery: null };
    case 'generating': return { allowedCommands: Object.freeze(['wait']), recovery: null };
    case 'waiting': return { allowedCommands: Object.freeze(['wait']), recovery: null };
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

function validateArtifactGraph(definition: CoursePackageDefinition): void {
  const byId = new Map<string, PackageArtifactDefinition>();
  for (const artifact of definition.artifacts) {
    if (byId.has(artifact.id)) throw new Error(`Duplicate course-package artifact id: ${artifact.id}`);
    byId.set(artifact.id, artifact);
  }
  for (const artifact of definition.artifacts) {
    for (const dependencyId of artifact.dependsOn) {
      if (!byId.has(dependencyId)) throw new Error(`Unknown dependency ${dependencyId} for artifact ${artifact.id}`);
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (artifactId: string): void => {
    if (visiting.has(artifactId)) throw new Error(`Cyclic course-package artifact dependency at: ${artifactId}`);
    if (visited.has(artifactId)) return;
    visiting.add(artifactId);
    for (const dependencyId of byId.get(artifactId)?.dependsOn ?? []) visit(dependencyId);
    visiting.delete(artifactId);
    visited.add(artifactId);
  };
  for (const artifact of definition.artifacts) visit(artifact.id);
}

export function createCoursePackageRun(
  definition: CoursePackageDefinition,
  goal: string,
  contextSnapshotId: string | null,
  links?: Pick<CoursePackageRunBase, 'parentRunRef' | 'sourceArtifactRef'>,
): CoursePackageRun {
  validateArtifactGraph(definition);
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
  return freezeRun({ ...run, stage: 'generating', artifacts: run.artifacts.map((item) => withArtifactState(item, item.state === 'excluded' ? 'excluded' : 'generating')), allowedCommands: Object.freeze(['complete-generation']), recovery: 'wait-or-complete-fixture' });
}

export function completePackageGeneration(run: CoursePackageRun, failedArtifactIds: readonly string[]): CoursePackageRun {
  if (run.stage !== 'generating') return run;
  const failures = new Set(failedArtifactIds);
  const byId = new Map(run.artifacts.map((item) => [item.id, item]));
  const resolved = new Map<string, PackageArtifactState>();
  const resolving = new Set<string>();
  const resolve = (item: PackageArtifact): PackageArtifactState => {
    const existing = resolved.get(item.id);
    if (existing) return existing;
    if (resolving.has(item.id)) return 'waiting';
    if (item.state === 'excluded') return 'excluded';
    resolving.add(item.id);
    const state: PackageArtifactState = failures.has(item.id)
      ? 'failed'
      : item.dependsOn.every((dependencyId) => {
        const dependency = byId.get(dependencyId);
        return dependency ? resolve(dependency) === 'ready' : false;
      }) ? 'ready' : 'waiting';
    resolving.delete(item.id);
    resolved.set(item.id, state);
    return state;
  };
  const artifacts = run.artifacts.map((item) => withArtifactState(item, resolve(item)));
  return freezeRun({ ...run, stage: 'artifact_ready', artifacts, allowedCommands: Object.freeze(['review-artifacts', 'propose-save']), recovery: null });
}

export function setPackageArtifactIncluded(run: CoursePackageRun, artifactId: string, included: boolean): CoursePackageRun {
  if (run.stage !== 'configuring' && run.stage !== 'artifact_ready' && run.stage !== 'partial_success') return run;
  const target = run.artifacts.find(({ id }) => id === artifactId);
  const configurable = run.stage === 'configuring';
  if (!target || (included ? target.state !== 'excluded' : configurable ? target.state !== 'planned' : !['ready', 'failed', 'waiting'].includes(target.state))) return run;
  const byId = new Map(run.artifacts.map((item) => [item.id, item]));
  const dependsOn = (item: PackageArtifact, dependencyId: string, visited = new Set<string>()): boolean => {
    if (visited.has(item.id)) return false;
    const nextVisited = new Set(visited).add(item.id);
    return item.dependsOn.some((id) => id === dependencyId || Boolean(byId.get(id) && dependsOn(byId.get(id)!, dependencyId, nextVisited)));
  };
  if (included && target.dependsOn.some((id) => configurable
    ? byId.get(id)?.state === 'excluded'
    : !['ready', 'written_back'].includes(byId.get(id)?.state ?? 'failed'))) return run;
  return freezeRun({
    ...run,
    artifacts: run.artifacts.map((item) => item.id === artifactId || (!included && dependsOn(item, artifactId))
      ? withArtifactState(item, included ? configurable ? 'planned' : 'ready' : 'excluded')
      : item),
  });
}

export function retryPackageArtifact(run: CoursePackageRun, artifactId: string): CoursePackageRun {
  if (run.stage !== 'artifact_ready' && run.stage !== 'partial_success') return run;
  const target = run.artifacts.find(({ id }) => id === artifactId);
  if (!target || target.state !== 'failed') return run;
  const states = new Map(run.artifacts.map((item) => [item.id, item.id === artifactId ? 'ready' as const : item.state]));
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of run.artifacts) {
      if (states.get(item.id) === 'waiting' && item.dependsOn.every((dependencyId) => ['ready', 'written_back'].includes(states.get(dependencyId) ?? 'failed'))) {
        states.set(item.id, 'ready');
        changed = true;
      }
    }
  }
  return freezeRun({ ...run, stage: 'artifact_ready', artifacts: run.artifacts.map((item) => withArtifactState(item, states.get(item.id) ?? item.state)), allowedCommands: Object.freeze(['review-artifacts', 'propose-save']), recovery: null });
}

export function markPackageArtifactsApproved(run: CoursePackageRun, selectedArtifactIds: readonly string[]): CoursePackageRun {
  if (run.stage !== 'artifact_ready' && run.stage !== 'partial_success') return run;
  const approvable = new Set(getPackageApprovableArtifactIds(run));
  const selected = new Set(selectedArtifactIds);
  if ([...selected].some((id) => !approvable.has(id))) return run;
  return freezeRun({ ...run, artifacts: run.artifacts.map((item) => selected.has(item.id) && item.state === 'ready' ? withArtifactState(item, 'approved') : item) });
}

export function reopenPackageArtifacts(run: CoursePackageRun): CoursePackageRun {
  if (run.stage !== 'artifact_ready' && run.stage !== 'partial_success') return run;
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

export function applyPackageExecutionReceipt(
  run: CoursePackageRun,
  action: PackageProposedAction,
  approval: PackageApproval,
  receipt: PackageExecutionReceipt,
): PackageReceiptApplication {
  const rejected = (reason: string): PackageReceiptApplication => Object.freeze({ accepted: false, run, reason });
  const accepted = (next: CoursePackageRun): PackageReceiptApplication => Object.freeze({ accepted: true, run: next });
  if (run.stage !== 'artifact_ready' && run.stage !== 'partial_success') return rejected('run-stage-rejects-receipt');
  if (!run.contextSnapshotId || action.runRef !== run.id || action.contextSnapshotId !== run.contextSnapshotId
    || action.status !== 'approved' || approval.actionId !== action.id || approval.decision !== 'approved'
    || receipt.actionId !== action.id || receipt.approvalId !== approval.id || receipt.idempotencyKey !== action.idempotencyKey) return rejected('receipt-ownership-mismatch');
  const approvedRefs = new Map(action.artifactRefs.map(({ id, version }) => [id, version]));
  if (run.artifacts.some((item) => item.state === 'approved' && approvedRefs.get(item.id) !== item.version)) return rejected('approved-artifact-version-mismatch');
  if (receipt.items.length !== run.artifacts.length || new Set(receipt.items.map(({ artifactId }) => artifactId)).size !== run.artifacts.length) return rejected('receipt-items-do-not-cover-run');
  const results = new Map(receipt.items.map((item) => [item.artifactId, item.result]));
  const itemsMatchRun = run.artifacts.every((item) => {
    const result = results.get(item.id);
    if (!result) return false;
    if (item.state === 'approved') return result === 'succeeded' || result === 'failed' || result === 'not_executed' || result === 'waiting';
    if (item.state === 'waiting') return result === 'waiting';
    return result === 'not_executed';
  });
  if (!itemsMatchRun) return rejected('receipt-item-state-mismatch');
  const hasSucceeded = receipt.items.some(({ result }) => result === 'succeeded');
  const hasIncomplete = receipt.items.some(({ result }) => result === 'failed' || result === 'waiting');
  const selectedResultsSucceeded = action.artifactRefs.every(({ id }) => results.get(id) === 'succeeded');
  if (receipt.status === 'success' && (!selectedResultsSucceeded || hasIncomplete)) return rejected('success-receipt-contains-incomplete-results');
  if (receipt.status === 'partial_success' && (!hasSucceeded || !hasIncomplete)) return rejected('partial-receipt-missing-mixed-results');
  if (!['success', 'partial_success'].includes(receipt.status) && receipt.items.some(({ result }) => result === 'succeeded' || result === 'failed')) return rejected('non-execution-receipt-contains-execution-results');
  if (receipt.status !== 'success' && receipt.status !== 'partial_success') return accepted(run);
  const artifacts = run.artifacts.map((item) => {
    const result = results.get(item.id);
    if (result === 'succeeded' && item.state === 'approved' && approvedRefs.get(item.id) === item.version) return withArtifactState(item, 'written_back');
    if (result === 'failed' && item.state === 'approved') return withArtifactState(item, 'failed');
    if (result === 'waiting' && item.state === 'approved') return withArtifactState(item, 'waiting');
    if (result === 'not_executed' && item.state === 'approved') return withArtifactState(item, 'ready');
    return item;
  });
  if (receipt.status === 'success') return accepted(freezeRun({ ...run, stage: 'completed', artifacts, allowedCommands: Object.freeze(['review-receipt']), recovery: null }));
  return accepted(freezeRun({ ...run, stage: 'partial_success', artifacts, allowedCommands: Object.freeze(['review-receipt', 'retry-failed']), recovery: 'retry-failed-items' }));
}
