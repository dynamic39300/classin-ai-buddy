import { describe, expect, it } from 'vitest';
import { resolveProductTarget } from './product-target';

describe('product target resolver', () => {
  it('resolves shared objects into each role tree', () => {
    expect(resolveProductTarget('teacher', { kind: 'class', classId: 'physics-3' }))
      .toBe('/teacher/classes/physics-3');
    expect(resolveProductTarget('student-family', { kind: 'task', taskId: 'task-1' }))
      .toBe('/student/todos/task-1');
    expect(resolveProductTarget('teacher', { kind: 'message', category: 'class', threadId: 'class-physics-3' }))
      .toBe('/teacher/messages?category=class&thread=class-physics-3');
    expect(resolveProductTarget('student-family', {
      kind: 'homework', homeworkId: 'homework 1', source: 'student_schedule',
    })).toBe('/student/homework/homework%201?source=student_schedule');
  });

  it('rejects teacher-only targets for the student role', () => {
    expect(resolveProductTarget('student-family', { kind: 'insight', classId: 'physics-3' })).toBeNull();
    expect(resolveProductTarget('student-family', { kind: 'space', surface: 'my-drive' })).toBeNull();
  });

  it('encodes object identifiers and optional context', () => {
    expect(resolveProductTarget('teacher', { kind: 'open-course', openCourseId: '公开课 1' }))
      .toBe('/teacher/open-courses?dialog=detail&course=%E5%85%AC%E5%BC%80%E8%AF%BE+1');
    expect(resolveProductTarget('student-family', { kind: 'open-course', openCourseId: '公开课 1', source: 'home' }))
      .toBe('/student/open-courses?dialog=detail&course=%E5%85%AC%E5%BC%80%E8%AF%BE+1&source=home');
    expect(resolveProductTarget('teacher', {
      kind: 'class',
      classId: 'physics-3',
      courseId: 'course-momentum',
      unitId: 'unit-momentum-1',
      activityId: 'activity-momentum-lesson',
      source: 'home',
    })).toBe('/teacher/classes/physics-3?course=course-momentum&unit=unit-momentum-1&activity=activity-momentum-lesson&from=home');
    expect(resolveProductTarget('teacher', { kind: 'task', taskId: 'task-1', source: 'home' }))
      .toBe('/teacher/tasks/task-1?from=home');
    expect(resolveProductTarget('teacher', { kind: 'insight', classId: 'physics-3', studentId: 'student-1' }))
      .toBe('/teacher/insights?class=physics-3&student=student-1');
    expect(resolveProductTarget('teacher', {
      kind: 'insight', classId: 'physics-3', section: 'diagnosis', source: 'home',
    })).toBe('/teacher/insights?class=physics-3&section=diagnosis&source=home');
    expect(resolveProductTarget('teacher', {
      kind: 'message', category: 'class', threadId: 'class-physics-3', source: 'home',
    })).toBe('/teacher/messages?category=class&thread=class-physics-3&source=home');
    expect(resolveProductTarget('student-family', {
      kind: 'class-chat', classId: 'physics-3', source: 'home',
    })).toBe('/student/classes/physics-3/chat?from=home');
  });
});
