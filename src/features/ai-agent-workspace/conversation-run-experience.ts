import type { ContextProjection } from '@domain/workbuddy/core-context';
import type { CoursewarePlanStep } from '@domain/workbuddy/course-production';
import type { ConversationRunEventState } from '@contracts/workbuddy/conversation-run';

export type CoursewareExperienceState = Readonly<{
  status: 'idle' | 'running' | 'completed';
  activeIndex: number | null;
  completedCount: number;
}>;

export type CoursewareExperienceEvent = Readonly<{
  id: string;
  stepId: string;
  title: string;
  capabilityId: string;
  capabilityLabel: string;
  purpose: string;
  state: Extract<ConversationRunEventState, 'queued' | 'running' | 'completed'>;
  inputSummary: string;
  outputSummary: string;
  elapsedLabel: string;
  contextLabels: readonly string[];
  excludedSensitiveCount: number;
}>;

const CAPABILITY_LABELS: Readonly<Record<string, string>> = Object.freeze({
  'goal-interpreter': '智能课件目标理解',
  'lesson-structure': '智能课件结构设计',
  'courseware-renderer': '智能课件页面生成',
  'courseware-quality-check': '智能课件质量检查',
});

const CAPABILITY_INPUTS: Readonly<Record<string, string>> = Object.freeze({
  'goal-interpreter': '教师目标、课时要求与已确认教学范围',
  'lesson-structure': '目标约束、课程标准与课件内容要求',
  'courseware-renderer': '课件结构、页面风格与课堂活动要求',
  'courseware-quality-check': '智能课件草稿与目标覆盖清单',
});

const CAPABILITY_DURATIONS: Readonly<Record<string, string>> = Object.freeze({
  'goal-interpreter': '4 秒',
  'lesson-structure': '12 秒',
  'courseware-renderer': '28 秒',
  'courseware-quality-check': '7 秒',
});

export function createCoursewareExperience(plan: readonly CoursewarePlanStep[]): CoursewareExperienceState {
  void plan;
  return Object.freeze({ status: 'idle', activeIndex: null, completedCount: 0 });
}

export function startCoursewareExperience(state: CoursewareExperienceState): CoursewareExperienceState {
  if (state.status !== 'idle') return state;
  return Object.freeze({ status: 'running', activeIndex: 0, completedCount: 0 });
}

export function advanceCoursewareExperience(state: CoursewareExperienceState, stepCount: number): CoursewareExperienceState {
  if (state.status !== 'running' || state.activeIndex === null) return state;
  const completedCount = Math.min(stepCount, state.completedCount + 1);
  if (completedCount >= stepCount) return Object.freeze({ status: 'completed', activeIndex: null, completedCount });
  return Object.freeze({ status: 'running', activeIndex: completedCount, completedCount });
}

export function projectCoursewareExperienceEvents(
  state: CoursewareExperienceState,
  plan: readonly CoursewarePlanStep[],
  projections: readonly ContextProjection[],
): readonly CoursewareExperienceEvent[] {
  if (state.status === 'idle') return Object.freeze([]);
  const projectionByCapability = new Map(projections.map((projection) => [projection.capabilityId, projection]));
  return Object.freeze(plan.map((step, index) => {
    const projection = projectionByCapability.get(step.capability);
    const eventState: CoursewareExperienceEvent['state'] = index < state.completedCount
      ? 'completed'
      : index === state.activeIndex ? 'running' : 'queued';
    return Object.freeze({
      id: `experience:${step.id}`,
      stepId: step.id,
      title: step.title,
      capabilityId: step.capability,
      capabilityLabel: CAPABILITY_LABELS[step.capability] ?? step.capabilitySummary,
      purpose: projection?.purpose ?? step.capabilitySummary,
      state: eventState,
      inputSummary: CAPABILITY_INPUTS[step.capability] ?? '已确认的任务输入',
      outputSummary: step.expectedOutput,
      elapsedLabel: eventState === 'completed' ? (CAPABILITY_DURATIONS[step.capability] ?? '已完成') : eventState === 'running' ? '计算中' : '等待执行',
      contextLabels: Object.freeze(projection?.items.map(({ label }) => label) ?? []),
      excludedSensitiveCount: projection?.excludedSensitiveCount ?? 0,
    });
  }));
}
