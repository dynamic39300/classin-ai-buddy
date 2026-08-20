import { describe, expect, it } from 'vitest';
import type { OpenCourseRecord } from '@domain/class/class';
import {
  canDeleteOpenCourse,
  canEditOpenCourse,
  canEnterOpenCoursePreflight,
  createDemoOpenCoursePasscode,
  joinOpenCourseByPasscode,
  normalizeOpenCourseClassroom,
  resolveOpenCourseStatus,
  resolveTeacherOpenCourseActions,
  selectTeacherOpenCourses,
  selectStudentOpenCourses,
  toOpenCourseWorkspaceRecord,
  validateOpenCourseInput,
  type OpenCourseInput,
} from './open-course';

const baseInput: OpenCourseInput = {
  title: '  家长沟通公开课  ',
  coverId: 'cover-green',
  startsAt: '2026-08-08T14:45:00+08:00',
  durationMinutes: 40,
  classroom: {
    showSeats: true,
    autoStage: true,
    stageCapacity: '1V6',
    recordClassroom: false,
    recordScene: false,
  },
};

function record(overrides: Partial<OpenCourseRecord> = {}): OpenCourseRecord {
  return {
    id: 'open-demo',
    title: '公开课',
    subject: '物理',
    instructorName: '王老师',
    startsAt: '2026-08-08T14:45:00+08:00',
    durationMinutes: 40,
    status: 'ended',
    visibleTo: ['teacher'],
    ownerRoles: ['teacher'],
    enrolledCount: 0,
    maxSeats: 0,
    description: '说明',
    classroomSummary: '线上直播间',
    ...overrides,
  };
}

describe('open course domain', () => {
  it('validates and normalizes every mobile Core field', () => {
    const result = validateOpenCourseInput(baseInput);
    expect(result).toMatchObject({ valid: true, value: { title: '家长沟通公开课' } });
    expect(normalizeOpenCourseClassroom({ ...baseInput.classroom, showSeats: false })).toMatchObject({
      showSeats: false,
      autoStage: false,
    });

    const invalid = validateOpenCourseInput({
      ...baseInput,
      title: 'x'.repeat(51),
      startsAt: '2026-08-08T14:14:00+08:00',
      durationMinutes: 30 as OpenCourseInput['durationMinutes'],
    });
    expect(invalid).toMatchObject({
      valid: false,
      errors: { title: expect.any(String), startsAt: expect.any(String), durationMinutes: expect.any(String) },
    });
  });

  it('derives scheduled, live and ended states and gates edit, delete and preflight', () => {
    const scheduled = record({ startsAt: '2026-08-08T14:46:00+08:00' });
    const ready = record({ startsAt: '2026-08-08T14:45:00+08:00' });
    const live = record({ startsAt: '2026-08-08T14:00:00+08:00' });
    const ended = record({ startsAt: '2026-08-08T13:00:00+08:00', durationMinutes: 40 });

    expect(resolveOpenCourseStatus(scheduled)).toBe('scheduled');
    expect(resolveOpenCourseStatus(live)).toBe('live');
    expect(resolveOpenCourseStatus(ended)).toBe('ended');
    expect(canEditOpenCourse(scheduled)).toBe(true);
    expect(canDeleteOpenCourse(live)).toBe(false);
    expect(canEnterOpenCoursePreflight(scheduled)).toBe(false);
    expect(canEnterOpenCoursePreflight(ready)).toBe(true);
    expect(canEnterOpenCoursePreflight(live)).toBe(true);
    expect(canEnterOpenCoursePreflight(ended)).toBe(false);
  });

  it('shares one teacher action model across detail entry points', () => {
    expect(resolveTeacherOpenCourseActions(record({ startsAt: '2026-08-08T14:46:00+08:00' }))).toMatchObject({
      canEdit: true,
      canDelete: true,
      canInvite: true,
      canEnter: false,
      enterLabel: '上课',
    });
    expect(resolveTeacherOpenCourseActions(record({ startsAt: '2026-08-08T14:00:00+08:00' }))).toMatchObject({
      canEdit: false,
      canDelete: false,
      canInvite: true,
      canEnter: true,
      enterLabel: '进入课堂',
    });
    expect(resolveTeacherOpenCourseActions(record({ startsAt: '2026-08-08T13:00:00+08:00' }))).toMatchObject({
      canEdit: false,
      canDelete: false,
      canInvite: false,
      canEnter: false,
      enterLabel: '已结束',
    });
  });

  it('adapts legacy records without changing the shared OpenCourseRecord contract', () => {
    const adapted = toOpenCourseWorkspaceRecord(record());
    expect(adapted.status).toBe('scheduled');
    expect(adapted.passcode).toBe(createDemoOpenCoursePasscode('open-demo'));
    expect(adapted.classroom).toMatchObject({ showSeats: true, autoStage: true, stageCapacity: '1V6' });
  });

  it('returns empty, missing, duplicate and success join states', () => {
    const course = record();
    const passcode = createDemoOpenCoursePasscode(course.id);
    expect(joinOpenCourseByPasscode([course], new Set(), ' ').status).toBe('empty');
    expect(joinOpenCourseByPasscode([course], new Set(), 'missing').status).toBe('not-found');
    expect(joinOpenCourseByPasscode([course], new Set([course.id]), passcode).status).toBe('duplicate');
    expect(joinOpenCourseByPasscode([course], new Set(), passcode)).toMatchObject({ status: 'success', course: { id: course.id } });
  });

  it('creates distinct deterministic passcodes for sequential local records', () => {
    expect(createDemoOpenCoursePasscode('open-local-4')).toBe(createDemoOpenCoursePasscode('open-local-4'));
    expect(createDemoOpenCoursePasscode('open-local-4')).not.toBe(createDemoOpenCoursePasscode('open-local-5'));
  });

  it('selects teacher-owned records without confusing instructor identity with ownership', () => {
    const records = [
      record({ id: 'owned', instructorName: '陈老师', ownerRoles: ['teacher'], visibleTo: ['teacher'] }),
      record({ id: 'visible-only', instructorName: '王老师', ownerRoles: [], visibleTo: ['teacher'] }),
      record({ id: 'hidden', ownerRoles: ['teacher'], visibleTo: [] }),
    ];

    expect(selectTeacherOpenCourses(records).map(({ id }) => id)).toEqual(['owned']);
  });

  it('derives collection status before filtering and supports query and deterministic sorting', () => {
    const records = [
      record({ id: 'later', title: '物理实验', subject: '物理', startsAt: '2026-08-08T16:00:00+08:00', status: 'ended' }),
      record({ id: 'live', title: '家长沟通', subject: '家庭教育', startsAt: '2026-08-08T14:00:00+08:00', status: 'scheduled' }),
    ];
    const clock = new Date('2026-08-08T14:15:00+08:00');

    expect(selectTeacherOpenCourses(records, { status: 'live' }, clock).map(({ id }) => id)).toEqual(['live']);
    expect(selectTeacherOpenCourses(records, { query: '物理', sort: 'title-asc' }, clock).map(({ id }) => id)).toEqual(['later']);
  });

  it('selects only joined records that are visible to the student/family role', () => {
    const records = [
      record({ id: 'joined', visibleTo: ['teacher', 'student-family'] }),
      record({ id: 'not-joined', visibleTo: ['student-family'] }),
      record({ id: 'teacher-only', visibleTo: ['teacher'] }),
    ];

    expect(selectStudentOpenCourses(records, new Set(['joined', 'teacher-only'])).map(({ id }) => id)).toEqual(['joined']);
  });

});
