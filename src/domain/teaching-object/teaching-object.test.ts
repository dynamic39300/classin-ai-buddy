import { describe, expect, it } from 'vitest';
import type { ClassActivityType } from '@domain/class/class';
import type { ScheduleEvent } from '@domain/schedule/schedule';
import type { TaskKind } from '@domain/task/task';
import {
  getClassActivityTeachingObjectKind,
  getScheduleTeachingObjectKind,
  getTaskTeachingObjectKind,
  TEACHING_OBJECT_LABELS,
} from './teaching-object';

describe('teaching object iconography', () => {
  it('defines a label for every normalized object kind', () => {
    expect(Object.keys(TEACHING_OBJECT_LABELS)).toHaveLength(19);
    expect(TEACHING_OBJECT_LABELS.lesson).toBe('课堂');
    expect(TEACHING_OBJECT_LABELS.homework).toBe('作业');
    expect(TEACHING_OBJECT_LABELS.quiz).toBe('测验');
  });

  it.each([
    ['classroom', 'lesson'],
    ['homework', 'homework'],
    ['quiz', 'quiz'],
    ['recorded', 'recording'],
    ['material', 'material'],
  ] satisfies ReadonlyArray<readonly [TaskKind, string]>)('maps task %s to %s', (kind, expected) => {
    expect(getTaskTeachingObjectKind(kind)).toBe(expected);
  });

  it.each([
    ['lesson', 'lesson'],
    ['homework', 'homework'],
    ['quiz', 'quiz'],
    ['reading', 'reading'],
    ['exercise', 'exercise'],
    ['livestream', 'livestream'],
  ] satisfies ReadonlyArray<readonly [ClassActivityType, string]>)('maps class activity %s to %s', (kind, expected) => {
    expect(getClassActivityTeachingObjectKind(kind)).toBe(expected);
  });

  it('distinguishes homework and quiz schedule assignments', () => {
    const assignment = {
      kind: 'assignment',
      activityType: 'homework',
    } as ScheduleEvent;
    const quiz = { ...assignment, activityType: 'quiz' } as ScheduleEvent;

    expect(getScheduleTeachingObjectKind(assignment)).toBe('homework');
    expect(getScheduleTeachingObjectKind(quiz)).toBe('quiz');
    expect(getScheduleTeachingObjectKind({ kind: 'lesson' } as ScheduleEvent)).toBe('lesson');
    expect(getScheduleTeachingObjectKind({ kind: 'recording' } as ScheduleEvent)).toBe('recording');
    expect(getScheduleTeachingObjectKind({ kind: 'open-course' } as ScheduleEvent)).toBe('open-course');
  });
});
