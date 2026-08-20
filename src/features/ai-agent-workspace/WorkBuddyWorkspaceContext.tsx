import { useMemo, useState, type ReactNode } from 'react';
import type { WorkBuddyRunViewModel } from '@contracts/workbuddy/workspace';
import type { ClassInWritebackAdapter, WritebackScenario, WritebackScenarioController } from '@contracts/workbuddy/classin-writeback';
import type { PackageWritebackAdapter, PackageWritebackScenario, PackageWritebackScenarioController } from '@contracts/workbuddy/package-writeback';
import type { WorkBuddyRuntimeFixture } from '@contracts/workbuddy/runtime-fixture';
import type { WorkBuddyClock } from '@contracts/workbuddy/clock';
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
import { createPackageSaveAction, decidePackageAction, expirePackageAction, type PackageActionInput, type PackageApproval, type PackageProposedAction } from '@domain/workbuddy/package-writeback';
import {
  approveAction, createCoursewareSaveAction, expireAction, rejectAction,
  type Approval, type CoursewareSaveActionInput, type ExecutionReceipt, type ProposedAction,
} from '@domain/workbuddy/writeback';
import { projectCoreContextView, projectCoursewareRunView, projectPackageRunView } from './workbuddy-course-production-view';
import { useWorkBuddyHistory } from './use-workbuddy-history';
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
  replannedCoursewareOutput: CoursewareExecutionOutput;
  capabilityManifests: readonly CapabilityContextManifest[];
  coursewareActionInput: CoursewareSaveActionInput;
  packageDefinition: CoursePackageDefinition;
  packageActionInput: PackageActionInput;
  packageFailedArtifactIds: readonly string[];
  runtimeFixture: WorkBuddyRuntimeFixture;
  clock: WorkBuddyClock;
  writebackAdapter: ClassInWritebackAdapter;
  writebackScenarioController: WritebackScenarioController;
  packageWritebackAdapter: PackageWritebackAdapter;
  packageWritebackScenarioController: PackageWritebackScenarioController;
  children: ReactNode;
}>;

function addMinutes(iso: string, minutes: number): string {
  return new Date(Date.parse(iso) + minutes * 60_000).toISOString();
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

export function WorkBuddyWorkspaceProvider(props: WorkBuddyWorkspaceProviderProps) {
  const {
    initialRuns, initialContextItems, recommendedContextItemIds, coursewareDefinition, coursewareOutput, replannedCoursewareOutput,
    capabilityManifests, coursewareActionInput, packageDefinition, packageActionInput, packageFailedArtifactIds, runtimeFixture, clock,
    writebackAdapter, writebackScenarioController, packageWritebackAdapter, packageWritebackScenarioController, children,
  } = props;
  const [contextProposal, setContextProposal] = useState(() => createContextProposal(initialContextItems, 'single-courseware'));
  const [contextSnapshot, setContextSnapshot] = useState<ContextSnapshot | null>(null);
  const [snapshotsById, setSnapshotsById] = useState<Readonly<Record<string, ContextSnapshot>>>({});
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
  const [activeCoursewarePanel, setActiveCoursewarePanel] = useState<CoursewarePanel>('none');
  const [activePackagePanel, setActivePackagePanel] = useState<PackagePanel>('none');
  const [activePackageArtifactId, setActivePackageArtifactId] = useState<string | null>(null);
  const history = useWorkBuddyHistory(initialRuns, coursewareRun, packageRun, snapshotsById, runtimeFixture);

  const coursewareSnapshot = coursewareRun ? snapshotsById[coursewareRun.contextSnapshotId] ?? null : null;
  const projections = useMemo(() => coursewareSnapshot && coursewareRun
    ? capabilityManifests.map((manifest) => projectContext(coursewareSnapshot, manifest, {
      generatedAt: runtimeFixture.projectionGeneratedAt,
      taskGoal: coursewareRun.goal,
    }))
    : [], [capabilityManifests, coursewareRun, coursewareSnapshot, runtimeFixture.projectionGeneratedAt]);

  const implementation = useMemo<WorkspaceImplementation>(() => ({
    runs: history.runs,
    getRun: history.getRun,
    renameRun: history.renameRun,
    togglePinRun: history.togglePinRun,
    removeRun: history.removeRun,
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
      history.resetHistory();
    },
    coursewareView: projectCoursewareRunView(
      coursewareRun,
      projections,
      coursewareAction,
      coursewareReceipt,
      snapshotsById,
      packageRun && packageRun.parentRunRef === coursewareRun?.id ? packageRun.id : null,
    ),
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
      const output = current.revision > 1 ? replannedCoursewareOutput : coursewareOutput;
      const next = executeCoursewarePlan(current, output);
      return next;
    }),
    approveCoursewareArtifact: () => setCoursewareRun((current) => current ? approveCoursewareArtifact(current) : current),
    proposeCoursewareSave: () => {
      if (!coursewareRun?.artifact || coursewareRun.reviewStatus !== 'approved') return;
      const target = coursewareRun.revision > 1 ? runtimeFixture.replan.target : coursewareActionInput.target;
      const renewingExpiredAction = coursewareAction?.status === 'expired';
      setCoursewareAction(createCoursewareSaveAction({
        ...coursewareActionInput,
        id: renewingExpiredAction ? runtimeFixture.expirationRecovery.coursewareActionId : coursewareRun.revision > 1 ? runtimeFixture.replan.actionId : coursewareActionInput.id,
        idempotencyKey: renewingExpiredAction ? runtimeFixture.expirationRecovery.coursewareIdempotencyKey : coursewareRun.revision > 1 ? runtimeFixture.replan.idempotencyKey : coursewareActionInput.idempotencyKey,
        expiresAt: renewingExpiredAction ? addMinutes(clock.now(), runtimeFixture.expirationRecovery.ttlMinutes) : coursewareActionInput.expiresAt,
        runRef: coursewareRun.id, contextSnapshotId: coursewareRun.contextSnapshotId,
        artifactId: coursewareRun.artifact.id, artifactVersion: coursewareRun.artifact.version, target,
      }));
      setCoursewareApproval(null); setCoursewareReceipt(null);
    },
    approveCoursewareSave: () => {
      if (!coursewareAction) return;
      const checkedAction = expireAction(coursewareAction, clock.now());
      if (checkedAction.status === 'expired') { setCoursewareAction(checkedAction); setCoursewareApproval(null); return; }
      const approvalId = coursewareAction.id === runtimeFixture.coursewareRecovery.actionId
        ? runtimeFixture.coursewareRecovery.approvalId
        : coursewareAction.id === runtimeFixture.expirationRecovery.coursewareActionId ? runtimeFixture.expirationRecovery.coursewareApprovalId
        : coursewareRun && coursewareRun.revision > 1 ? runtimeFixture.replan.approvalId : runtimeFixture.approval.coursewareApproveId;
      const result = approveAction(checkedAction, approvalId, clock.now(), runtimeFixture.approval.actorId);
      if (result) { setCoursewareAction(result.action); setCoursewareApproval(result.approval); }
    },
    rejectCoursewareSave: () => {
      if (!coursewareAction) return;
      const checkedAction = expireAction(coursewareAction, clock.now());
      if (checkedAction.status === 'expired') { setCoursewareAction(checkedAction); setCoursewareApproval(null); return; }
      const result = rejectAction(checkedAction, runtimeFixture.approval.coursewareRejectId, clock.now(), runtimeFixture.approval.actorId);
      if (result) { setCoursewareAction(result.action); setCoursewareApproval(result.approval); }
    },
    executeApprovedCoursewareSave: () => {
      if (!coursewareRun?.artifact || !coursewareAction || !coursewareApproval) return;
      const checkedAction = expireAction(coursewareAction, clock.now());
      if (checkedAction.status === 'expired') { setCoursewareAction(checkedAction); setCoursewareApproval(null); setCoursewareReceipt(null); setActiveCoursewarePanel('action'); return; }
      if (checkedAction.runRef !== coursewareRun.id || checkedAction.contextSnapshotId !== coursewareRun.contextSnapshotId
        || checkedAction.artifactRef.id !== coursewareRun.artifact.id || checkedAction.artifactRef.version !== coursewareRun.artifact.version
        || coursewareApproval.actionId !== checkedAction.id) return;
      setCoursewareReceipt(writebackAdapter.execute(checkedAction, coursewareApproval));
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
      const renewingExpiredAction = packageAction?.status === 'expired';
      const actionRun = renewingExpiredAction ? reopenPackageArtifacts(packageRun) : packageRun;
      const action = createPackageSaveAction(actionRun, renewingExpiredAction ? {
        ...packageActionInput,
        id: runtimeFixture.expirationRecovery.packageActionId,
        idempotencyKey: runtimeFixture.expirationRecovery.packageIdempotencyKey,
        expiresAt: addMinutes(clock.now(), runtimeFixture.expirationRecovery.ttlMinutes),
      } : retrying ? {
        ...packageActionInput,
        id: runtimeFixture.packageRecovery.retryActionId,
        idempotencyKey: runtimeFixture.packageRecovery.retryIdempotencyKey,
      } : packageActionInput);
      if (action) { setPackageRun(actionRun); setPackageAction(action); setPackageApproval(null); setPackageReceipt(null); }
    },
    approvePackageSave: () => {
      if (!packageAction || !packageRun) return;
      const checkedAction = expirePackageAction(packageAction, clock.now());
      if (checkedAction.status === 'expired') { setPackageAction(checkedAction); setPackageApproval(null); return; }
      const approvalId = packageAction.id === runtimeFixture.packageRecovery.retryActionId
        ? runtimeFixture.packageRecovery.retryApprovalId
        : packageAction.id === runtimeFixture.expirationRecovery.packageActionId ? runtimeFixture.expirationRecovery.packageApprovalId
        : packageAction.id === runtimeFixture.packageRecovery.actionId ? runtimeFixture.packageRecovery.approvalId : runtimeFixture.approval.packageApproveId;
      const result = decidePackageAction(checkedAction, { id: approvalId, decidedBy: runtimeFixture.approval.actorId, decidedAt: clock.now() }, 'approved');
      if (!result) return;
      setPackageAction(result.action); setPackageApproval(result.approval); setPackageRun(markPackageArtifactsApproved(packageRun, result.action.artifactRefs.map(({ id }) => id)));
    },
    rejectPackageSave: () => {
      if (!packageAction) return;
      const checkedAction = expirePackageAction(packageAction, clock.now());
      if (checkedAction.status === 'expired') { setPackageAction(checkedAction); setPackageApproval(null); return; }
      const result = decidePackageAction(checkedAction, { id: runtimeFixture.approval.packageRejectId, decidedBy: runtimeFixture.approval.actorId, decidedAt: clock.now() }, 'rejected');
      if (result) { setPackageAction(result.action); setPackageApproval(result.approval); }
    },
    executeApprovedPackageSave: () => {
      if (!packageRun || !packageRun.contextSnapshotId || !packageAction || !packageApproval) return;
      const checkedAction = expirePackageAction(packageAction, clock.now());
      if (checkedAction.status === 'expired') { setPackageAction(checkedAction); setPackageApproval(null); setPackageReceipt(null); setActivePackagePanel('approval'); return; }
      if (checkedAction.runRef !== packageRun.id || checkedAction.contextSnapshotId !== packageRun.contextSnapshotId || packageApproval.actionId !== checkedAction.id) return;
      const contextSnapshotId = packageRun.contextSnapshotId;
      const candidates = packageRun.artifacts.map(({ id, kind, version, state }) => ({
        id, kind, version, runRef: packageRun.id, contextSnapshotId,
        approvalState: state === 'approved' || state === 'written_back' || state === 'waiting' ? state : 'not_selected' as const,
      }));
      const receipt = packageWritebackAdapter.execute(checkedAction, packageApproval, candidates);
      const application = applyPackageExecutionReceipt(packageRun, checkedAction, packageApproval, receipt);
      if (!application.accepted) return;
      setPackageReceipt(receipt); setPackageRun(application.run);
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
      const retryingWriteback = packageReceipt?.status === 'partial_success';
      setPackageRun((current) => current
        ? current.artifacts
          .filter(({ state, allowedCommands }) => state === 'failed' && allowedCommands.includes('retry'))
          .reduce((next, artifact) => retryPackageArtifact(next, artifact.id), current)
        : current);
      if (retryingWriteback) {
        packageWritebackScenarioController.setScenario('success');
        setPackageWritebackScenarioState('success');
      }
      setPackageAction(null); setPackageApproval(null);
      if (!retryingWriteback) setPackageReceipt(null);
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
        { title: runtimeFixture.replan.title, goal: runtimeFixture.replan.goal, plan: nextPlan },
        { action: coursewareAction ?? undefined, receipt: coursewareReceipt ?? undefined },
      );
      setSnapshotsById((current) => ({ ...current, [result.snapshot.id]: result.snapshot }));
      setContextSnapshot(result.snapshot); setContextProposal(proposal); setCoursewareRun(next);
      setCoursewareAction(null); setCoursewareApproval(null); setCoursewareReceipt(null); setActiveCoursewarePanel('none');
    },
  }), [
    activeCoursewarePanel, activePackageArtifactId, activePackagePanel, clock, contextProposal, contextSnapshot, coursewareAction,
    coursewareActionInput, coursewareApproval, coursewareDefinition, coursewareOutput, coursewareReceipt, coursewareRun, coursewareSnapshot,
    initialContextItems, packageAction, packageActionInput, packageApproval, packageDefinition, packageFailedArtifactIds, replannedCoursewareOutput,
    packageReceipt, packageRun, packageWritebackAdapter, packageWritebackScenario, packageWritebackScenarioController,
    history, projections, recommendedContextItemIds, runtimeFixture, snapshotsById, taskType, writebackAdapter, writebackScenario,
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
