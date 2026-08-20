import { useMemo, useState, type ReactNode } from 'react';
import type { WorkBuddyRunViewModel } from '@contracts/workbuddy/workspace';
import type { ClassInWritebackAdapter, WritebackScenario, WritebackScenarioController } from '@contracts/workbuddy/classin-writeback';
import type { PackageWritebackAdapter } from '@contracts/workbuddy/package-writeback';
import {
  confirmContext,
  createContextProposal,
  selectContextItems,
  projectContext,
  type ContextSnapshot,
  type CoreContextItem,
  type WorkBuddyTaskType,
} from '@domain/workbuddy/core-context';
import {
  confirmCoursewareBrief,
  createSingleCoursewareRun,
  executeCoursewarePlan,
  reviseCoursewareBrief,
  updateCoursewareBrief,
  type SingleCoursewareRun,
} from '@domain/workbuddy/course-production';
import { approveAction, createCoursewareSaveAction, rejectAction, type Approval, type ExecutionReceipt, type ProposedAction } from '@domain/workbuddy/writeback';
import { createCoursePackageRun, generatePackageArtifacts, retryPackageArtifact, setPackageArtifactIncluded, type CoursePackageRun, type PackageExecutionReceipt } from '@domain/workbuddy/course-package';
import { WorkBuddyWorkspaceContext, type WorkBuddyWorkspace } from './workbuddy-workspace';

type WorkBuddyWorkspaceProviderProps = Readonly<{
  initialRuns: readonly WorkBuddyRunViewModel[];
  initialContextItems: readonly CoreContextItem[];
  recommendedContextItemIds: readonly string[];
  writebackAdapter: ClassInWritebackAdapter;
  writebackScenarioController: WritebackScenarioController;
  packageWritebackAdapter: PackageWritebackAdapter;
  children: ReactNode;
}>;

function projectCoursewareRunIntoHistory(current: readonly WorkBuddyRunViewModel[], run: SingleCoursewareRun): readonly WorkBuddyRunViewModel[] {
  return current.map((item) => item.id === run.id ? {
    ...item,
    runState: run.stage === 'artifact_ready'
      ? { status: 'completed', allowedCommands: ['review-artifact'], recovery: null }
      : { status: 'waiting', allowedCommands: ['confirm', 'revise'], recovery: 'confirm-or-revise' },
    steps: run.events.length ? run.events.map((event) => ({ title: event.title, summary: event.summary, time: '固定事件', state: 'completed' as const })) : item.steps,
    artifact: run.artifact ? {
      title: run.artifact.title,
      version: run.artifact.version,
      progress: `${run.artifact.pageCount} 页`,
      eyebrow: '高二物理 · 动量与碰撞',
      heading: run.artifact.title,
      summary: run.artifact.validationSummary,
      truthLabel: run.artifact.truthLabel,
    } : item.artifact,
  } : item);
}

export function WorkBuddyWorkspaceProvider({ initialRuns, initialContextItems, recommendedContextItemIds, writebackAdapter, writebackScenarioController, packageWritebackAdapter, children }: WorkBuddyWorkspaceProviderProps) {
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
  const [packageReceipt, setPackageReceipt] = useState<PackageExecutionReceipt | null>(null);

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
      if (result.ok) setContextSnapshot(result.snapshot);
    },
    resetCoreContext: () => {
      setContextSnapshot(null);
      setContextProposal(createContextProposal(initialContextItems, 'single-courseware'));
    },
    coursewareRun,
    coursewareProjection: contextSnapshot ? projectContext(contextSnapshot, ['actor_organization', 'teaching_scope', 'resources_input', 'domain_knowledge']) : null,
    createCoursewareTask: (goal) => {
      if (!contextSnapshot || !goal.trim()) return null;
      const run = createSingleCoursewareRun(goal, contextSnapshot.id);
      setCoursewareRun(run);
      setRuns((current) => [{
        fixtureVersion: run.fixtureVersion,
        id: run.id,
        title: run.title,
        relativeTime: '刚刚',
        runState: { status: 'waiting', allowedCommands: ['confirm', 'revise'], recovery: 'confirm-or-revise' },
        pinned: false,
        goal: run.goal,
        contextLabels: contextSnapshot.items.filter(({ kind }) => ['class', 'course', 'unit'].includes(kind)).map(({ label }) => label),
        steps: [{ title: '等待补齐任务信息', summary: '教学范围已从 ContextSnapshot 复用，只询问课件交付约束。', time: '现在', state: 'waiting' }],
        artifact: { title: '课件 ArtifactDraft', version: '尚未生成', progress: '等待计划确认', eyebrow: '固定 Mock 场景', heading: '尚未生成课件', summary: '确认任务信息和计划后生成固定 Mock 产物。', truthLabel: '当前没有已生成的 ArtifactDraft。' },
      }, ...current.filter(({ id }) => id !== run.id)]);
      return run.id;
    },
    updateCoursewareTaskBrief: (patch) => setCoursewareRun((current) => current ? updateCoursewareBrief(current, patch) : current),
    confirmCoursewareTaskBrief: () => setCoursewareRun((current) => current ? confirmCoursewareBrief(current) : current),
    reviseCoursewareTaskBrief: () => setCoursewareRun((current) => current ? reviseCoursewareBrief(current) : current),
    executeCoursewareTaskPlan: () => setCoursewareRun((current) => {
      if (!current) return current;
      const next = executeCoursewarePlan(current);
      setRuns((history) => projectCoursewareRunIntoHistory(history, next));
      return next;
    }),
    coursewareAction,
    coursewareApproval,
    coursewareReceipt,
    proposeCoursewareSave: () => {
      if (!coursewareRun?.artifact) return;
      setCoursewareAction(createCoursewareSaveAction({ artifactId: coursewareRun.artifact.id, artifactVersion: coursewareRun.artifact.version }));
      setCoursewareApproval(null);
      setCoursewareReceipt(null);
    },
    approveCoursewareSave: () => {
      if (!coursewareAction) return;
      const result = approveAction(coursewareAction, 'approval-courseware-save-1', '2026-08-20T10:05:00+08:00');
      if (!result) return;
      setCoursewareAction(result.action);
      setCoursewareApproval(result.approval);
    },
    rejectCoursewareSave: () => {
      if (!coursewareAction) return;
      const result = rejectAction(coursewareAction, 'approval-courseware-reject-1', '2026-08-20T10:05:00+08:00');
      if (!result) return;
      setCoursewareAction(result.action);
      setCoursewareApproval(result.approval);
    },
    executeApprovedCoursewareSave: () => {
      if (!coursewareAction || !coursewareApproval) return;
      setCoursewareReceipt(writebackAdapter.execute(coursewareAction, coursewareApproval));
    },
    writebackScenario,
    setWritebackScenario: (scenario) => {
      writebackScenarioController.setScenario(scenario);
      setWritebackScenarioState(scenario);
      setCoursewareReceipt(null);
    },
    taskType,
    setTaskType: (nextTaskType) => {
      if (nextTaskType === taskType) return;
      setTaskTypeState(nextTaskType);
      setContextSnapshot(null);
      setContextProposal(createContextProposal(initialContextItems, nextTaskType));
    },
    packageRun,
    packageReceipt,
    createPackageTask: (goal) => {
      if (!contextSnapshot || taskType !== 'course-package' || !goal.trim()) return null;
      const run = createCoursePackageRun(goal.trim(), contextSnapshot.id);
      setPackageRun(run);
      setPackageReceipt(null);
      return run.id;
    },
    generatePackage: () => setPackageRun((current) => current ? generatePackageArtifacts(current) : current),
    setPackageItemIncluded: (artifactId, included) => setPackageRun((current) => current ? setPackageArtifactIncluded(current, artifactId, included) : current),
    executePackageSave: () => setPackageRun((current) => {
      if (!current) return current;
      const result = packageWritebackAdapter.execute(current);
      setPackageReceipt(result.receipt);
      return result.run;
    }),
    retryPackageItem: (artifactId) => setPackageRun((current) => current ? retryPackageArtifact(current, artifactId) : current),
    derivePackageFromCourseware: () => {
      if (!coursewareRun?.artifact || !contextSnapshot) return null;
      const derivedSnapshot = Object.freeze({
        ...contextSnapshot,
        id: 'context-snapshot-derived-package-1',
        taskType: 'course-package' as const,
        confirmedAt: '2026-08-20T10:10:00+08:00',
        items: Object.freeze(contextSnapshot.items.map((item) => Object.freeze({ ...item }))),
      });
      const run = createCoursePackageRun('基于已审阅课件生成配套作业、测验和录播脚本', derivedSnapshot.id, {
        parentRunRef: coursewareRun.id,
        sourceArtifactRef: Object.freeze({ id: coursewareRun.artifact.id, version: coursewareRun.artifact.version }),
      });
      setTaskTypeState('course-package');
      setContextSnapshot(derivedSnapshot);
      setPackageRun(run);
      setPackageReceipt(null);
      return run.id;
    },
  }), [contextProposal, contextSnapshot, coursewareAction, coursewareApproval, coursewareReceipt, coursewareRun, initialContextItems, packageReceipt, packageRun, packageWritebackAdapter, recommendedContextItemIds, runs, taskType, writebackAdapter, writebackScenario, writebackScenarioController]);

  return <WorkBuddyWorkspaceContext.Provider value={value}>{children}</WorkBuddyWorkspaceContext.Provider>;
}
