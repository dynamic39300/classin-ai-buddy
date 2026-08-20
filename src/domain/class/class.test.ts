import { describe, expect, it } from 'vitest';
import {
  addClassActivity,
  canEditClassNickname,
  canCompleteClassCourse,
  canManageClass,
  canManageOpenCourse,
  canSetClassTeacher,
  confirmClassAnnouncement,
  createClassCourse,
  deleteClassCourse,
  deleteClassUnit,
  filterClassRecords,
  filterOpenCourses,
  getClassActivityAction,
  getClassActivityActions,
  getClassMemberCounts,
  getClassMemberRemovalEligibility,
  getClassMemberDisplayName,
  getClassExitEligibility,
  normalizeClassNickname,
  removeClassMembers,
  removeEligibleClassMembers,
  getVisibleClassCourses,
  getVisibleClassRecords,
  renameClassCourse,
  saveClassUnit,
  setClassHeadmaster,
  validateCourseName,
  validateUnitInput,
  type ClassActivity,
  type ClassMember,
  type ClassRecord,
  type OpenCourseRecord,
} from './class';

function makeClass(overrides: Partial<ClassRecord> = {}): ClassRecord {
  return {
    id: 'class-1', name: '高二物理 3 班',
    visibleTo: ['teacher', 'student-family'], roleByAppRole: { teacher: 'headmaster', 'student-family': 'student-family' },
    memberCount: 30, pendingCountByRole: { teacher: 4, 'student-family': 1 }, unreadCountByRole: { teacher: 1, 'student-family': 2 },
    coverTone: 'green', courses: [], announcements: [], members: [], settings: {
      allowStudentInvite: false, allowViewAfterLeaveOrComplete: true, allowTeacherCreateLesson: true,
      allowStudentEditNickname: true, classIntro: '', coverColor: '#0FAD7C',
    }, updatedAt: '2026-08-08T14:00:00+08:00', ...overrides,
  };
}

function makeOpenCourse(overrides: Partial<OpenCourseRecord> = {}): OpenCourseRecord {
  return {
    id: 'open-1', title: '高效阅读公开课', subject: '英语', instructorName: '陈老师', startsAt: '2026-08-08T16:00:00+08:00',
    durationMinutes: 40, status: 'scheduled', visibleTo: ['teacher', 'student-family'], ownerRoles: ['teacher'], enrolledCount: 18,
    maxSeats: 30, description: '从文章结构入手，练习阅读定位与主旨判断。', classroomSummary: '线上直播间', ...overrides,
  };
}

describe('class visibility and filters', () => {
  it('keeps role-only classes isolated and sorts classes by update time', () => {
    const teacherOnly = makeClass({ id: 'teacher-only', visibleTo: ['teacher'] });
    const latest = makeClass({ id: 'latest', updatedAt: '2026-08-09T14:00:00+08:00' });
    expect(getVisibleClassRecords('student-family', [teacherOnly])).toHaveLength(0);
    expect(filterClassRecords('teacher', [latest, makeClass()], '')[0]?.id).toBe('latest');
  });

  it('searches class and open course context', () => {
    expect(filterClassRecords('teacher', [makeClass()], '教研')).toHaveLength(0);
    expect(filterClassRecords('teacher', [makeClass()], '物理')).toHaveLength(1);
    expect(filterOpenCourses('student-family', [makeOpenCourse()], '陈老师')).toHaveLength(1);
  });

  it('keeps draft teaching content out of the student view', () => {
    const course = {
      id: 'course-1', name: '动量', description: '课程', status: 'active' as const, units: [
        { id: 'published', title: '已发布', description: '', status: 'published' as const, activities: [
          { id: 'visible', type: 'lesson' as const, title: '课堂', status: 'upcoming' as const, detail: '' },
        ] },
        { id: 'draft-unit', title: '草稿单元', description: '', status: 'draft' as const, activities: [
          { id: 'hidden-with-unit', type: 'homework' as const, title: '草稿单元作业', status: 'pending' as const, detail: '' },
        ] },
      ],
    };

    expect(getVisibleClassCourses('teacher', [course])[0]?.units).toHaveLength(2);
    const studentCourse = getVisibleClassCourses('student-family', [course])[0];
    expect(studentCourse?.units.map(({ id }) => id)).toEqual(['published']);
    expect(studentCourse?.units[0]?.activities.map(({ id }) => id)).toEqual(['visible']);
  });
});

describe('class content commands', () => {
  it('validates the mobile course and unit field limits', () => {
    expect(validateCourseName('  动量与碰撞  ')).toEqual({ valid: true, value: '动量与碰撞' });
    expect(validateCourseName('')).toEqual({ valid: false, error: '请输入课程名称。' });
    expect(validateCourseName('课'.repeat(51))).toEqual({ valid: false, error: '课程名称不能超过 50 个字。' });
    expect(validateUnitInput('第一单元', '  单元介绍  ')).toEqual({ valid: true, title: '第一单元', description: '单元介绍' });
    expect(validateUnitInput('单'.repeat(101), '')).toMatchObject({ valid: false, field: 'title' });
    expect(validateUnitInput('第一单元', '介'.repeat(301))).toMatchObject({ valid: false, field: 'description' });
  });

  it('creates, renames, and deletes courses without mutating the source', () => {
    const source = [{ id: 'course-1', name: '旧课程', description: '', status: 'active' as const, units: [] }];
    const created = createClassCourse(source, { id: 'course-2', name: '新课程', description: '', status: 'active', units: [], activities: [] });
    const renamed = renameClassCourse(created, 'course-2', '新课程（上）');
    const deleted = deleteClassCourse(renamed, 'course-1');

    expect(source).toHaveLength(1);
    expect(renamed[1]?.name).toBe('新课程（上）');
    expect(deleted.map(({ id }) => id)).toEqual(['course-2']);
  });

  it('saves unit draft or publication and scopes activities to a unit or course', () => {
    const source = [{ id: 'course-1', name: '课程', description: '', status: 'active' as const, units: [], activities: [] }];
    const withDraft = saveClassUnit(source, 'course-1', { id: 'unit-1', title: '单元', description: '', status: 'draft', activities: [] });
    const published = saveClassUnit(withDraft, 'course-1', { ...withDraft[0]!.units[0]!, status: 'published' });
    const courseActivity = addClassActivity(published, 'course-1', null, { id: 'a-1', type: 'quiz', title: '随堂测验', status: 'pending', detail: '待开始' });
    const unitActivity = addClassActivity(courseActivity, 'course-1', 'unit-1', { id: 'a-2', type: 'exercise', title: '单元练习', status: 'pending', detail: '待开始' });

    expect(withDraft[0]?.units[0]?.status).toBe('draft');
    expect(getVisibleClassCourses('student-family', withDraft)).toEqual([]);
    expect(getVisibleClassCourses('student-family', published)[0]?.units[0]?.status).toBe('published');
    expect(unitActivity[0]?.activities?.map(({ id }) => id)).toEqual(['a-1']);
    expect(unitActivity[0]?.units[0]?.activities.map(({ id }) => id)).toEqual(['a-2']);
    expect(deleteClassUnit(unitActivity, 'course-1', 'unit-1')[0]?.units).toEqual([]);
  });
});

describe('class permissions and actions', () => {
  it('allows management only to an active teacher-owned class/course', () => {
    expect(canManageClass('teacher', makeClass())).toBe(true);
    expect(canManageClass('student-family', makeClass())).toBe(false);
    expect(canManageOpenCourse('teacher', makeOpenCourse())).toBe(true);
    expect(canManageOpenCourse('student-family', makeOpenCourse())).toBe(false);
    expect(canManageOpenCourse('teacher', makeOpenCourse({ status: 'live' }))).toBe(false);
  });

  it('maps activity status to role-aware actions', () => {
    const now = new Date('2026-08-08T14:00:00+08:00');
    const upcoming: ClassActivity = { id: 'a', type: 'lesson', title: '课堂', status: 'upcoming', scheduledAt: '2026-08-08T15:00:00+08:00', detail: '' };
    expect(getClassActivityAction('teacher', upcoming, now).label).toBe('去备课');
    expect(getClassActivityAction('student-family', upcoming, now).label).toBe('课前准备');
    expect(getClassActivityAction('teacher', { ...upcoming, status: 'active' }, now).label).toBe('去上课');
  });

  it('derives all available classroom actions from role, time, and replay availability', () => {
    const now = new Date('2026-08-08T14:00:00+08:00');
    const lesson: ClassActivity = {
      id: 'lesson',
      type: 'lesson',
      title: '动量守恒模型',
      status: 'upcoming',
      scheduledAt: '2026-08-08T14:30:00+08:00',
      detail: '',
    };

    expect(getClassActivityActions('teacher', lesson, now).map(({ label }) => label)).toEqual(['去备课', '去上课']);
    expect(getClassActivityActions('student-family', lesson, now).map(({ label }) => label)).toEqual(['去上课']);
    expect(getClassActivityActions('teacher', { ...lesson, scheduledAt: '2026-08-08T14:30:01+08:00' }, now).map(({ label }) => label)).toEqual(['去备课']);
    expect(getClassActivityActions('student-family', { ...lesson, scheduledAt: '2026-08-08T14:30:01+08:00' }, now).map(({ label }) => label)).toEqual(['课前准备']);

    const completed = { ...lesson, status: 'completed' as const };
    expect(getClassActivityActions('teacher', completed, now).map(({ label }) => label)).toEqual(['课堂报告', '课堂记录']);
    expect(getClassActivityActions('student-family', completed, now).map(({ label }) => label)).toEqual(['课堂记录']);
    expect(getClassActivityActions('teacher', { ...completed, replayAvailability: 'available' }, now).map(({ label }) => label)).toEqual(['课堂报告', '看回放']);
    expect(getClassActivityActions('student-family', { ...completed, replayAvailability: 'available' }, now).map(({ label }) => label)).toEqual(['看回放']);
  });

  it('applies mobile member role, nickname, and removal permissions', () => {
    const headmaster: ClassMember = { id: 'hm', name: '王老师', role: 'headmaster', plan: 'pro', relationship: '班主任', joinedAt: '', leftAt: null };
    const teacher: ClassMember = { id: 'teacher', name: '张老师', role: 'teacher', plan: 'trial', relationship: '协同教师', joinedAt: '', leftAt: null, hasBlockingLesson: true };
    const student: ClassMember = { id: 'student', name: '李明', role: 'student-family', plan: 'free', relationship: '学生', joinedAt: '', leftAt: null };
    const settings = makeClass().settings;

    expect(canSetClassTeacher('headmaster', student)).toBe(true);
    expect(canSetClassTeacher('teacher', student)).toBe(false);
    expect(canEditClassNickname('headmaster', headmaster.id, teacher, settings)).toBe(true);
    expect(canEditClassNickname('teacher', teacher.id, teacher, settings)).toBe(true);
    expect(canEditClassNickname('teacher', teacher.id, student, settings)).toBe(true);
    expect(canEditClassNickname('student-family', student.id, student, settings)).toBe(true);
    expect(canEditClassNickname('student-family', student.id, student, { ...settings, allowStudentEditNickname: false })).toBe(false);
    expect(getClassMemberRemovalEligibility('headmaster', headmaster.id, teacher)).toEqual({ allowed: false, reason: 'blocking-lesson' });
    expect(getClassMemberRemovalEligibility('teacher', teacher.id, student)).toEqual({ allowed: false, reason: 'permission' });
    const blockedBatch = removeEligibleClassMembers('headmaster', headmaster.id, [headmaster, teacher, student], new Set([teacher.id, student.id]), '2026-08-08T14:15:00+08:00');
    expect(blockedBatch.removed).toBe(false);
    expect(blockedBatch.members).toEqual([headmaster, teacher, student]);
  });

  it('moves the headmaster role only between active teacher members', () => {
    const members: ClassMember[] = [
      { id: 'headmaster', name: '王老师', role: 'headmaster', plan: 'pro', relationship: '班主任', joinedAt: '', leftAt: null },
      { id: 'teacher', name: '张老师', role: 'teacher', plan: 'trial', relationship: '协同教师', joinedAt: '', leftAt: null },
      { id: 'student', name: '李明', role: 'student-family', plan: 'free', relationship: '学生', joinedAt: '', leftAt: null },
    ];

    expect(setClassHeadmaster(members, 'teacher')).toEqual([
      { ...members[0]!, role: 'teacher', relationship: '协同教师' },
      { ...members[1]!, role: 'headmaster', relationship: '班主任' },
      members[2],
    ]);
    expect(setClassHeadmaster(members, 'student')).toEqual(members);
  });

  it('normalizes class nicknames and excludes soft-deleted members from counts', () => {
    const members: ClassMember[] = [
      { id: 'teacher', name: '王老师', role: 'headmaster', plan: 'pro', relationship: '班主任', joinedAt: '', leftAt: null },
      { id: 'student', name: '李明', role: 'student-family', plan: 'free', relationship: '学生', joinedAt: '', leftAt: null },
    ];
    expect(normalizeClassNickname('  小\n明  ', '李明')).toBe('小 明');
    expect(normalizeClassNickname('', '李明')).toBe('李明');
    expect(getClassMemberDisplayName({ ...members[1]!, classNickname: '小明' })).toBe('小明');
    expect(getClassMemberCounts(removeClassMembers(members, new Set(['student']), '2026-08-08T14:15:00+08:00'))).toEqual({ total: 1, teachers: 1, students: 0 });
  });

  it('confirms an announcement without duplicating the member', () => {
    const announcement = {
      id: 'a', title: '通知', body: '正文', createdAt: '', authorName: '王老师', readByRole: {},
      confirmedMemberIds: ['student-2'], unconfirmedMemberIds: ['student-1'],
    };
    const confirmed = confirmClassAnnouncement([announcement], 'a', 'student-1');
    expect(confirmed[0]?.confirmedMemberIds).toEqual(['student-2', 'student-1']);
    expect(confirmed[0]?.unconfirmedMemberIds).toEqual([]);
    expect(confirmClassAnnouncement(confirmed, 'a', 'student-1')).toEqual(confirmed);
  });

  it('resolves mobile account-plan exit and course completion eligibility', () => {
    const freeMember: ClassMember = { id: 'free', name: '李明', role: 'student-family', plan: 'free', relationship: '学生', joinedAt: '', leftAt: null };
    const trialMember: ClassMember = { ...freeMember, id: 'trial', plan: 'trial' };
    const proMember: ClassMember = { ...freeMember, id: 'pro', plan: 'pro' };
    const unfinishedCourse = { id: 'course', name: '课程', description: '', status: 'active' as const, units: [{ id: 'unit', title: '单元', description: '', status: 'published' as const, activities: [{ id: 'lesson', type: 'lesson' as const, title: '课堂', status: 'pending' as const, detail: '' }] }] };
    const unfinished = makeClass({ courses: [unfinishedCourse] });
    expect(getClassExitEligibility(unfinished, freeMember, new Date('2026-08-08T14:15:00+08:00'))).toEqual({ allowed: true });
    expect(getClassExitEligibility(unfinished, trialMember, new Date('2026-08-08T14:15:00+08:00'))).toEqual({ allowed: false, reason: 'unfinished-lessons' });
    expect(canCompleteClassCourse(unfinishedCourse)).toBe(false);

    const completed = makeClass({ lastLessonEndedAt: '2026-05-20T14:15:00+08:00' });
    expect(getClassExitEligibility(completed, proMember, new Date('2026-08-08T14:15:00+08:00'))).toEqual({ allowed: true });
    expect(canCompleteClassCourse({ ...unfinishedCourse, units: [] })).toBe(true);
  });
});
