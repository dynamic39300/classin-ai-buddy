import { useMemo, useState, type ReactNode } from 'react';
import type { WorkBuddyRunViewModel } from '@contracts/workbuddy/workspace';
import type { ClassInWritebackAdapter, WritebackScenario, WritebackScenarioController } from '@contracts/workbuddy/classin-writeback';
import type { PackageWritebackAdapter, PackageWritebackScenario, PackageWritebackScenarioController } from '@contracts/workbuddy/package-writeback';
import {
  confirmContext, createContextProposal, projectContext, selectContextItems,
  type CapabilityContextManifest, type ContextSnapshot, type CoreContextItem, type WorkBuddyTaskType,
} from '@domain/workbuddy/core-context';
import {
  confirmCoursewareBrief, createSingleCoursewareRun, executeCoursewarePlan, replanCoursewareRun,
  reviseCoursewareBrief, updateCoursewareBrief,
  type CoursewareExecutionOutput, type CoursewareRunDefinition, type SingleCoursewareRun,
} from '@domain/workbuddy/course-production';
import {
  applyPackageExecutionReceipt, attachPackageContext, createCoursePackageRun, generatePackageArtifacts,
  markPackageArtifactsApproved, retryPackageArtifact, setPackageArtifactIncluded,
  type CoursePackageDefinition, type CoursePackageRun, type PackageExecutionReceipt,
} from '@domain/workbuddy/course-package';
import { createPackageSaveAction, decidePackageAction, type PackageActionInput, type PackageApproval, type PackageProposedAction } from '@domain/workbuddy/package-writeback';
import {
  approveAction, createCoursewareSaveAction, rejectAction,
  type Approval, type CoursewareSaveActionInput, type ExecutionReceipt, type ProposedAction,
} from '@domain/workbuddy/writeback';
import { projectCoursewareRunView, projectPackageRunView } from './workbuddy-course-production-view';
import { WorkBuddyWorkspaceContext, type WorkBuddyWorkspace } from './workbuddy-workspace';

type WorkBuddyWorkspaceProviderProps = Readonly<{
  initialRuns: readonly WorkBuddyRunViewModel[];
  initialContextItems: readonly CoreContextItem[];
  recommendedContextItemIds: readonly string[];
  coursewareDefinition: CoursewareRunDefinition;
  coursewareOutput: CoursewareExecutionOutput;
  capabilityManifests: readonly CapabilityContextManifest[];
  coursewareActionInput: CoursewareSaveActionInput;
  packageDefinition: CoursePackageDefinition;
  packageActionInput: PackageActionInput;
  packageFailedArtifactIds: readonly string[];
  writebackAdapter: ClassInWritebackAdapter;
  writebackScenarioController: WritebackScenarioController;
  packageWritebackAdapter: PackageWritebackAdapter;
  packageWritebackScenarioController: PackageWritebackScenarioController;
  children: ReactNode;
}>;

function projectCoursewareHistory(current: readonly WorkBuddyRunViewModel[], run: SingleCoursewareRun): readonly WorkBuddyRunViewModel[] {
  const existing = current.find(({ id }) => id === run.id);
  const item: WorkBuddyRunViewModel = {
    fixtureVersion: 'workbuddy-m4-course-production-v1', id: run.id, title: run.title, relativeTime: '刚刚', pinned: existing?.pinned,
    runState: run.stage === 'artifact_ready'
      ? { status: 'completed', allowedCommands: ['review-artifact'], recovery: null }
      : { status: 'waiting', allowedCommands: ['confirm', 'revise'], recovery: 'confirm-or-revise' },
    goal: run.goal,
    contextLabels: existing?.contextLabels ?? [],
    steps: run.events.length
      ? run.events.map((event) => ({ title: event.title, summary: event.summary, time: '固定事件', state: 'completed' }))
      : [{ title: '等待教师确认', summary: 'Context 与计划仍在确认阶段。', time: '现在', state: 'waiting' }],
    artifact: run.artifact
      ? { title: run.artifact.title, version: run.artifact.version, progress: `${run.artifact.pageCount} 页`, eyebrow: '高二物理 · 动量与碰撞', heading: run.artifact.title, summary: run.artifact.validationSummary, truthLabel: run.artifact.truthLabel }
      : { title: '课件 ArtifactDraft', version: '尚未生成', progress: '等待计划确认', eyebrow: '固定 Mock 场景', heading: '尚未生成课件', summary: '确认任务信息和计划后生成固定 Mock 产物。', truthLabel: '当前没有已生成的 ArtifactDraft。' },
  };
  return [item, ...current.filter(({ id }) => id !== run.id)];
}

function projectPackageHistory(current: readonly WorkBuddyRunViewModel[], run: CoursePackageRun): readonly WorkBuddyRunViewModel[] {
  const existing = current.find(({ id }) => id === run.id);
  const completed = run.stage === 'completed';
  const failedCount = run.artifacts.filter(({ state }) => state === 'failed').length;
  const readyCount = run.artifacts.filter(({ state }) => ['ready', 'approved', 'written_back'].includes(state)).length;
  const item: WorkBuddyRunViewModel = {
    fixtureVersion: 'workbuddy-m4-course-production-v1', id: run.id, title: run.title, relativeTime: '刚刚', pinned: existing?.pinned,
    runState: completed
      ? { status: 'completed', allowedCommands: ['review-artifact'], recovery: null }
      : { status: 'waiting', allowedCommands: ['confirm', 'revise'], recovery: 'confirm-or-revise' },
    goal: run.goal, contextLabels: existing?.contextLabels ?? [],
    steps: [{
      title: run.stage === 'awaiting_context' ? '等待确认独立 Context' : run.stage === 'configuring' ? '等待确认产物清单' : '课程方案包已生成',
      summary: `${readyCount} 项可用${failedCount ? ` · ${failedCount} 项需恢复` : ''}`, time: '现在', state: failedCount ? 'failed' : completed ? 'completed' : 'waiting',
    }],
    artifact: { title: '课程方案包', version: 'v1', progress: `${readyCount}/${run.artifacts.length} 项`, eyebrow: '固定 Mock Artifact Graph', heading: run.title, summary: '课件、作业、测验与录播脚本保持独立状态。', truthLabel: '固定 Mock 课程方案包 · 未连接真实 ClassIn 写回。' },
  };
  return [item, ...current.filter(({ id }) => id !== run.id)];
}

export function WorkBuddyWorkspaceProvider(props: WorkBuddyWorkspaceProviderProps) {
  const {
    initialRuns, initialContextItems, recommendedContextItemIds, coursewareDefinition, coursewareOutput,
    capabilityManifests, coursewareActionInput, packageDefinition, packageActionInput, packageFailedArtifactIds,
    writebackAdapter, writebackScenarioController, packageWritebackAdapter, packageWritebackScenarioController, children,
  } = props;
  const [runs, setRuns] = useState<readonly WorkBuddyRunViewModel[]>(initialRuns);
  const [contextProposal, setContextProposal] = useState(() => createContextProposal(initialContextItems, 'single-courseware'));
  const [contextSnapshot, setContextSnapshot] = useState<ContextSnapshot | null>(null);
  const [coursewareRun, setCoursewareRun] = useState<SingleCoursewareRun | null>(null);
  const [coursewareAction, setCoursewareAction] = useState<ProposedAction | null>(null);
  const [coursewareApproval, setCoursewareApproval] = useState<Approval | null>(null);
  const [coursewareReceipt, setCoursewareReceipt] = useState<ExecutionReceipt | null>(null);
  const [writebackScenario, setWritebackScenarioState] = useState<WritebackScenario>(() => writebackScenarioController.getScenario());
  const [taskType, setTaskTypeState] = useState<WorkBuddyTaskType>('single-courseware');
  const [packageRun, setPackageRun] = useState<CoursePackageRun | null>(null);
  const [packageAction, setPackageAction] = useState<PackageProposedAction | null>(null);
  const [packageApproval, setPackageApproval] = useState<PackageApproval | null>(null);
  const [packageReceipt, setPackageReceipt] = useState<PackageExecutionReceipt | null>(null);
  const [packageWritebackScenario, setPackageWritebackScenarioState] = useState<PackageWritebackScenario>(() => packageWritebackScenarioController.getScenario());
  const [activeCoursewarePanel, setActiveCoursewarePanel] = useState<WorkBuddyWorkspace['activeCoursewarePanel']>('none');
  const [activePackagePanel, setActivePackagePanel] = useState<WorkBuddyWorkspace['activePackagePanel']>('none');

  const projections = useMemo(() => contextSnapshot
    ? capabilityManifests.map((manifest) => projectContext(contextSnapshot, manifest, '2026-08-20T10:04:00+08:00'))
    : [], [capabilityManifests, contextSnapshot]);

  const value = useMemo<WorkBuddyWorkspace>(() => ({
    runs,
    getRun: (runId) => runs.find((run) => run.id === runId),
    renameRun: (runId, title) => setRuns((current) => current.map((run) => run.id === runId ? { ...run, title } : run)),
    togglePinRun: (runId) => setRuns((current) => current.map((run) => run.id === runId ? { ...run, pinned: !run.pinned } : run)),
    removeRun: (runId) => setRuns((current) => current.filter((run) => run.id !== runId)),
    contextProposal,
    contextSnapshot,
    applyRecommendedContext: () => {
      setContextSnapshot(null);
      setContextProposal((current) => selectContextItems(current, recommendedContextItemIds));
    },
    confirmCoreContext: () => {
      const result = confirmContext(contextProposal, {
        snapshotId: contextProposal.taskType === 'course-package' ? 'context-snapshot-package-1' : 'context-snapshot-courseware-1',
        confirmedAt: '2026-08-20T10:00:00+08:00',
      });
      if (!result.ok) return;
      setContextSnapshot(result.snapshot);
      if (packageRun?.stage === 'awaiting_context') {
        const next = attachPackageContext(packageRun, result.snapshot.id);
        setPackageRun(next);
        setRuns((current) => projectPackageHistory(current, next));
      }
    },
    resetCoreContext: () => {
      setContextSnapshot(null); setContextProposal(createContextProposal(initialContextItems, 'single-courseware')); setTaskTypeState('single-courseware');
      setCoursewareRun(null); setCoursewareAction(null); setCoursewareApproval(null); setCoursewareReceipt(null);
      setPackageRun(null); setPackageAction(null); setPackageApproval(null); setPackageReceipt(null);
      setActiveCoursewarePanel('none'); setActivePackagePanel('none');
      writebackScenarioController.setScenario('success'); setWritebackScenarioState('success');
      packageWritebackScenarioController.setScenario('partial_success'); setPackageWritebackScenarioState('partial_success');
      setRuns((current) => current.filter(({ fixtureVersion }) => fixtureVersion === 'workbuddy-m3-v1'));
    },
    coursewareView: projectCoursewareRunView(coursewareRun, projections, coursewareAction, coursewareReceipt),
    createCoursewareTask: (goal) => {
      if (!contextSnapshot || !goal.trim()) return null;
      const run = createSingleCoursewareRun(coursewareDefinition, goal, contextSnapshot.id);
      setCoursewareRun(run);
      setRuns((current) => projectCoursewareHistory(current, run).map((item) => item.id === run.id ? { ...item, contextLabels: contextSnapshot.items.filter(({ kind }) => ['class', 'course', 'unit'].includes(kind)).map(({ label }) => label) } : item));
      return run.id;
    },
    updateCoursewareTaskBrief: (patch) => setCoursewareRun((current) => current ? updateCoursewareBrief(current, patch) : current),
    confirmCoursewareTaskBrief: () => setCoursewareRun((current) => current ? confirmCoursewareBrief(current) : current),
    reviseCoursewareTaskBrief: () => setCoursewareRun((current) => current ? reviseCoursewareBrief(current) : current),
    executeCoursewareTaskPlan: () => setCoursewareRun((current) => {
      if (!current) return current;
      const next = executeCoursewarePlan(current, coursewareOutput);
      setRuns((history) => projectCoursewareHistory(history, next));
      return next;
    }),
    proposeCoursewareSave: () => {
      if (!coursewareRun?.artifact) return;
      setCoursewareAction(createCoursewareSaveAction({ ...coursewareActionInput, artifactId: coursewareRun.artifact.id, artifactVersion: coursewareRun.artifact.version }));
      setCoursewareApproval(null); setCoursewareReceipt(null);
    },
    approveCoursewareSave: () => {
      if (!coursewareAction) return;
      const result = approveAction(coursewareAction, 'approval-courseware-save-1', '2026-08-20T10:05:00+08:00', 'teacher-wang');
      if (result) { setCoursewareAction(result.action); setCoursewareApproval(result.approval); }
    },
    rejectCoursewareSave: () => {
      if (!coursewareAction) return;
      const result = rejectAction(coursewareAction, 'approval-courseware-reject-1', '2026-08-20T10:05:00+08:00', 'teacher-wang');
      if (result) { setCoursewareAction(result.action); setCoursewareApproval(result.approval); }
    },
    executeApprovedCoursewareSave: () => {
      if (coursewareAction && coursewareApproval) setCoursewareReceipt(writebackAdapter.execute(coursewareAction, coursewareApproval));
    },
    recoverCoursewareSave: () => {
      if (!coursewareRun?.artifact || !coursewareReceipt || coursewareReceipt.status === 'success') return;
      const target = coursewareReceipt.status === 'permission_denied'
        ? { ...coursewareActionInput.target, unitId: 'unit-momentum-drafts', label: '高二物理 3 班 / 动量与碰撞 / 教师草稿区' }
        : { ...coursewareActionInput.target, expectedVersion: coursewareReceipt.status === 'version_conflict' ? coursewareReceipt.currentVersion ?? coursewareActionInput.target.expectedVersion : coursewareActionInput.target.expectedVersion };
      writebackScenarioController.setScenario('success'); setWritebackScenarioState('success');
      setCoursewareAction(createCoursewareSaveAction({ ...coursewareActionInput, id: 'action-courseware-save-recovery-1', idempotencyKey: 'workbuddy-courseware-save-recovery-1', artifactId: coursewareRun.artifact.id, artifactVersion: coursewareRun.artifact.version, target }));
      setCoursewareApproval(null); setCoursewareReceipt(null); setActiveCoursewarePanel('action');
    },
    writebackScenario,
    setWritebackScenario: (scenario) => { writebackScenarioController.setScenario(scenario); setWritebackScenarioState(scenario); setCoursewareReceipt(null); },
    taskType,
    setTaskType: (nextTaskType) => {
      if (nextTaskType === taskType) return;
      setTaskTypeState(nextTaskType); setContextSnapshot(null); setContextProposal(createContextProposal(initialContextItems, nextTaskType));
    },
    packageView: projectPackageRunView(packageRun, packageAction, packageReceipt),
    packageWritebackScenario,
    setPackageWritebackScenario: (scenario) => { packageWritebackScenarioController.setScenario(scenario); setPackageWritebackScenarioState(scenario); setPackageReceipt(null); },
    createPackageTask: (goal) => {
      if (!contextSnapshot || taskType !== 'course-package' || !goal.trim()) return null;
      const run = createCoursePackageRun(packageDefinition, goal, contextSnapshot.id);
      setPackageRun(run); setPackageAction(null); setPackageApproval(null); setPackageReceipt(null);
      setRuns((current) => projectPackageHistory(current, run).map((item) => item.id === run.id ? { ...item, contextLabels: contextSnapshot.items.filter(({ kind }) => ['class', 'course', 'unit'].includes(kind)).map(({ label }) => label) } : item));
      return run.id;
    },
    generatePackage: () => setPackageRun((current) => {
      if (!current) return current;
      const next = generatePackageArtifacts(current, packageFailedArtifactIds);
      setRuns((history) => projectPackageHistory(history, next));
      return next;
    }),
    setPackageItemIncluded: (artifactId, included) => setPackageRun((current) => {
      if (!current) return current;
      const next = setPackageArtifactIncluded(current, artifactId, included);
      if (packageAction?.status === 'proposed') setPackageAction(createPackageSaveAction(next, packageActionInput));
      return next;
    }),
    proposePackageSave: () => {
      if (!packageRun) return;
      const retrying = packageReceipt?.status === 'partial_success';
      const action = createPackageSaveAction(packageRun, retrying ? {
        ...packageActionInput,
        id: `${packageActionInput.id}-retry-1`,
        idempotencyKey: `${packageActionInput.idempotencyKey}-retry-1`,
      } : packageActionInput);
      if (action) { setPackageAction(action); setPackageApproval(null); setPackageReceipt(null); }
    },
    approvePackageSave: () => {
      if (!packageAction || !packageRun) return;
      const result = decidePackageAction(packageAction, { id: 'approval-package-save-1', decidedBy: 'teacher-wang', decidedAt: '2026-08-20T10:15:00+08:00' }, 'approved');
      if (!result) return;
      setPackageAction(result.action); setPackageApproval(result.approval); setPackageRun(markPackageArtifactsApproved(packageRun, result.action.artifactRefs.map(({ id }) => id)));
    },
    rejectPackageSave: () => {
      if (!packageAction) return;
      const result = decidePackageAction(packageAction, { id: 'approval-package-reject-1', decidedBy: 'teacher-wang', decidedAt: '2026-08-20T10:15:00+08:00' }, 'rejected');
      if (result) { setPackageAction(result.action); setPackageApproval(result.approval); }
    },
    executeApprovedPackageSave: () => {
      if (!packageRun || !packageAction || !packageApproval) return;
      const receipt = packageWritebackAdapter.execute(packageAction, packageApproval, packageRun);
      const next = applyPackageExecutionReceipt(packageRun, receipt);
      setPackageReceipt(receipt); setPackageRun(next); setRuns((history) => projectPackageHistory(history, next));
    },
    retryPackageItem: (artifactId) => setPackageRun((current) => current ? retryPackageArtifact(current, artifactId) : current),
    derivePackageFromCourseware: () => {
      if (!coursewareRun?.artifact) return null;
      const proposal = selectContextItems(createContextProposal(initialContextItems, 'course-package'), ['physics-3', 'course-momentum', 'unit-momentum-1', 'my-root-pdf', 'physics-standard-v2']);
      const run = createCoursePackageRun(packageDefinition, '基于已审阅课件生成配套作业、测验和录播脚本', null, {
        parentRunRef: coursewareRun.id, sourceArtifactRef: Object.freeze({ id: coursewareRun.artifact.id, version: coursewareRun.artifact.version }),
      });
      setTaskTypeState('course-package'); setContextSnapshot(null); setContextProposal(proposal);
      setPackageRun(run); setPackageAction(null); setPackageApproval(null); setPackageReceipt(null); setActivePackagePanel('none');
      setRuns((current) => projectPackageHistory(current, run));
      return run.id;
    },
    activeCoursewarePanel, setActiveCoursewarePanel,
    activePackagePanel, setActivePackagePanel,
    replanCoursewareToWaveContext: () => {
      if (!coursewareRun) return;
      const proposal = selectContextItems(createContextProposal(initialContextItems, 'single-courseware'), ['physics-1', 'course-physics-1', 'unit-wave-1']);
      const result = confirmContext(proposal, { snapshotId: 'context-snapshot-courseware-2', confirmedAt: '2026-08-20T10:20:00+08:00' });
      if (!result.ok) return;
      const next = replanCoursewareRun(coursewareRun, result.snapshot.id, '主教学范围从高二物理 3 班调整为高二物理 1 班', { actionId: coursewareAction?.id, receiptId: coursewareReceipt?.id });
      setContextSnapshot(result.snapshot); setContextProposal(proposal); setCoursewareRun(next);
      setCoursewareAction(null); setCoursewareApproval(null); setCoursewareReceipt(null); setActiveCoursewarePanel('none');
      setRuns((history) => projectCoursewareHistory(history, next));
    },
  }), [
    activeCoursewarePanel, activePackagePanel, contextProposal, contextSnapshot, coursewareAction,
    coursewareActionInput, coursewareApproval, coursewareDefinition, coursewareOutput, coursewareReceipt, coursewareRun,
    initialContextItems, packageAction, packageActionInput, packageApproval, packageDefinition, packageFailedArtifactIds,
    packageReceipt, packageRun, packageWritebackAdapter, packageWritebackScenario, packageWritebackScenarioController,
    projections, recommendedContextItemIds, runs, taskType, writebackAdapter, writebackScenario,
    writebackScenarioController,
  ]);

  return <WorkBuddyWorkspaceContext.Provider value={value}>{children}</WorkBuddyWorkspaceContext.Provider>;
}
