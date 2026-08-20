import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { WorkBuddyRunViewModel } from '@contracts/workbuddy/workspace';
import type { ClassInWritebackAdapter, WritebackScenario, WritebackScenarioController } from '@contracts/workbuddy/classin-writeback';
import type { PackageWritebackAdapter, PackageWritebackScenario, PackageWritebackScenarioController } from '@contracts/workbuddy/package-writeback';
import type { WorkBuddyRuntimeFixture } from '@contracts/workbuddy/runtime-fixture';
import {
  confirmContext, createContextProposal, projectContext, selectContextItems, toggleContextItem,
  type CapabilityContextManifest, type ContextSnapshot, type CoreContextItem, type WorkBuddyTaskType,
} from '@domain/workbuddy/core-context';
import {
  approveCoursewareArtifact, confirmCoursewareBrief, createSingleCoursewareRun, executeCoursewarePlan, replanCoursewareRun,
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
import {
  WorkBuddyWorkspaceContext,
  type CoursewarePanel,
  type PackagePanel,
  type WorkBuddyContext,
  type WorkBuddyCoursePackage,
  type WorkBuddyCourseware,
  type WorkBuddyHistory,
  type WorkBuddyWorkspace,
} from './workbuddy-workspace';

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

type HistoryOverride = Readonly<{ title?: string; pinned?: boolean; removed?: boolean }>;
type PersistedWorkspaceState = Readonly<{
  fixtureVersion: 'workbuddy-m4-course-production-v1';
  contextProposal: ReturnType<typeof createContextProposal>;
  contextSnapshot: ContextSnapshot | null;
  snapshotsById: Readonly<Record<string, ContextSnapshot>>;
  taskType: WorkBuddyTaskType;
  coursewareRun: SingleCoursewareRun | null;
  coursewareAction: ProposedAction | null;
  coursewareApproval: Approval | null;
  coursewareReceipt: ExecutionReceipt | null;
  packageRun: CoursePackageRun | null;
  packageAction: PackageProposedAction | null;
  packageApproval: PackageApproval | null;
  packageReceipt: PackageExecutionReceipt | null;
  historyOverrides: Readonly<Record<string, HistoryOverride>>;
}>;

const WORKBUDDY_SESSION_KEY = 'classin-workbuddy-m4-session-v1';

function loadWorkspaceState(): PersistedWorkspaceState | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(WORKBUDDY_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedWorkspaceState;
    return parsed.fixtureVersion === 'workbuddy-m4-course-production-v1' ? parsed : null;
  } catch {
    return null;
  }
}

type WorkspaceImplementation = WorkBuddyHistory
  & WorkBuddyContext
  & Omit<WorkBuddyCourseware, 'activePanel' | 'setActivePanel' | 'replanToWaveContext'>
  & Omit<WorkBuddyCoursePackage, 'activePanel' | 'setActivePanel'>
  & Readonly<{
    activeCoursewarePanel: CoursewarePanel;
    setActiveCoursewarePanel: (panel: CoursewarePanel) => void;
    activePackagePanel: PackagePanel;
    setActivePackagePanel: (panel: PackagePanel) => void;
    replanCoursewareToWaveContext: () => void;
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
  const completed = run.stage === 'completed' || (run.stage === 'artifact_ready' && run.artifacts.every(({ state }) => !['failed', 'waiting', 'generating', 'planned'].includes(state)));
  const failedCount = run.artifacts.filter(({ state }) => state === 'failed').length;
  const readyCount = run.artifacts.filter(({ state }) => ['ready', 'approved', 'written_back'].includes(state)).length;
  const item: WorkBuddyRunViewModel = {
    fixtureVersion: run.fixtureVersion, id: run.id, title: run.title, relativeTime: fixture.history.relativeTime, pinned: existing?.pinned,
    runState: completed
      ? { status: 'completed', allowedCommands: ['review-artifact'], recovery: null }
      : run.stage === 'generating'
        ? { status: 'running', allowedCommands: ['supplement', 'stop'], recovery: 'stop-or-wait' }
      : run.stage === 'partial_success' || failedCount
        ? { status: 'failed', allowedCommands: ['retry', 'revise'], recovery: 'retry-or-revise' }
        : { status: 'waiting', allowedCommands: ['confirm', 'revise'], recovery: 'confirm-or-revise' },
    goal: run.goal, contextLabels: existing?.contextLabels ?? [],
    steps: [{
      title: run.stage === 'awaiting_context' ? '等待确认独立上下文' : run.stage === 'configuring' ? '等待确认产物清单' : run.stage === 'generating' ? '课程方案包生成中' : run.stage === 'partial_success' ? '部分产物写回失败' : '课程方案包已生成',
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
  const [restoredState] = useState(loadWorkspaceState);
  const [historyOverrides, setHistoryOverrides] = useState<Readonly<Record<string, HistoryOverride>>>(restoredState?.historyOverrides ?? {});
  const [contextProposal, setContextProposal] = useState(() => restoredState?.contextProposal ?? createContextProposal(initialContextItems, 'single-courseware'));
  const [contextSnapshot, setContextSnapshot] = useState<ContextSnapshot | null>(restoredState?.contextSnapshot ?? null);
  const [snapshotsById, setSnapshotsById] = useState<Readonly<Record<string, ContextSnapshot>>>(restoredState?.snapshotsById ?? {});
  const [coursewareRun, setCoursewareRun] = useState<SingleCoursewareRun | null>(restoredState?.coursewareRun ?? null);
  const [coursewareAction, setCoursewareAction] = useState<ProposedAction | null>(restoredState?.coursewareAction ?? null);
  const [coursewareApproval, setCoursewareApproval] = useState<Approval | null>(restoredState?.coursewareApproval ?? null);
  const [coursewareReceipt, setCoursewareReceipt] = useState<ExecutionReceipt | null>(restoredState?.coursewareReceipt ?? null);
  const [writebackScenario, setWritebackScenarioState] = useState<WritebackScenario>(() => writebackScenarioController.getScenario());
  const [taskType, setTaskTypeState] = useState<WorkBuddyTaskType>(restoredState?.taskType ?? 'single-courseware');
  const [packageRun, setPackageRun] = useState<CoursePackageRun | null>(restoredState?.packageRun ?? null);
  const [packageAction, setPackageAction] = useState<PackageProposedAction | null>(restoredState?.packageAction ?? null);
  const [packageApproval, setPackageApproval] = useState<PackageApproval | null>(restoredState?.packageApproval ?? null);
  const [packageReceipt, setPackageReceipt] = useState<PackageExecutionReceipt | null>(restoredState?.packageReceipt ?? null);
  const [packageWritebackScenario, setPackageWritebackScenarioState] = useState<PackageWritebackScenario>(() => packageWritebackScenarioController.getScenario());
  const [activeCoursewarePanel, setActiveCoursewarePanel] = useState<CoursewarePanel>('none');
  const [activePackagePanel, setActivePackagePanel] = useState<PackagePanel>('none');
  const [activePackageArtifactId, setActivePackageArtifactId] = useState<string | null>(null);

  const runs = useMemo(() => {
    let projected = [...initialRuns];
    if (coursewareRun) {
      const labels = snapshotsById[coursewareRun.contextSnapshotId]?.items.filter(({ kind }) => runtimeFixture.contextSummaryKinds.includes(kind)).map(({ label }) => label) ?? [];
      projected = projectCoursewareHistory(projected, coursewareRun, runtimeFixture).map((item) => item.id === coursewareRun.id ? { ...item, contextLabels: labels } : item);
    }
    if (packageRun) {
      const labels = packageRun.contextSnapshotId ? snapshotsById[packageRun.contextSnapshotId]?.items.filter(({ kind }) => runtimeFixture.contextSummaryKinds.includes(kind)).map(({ label }) => label) ?? [] : [];
      projected = projectPackageHistory(projected, packageRun, runtimeFixture).map((item) => item.id === packageRun.id ? { ...item, contextLabels: labels } : item);
    }
    return Object.freeze(projected
      .filter(({ id }) => !historyOverrides[id]?.removed)
      .map((run) => Object.freeze({ ...run, title: historyOverrides[run.id]?.title ?? run.title, pinned: historyOverrides[run.id]?.pinned ?? run.pinned })));
  }, [coursewareRun, historyOverrides, initialRuns, packageRun, runtimeFixture, snapshotsById]);

  const coursewareSnapshot = coursewareRun ? snapshotsById[coursewareRun.contextSnapshotId] ?? null : null;
  const projections = useMemo(() => coursewareSnapshot && coursewareRun
    ? capabilityManifests.map((manifest) => projectContext(coursewareSnapshot, manifest, {
      generatedAt: runtimeFixture.projectionGeneratedAt,
      taskGoal: coursewareRun.goal,
    }))
    : [], [capabilityManifests, coursewareRun, coursewareSnapshot, runtimeFixture.projectionGeneratedAt]);

  useEffect(() => {
    const state: PersistedWorkspaceState = {
      fixtureVersion: 'workbuddy-m4-course-production-v1', contextProposal, contextSnapshot, snapshotsById, taskType,
      coursewareRun, coursewareAction, coursewareApproval, coursewareReceipt,
      packageRun, packageAction, packageApproval, packageReceipt, historyOverrides,
    };
    window.localStorage.setItem(WORKBUDDY_SESSION_KEY, JSON.stringify(state));
  }, [contextProposal, contextSnapshot, coursewareAction, coursewareApproval, coursewareReceipt, coursewareRun,
    historyOverrides, packageAction, packageApproval, packageReceipt, packageRun, snapshotsById, taskType]);

  const implementation = useMemo<WorkspaceImplementation>(() => ({
    runs,
    getRun: (runId) => runs.find((run) => run.id === runId),
    renameRun: (runId, title) => setHistoryOverrides((current) => ({ ...current, [runId]: { ...current[runId], title } })),
    togglePinRun: (runId) => setHistoryOverrides((current) => ({ ...current, [runId]: { ...current[runId], pinned: !(current[runId]?.pinned ?? runs.find((run) => run.id === runId)?.pinned) } })),
    removeRun: (runId) => setHistoryOverrides((current) => ({ ...current, [runId]: { ...current[runId], removed: true } })),
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
        setSnapshotsById((current) => ({ ...current, [result.snapshot.id]: result.snapshot }));
        setPackageRun(next);
      }
    },
    resetCoreContext: () => {
      setContextSnapshot(null); setSnapshotsById({}); setContextProposal(createContextProposal(initialContextItems, 'single-courseware')); setTaskTypeState('single-courseware');
      setCoursewareRun(null); setCoursewareAction(null); setCoursewareApproval(null); setCoursewareReceipt(null);
      setPackageRun(null); setPackageAction(null); setPackageApproval(null); setPackageReceipt(null);
      setActiveCoursewarePanel('none'); setActivePackagePanel('none');
      setActivePackageArtifactId(null);
      writebackScenarioController.setScenario('success'); setWritebackScenarioState('success');
      packageWritebackScenarioController.setScenario('partial_success'); setPackageWritebackScenarioState('partial_success');
      setHistoryOverrides({});
      window.localStorage.removeItem(WORKBUDDY_SESSION_KEY);
    },
    coursewareView: projectCoursewareRunView(coursewareRun, projections, coursewareAction, coursewareReceipt, snapshotsById),
    createCoursewareTask: (goal) => {
      if (!contextSnapshot || !goal.trim()) return null;
      const run = createSingleCoursewareRun(coursewareDefinition, goal, contextSnapshot.id);
      setCoursewareRun(run); setCoursewareAction(null); setCoursewareApproval(null); setCoursewareReceipt(null);
      setSnapshotsById((current) => ({ ...current, [contextSnapshot.id]: contextSnapshot }));
      return run.id;
    },
    updateCoursewareTaskBrief: (patch) => setCoursewareRun((current) => current ? updateCoursewareBrief(current, patch) : current),
    confirmCoursewareTaskBrief: () => setCoursewareRun((current) => current ? confirmCoursewareBrief(current) : current),
    reviseCoursewareTaskBrief: () => setCoursewareRun((current) => current ? reviseCoursewareBrief(current) : current),
    executeCoursewareTaskPlan: () => setCoursewareRun((current) => {
      if (!current) return current;
      const output = current.revision > 1 ? {
        ...coursewareOutput,
        events: coursewareOutput.events.map((event) => Object.freeze({ ...event, id: `${event.id}-r${current.revision}` })),
        artifact: Object.freeze({ ...coursewareOutput.artifact, ...runtimeFixture.replan.artifact, sourceStepId: `${coursewareOutput.artifact.sourceStepId}-r${current.revision}` }),
      } : coursewareOutput;
      const next = executeCoursewarePlan(current, output);
      return next;
    }),
    approveCoursewareArtifact: () => setCoursewareRun((current) => current ? approveCoursewareArtifact(current) : current),
    proposeCoursewareSave: () => {
      if (!coursewareRun?.artifact || coursewareRun.reviewStatus !== 'approved') return;
      const target = coursewareRun.revision > 1 ? runtimeFixture.replan.target : coursewareActionInput.target;
      setCoursewareAction(createCoursewareSaveAction({
        ...coursewareActionInput, runRef: coursewareRun.id, contextSnapshotId: coursewareRun.contextSnapshotId,
        artifactId: coursewareRun.artifact.id, artifactVersion: coursewareRun.artifact.version, target,
      }));
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
      if (!coursewareRun?.artifact || !coursewareAction || !coursewareApproval) return;
      if (coursewareAction.runRef !== coursewareRun.id || coursewareAction.contextSnapshotId !== coursewareRun.contextSnapshotId
        || coursewareAction.artifactRef.id !== coursewareRun.artifact.id || coursewareAction.artifactRef.version !== coursewareRun.artifact.version
        || coursewareApproval.actionId !== coursewareAction.id) return;
      setCoursewareReceipt(writebackAdapter.execute(coursewareAction, coursewareApproval));
    },
    recoverCoursewareSave: () => {
      if (!coursewareRun?.artifact || !coursewareReceipt || coursewareReceipt.status === 'success') return;
      const previousTarget = coursewareAction?.target ?? (coursewareRun.revision > 1 ? runtimeFixture.replan.target : coursewareActionInput.target);
      const target = coursewareReceipt.status === 'permission_denied'
        ? { ...previousTarget, ...runtimeFixture.coursewareRecovery.fallbackTarget }
        : { ...previousTarget, expectedVersion: coursewareReceipt.status === 'version_conflict' ? coursewareReceipt.currentVersion : previousTarget.expectedVersion };
      if (coursewareReceipt.status === 'permission_denied') {
        writebackScenarioController.setScenario('success');
        setWritebackScenarioState('success');
      }
      setCoursewareAction(createCoursewareSaveAction({
        ...coursewareActionInput, id: runtimeFixture.coursewareRecovery.actionId, idempotencyKey: runtimeFixture.coursewareRecovery.idempotencyKey,
        runRef: coursewareRun.id, contextSnapshotId: coursewareRun.contextSnapshotId,
        artifactId: coursewareRun.artifact.id, artifactVersion: coursewareRun.artifact.version, target,
      }));
      setCoursewareApproval(null); setCoursewareReceipt(null); setActiveCoursewarePanel('action');
    },
    writebackScenario,
    setWritebackScenario: (scenario) => {
      writebackScenarioController.setScenario(scenario); setWritebackScenarioState(scenario);
      setCoursewareAction(null); setCoursewareApproval(null); setCoursewareReceipt(null);
    },
    taskType,
    setTaskType: (nextTaskType) => {
      if (nextTaskType === taskType) return;
      setTaskTypeState(nextTaskType); setContextSnapshot(null); setContextProposal(createContextProposal(initialContextItems, nextTaskType));
    },
    packageView: projectPackageRunView(packageRun, packageAction, packageReceipt),
    packageWritebackScenario,
    setPackageWritebackScenario: (scenario) => {
      packageWritebackScenarioController.setScenario(scenario); setPackageWritebackScenarioState(scenario);
      setPackageAction(null); setPackageApproval(null); setPackageReceipt(null);
    },
    createPackageTask: (goal) => {
      if (!contextSnapshot || taskType !== 'course-package' || !goal.trim()) return null;
      const run = createCoursePackageRun(packageDefinition, goal, contextSnapshot.id);
      setPackageRun(run); setPackageAction(null); setPackageApproval(null); setPackageReceipt(null);
      setSnapshotsById((current) => ({ ...current, [contextSnapshot.id]: contextSnapshot }));
      return run.id;
    },
    beginPackageGeneration: () => setPackageRun((current) => {
      if (!current) return current;
      const next = beginPackageGeneration(current);
      return next;
    }),
    completePackageGeneration: () => setPackageRun((current) => {
      if (!current) return current;
      const next = completePackageGeneration(current, packageFailedArtifactIds);
      setActivePackageArtifactId(next.artifacts[0]?.id ?? null);
      return next;
    }),
    setPackageItemIncluded: (artifactId, included) => setPackageRun((current) => {
      if (!current) return current;
      const next = setPackageArtifactIncluded(current, artifactId, included);
      if (packageAction?.status === 'proposed') setPackageAction(createPackageSaveAction(next, packageAction));
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
      if (packageAction.runRef !== packageRun.id || packageAction.contextSnapshotId !== packageRun.contextSnapshotId || packageApproval.actionId !== packageAction.id) return;
      const contextSnapshotId = packageRun.contextSnapshotId;
      const candidates = packageRun.artifacts.map(({ id, kind, version, state }) => ({
        id, kind, version, runRef: packageRun.id, contextSnapshotId,
        approvalState: state === 'approved' || state === 'written_back' ? state : 'not_selected' as const,
      }));
      const receipt = packageWritebackAdapter.execute(packageAction, packageApproval, candidates);
      const next = applyPackageExecutionReceipt(packageRun, packageAction, packageApproval, receipt);
      setPackageReceipt(receipt); setPackageRun(next);
    },
    recoverPackageSave: () => {
      if (!packageRun || !packageReceipt || (packageReceipt.status !== 'permission_denied' && packageReceipt.status !== 'version_conflict')) return;
      const previousTarget = packageAction?.target ?? packageActionInput.target;
      const target = packageReceipt.status === 'permission_denied'
        ? { ...previousTarget, ...runtimeFixture.packageRecovery.fallbackTarget }
        : { ...previousTarget, expectedVersion: packageReceipt.currentVersion };
      if (packageReceipt.status === 'permission_denied') {
        packageWritebackScenarioController.setScenario('success');
        setPackageWritebackScenarioState('success');
      }
      const reopened = reopenPackageArtifacts(packageRun);
      const action = createPackageSaveAction(reopened, { ...packageActionInput, id: runtimeFixture.packageRecovery.actionId, idempotencyKey: runtimeFixture.packageRecovery.idempotencyKey, target });
      if (action) { setPackageRun(reopened); setPackageAction(action); setPackageApproval(null); setPackageReceipt(null); setActivePackagePanel('approval'); }
    },
    retryFailedPackageItems: () => {
      setPackageRun((current) => current
        ? current.artifacts
          .filter(({ state, allowedCommands }) => state === 'failed' && allowedCommands.includes('retry'))
          .reduce((next, artifact) => retryPackageArtifact(next, artifact.id), current)
        : current);
      setPackageAction(null); setPackageApproval(null); setPackageReceipt(null);
    },
    derivePackageFromCourseware: () => {
      if (!coursewareRun?.artifact || coursewareRun.reviewStatus !== 'approved') return null;
      const proposal = selectContextItems(createContextProposal(initialContextItems, 'course-package'), runtimeFixture.derivedPackage.recommendedContextItemIds);
      const run = createCoursePackageRun(packageDefinition, runtimeFixture.derivedPackage.goal, null, {
        parentRunRef: coursewareRun.id, sourceArtifactRef: Object.freeze({ id: coursewareRun.artifact.id, version: coursewareRun.artifact.version }),
      });
      setTaskTypeState('course-package'); setContextSnapshot(null); setContextProposal(proposal);
      setPackageRun(run); setPackageAction(null); setPackageApproval(null); setPackageReceipt(null); setActivePackagePanel('none');
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
      const nextPlan = coursewareRun.plan.map((step) => Object.freeze({ ...step, id: `${step.id}-r${coursewareRun.revision + 1}`, expectedOutput: `机械波主题 · ${step.expectedOutput}` }));
      const next = replanCoursewareRun(
        coursewareRun,
        result.snapshot.id,
        runtimeFixture.replan.reason,
        { goal: runtimeFixture.replan.goal, plan: nextPlan },
        { action: coursewareAction ?? undefined, receipt: coursewareReceipt ?? undefined },
      );
      setSnapshotsById((current) => ({ ...current, [result.snapshot.id]: result.snapshot }));
      setContextSnapshot(result.snapshot); setContextProposal(proposal); setCoursewareRun(next);
      setCoursewareAction(null); setCoursewareApproval(null); setCoursewareReceipt(null); setActiveCoursewarePanel('none');
    },
  }), [
    activeCoursewarePanel, activePackageArtifactId, activePackagePanel, contextProposal, contextSnapshot, coursewareAction,
    coursewareActionInput, coursewareApproval, coursewareDefinition, coursewareOutput, coursewareReceipt, coursewareRun, coursewareSnapshot,
    initialContextItems, packageAction, packageActionInput, packageApproval, packageDefinition, packageFailedArtifactIds,
    packageReceipt, packageRun, packageWritebackAdapter, packageWritebackScenario, packageWritebackScenarioController,
    projections, recommendedContextItemIds, runs, runtimeFixture, snapshotsById, taskType, writebackAdapter, writebackScenario,
    writebackScenarioController,
  ]);

  const workspace = useMemo<WorkBuddyWorkspace>(() => ({
    history: Object.freeze({
      runs: implementation.runs,
      getRun: implementation.getRun,
      renameRun: implementation.renameRun,
      togglePinRun: implementation.togglePinRun,
      removeRun: implementation.removeRun,
    }),
    context: Object.freeze({
      contextView: implementation.contextView,
      coursewareContextView: implementation.coursewareContextView,
      applyRecommendedContext: implementation.applyRecommendedContext,
      toggleCoreContextItem: implementation.toggleCoreContextItem,
      confirmCoreContext: implementation.confirmCoreContext,
      resetCoreContext: implementation.resetCoreContext,
      taskType: implementation.taskType,
      setTaskType: implementation.setTaskType,
    }),
    courseware: Object.freeze({
      coursewareView: implementation.coursewareView,
      createCoursewareTask: implementation.createCoursewareTask,
      updateCoursewareTaskBrief: implementation.updateCoursewareTaskBrief,
      confirmCoursewareTaskBrief: implementation.confirmCoursewareTaskBrief,
      reviseCoursewareTaskBrief: implementation.reviseCoursewareTaskBrief,
      executeCoursewareTaskPlan: implementation.executeCoursewareTaskPlan,
      approveCoursewareArtifact: implementation.approveCoursewareArtifact,
      proposeCoursewareSave: implementation.proposeCoursewareSave,
      approveCoursewareSave: implementation.approveCoursewareSave,
      rejectCoursewareSave: implementation.rejectCoursewareSave,
      executeApprovedCoursewareSave: implementation.executeApprovedCoursewareSave,
      recoverCoursewareSave: implementation.recoverCoursewareSave,
      writebackScenario: implementation.writebackScenario,
      setWritebackScenario: implementation.setWritebackScenario,
      activePanel: implementation.activeCoursewarePanel,
      setActivePanel: implementation.setActiveCoursewarePanel,
      replanScope: implementation.replanScope,
      replanToWaveContext: implementation.replanCoursewareToWaveContext,
    }),
    coursePackage: Object.freeze({
      packageView: implementation.packageView,
      packageWritebackScenario: implementation.packageWritebackScenario,
      setPackageWritebackScenario: implementation.setPackageWritebackScenario,
      createPackageTask: implementation.createPackageTask,
      beginPackageGeneration: implementation.beginPackageGeneration,
      completePackageGeneration: implementation.completePackageGeneration,
      setPackageItemIncluded: implementation.setPackageItemIncluded,
      proposePackageSave: implementation.proposePackageSave,
      approvePackageSave: implementation.approvePackageSave,
      rejectPackageSave: implementation.rejectPackageSave,
      executeApprovedPackageSave: implementation.executeApprovedPackageSave,
      recoverPackageSave: implementation.recoverPackageSave,
      retryFailedPackageItems: implementation.retryFailedPackageItems,
      derivePackageFromCourseware: implementation.derivePackageFromCourseware,
      activePanel: implementation.activePackagePanel,
      setActivePanel: implementation.setActivePackagePanel,
      activePackageArtifactId: implementation.activePackageArtifactId,
      setActivePackageArtifactId: implementation.setActivePackageArtifactId,
    }),
  }), [implementation]);

  return <WorkBuddyWorkspaceContext.Provider value={workspace}>{children}</WorkBuddyWorkspaceContext.Provider>;
}
