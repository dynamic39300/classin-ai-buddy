import { useEffect, useRef, useState } from 'react';
import type { QuizActivityRunStage } from '@domain/workbuddy/quiz-activity-creation';

export const QUIZ_GENERATION_STEPS = Object.freeze([
  Object.freeze({ id: 'analyze', title: '分析测评目标', summary: '提取动量、方向约定与守恒条件三个诊断重点。' }),
  Object.freeze({ id: 'compose', title: '组织题型与分值', summary: '组合单选、多选、判断、填空和问答题，并分配 100 分。' }),
  Object.freeze({ id: 'solve', title: '生成答案与逐题解析', summary: '计算标准答案，补充教师审阅所需的解题依据。' }),
  Object.freeze({ id: 'validate', title: '校验试卷结构', summary: '检查题数、答案归属、解析完整性与总分。' }),
] as const);

export const QUIZ_ACTIVITY_EXPERIENCE_TIMING = Object.freeze({
  planMs: 420,
  generationStepMs: 480,
  draftExecutionMs: 720,
});

type QuizActivityExperienceCommands = Readonly<{
  beginGeneration: () => void;
  generatePaper: () => void;
  executeDraft: () => void;
}>;

export type QuizActivityExperience = Readonly<{
  generationStepIndex: number;
}>;

/**
 * Demo-only experience pacing. Domain transitions remain explicit and persisted;
 * this feature seam only makes system-owned work perceptible between teacher checkpoints.
 */
export function useQuizActivityExperience(
  runId: string,
  stage: QuizActivityRunStage | null,
  commands: QuizActivityExperienceCommands,
): QuizActivityExperience {
  const commandsRef = useRef(commands);
  const [generationStepIndex, setGenerationStepIndex] = useState(0);

  useEffect(() => {
    commandsRef.current = commands;
  }, [commands]);

  useEffect(() => {
    const timers: number[] = [];
    const schedule = (delayMs: number, command: () => void) => {
      timers.push(window.setTimeout(command, delayMs));
    };

    if (!stage) return undefined;

    if (stage === 'plan_ready') {
      schedule(QUIZ_ACTIVITY_EXPERIENCE_TIMING.planMs, () => commandsRef.current.beginGeneration());
    }

    if (stage === 'generating') {
      schedule(0, () => setGenerationStepIndex(0));
      QUIZ_GENERATION_STEPS.slice(1).forEach((_, index) => {
        schedule(QUIZ_ACTIVITY_EXPERIENCE_TIMING.generationStepMs * (index + 1), () => setGenerationStepIndex(index + 1));
      });
      schedule(
        QUIZ_ACTIVITY_EXPERIENCE_TIMING.generationStepMs * QUIZ_GENERATION_STEPS.length,
        () => commandsRef.current.generatePaper(),
      );
    }

    if (stage === 'creating_draft') {
      schedule(QUIZ_ACTIVITY_EXPERIENCE_TIMING.draftExecutionMs, () => commandsRef.current.executeDraft());
    }

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [runId, stage]);

  return Object.freeze({ generationStepIndex });
}
