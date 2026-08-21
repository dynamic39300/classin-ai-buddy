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
import type { CoursewareExecutionOutput, CoursewareRunDefinition, SingleCoursewareRun } from '@domain/workbuddy/course-production';
import type { CoursePackageDefinition, CoursePackageRun, PackageExecutionReceipt } from '@domain/workbuddy/course-package';
import type { PackageActionInput, PackageApproval, PackageProposedAction } from '@domain/workbuddy/package-writeback';
import type { Approval, CoursewareSaveActionInput, ExecutionReceipt, ProposedAction } from '@domain/workbuddy/writeback';
import { createWorkBuddyCoursewareController } from './workbuddy-courseware-controller';
import { projectCoreContextView, projectCoursewareRunView, projectPackageRunView } from './workbuddy-course-production-view';
import { useWorkBuddyHistory } from './use-workbuddy-history';
import { createWorkBuddyPackageController } from './workbuddy-package-controller';
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
  const [contextProposal, setContextProposal] = useState(() => createContextProposal(initialContextItems, 'single-courseware'));
  const [contextSnapshot, setContextSnapshot] = useState<ContextSnapshot | null>(null);
  const [snapshotsById, setSnapshotsById] = useState<Readonly<Record<string, ContextSnapshot>>>({});
  const [taskType, setTaskTypeState] = useState<WorkBuddyTaskType>('single-courseware');
  const [coursewareRun, setCoursewareRun] = useState<SingleCoursewareRun | null>(null);
  const [coursewareAction, setCoursewareAction] = useState<ProposedAction | null>(null);
  const [coursewareApproval, setCoursewareApproval] = useState<Approval | null>(null);
  const [coursewareReceipt, setCoursewareReceipt] = useState<ExecutionReceipt | null>(null);
  const [writebackScenario, setWritebackScenario] = useState<WritebackScenario>(() => writebackScenarioController.getScenario());
  const [activeCoursewarePanel, setActiveCoursewarePanel] = useState<CoursewarePanel>('none');
  const [packageRun, setPackageRun] = useState<CoursePackageRun | null>(null);
  const [packageAction, setPackageAction] = useState<PackageProposedAction | null>(null);
  const [packageApproval, setPackageApproval] = useState<PackageApproval | null>(null);
  const [packageReceipt, setPackageReceipt] = useState<PackageExecutionReceipt | null>(null);
  const [packageWritebackScenario, setPackageWritebackScenario] = useState<PackageWritebackScenario>(() => packageWritebackScenarioController.getScenario());
  const [activePackagePanel, setActivePackagePanel] = useState<PackagePanel>('none');
  const [activePackageArtifactId, setActivePackageArtifactId] = useState<string | null>(null);
  const [draftGoal, setDraftGoal] = useState('');

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
    setRun: setPackageRun, setAction: setPackageAction, setApproval: setPackageApproval, setReceipt: setPackageReceipt,
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

  const workspace: WorkBuddyWorkspace = Object.freeze({
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
      coursewareView: projectCoursewareRunView(
        coursewareRun, projections, coursewareAction, coursewareReceipt, snapshotsById, derivedPackageRunRef,
      ),
      ...coursewareController.commands,
    }),
    coursePackage: Object.freeze({
      packageView: projectPackageRunView(packageRun, packageAction, packageReceipt),
      ...packageController.commands,
    }),
  });

  return <WorkBuddyWorkspaceContext.Provider value={workspace}>{children}</WorkBuddyWorkspaceContext.Provider>;
}
