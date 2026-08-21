import { useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import type { WorkBuddyRunViewModel } from '@contracts/workbuddy/workspace';
import type { ClassInWritebackAdapter, WritebackScenario, WritebackScenarioController } from '@contracts/workbuddy/classin-writeback';
import type { PackageWritebackAdapter, PackageWritebackScenario, PackageWritebackScenarioController } from '@contracts/workbuddy/package-writeback';
import type { WorkBuddyRuntimeFixture } from '@contracts/workbuddy/runtime-fixture';
import type { WorkBuddyClock } from '@contracts/workbuddy/clock';
import {
  confirmContext, createContextProposal, projectContext, selectContextItems, toggleContextItem,
  type CapabilityContextManifest, type ContextSnapshot, type CoreContextItem, type WorkBuddyTaskType,
} from '@domain/workbuddy/core-context';
import type { CoursewareExecutionOutput, CoursewareRunDefinition, SingleCoursewareRun } from '@domain/workbuddy/course-production';
import type { CoursePackageDefinition, CoursePackageRun, PackageExecutionReceipt } from '@domain/workbuddy/course-package';
import type { PackageActionInput, PackageApproval, PackageProposedAction } from '@domain/workbuddy/package-writeback';
import type { Approval, CoursewareSaveActionInput, ExecutionReceipt, ProposedAction } from '@domain/workbuddy/writeback';
import { createWorkBuddyCoursewareController } from './workbuddy-courseware-controller';
import { projectCoreContextView, projectCoursewareRunView, projectPackageRunView } from './workbuddy-course-production-view';
import { useWorkBuddyHistory } from './use-workbuddy-history';
import { createWorkBuddyPackageController } from './workbuddy-package-controller';
import { projectCoursewareConversationRun, projectPackageConversationRun } from './conversation-run-projection';
import {
  createBrowserConversationRunScheduler,
  createConversationRunHostPort,
  createConversationRunModule,
  type ConversationRunHost,
} from './conversation-run-module';
import {
  clearWorkBuddyWorkspaceSession,
  loadWorkBuddyWorkspaceSession,
  saveWorkBuddyWorkspaceSession,
} from './workbuddy-workspace-session';
import { WorkBuddyWorkspaceContext, type CoursewarePanel, type PackagePanel, type WorkBuddyWorkspace } from './workbuddy-workspace';

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

export function WorkBuddyWorkspaceProvider(props: WorkBuddyWorkspaceProviderProps) {
  const {
    initialRuns, initialContextItems, recommendedContextItemIds, coursewareDefinition, coursewareOutput, replannedCoursewareOutput,
    capabilityManifests, coursewareActionInput, packageDefinition, packageActionInput, packageFailedArtifactIds, runtimeFixture, clock,
    writebackAdapter, writebackScenarioController, packageWritebackAdapter, packageWritebackScenarioController, children,
  } = props;
  const restoredSession = useMemo(() => loadWorkBuddyWorkspaceSession(), []);
  const [contextProposal, setContextProposal] = useState(() => restoredSession?.contextProposal ?? createContextProposal(initialContextItems, 'single-courseware'));
  const [contextSnapshot, setContextSnapshot] = useState<ContextSnapshot | null>(() => restoredSession?.contextSnapshot ?? null);
  const [snapshotsById, setSnapshotsById] = useState<Readonly<Record<string, ContextSnapshot>>>(() => restoredSession?.snapshotsById ?? {});
  const [taskType, setTaskTypeState] = useState<WorkBuddyTaskType>(() => restoredSession?.taskType ?? 'single-courseware');
  const [coursewareRun, setCoursewareRun] = useState<SingleCoursewareRun | null>(() => restoredSession?.coursewareRun ?? null);
  const [coursewareAction, setCoursewareAction] = useState<ProposedAction | null>(() => restoredSession?.coursewareAction ?? null);
  const [coursewareApproval, setCoursewareApproval] = useState<Approval | null>(() => restoredSession?.coursewareApproval ?? null);
  const [coursewareReceipt, setCoursewareReceipt] = useState<ExecutionReceipt | null>(() => restoredSession?.coursewareReceipt ?? null);
  const [writebackScenario, setWritebackScenario] = useState<WritebackScenario>(() => restoredSession?.writebackScenario ?? writebackScenarioController.getScenario());
  const [activeCoursewarePanel, setActiveCoursewarePanel] = useState<CoursewarePanel>(() => restoredSession?.activeCoursewarePanel ?? 'none');
  const [packageRun, setPackageRun] = useState<CoursePackageRun | null>(() => restoredSession?.packageRun ?? null);
  const [packageAction, setPackageAction] = useState<PackageProposedAction | null>(() => restoredSession?.packageAction ?? null);
  const [packageApproval, setPackageApproval] = useState<PackageApproval | null>(() => restoredSession?.packageApproval ?? null);
  const [packageReceipt, setPackageReceipt] = useState<PackageExecutionReceipt | null>(() => restoredSession?.packageReceipt ?? null);
  const [packageReceiptHistory, setPackageReceiptHistory] = useState<readonly PackageExecutionReceipt[]>(() => restoredSession?.packageReceiptHistory ?? []);
  const [packageWritebackScenario, setPackageWritebackScenario] = useState<PackageWritebackScenario>(() => restoredSession?.packageWritebackScenario ?? packageWritebackScenarioController.getScenario());
  const [activePackagePanel, setActivePackagePanel] = useState<PackagePanel>(() => restoredSession?.activePackagePanel ?? 'none');
  const [activePackageArtifactId, setActivePackageArtifactId] = useState<string | null>(() => restoredSession?.activePackageArtifactId ?? null);
  const [draftGoal, setDraftGoal] = useState(() => restoredSession?.draftGoal ?? '');
  const [conversationHostPort] = useState(() => createConversationRunHostPort());
  const [conversationModule] = useState(() => createConversationRunModule(
    conversationHostPort.host,
    createBrowserConversationRunScheduler(),
  ));

  const coursewareController = createWorkBuddyCoursewareController({
    contextSnapshot, initialContextItems, coursewareDefinition, coursewareOutput, replannedCoursewareOutput, coursewareActionInput,
    runtimeFixture, clock, writebackAdapter, writebackScenarioController, run: coursewareRun, action: coursewareAction,
    approval: coursewareApproval, receipt: coursewareReceipt, writebackScenario, activePanel: activeCoursewarePanel,
    setRun: setCoursewareRun, setAction: setCoursewareAction, setApproval: setCoursewareApproval, setReceipt: setCoursewareReceipt,
    setWritebackScenario, setActivePanel: setActiveCoursewarePanel, setContextSnapshot, setContextProposal, setSnapshotsById,
  });
  const packageController = createWorkBuddyPackageController({
    contextSnapshot, taskType, initialContextItems, packageDefinition, packageActionInput, failedArtifactIds: packageFailedArtifactIds,
    runtimeFixture, clock, writebackAdapter: packageWritebackAdapter, writebackScenarioController: packageWritebackScenarioController,
    sourceCoursewareRun: coursewareRun, run: packageRun, action: packageAction, approval: packageApproval, receipt: packageReceipt,
    writebackScenario: packageWritebackScenario, activePanel: activePackagePanel, activeArtifactId: activePackageArtifactId,
    setRun: setPackageRun, setAction: setPackageAction, setApproval: setPackageApproval, setReceipt: setPackageReceipt, setReceiptHistory: setPackageReceiptHistory,
    setWritebackScenario: setPackageWritebackScenario, setActivePanel: setActivePackagePanel, setActiveArtifactId: setActivePackageArtifactId,
    setTaskType: setTaskTypeState, setContextSnapshot, setContextProposal, setSnapshotsById,
  });
  const history = useWorkBuddyHistory(initialRuns, coursewareRun, packageRun, snapshotsById, runtimeFixture);
  const coursewareSnapshot = coursewareRun ? snapshotsById[coursewareRun.contextSnapshotId] ?? null : null;
  const projections = useMemo(() => coursewareSnapshot && coursewareRun
    ? capabilityManifests.map((manifest) => projectContext(coursewareSnapshot, manifest, {
      generatedAt: runtimeFixture.projectionGeneratedAt,
      taskGoal: coursewareRun.goal,
    }))
    : [], [capabilityManifests, coursewareRun, coursewareSnapshot, runtimeFixture.projectionGeneratedAt]);
  const derivedPackageRunRef = packageRun && packageRun.parentRunRef === coursewareRun?.id
    && packageRun.sourceArtifactRef?.id === coursewareRun?.artifact?.id
    && packageRun.sourceArtifactRef?.version === coursewareRun?.artifact?.version
    ? packageRun.id : null;
  const coursewareView = projectCoursewareRunView(
    coursewareRun, projections, coursewareAction, coursewareReceipt, snapshotsById, derivedPackageRunRef,
  );
  const packageView = projectPackageRunView(packageRun, packageAction, packageReceipt, packageReceiptHistory);

  const conversationHost: ConversationRunHost = Object.freeze({
    open: (runRef) => {
      if (coursewareView?.run.id === runRef) return Object.freeze({
        projection: projectCoursewareConversationRun(coursewareView),
        progressStepCount: coursewareView.run.plan.length,
      });
      if (packageView?.run.id === runRef) return Object.freeze({
        projection: projectPackageConversationRun(packageView),
        progressStepCount: 3,
      });
      return null;
    },
    execute: (runRef: string, command: Parameters<typeof conversationModule.dispatch>[1]) => {
      const accepted = (resultRef?: string | null) => Object.freeze({ status: 'accepted' as const, resultRef: resultRef ?? undefined });
      const rejected = (reason = 'command-not-supported-by-host') => Object.freeze({ status: 'rejected' as const, reason });
      if (coursewareView?.run.id === runRef) {
        switch (command.type) {
          case 'submit_clarification':
            coursewareController.commands.updateCoursewareTaskBrief({
              durationMinutes: command.durationMinutes,
              teachingApproach: command.teachingApproach,
            });
            coursewareController.commands.confirmCoursewareTaskBrief();
            return accepted();
          case 'confirm_clarification': coursewareController.commands.confirmCoursewareTaskBrief(); return accepted();
          case 'revise_plan': coursewareController.commands.reviseCoursewareTaskBrief(); return accepted();
          case 'start_plan': return accepted();
          case 'complete_generation': coursewareController.commands.executeCoursewareTaskPlan(); return accepted();
          case 'confirm_replan': coursewareController.commands.replanToWaveContext(); return accepted();
          case 'dismiss_replan': return accepted();
          case 'supplement': return accepted();
          case 'approve_artifact': coursewareController.commands.approveCoursewareArtifact(); return accepted();
          case 'revise_artifact': coursewareController.commands.reviseCoursewareArtifact({ instruction: command.instruction, changes: command.changes }); return accepted();
          case 'propose_action': coursewareController.commands.proposeCoursewareSave(); return accepted();
          case 'approve_action': coursewareController.commands.approveCoursewareSave(); return accepted();
          case 'reject_action': coursewareController.commands.rejectCoursewareSave(); return accepted();
          case 'execute_action': coursewareController.commands.executeApprovedCoursewareSave(); return accepted();
          case 'recover_action': coursewareController.commands.recoverCoursewareSave(); return accepted();
          case 'derive_package': return accepted(coursewareController.run ? packageController.commands.derivePackageFromCourseware() : null);
          case 'set_scenario':
            if (command.scenario !== 'partial_success') coursewareController.commands.setWritebackScenario(command.scenario);
            return accepted();
          default: return rejected();
        }
      }
      if (packageView?.run.id === runRef) {
        switch (command.type) {
          case 'begin_package': packageController.commands.beginPackageGeneration(); return accepted();
          case 'complete_generation': packageController.commands.completePackageGeneration(); return accepted();
          case 'supplement': return accepted();
          case 'set_package_item_included': packageController.commands.setPackageItemIncluded(command.artifactId, command.included); return accepted();
          case 'revise_package_artifact': packageController.commands.revisePackageArtifact(command.artifactId); return accepted();
          case 'select_package_artifact': packageController.commands.setActivePackageArtifactId(command.artifactId); return accepted();
          case 'propose_action': packageController.commands.proposePackageSave(); return accepted();
          case 'approve_action': packageController.commands.approvePackageSave(); return accepted();
          case 'reject_action': packageController.commands.rejectPackageSave(); return accepted();
          case 'execute_action': packageController.commands.executeApprovedPackageSave(); return accepted();
          case 'recover_action': packageController.commands.recoverPackageSave(); return accepted();
          case 'retry_failed': packageController.commands.retryFailedPackageItems(); return accepted();
          case 'set_scenario':
            packageController.commands.setPackageWritebackScenario(command.scenario === 'partial_success' ? 'partial_success' : 'success');
            return accepted();
          default: return rejected();
        }
      }
      return rejected('run-not-found');
    },
  });

  useLayoutEffect(() => conversationHostPort.bind(conversationHost), [conversationHost, conversationHostPort]);

  useEffect(() => {
    writebackScenarioController.setScenario(writebackScenario);
    packageWritebackScenarioController.setScenario(packageWritebackScenario);
    saveWorkBuddyWorkspaceSession(Object.freeze({
      version: 2,
      contextProposal, contextSnapshot, snapshotsById, taskType,
      coursewareRun, coursewareAction, coursewareApproval, coursewareReceipt, writebackScenario, activeCoursewarePanel,
      packageRun, packageAction, packageApproval, packageReceipt, packageReceiptHistory, packageWritebackScenario,
      activePackagePanel, activePackageArtifactId, draftGoal,
    }));
  }, [
    activeCoursewarePanel, activePackageArtifactId, activePackagePanel, contextProposal, contextSnapshot, coursewareAction,
    coursewareApproval, coursewareReceipt, coursewareRun, draftGoal, packageAction, packageApproval, packageReceipt,
    packageReceiptHistory, packageRun, packageWritebackScenario, packageWritebackScenarioController, snapshotsById, taskType,
    writebackScenario, writebackScenarioController,
  ]);

  const workspace: WorkBuddyWorkspace = Object.freeze({
    conversationRun: conversationModule,
    history: Object.freeze({
      runs: history.runs,
      getRun: history.getRun,
      renameRun: history.renameRun,
      togglePinRun: history.togglePinRun,
      removeRun: history.removeRun,
    }),
    taskDraft: Object.freeze({
      goal: draftGoal,
      setGoal: setDraftGoal,
      clear: () => setDraftGoal(''),
    }),
    context: Object.freeze({
      contextView: projectCoreContextView(contextProposal, contextSnapshot),
      coursewareContextView: coursewareSnapshot ? projectCoreContextView(contextProposal, coursewareSnapshot) : null,
      applyRecommendedContext: () => {
        setContextSnapshot(null);
        setContextProposal((current) => selectContextItems(current, recommendedContextItemIds));
      },
      toggleCoreContextItem: (itemId: string) => {
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
        packageController.attachContext(result.snapshot);
      },
      resetCoreContext: () => {
        if (coursewareRun) conversationModule.dispatch(coursewareRun.id, { id: `${coursewareRun.id}:reset`, type: 'reset' });
        if (packageRun) conversationModule.dispatch(packageRun.id, { id: `${packageRun.id}:reset`, type: 'reset' });
        clearWorkBuddyWorkspaceSession();
        setContextSnapshot(null); setSnapshotsById({});
        setContextProposal(createContextProposal(initialContextItems, 'single-courseware')); setTaskTypeState('single-courseware');
        coursewareController.reset(); packageController.reset(); history.resetHistory();
      },
      taskType,
      setTaskType: (nextTaskType: WorkBuddyTaskType) => {
        if (nextTaskType === taskType) return;
        setTaskTypeState(nextTaskType); setContextSnapshot(null);
        setContextProposal(createContextProposal(initialContextItems, nextTaskType));
      },
    }),
    courseware: Object.freeze({
      coursewareView,
      ...coursewareController.commands,
    }),
    coursePackage: Object.freeze({
      packageView,
      ...packageController.commands,
    }),
  });

  return <WorkBuddyWorkspaceContext.Provider value={workspace}>{children}</WorkBuddyWorkspaceContext.Provider>;
}
