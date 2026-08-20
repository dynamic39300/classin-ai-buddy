export type PackageArtifactState = 'planned' | 'ready' | 'failed' | 'excluded' | 'written_back';
export type PackageArtifactKind = 'courseware' | 'homework' | 'quiz' | 'recording-script';

export type PackageArtifact = Readonly<{
  id: string;
  kind: PackageArtifactKind;
  title: string;
  dependsOn: readonly string[];
  state: PackageArtifactState;
  included: boolean;
  version: 'v1';
}>;

export type CoursePackageRun = Readonly<{
  id: 'run-m4-course-package';
  fixtureVersion: 'workbuddy-m4-course-production-v1';
  taskType: 'course-package';
  title: '动量单元课程方案包';
  goal: string;
  contextSnapshotId: string;
  stage: 'configuring' | 'artifact_ready' | 'partial_success' | 'completed';
  artifacts: readonly PackageArtifact[];
  parentRunRef?: string;
  sourceArtifactRef?: Readonly<{ id: string; version: string }>;
}>;

export type PackageReceiptItem = Readonly<{ artifactId: string; result: 'succeeded' | 'failed' | 'not_executed' | 'waiting'; objectId?: string }>;
export type PackageExecutionReceipt = Readonly<{ id: string; status: 'partial_success' | 'success'; items: readonly PackageReceiptItem[]; truthLabel: '固定 Mock Package ExecutionReceipt' }>;

const PLANNED: readonly PackageArtifact[] = Object.freeze([
  Object.freeze({ id: 'package-courseware', kind: 'courseware', title: '动量守恒模型课件', dependsOn: Object.freeze([]), state: 'planned' as const, included: true, version: 'v1' as const }),
  Object.freeze({ id: 'package-homework', kind: 'homework', title: '动量守恒分层作业', dependsOn: Object.freeze(['package-courseware']), state: 'planned' as const, included: true, version: 'v1' as const }),
  Object.freeze({ id: 'package-quiz', kind: 'quiz', title: '动量与碰撞随堂测验', dependsOn: Object.freeze(['package-courseware']), state: 'planned' as const, included: true, version: 'v1' as const }),
  Object.freeze({ id: 'package-recording', kind: 'recording-script', title: '碰撞实验录播脚本', dependsOn: Object.freeze(['package-courseware']), state: 'planned' as const, included: true, version: 'v1' as const }),
]);

function freezeRun(run: CoursePackageRun): CoursePackageRun {
  return Object.freeze({ ...run, artifacts: Object.freeze(run.artifacts.map((item) => Object.freeze({ ...item, dependsOn: Object.freeze([...item.dependsOn]) }))) });
}

export function createCoursePackageRun(goal: string, contextSnapshotId: string, links?: Pick<CoursePackageRun, 'parentRunRef' | 'sourceArtifactRef'>): CoursePackageRun {
  return freezeRun({ id: 'run-m4-course-package', fixtureVersion: 'workbuddy-m4-course-production-v1', taskType: 'course-package', title: '动量单元课程方案包', goal, contextSnapshotId, stage: 'configuring', artifacts: PLANNED, ...links });
}

export function generatePackageArtifacts(run: CoursePackageRun): CoursePackageRun {
  if (run.stage !== 'configuring') return run;
  return freezeRun({ ...run, stage: 'artifact_ready', artifacts: run.artifacts.map((item) => ({ ...item, state: item.id === 'package-recording' ? 'failed' : 'ready' })) });
}

export function setPackageArtifactIncluded(run: CoursePackageRun, artifactId: string, included: boolean): CoursePackageRun {
  return freezeRun({ ...run, artifacts: run.artifacts.map((item) => item.id === artifactId && item.state !== 'written_back' ? { ...item, included, state: included ? (item.state === 'excluded' ? 'ready' : item.state) : 'excluded' } : item) });
}

export function retryPackageArtifact(run: CoursePackageRun, artifactId: string): CoursePackageRun {
  return freezeRun({ ...run, stage: 'artifact_ready', artifacts: run.artifacts.map((item) => item.id === artifactId && item.state === 'failed' ? { ...item, state: 'ready' } : item) });
}

export function executePackageWriteback(run: CoursePackageRun): Readonly<{ run: CoursePackageRun; receipt: PackageExecutionReceipt }> {
  const items: PackageReceiptItem[] = run.artifacts.map((item) => {
    if (item.state === 'written_back') return Object.freeze({ artifactId: item.id, result: 'waiting' as const, objectId: `classin-${item.id}` });
    if (!item.included || item.state === 'excluded') return Object.freeze({ artifactId: item.id, result: 'not_executed' as const });
    if (item.state === 'failed') return Object.freeze({ artifactId: item.id, result: 'failed' as const });
    return Object.freeze({ artifactId: item.id, result: 'succeeded' as const, objectId: `classin-${item.id}` });
  });
  const artifacts = run.artifacts.map((item, index) => items[index]?.result === 'succeeded' ? { ...item, state: 'written_back' as const } : item);
  const status = items.every(({ result }) => result === 'succeeded' || result === 'waiting') ? 'success' as const : 'partial_success' as const;
  return Object.freeze({
    run: freezeRun({ ...run, stage: status === 'success' ? 'completed' : 'partial_success', artifacts }),
    receipt: Object.freeze({ id: status === 'success' ? 'receipt-package-retry-1' : 'receipt-package-partial-1', status, items: Object.freeze(items), truthLabel: '固定 Mock Package ExecutionReceipt' }),
  });
}
