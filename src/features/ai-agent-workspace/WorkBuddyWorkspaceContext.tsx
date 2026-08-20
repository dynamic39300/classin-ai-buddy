import { useMemo, useState, type ReactNode } from 'react';
import type { WorkBuddyRunViewModel } from '@contracts/workbuddy/workspace';
import {
  confirmContext,
  createContextProposal,
  selectContextItems,
  projectContext,
  type ContextSnapshot,
  type CoreContextItem,
} from '@domain/workbuddy/core-context';
import {
  confirmCoursewareBrief,
  createSingleCoursewareRun,
  executeCoursewarePlan,
  reviseCoursewareBrief,
  updateCoursewareBrief,
  type SingleCoursewareRun,
} from '@domain/workbuddy/course-production';
import { WorkBuddyWorkspaceContext, type WorkBuddyWorkspace } from './workbuddy-workspace';

type WorkBuddyWorkspaceProviderProps = Readonly<{
  initialRuns: readonly WorkBuddyRunViewModel[];
  initialContextItems: readonly CoreContextItem[];
  recommendedContextItemIds: readonly string[];
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

export function WorkBuddyWorkspaceProvider({ initialRuns, initialContextItems, recommendedContextItemIds, children }: WorkBuddyWorkspaceProviderProps) {
  const [runs, setRuns] = useState<readonly WorkBuddyRunViewModel[]>(initialRuns);
  const [contextProposal, setContextProposal] = useState(() => createContextProposal(initialContextItems, 'single-courseware'));
  const [contextSnapshot, setContextSnapshot] = useState<ContextSnapshot | null>(null);
  const [coursewareRun, setCoursewareRun] = useState<SingleCoursewareRun | null>(null);

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
        snapshotId: 'context-snapshot-courseware-1',
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
  }), [contextProposal, contextSnapshot, coursewareRun, initialContextItems, recommendedContextItemIds, runs]);

  return <WorkBuddyWorkspaceContext.Provider value={value}>{children}</WorkBuddyWorkspaceContext.Provider>;
}
