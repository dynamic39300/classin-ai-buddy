import { useMemo, useState } from 'react';
import type { WorkBuddyRunViewModel } from '@contracts/workbuddy/workspace';
import type { WorkBuddyRuntimeFixture } from '@contracts/workbuddy/runtime-fixture';
import type { ContextSnapshot } from '@domain/workbuddy/core-context';
import type { CoursePackageRun } from '@domain/workbuddy/course-package';
import type { SingleCoursewareRun } from '@domain/workbuddy/course-production';
import type { WorkBuddyHistory } from './workbuddy-workspace';

type HistoryOverride = Readonly<{ title?: string; pinned?: boolean; removed?: boolean }>;

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

export function useWorkBuddyHistory(
  initialRuns: readonly WorkBuddyRunViewModel[],
  coursewareRun: SingleCoursewareRun | null,
  packageRun: CoursePackageRun | null,
  snapshotsById: Readonly<Record<string, ContextSnapshot>>,
  fixture: WorkBuddyRuntimeFixture,
): WorkBuddyHistory & Readonly<{ resetHistory: () => void }> {
  const [overrides, setOverrides] = useState<Readonly<Record<string, HistoryOverride>>>({});
  const runs = useMemo(() => {
    let projected = [...initialRuns];
    if (coursewareRun) {
      const labels = snapshotsById[coursewareRun.contextSnapshotId]?.items.filter(({ kind }) => fixture.contextSummaryKinds.includes(kind)).map(({ label }) => label) ?? [];
      projected = projectCoursewareHistory(projected, coursewareRun, fixture).map((item) => item.id === coursewareRun.id ? { ...item, contextLabels: labels } : item);
    }
    if (packageRun) {
      const labels = packageRun.contextSnapshotId ? snapshotsById[packageRun.contextSnapshotId]?.items.filter(({ kind }) => fixture.contextSummaryKinds.includes(kind)).map(({ label }) => label) ?? [] : [];
      projected = projectPackageHistory(projected, packageRun, fixture).map((item) => item.id === packageRun.id ? { ...item, contextLabels: labels } : item);
    }
    return Object.freeze(projected
      .filter(({ id }) => !overrides[id]?.removed)
      .map((run) => Object.freeze({ ...run, title: overrides[run.id]?.title ?? run.title, pinned: overrides[run.id]?.pinned ?? run.pinned })));
  }, [coursewareRun, fixture, initialRuns, overrides, packageRun, snapshotsById]);

  return useMemo(() => Object.freeze({
    runs,
    getRun: (runId: string) => runs.find((run) => run.id === runId),
    renameRun: (runId: string, title: string) => setOverrides((current) => ({ ...current, [runId]: { ...current[runId], title } })),
    togglePinRun: (runId: string) => setOverrides((current) => ({ ...current, [runId]: { ...current[runId], pinned: !(current[runId]?.pinned ?? runs.find((run) => run.id === runId)?.pinned) } })),
    removeRun: (runId: string) => setOverrides((current) => ({ ...current, [runId]: { ...current[runId], removed: true } })),
    resetHistory: () => setOverrides({}),
  }), [runs]);
}
