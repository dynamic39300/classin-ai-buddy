import type { Dispatch, SetStateAction } from 'react';
import type { QuizActivityDraftAdapter, QuizActivityDraftScenario, QuizActivityDraftScenarioController } from '@contracts/workbuddy/quiz-activity-draft';
import type { ContextSnapshot, WorkBuddyTaskType } from '@domain/workbuddy/core-context';
import { QuizActivityCreationModule, type QuizActivityCreationRun, type QuizActivitySettings, type QuizPaperArtifact, type QuizPaperBrief } from '@domain/workbuddy/quiz-activity-creation';
import type { WorkBuddyQuizActivity } from './workbuddy-workspace';
import { projectQuizActivityRunView } from './workbuddy-course-production-view';

type QuizActivityControllerParams = Readonly<{
  contextSnapshot: ContextSnapshot | null;
  taskType: WorkBuddyTaskType;
  run: QuizActivityCreationRun | null;
  scenario: QuizActivityDraftScenario;
  paper: QuizPaperArtifact;
  adapter: QuizActivityDraftAdapter;
  scenarioController: QuizActivityDraftScenarioController;
  setRun: Dispatch<SetStateAction<QuizActivityCreationRun | null>>;
  setScenario: Dispatch<SetStateAction<QuizActivityDraftScenario>>;
}>;

export type WorkBuddyQuizActivityController = Readonly<{
  commands: WorkBuddyQuizActivity;
  reset: () => void;
}>;

function actionIdentity(run: QuizActivityCreationRun): Readonly<{ actionId: string; idempotencyKey: string }> {
  const suffix = `${run.id}-${run.target.expectedVersion}-r${run.settingsRevision}`;
  return Object.freeze({ actionId: `action-${suffix}`, idempotencyKey: `quiz-draft-${suffix}` });
}

function projectPaperForBrief(paper: QuizPaperArtifact, brief: QuizPaperBrief): QuizPaperArtifact {
  const selected = paper.questions.filter(({ type }) => brief.questionTypes.includes(type)).slice(0, brief.questionCount);
  if (selected.length !== brief.questionCount) throw new Error('当前体验题库无法满足已确认的题型数量，请重新选择题型。');
  if (brief.totalScore < selected.length) throw new Error('试卷总分不能小于题目数量。');
  const baseScore = Math.floor(brief.totalScore / selected.length);
  const remainder = brief.totalScore % selected.length;
  const questions = selected.map((question, index) => Object.freeze({
    ...question,
    score: baseScore + (index < remainder ? 1 : 0),
  }));
  return Object.freeze({
    ...paper,
    description: `检查动量概念、方向约定与守恒条件，共 ${questions.length} 题。`,
    questions: Object.freeze(questions),
    totalScore: brief.totalScore,
    validation: Object.freeze({
      status: 'passed' as const,
      summary: `${questions.length} 种题型、答案、解析、方向符号与 ${brief.totalScore} 分总分校验通过`,
    }),
  });
}

export function createWorkBuddyQuizActivityController(params: QuizActivityControllerParams): WorkBuddyQuizActivityController {
  const { contextSnapshot, taskType, run, scenario, paper, adapter, scenarioController, setRun, setScenario } = params;
  const propose = (current: QuizActivityCreationRun) => {
    const identity = actionIdentity(current);
    return QuizActivityCreationModule.proposeDraft(current, { ...identity, expiresAt: '2026-08-24T18:40:00+08:00' });
  };

  return Object.freeze({
    reset: () => { setRun(null); scenarioController.reset(); setScenario('success'); },
    commands: Object.freeze({
      view: projectQuizActivityRunView(run),
      createTask: (goal: string) => {
        if (!contextSnapshot || taskType !== 'quiz-activity-creation' || !goal.trim()) return null;
        const classItem = contextSnapshot.items.find(({ kind }) => kind === 'class');
        const courseItem = contextSnapshot.items.find(({ kind }) => kind === 'course');
        const unitItem = contextSnapshot.items.find(({ kind }) => kind === 'unit');
        if (!classItem || !courseItem || !unitItem || courseItem.parentId !== classItem.id || unitItem.parentId !== courseItem.id) return null;
        const previousIndex = Number(run?.id.match(/(\d+)$/)?.[1] ?? 0);
        const runId = `run-quiz-activity-${previousIndex + 1}`;
        setRun(QuizActivityCreationModule.create({
          runId,
          contextSnapshotId: contextSnapshot.id,
          goal,
          target: { classId: classItem.id, courseId: courseItem.id, unitId: unitItem.id, expectedVersion: unitItem.sourceVersion, label: `${classItem.label} / ${courseItem.label} / ${unitItem.label}` },
          now: '2026-08-24T17:40:00+08:00',
        }));
        return runId;
      },
      updatePaperBrief: (patch: Partial<QuizPaperBrief>) => setRun((current) => current ? QuizActivityCreationModule.updatePaperBrief(current, patch) : current),
      confirmPaperBrief: (patch?: Partial<QuizPaperBrief>) => setRun((current) => current
        ? QuizActivityCreationModule.confirmPaperBrief(QuizActivityCreationModule.updatePaperBrief(current, patch ?? {}))
        : current),
      beginGeneration: () => setRun((current) => current ? QuizActivityCreationModule.beginGeneration(current) : current),
      generatePaper: () => setRun((current) => current
        ? QuizActivityCreationModule.generatePaper(current, projectPaperForBrief(paper, current.brief))
        : current),
      approvePaper: () => setRun((current) => current ? QuizActivityCreationModule.approvePaper(current, { teacherId: 'teacher-wang', reviewedAt: '2026-08-24T17:44:00+08:00' }) : current),
      markArtifactSaved: () => setRun((current) => current ? QuizActivityCreationModule.recordArtifactSaved(current) : current),
      updateActivitySettings: (patch: Partial<QuizActivitySettings>) => setRun((current) => current ? QuizActivityCreationModule.updateActivitySettings(current, patch) : current),
      prepareDraft: (patch: Partial<QuizActivitySettings>) => {
        if (!run) return '当前测验任务已不可用，请重新进入任务。';
        try {
          setRun(propose(QuizActivityCreationModule.updateActivitySettings(run, patch)));
          return null;
        } catch (error) {
          return error instanceof Error ? error.message : '测验活动参数校验失败，请检查后重试。';
        }
      },
      proposeDraft: () => setRun((current) => current ? propose(current) : current),
      approveDraft: () => setRun((current) => current ? QuizActivityCreationModule.approveDraft(current, { approvalId: `approval-${current.id}-r${current.settingsRevision}`, teacherId: 'teacher-wang', decidedAt: '2026-08-24T17:45:00+08:00' }) : current),
      executeDraft: () => {
        if (!run?.action || !run.approval || run.stage !== 'creating_draft') return;
        const receipt = adapter.execute(run.action, run.approval);
        setRun((current) => current?.stage === 'creating_draft' && current.action?.id === run.action?.id
          ? QuizActivityCreationModule.recordReceipt(current, receipt)
          : current);
      },
      retryDraft: () => setRun((current) => current ? QuizActivityCreationModule.retryDraft(current) : current),
      refreshTarget: () => setRun((current) => current ? QuizActivityCreationModule.refreshTarget(current) : current),
      scenario,
      setScenario,
    }),
  });
}
