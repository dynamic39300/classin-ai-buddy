import { useMemo, useState, type ReactNode } from 'react';
import type { WorkBuddyRunViewModel } from '@contracts/workbuddy/workspace';
import type { ClassInWritebackAdapter, WritebackScenario, WritebackScenarioController } from '@contracts/workbuddy/classin-writeback';
import type { PackageWritebackAdapter, PackageWritebackScenario, PackageWritebackScenarioController } from '@contracts/workbuddy/package-writeback';
import type { WorkBuddyRuntimeFixture } from '@contracts/workbuddy/runtime-fixture';
import {
  confirmContext, createContextProposal, projectContext, selectContextItems, toggleContextItem,
  type CapabilityContextManifest, type ContextSnapshot, type CoreContextItem, type WorkBuddyTaskType,
} from '@domain/workbuddy/core-context';
import {
  confirmCoursewareBrief, createSingleCoursewareRun, executeCoursewarePlan, replanCoursewareRun,
  reviseCoursewareBrief, updateCoursewareBrief,
  type CoursewareExecutionOutput, type CoursewareRunDefinition, type SingleCoursewareRun,
} from '@domain/workbuddy/course-production';
import {
  applyPackageExecutionReceipt, attachPackageContext, beginPackageGeneration, completePackageGeneration, createCoursePackageRun,
  markPackageArtifactsApproved, reopenPackageArtifacts, retryPackageArtifact, setPackageArtifactIncluded,
  type CoursePackageDefinition, type CoursePackageRun, type PackageExecutionReceipt,
} from '@domain/workbuddy/course-package';
import { createPackageSaveAction, decidePackageAction, type PackageActionInput, type PackageApproval, type PackageProposedAction } from '@domain/workbuddy/package-writeback';
import {
  approveAction, createCoursewareSaveAction, rejectAction,
  type Approval, type CoursewareSaveActionInput, type ExecutionReceipt, type ProposedAction,
} from '@domain/workbuddy/writeback';
import { projectCoreContextView, projectCoursewareRunView, projectPackageRunView } from './workbuddy-course-production-view';
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
  runtimeFixture: WorkBuddyRuntimeFixture;
  writebackAdapter: ClassInWritebackAdapter;
  writebackScenarioController: WritebackScenarioController;
  packageWritebackAdapter: PackageWritebackAdapter;
  packageWritebackScenarioController: PackageWritebackScenarioController;
  children: ReactNode;
}>;

function projectCoursewareHistory(current: readonly WorkBuddyRunViewModel[], run: SingleCoursewareRun, fixture: WorkBuddyRuntimeFixture): readonly WorkBuddyRunViewModel[] {
  const existing = current.find(({ id }) => id === run.id);
  const item: WorkBuddyRunViewModel = {
    fixtureVersion: run.fixtureVersion, id: run.id, title: run.title, relativeTime: fixture.history.relativeTime, pinned: existing?.pinned,
    runState: run.stage === 'artifact_ready'
      ? { status: 'completed', allowedCommands: ['review-artifact'], recovery: null }
      : { status: 'waiting', allowedCommands: ['confirm', 'revise'], recovery: 'confirm-or-revise' },
    goal: run.goal,
    contextLabels: existing?.contextLabels ?? [],
    steps: run.events.length
      ? run.events.map((event) => ({ title: event.title, summary: event.summary, time: fixture.history.eventTime, state: 'completed' }))
      : [{ title: '等待教师确认', summary: '核心上下文与计划仍在确认阶段。', time: fixture.history.currentStepTime, state: 'waiting' }],
    artifact: run.artifact
      ? { title: run.artifact.title, version: run.artifact.version, progress: `${run.artifact.pageCount} 页`, eyebrow: fixture.history.coursewareEyebrow, heading: run.artifact.title, summary: run.artifact.validationSummary, truthLabel: run.artifact.truthLabel }
      : { title: '课件草稿', version: '尚未生成', progress: '等待计划确认', eyebrow: '[模拟]课程生产', heading: '尚未生成课件', summary: '确认任务信息和计划后生成[模拟]产物。', truthLabel: '[模拟]当前没有已生成的课件草稿。' },
  };
  return [item, ...current.filter(({ id }) => id !== run.id)];
}

function projectPackageHistory(current: readonly WorkBuddyRunViewModel[], run: CoursePackageRun, fixture: WorkBuddyRuntimeFixture): readonly WorkBuddyRunViewModel[] {
  const existing = current.find(({ id }) => id === run.id);
  const completed = run.stage === 'completed';
  const failedCount = run.artifacts.filter(({ state }) => state === 'failed').length;
  const readyCount = run.artifacts.filter(({ state }) => ['ready', 'approved', 'written_back'].includes(state)).length;
  const item: WorkBuddyRunViewModel = {
    fixtureVersion: run.fixtureVersion, id: run.id, title: run.title, relativeTime: fixture.history.relativeTime, pinned: existing?.pinned,
    runState: completed
      ? { status: 'completed', allowedCommands: ['review-artifact'], recovery: null }
      : run.stage === 'generating'
        ? { status: 'running', allowedCommands: ['supplement', 'stop'], recovery: 'stop-or-wait' }
      : { status: 'waiting', allowedCommands: ['confirm', 'revise'], recovery: 'confirm-or-revise' },
    goal: run.goal, contextLabels: existing?.contextLabels ?? [],
    steps: [{
      title: run.stage === 'awaiting_context' ? '等待确认独立上下文' : run.stage === 'configuring' ? '等待确认产物清单' : run.stage === 'generating' ? '课程方案包生成中' : '课程方案包已生成',
      summary: `${readyCount} 项可用${failedCount ? ` · ${failedCount} 项需恢复` : ''}`, time: fixture.history.currentStepTime, state: run.stage === 'generating' ? 'running' : failedCount ? 'failed' : completed ? 'completed' : 'waiting',
    }],
    artifact: { title: '课程方案包', version: 'v1', progress: `${readyCount}/${run.artifacts.length} 项`, eyebrow: fixture.history.packageEyebrow, heading: run.title, summary: fixture.history.packageSummary, truthLabel: '[模拟]课程方案包 · 未连接真实 ClassIn 写回。' },
  };
  return [item, ...current.filter(({ id }) => id !== run.id)];
}

export function WorkBuddyWorkspaceProvider(props: WorkBuddyWorkspaceProviderProps) {
  const {
    initialRuns, initialContextItems, recommendedContextItemIds, coursewareDefinition, coursewareOutput,
    capabilityManifests, coursewareActionInput, packageDefinition, packageActionInput, packageFailedArtifactIds, runtimeFixture,
    writebackAdapter, writebackScenarioController, packageWritebackAdapter, packageWritebackScenarioController, children,
  } = props;
  const [runs, setRuns] = useState<readonly WorkBuddyRunViewModel[]>(initialRuns);
  const [contextProposal, setContextProposal] = useState(() => createContextProposal(initialContextItems, 'single-courseware'));
  const [contextSnapshot, setContextSnapshot] = useState<ContextSnapshot | null>(null);
  const [runSnapshots, setRunSnapshots] = useState<Readonly<Record<string, ContextSnapshot>>>({});
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
  const [activePackageArtifactId, setActivePackageArtifactId] = useState<string | null>(null);

  const coursewareSnapshot = coursewareRun ? runSnapshots[coursewareRun.id] ?? null : null;
  const projections = useMemo(() => coursewareSnapshot
    ? capabilityManifests.map((manifest) => projectContext(coursewareSnapshot, manifest, runtimeFixture.projectionGeneratedAt))
    : [], [capabilityManifests, coursewareSnapshot, runtimeFixture.projectionGeneratedAt]);

  const value = useMemo<WorkBuddyWorkspace>(() => ({
    runs,
    getRun: (runId) => runs.find((run) => run.id === runId),
    renameRun: (runId, title) => setRuns((current) => current.map((run) => run.id === runId ? { ...run, title } : run)),
    togglePinRun: (runId) => setRuns((current) => current.map((run) => run.id === runId ? { ...run, pinned: !run.pinned } : run)),
    removeRun: (runId) => setRuns((current) => current.filter((run) => run.id !== runId)),
    contextView: projectCoreContextView(contextProposal, contextSnapshot),
    coursewareContextView: coursewareSnapshot ? projectCoreContextView(contextProposal, coursewareSnapshot) : null,
    applyRecommendedContext: () => {
      setContextSnapshot(null);
      setContextProposal((current) => selectContextItems(current, recommendedContextItemIds));
    },
    toggleCoreContextItem: (itemId) => {
      setContextSnapshot(null);
      setContextProposal((current) => toggleContextItem(current, itemId));
    },
    confirmCoreContext: () => {
      const result = confirmContext(contextProposal, {
        snapshotId: contextProposal.taskType === 'course-package' ? runtimeFixture.snapshot.packageId : runtimeFixture.snapshot.coursewareId,
        confirmedAt: runtimeFixture.snapshot.confirmedAt,
      });
      if (!result.ok) return;
      setContextSnapshot(result.snapshot);
      if (packageRun?.stage === 'awaiting_context') {
        const next = attachPackageContext(packageRun, result.snapshot.id);
        setRunSnapshots((current) => ({ ...current, [next.id]: result.snapshot }));
        setPackageRun(next);
        setRuns((current) => projectPackageHistory(current, next, runtimeFixture));
      }
    },
    resetCoreContext: () => {
      setContextSnapshot(null); setRunSnapshots({}); setContextProposal(createContextProposal(initialContextItems, 'single-courseware')); setTaskTypeState('single-courseware');
      setCoursewareRun(null); setCoursewareAction(null); setCoursewareApproval(null); setCoursewareReceipt(null);
      setPackageRun(null); setPackageAction(null); setPackageApproval(null); setPackageReceipt(null);
      setActiveCoursewarePanel('none'); setActivePackagePanel('none');
      setActivePackageArtifactId(null);
      writebackScenarioController.setScenario('success'); setWritebackScenarioState('success');
      packageWritebackScenarioController.setScenario('partial_success'); setPackageWritebackScenarioState('partial_success');
      setRuns((current) => current.filter(({ fixtureVersion }) => fixtureVersion === 'workbuddy-m3-v1'));
    },
    coursewareView: projectCoursewareRunView(coursewareRun, projections, coursewareAction, coursewareReceipt),
    createCoursewareTask: (goal) => {
      if (!contextSnapshot || !goal.trim()) return null;
      const run = createSingleCoursewareRun(coursewareDefinition, goal, contextSnapshot.id);
      setCoursewareRun(run);
      setRunSnapshots((current) => ({ ...current, [run.id]: contextSnapshot }));
      setRuns((current) => projectCoursewareHistory(current, run, runtimeFixture).map((item) => item.id === run.id ? { ...item, contextLabels: contextSnapshot.items.filter(({ kind }) => runtimeFixture.contextSummaryKinds.includes(kind)).map(({ label }) => label) } : item));
      return run.id;
    },
    updateCoursewareTaskBrief: (patch) => setCoursewareRun((current) => current ? updateCoursewareBrief(current, patch) : current),
    confirmCoursewareTaskBrief: () => setCoursewareRun((current) => current ? confirmCoursewareBrief(current) : current),
    reviseCoursewareTaskBrief: () => setCoursewareRun((current) => current ? reviseCoursewareBrief(current) : current),
    executeCoursewareTaskPlan: () => setCoursewareRun((current) => {
      if (!current) return current;
      const next = executeCoursewarePlan(current, coursewareOutput);
      setRuns((history) => projectCoursewareHistory(history, next, runtimeFixture));
      return next;
    }),
    proposeCoursewareSave: () => {
      if (!coursewareRun?.artifact) return;
      setCoursewareAction(createCoursewareSaveAction({ ...coursewareActionInput, artifactId: coursewareRun.artifact.id, artifactVersion: coursewareRun.artifact.version }));
      setCoursewareApproval(null); setCoursewareReceipt(null);
    },
    approveCoursewareSave: () => {
      if (!coursewareAction) return;
      const result = approveAction(coursewareAction, runtimeFixture.approval.coursewareApproveId, runtimeFixture.approval.coursewareDecidedAt, runtimeFixture.approval.actorId);
      if (result) { setCoursewareAction(result.action); setCoursewareApproval(result.approval); }
    },
    rejectCoursewareSave: () => {
      if (!coursewareAction) return;
      const result = rejectAction(coursewareAction, runtimeFixture.approval.coursewareRejectId, runtimeFixture.approval.coursewareDecidedAt, runtimeFixture.approval.actorId);
      if (result) { setCoursewareAction(result.action); setCoursewareApproval(result.approval); }
    },
    executeApprovedCoursewareSave: () => {
      if (coursewareAction && coursewareApproval) setCoursewareReceipt(writebackAdapter.execute(coursewareAction, coursewareApproval));
    },
    recoverCoursewareSave: () => {
      if (!coursewareRun?.artifact || !coursewareReceipt || coursewareReceipt.status === 'success') return;
      const target = coursewareReceipt.status === 'permission_denied'
        ? { ...coursewareActionInput.target, ...runtimeFixture.coursewareRecovery.fallbackTarget }
        : { ...coursewareActionInput.target, expectedVersion: coursewareReceipt.status === 'version_conflict' ? coursewareReceipt.currentVersion ?? coursewareActionInput.target.expectedVersion : coursewareActionInput.target.expectedVersion };
      if (coursewareReceipt.status === 'permission_denied') {
        writebackScenarioController.setScenario('success');
        setWritebackScenarioState('success');
      }
      setCoursewareAction(createCoursewareSaveAction({ ...coursewareActionInput, id: runtimeFixture.coursewareRecovery.actionId, idempotencyKey: runtimeFixture.coursewareRecovery.idempotencyKey, artifactId: coursewareRun.artifact.id, artifactVersion: coursewareRun.artifact.version, target }));
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
      setRunSnapshots((current) => ({ ...current, [run.id]: contextSnapshot }));
      setRuns((current) => projectPackageHistory(current, run, runtimeFixture).map((item) => item.id === run.id ? { ...item, contextLabels: contextSnapshot.items.filter(({ kind }) => runtimeFixture.contextSummaryKinds.includes(kind)).map(({ label }) => label) } : item));
      return run.id;
    },
    beginPackageGeneration: () => setPackageRun((current) => {
      if (!current) return current;
      const next = beginPackageGeneration(current);
      setRuns((history) => projectPackageHistory(history, next, runtimeFixture));
      return next;
    }),
    completePackageGeneration: () => setPackageRun((current) => {
      if (!current) return current;
      const next = completePackageGeneration(current, packageFailedArtifactIds);
      setActivePackageArtifactId(next.artifacts[0]?.id ?? null);
      setRuns((history) => projectPackageHistory(history, next, runtimeFixture));
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
        id: runtimeFixture.packageRecovery.retryActionId,
        idempotencyKey: runtimeFixture.packageRecovery.retryIdempotencyKey,
      } : packageActionInput);
      if (action) { setPackageAction(action); setPackageApproval(null); setPackageReceipt(null); }
    },
    approvePackageSave: () => {
      if (!packageAction || !packageRun) return;
      const result = decidePackageAction(packageAction, { id: runtimeFixture.approval.packageApproveId, decidedBy: runtimeFixture.approval.actorId, decidedAt: runtimeFixture.approval.packageDecidedAt }, 'approved');
      if (!result) return;
      setPackageAction(result.action); setPackageApproval(result.approval); setPackageRun(markPackageArtifactsApproved(packageRun, result.action.artifactRefs.map(({ id }) => id)));
    },
    rejectPackageSave: () => {
      if (!packageAction) return;
      const result = decidePackageAction(packageAction, { id: runtimeFixture.approval.packageRejectId, decidedBy: runtimeFixture.approval.actorId, decidedAt: runtimeFixture.approval.packageDecidedAt }, 'rejected');
      if (result) { setPackageAction(result.action); setPackageApproval(result.approval); }
    },
    executeApprovedPackageSave: () => {
      if (!packageRun || !packageRun.contextSnapshotId || !packageAction || !packageApproval) return;
      const contextSnapshotId = packageRun.contextSnapshotId;
      const candidates = packageRun.artifacts.map(({ id, kind, version, state }) => ({
        id, kind, version, runRef: packageRun.id, contextSnapshotId,
        approvalState: state === 'approved' || state === 'written_back' ? state : 'not_selected' as const,
      }));
      const receipt = packageWritebackAdapter.execute(packageAction, packageApproval, candidates);
      const next = applyPackageExecutionReceipt(packageRun, receipt);
      setPackageReceipt(receipt); setPackageRun(next); setRuns((history) => projectPackageHistory(history, next, runtimeFixture));
    },
    recoverPackageSave: () => {
      if (!packageRun || !packageReceipt || !['permission_denied', 'version_conflict'].includes(packageReceipt.status)) return;
      const target = packageReceipt.status === 'permission_denied'
        ? { ...packageActionInput.target, ...runtimeFixture.packageRecovery.fallbackTarget }
        : { ...packageActionInput.target, expectedVersion: packageReceipt.currentVersion ?? packageActionInput.target.expectedVersion };
      if (packageReceipt.status === 'permission_denied') {
        packageWritebackScenarioController.setScenario('success');
        setPackageWritebackScenarioState('success');
      }
      const reopened = reopenPackageArtifacts(packageRun);
      const action = createPackageSaveAction(reopened, { ...packageActionInput, id: runtimeFixture.packageRecovery.actionId, idempotencyKey: runtimeFixture.packageRecovery.idempotencyKey, target });
      if (action) { setPackageRun(reopened); setPackageAction(action); setPackageApproval(null); setPackageReceipt(null); setActivePackagePanel('approval'); }
    },
    retryPackageItem: (artifactId) => setPackageRun((current) => current ? retryPackageArtifact(current, artifactId) : current),
    derivePackageFromCourseware: () => {
      if (!coursewareRun?.artifact) return null;
      const proposal = selectContextItems(createContextProposal(initialContextItems, 'course-package'), runtimeFixture.derivedPackage.recommendedContextItemIds);
      const run = createCoursePackageRun(packageDefinition, runtimeFixture.derivedPackage.goal, null, {
        parentRunRef: coursewareRun.id, sourceArtifactRef: Object.freeze({ id: coursewareRun.artifact.id, version: coursewareRun.artifact.version }),
      });
      setTaskTypeState('course-package'); setContextSnapshot(null); setContextProposal(proposal);
      setPackageRun(run); setPackageAction(null); setPackageApproval(null); setPackageReceipt(null); setActivePackagePanel('none');
      setRuns((current) => projectPackageHistory(current, run, runtimeFixture));
      return run.id;
    },
    activeCoursewarePanel, setActiveCoursewarePanel,
    activePackagePanel, setActivePackagePanel,
    activePackageArtifactId, setActivePackageArtifactId,
    replanScope: Object.freeze({ previousLabel: runtimeFixture.replan.previousScopeLabel, nextLabel: runtimeFixture.replan.nextScopeLabel }),
    replanCoursewareToWaveContext: () => {
      if (!coursewareRun) return;
      const proposal = selectContextItems(createContextProposal(initialContextItems, 'single-courseware'), runtimeFixture.replan.selectedContextItemIds);
      const result = confirmContext(proposal, { snapshotId: runtimeFixture.snapshot.replannedCoursewareId, confirmedAt: runtimeFixture.snapshot.replannedAt });
      if (!result.ok) return;
      const next = replanCoursewareRun(coursewareRun, result.snapshot.id, runtimeFixture.replan.reason, { actionId: coursewareAction?.id, receiptId: coursewareReceipt?.id });
      setRunSnapshots((current) => ({ ...current, [next.id]: result.snapshot }));
      setContextSnapshot(result.snapshot); setContextProposal(proposal); setCoursewareRun(next);
      setCoursewareAction(null); setCoursewareApproval(null); setCoursewareReceipt(null); setActiveCoursewarePanel('none');
      setRuns((history) => projectCoursewareHistory(history, next, runtimeFixture));
    },
  }), [
    activeCoursewarePanel, activePackageArtifactId, activePackagePanel, contextProposal, contextSnapshot, coursewareAction,
    coursewareActionInput, coursewareApproval, coursewareDefinition, coursewareOutput, coursewareReceipt, coursewareRun, coursewareSnapshot,
    initialContextItems, packageAction, packageActionInput, packageApproval, packageDefinition, packageFailedArtifactIds,
    packageReceipt, packageRun, packageWritebackAdapter, packageWritebackScenario, packageWritebackScenarioController,
    projections, recommendedContextItemIds, runs, runtimeFixture, taskType, writebackAdapter, writebackScenario,
    writebackScenarioController,
  ]);

  return <WorkBuddyWorkspaceContext.Provider value={value}>{children}</WorkBuddyWorkspaceContext.Provider>;
}
