import type { ClassActivityType } from '@domain/class/class';
import type { ScheduleEvent } from '@domain/schedule/schedule';
import type { TaskKind } from '@domain/task/task';

export type TeachingObjectKind =
  | 'class'
  | 'course'
  | 'unit'
  | 'lesson'
  | 'open-course'
  | 'homework'
  | 'quiz'
  | 'recording'
  | 'reading'
  | 'exercise'
  | 'livestream'
  | 'announcement'
  | 'discussion'
  | 'answer-sheet'
  | 'check-in'
  | 'material'
  | 'scorm'
  | 'schedule'
  | 'ai-oral';

export const TEACHING_OBJECT_LABELS: Record<TeachingObjectKind, string> = {
  class: '班级',
  course: '课程',
  unit: '单元',
  lesson: '课堂',
  'open-course': '公开课',
  homework: '作业',
  quiz: '测验',
  recording: '录播课',
  reading: '阅读',
  exercise: '练习',
  livestream: '直播',
  announcement: '公告',
  discussion: '讨论',
  'answer-sheet': '答题卡',
  'check-in': '打卡',
  material: '学习资料',
  scorm: 'SCORM',
  schedule: '日程',
  'ai-oral': 'AI口语卡',
};

const TASK_OBJECT_KINDS: Record<TaskKind, TeachingObjectKind> = {
  classroom: 'lesson',
  homework: 'homework',
  quiz: 'quiz',
  announcement: 'announcement',
  discussion: 'discussion',
  'answer-sheet': 'answer-sheet',
  'check-in': 'check-in',
  recorded: 'recording',
  material: 'material',
  scorm: 'scorm',
  schedule: 'schedule',
  'ai-oral': 'ai-oral',
};

const CLASS_ACTIVITY_OBJECT_KINDS: Record<ClassActivityType, TeachingObjectKind> = {
  lesson: 'lesson',
  homework: 'homework',
  quiz: 'quiz',
  reading: 'reading',
  exercise: 'exercise',
  livestream: 'livestream',
};

export function getTaskTeachingObjectKind(kind: TaskKind): TeachingObjectKind {
  return TASK_OBJECT_KINDS[kind];
}

export function getClassActivityTeachingObjectKind(type: ClassActivityType): TeachingObjectKind {
  return CLASS_ACTIVITY_OBJECT_KINDS[type];
}

export function getScheduleTeachingObjectKind(event: ScheduleEvent): TeachingObjectKind {
  if (event.kind === 'assignment') return event.activityType;
  if (event.kind === 'recording') return 'recording';
  if (event.kind === 'open-course') return 'open-course';
  return 'lesson';
}
