import type { AppRole } from '@domain/account/role';

export type ClassCourseLifecycle = 'active' | 'completed';
export type ClassMemberRole = 'headmaster' | 'teacher' | 'student-family';
export type ClassAccountPlan = 'free' | 'trial' | 'pro';
export type ClassActivityType = 'lesson' | 'homework' | 'quiz' | 'reading' | 'exercise' | 'livestream';
export type ClassActivityStatus = 'completed' | 'active' | 'upcoming' | 'pending';
export type ClassActivityReplayAvailability = 'available' | 'unavailable';
export type ClassActivityActionId =
  | 'open-homework'
  | 'enter-classroom'
  | 'prepare-classroom'
  | 'view-classroom-preparation'
  | 'view-classroom-report'
  | 'watch-replay'
  | 'view-classroom-record'
  | 'view-activity';
export type ClassActivityAction = {
  id: ClassActivityActionId;
  label: string;
  feedback: string;
  priority: 'primary' | 'secondary';
};
export type ClassUnitStatus = 'published' | 'draft';
export type OpenCourseStatus = 'scheduled' | 'live' | 'ended';

export type ClassContentValidation =
  | { valid: true; value: string }
  | { valid: false; error: string };

export type ClassActivity = {
  id: string;
  type: ClassActivityType;
  title: string;
  status: ClassActivityStatus;
  homeworkId?: string;
  scheduledAt?: string;
  replayAvailability?: ClassActivityReplayAvailability;
  detail: string;
};

export type ClassUnit = {
  id: string;
  title: string;
  description: string;
  status: ClassUnitStatus;
  activities: ClassActivity[];
};

export type ClassCourse = {
  id: string;
  name: string;
  description: string;
  status: ClassCourseLifecycle;
  units: ClassUnit[];
  activities?: ClassActivity[];
};

export type ClassAnnouncement = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  authorName: string;
  readByRole: Partial<Record<AppRole, boolean>>;
  confirmedMemberIds: readonly string[];
  unconfirmedMemberIds: readonly string[];
};

export type ClassMember = {
  id: string;
  name: string;
  classNickname?: string;
  role: ClassMemberRole;
  plan: ClassAccountPlan;
  relationship: string;
  joinedAt: string;
  leftAt: string | null;
  isCurrentUser?: boolean;
  hasBlockingLesson?: boolean;
};

export type ClassSettings = {
  allowStudentInvite: boolean;
  allowViewAfterLeaveOrComplete: boolean;
  allowTeacherCreateLesson: boolean;
  allowStudentEditNickname: boolean;
  classIntro: string;
  coverColor: string;
};

export type ClassRecord = {
  id: string;
  name: string;
  visibleTo: readonly AppRole[];
  roleByAppRole: Partial<Record<AppRole, ClassMemberRole>>;
  memberCount: number;
  pendingCountByRole: Partial<Record<AppRole, number>>;
  unreadCountByRole: Partial<Record<AppRole, number>>;
  nextActivity?: { title: string; startsAt: string; detail: string };
  coverTone: 'green' | 'blue' | 'amber' | 'ink';
  courses: ClassCourse[];
  announcements: ClassAnnouncement[];
  members: ClassMember[];
  settings: ClassSettings;
  lastLessonEndedAt?: string;
  updatedAt: string;
};

export type OpenCourseRecord = {
  id: string;
  title: string;
  subject: string;
  instructorName: string;
  startsAt: string;
  durationMinutes: number;
  status: OpenCourseStatus;
  visibleTo: readonly AppRole[];
  ownerRoles: readonly AppRole[];
  enrolledCount: number;
  maxSeats: number;
  description: string;
  classroomSummary: string;
};

export const CLASS_COURSE_LIFECYCLE_LABELS: Record<ClassCourseLifecycle, string> = {
  active: '未结课',
  completed: '已结课',
};

export const OPEN_COURSE_STATUS_LABELS: Record<OpenCourseStatus, string> = {
  scheduled: '待开始',
  live: '直播中',
  ended: '已结束',
};

export const CLASS_ACTIVITY_TYPE_LABELS: Record<ClassActivityType, string> = {
  lesson: '课堂',
  homework: '作业',
  quiz: '测验',
  reading: '阅读/录播',
  exercise: '练习',
  livestream: '直播',
};

export const CLASS_MEMBER_ROLE_LABELS: Record<ClassMemberRole, string> = {
  headmaster: '班主任',
  teacher: '教师',
  'student-family': '学生',
};

export function validateCourseName(name: string): ClassContentValidation {
  const value = name.trim();
  if (!value) return { valid: false, error: '请输入课程名称。' };
  if (value.length > 50) return { valid: false, error: '课程名称不能超过 50 个字。' };
  return { valid: true, value };
}

export function validateUnitInput(title: string, description: string):
  | { valid: true; title: string; description: string }
  | { valid: false; field: 'title' | 'description'; error: string } {
  const normalizedTitle = title.trim();
  const normalizedDescription = description.trim();
  if (!normalizedTitle) return { valid: false, field: 'title', error: '请输入单元名称。' };
  if (normalizedTitle.length > 100) return { valid: false, field: 'title', error: '单元名称不能超过 100 个字。' };
  if (normalizedDescription.length > 300) return { valid: false, field: 'description', error: '单元介绍不能超过 300 个字。' };
  return { valid: true, title: normalizedTitle, description: normalizedDescription };
}

export function createClassCourse(courses: ReadonlyArray<ClassCourse>, course: ClassCourse): ClassCourse[] {
  return [...courses, course];
}

export function renameClassCourse(courses: ReadonlyArray<ClassCourse>, courseId: string, name: string): ClassCourse[] {
  return courses.map((course) => course.id === courseId ? { ...course, name } : course);
}

export function deleteClassCourse(courses: ReadonlyArray<ClassCourse>, courseId: string): ClassCourse[] {
  return courses.filter((course) => course.id !== courseId);
}

export function saveClassUnit(
  courses: ReadonlyArray<ClassCourse>,
  courseId: string,
  unit: ClassUnit,
): ClassCourse[] {
  return courses.map((course) => {
    if (course.id !== courseId) return course;
    const exists = course.units.some(({ id }) => id === unit.id);
    return { ...course, units: exists ? course.units.map((current) => current.id === unit.id ? unit : current) : [...course.units, unit] };
  });
}

export function deleteClassUnit(courses: ReadonlyArray<ClassCourse>, courseId: string, unitId: string): ClassCourse[] {
  return courses.map((course) => course.id === courseId
    ? { ...course, units: course.units.filter((unit) => unit.id !== unitId) }
    : course);
}

export function addClassActivity(
  courses: ReadonlyArray<ClassCourse>,
  courseId: string,
  unitId: string | null,
  activity: ClassActivity,
): ClassCourse[] {
  return courses.map((course) => {
    if (course.id !== courseId) return course;
    if (!unitId) return { ...course, activities: [...(course.activities ?? []), activity] };
    return {
      ...course,
      units: course.units.map((unit) => unit.id === unitId
        ? { ...unit, activities: [...unit.activities, activity] }
        : unit),
    };
  });
}

export function getVisibleClassRecords(role: AppRole, records: ReadonlyArray<ClassRecord>): ClassRecord[] {
  return records.filter(({ visibleTo }) => visibleTo.includes(role));
}

export function filterClassRecords(
  role: AppRole,
  records: ReadonlyArray<ClassRecord>,
  query: string,
): ClassRecord[] {
  const normalized = query.trim().toLocaleLowerCase();
  return getVisibleClassRecords(role, records)
    .filter((record) => !normalized || record.name.toLocaleLowerCase().includes(normalized))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getVisibleOpenCourses(role: AppRole, records: ReadonlyArray<OpenCourseRecord>): OpenCourseRecord[] {
  return records.filter(({ visibleTo }) => visibleTo.includes(role));
}

export function getVisibleClassCourses(role: AppRole, courses: ReadonlyArray<ClassCourse>): ClassCourse[] {
  if (role === 'teacher') return [...courses];
  return courses
    .map((course) => ({
      ...course,
      activities: [...(course.activities ?? [])],
      units: course.units
        .filter(({ status }) => status === 'published')
        .map((unit) => ({
          ...unit,
          activities: [...unit.activities],
        })),
    }))
    .filter(({ units, activities }) => units.length > 0 || (activities?.length ?? 0) > 0);
}

export function filterOpenCourses(
  role: AppRole,
  records: ReadonlyArray<OpenCourseRecord>,
  query: string,
  status: OpenCourseStatus | 'all' = 'all',
): OpenCourseRecord[] {
  const normalized = query.trim().toLocaleLowerCase();
  return getVisibleOpenCourses(role, records)
    .filter((course) => status === 'all' || course.status === status)
    .filter((course) => !normalized || [course.title, course.subject, course.instructorName].join(' ').toLocaleLowerCase().includes(normalized))
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
}

export function canManageClass(role: AppRole, record: ClassRecord): boolean {
  const classRole = record.roleByAppRole.teacher;
  return role === 'teacher' && (classRole === 'headmaster' || classRole === 'teacher');
}

export function getActiveClassMembers(members: ReadonlyArray<ClassMember>): ClassMember[] {
  return members.filter(({ leftAt }) => leftAt === null);
}

export function getClassMemberCounts(members: ReadonlyArray<ClassMember>): {
  total: number;
  teachers: number;
  students: number;
} {
  const active = getActiveClassMembers(members);
  return {
    total: active.length,
    teachers: active.filter(({ role }) => role === 'headmaster' || role === 'teacher').length,
    students: active.filter(({ role }) => role === 'student-family').length,
  };
}

export function getClassMemberDisplayName(member: ClassMember): string {
  return member.classNickname?.trim() || member.name;
}

export function normalizeClassNickname(value: string, accountName: string): string {
  const normalized = value.replace(/[\r\n]+/g, ' ').trim().slice(0, 20);
  return normalized || accountName;
}

export function canEditClassNickname(
  actorRole: ClassMemberRole,
  actorMemberId: string,
  target: ClassMember,
  settings: ClassSettings,
): boolean {
  if (target.leftAt !== null) return false;
  if (actorRole === 'headmaster') return true;
  if (actorRole === 'teacher') return target.id === actorMemberId || target.role === 'student-family';
  return target.id === actorMemberId && settings.allowStudentEditNickname;
}

export function updateClassMemberNickname(
  members: ReadonlyArray<ClassMember>,
  memberId: string,
  value: string,
): ClassMember[] {
  return members.map((member) => member.id === memberId
    ? { ...member, classNickname: normalizeClassNickname(value, member.name) }
    : member);
}

export function canSetClassTeacher(actorRole: ClassMemberRole, target: ClassMember): boolean {
  return actorRole === 'headmaster' && target.leftAt === null && target.role === 'student-family';
}

export function setClassMemberAsTeacher(members: ReadonlyArray<ClassMember>, memberId: string): ClassMember[] {
  return members.map((member) => member.id === memberId
    ? { ...member, role: 'teacher', relationship: '协同教师' }
    : member);
}

export function setClassHeadmaster(members: ReadonlyArray<ClassMember>, memberId: string): ClassMember[] {
  const candidate = members.find((member) => (
    member.id === memberId
    && member.leftAt === null
    && (member.role === 'headmaster' || member.role === 'teacher')
  ));
  if (!candidate) return [...members];

  return members.map((member) => {
    if (member.leftAt !== null) return member;
    if (member.id === memberId) return { ...member, role: 'headmaster', relationship: '班主任' };
    if (member.role === 'headmaster') return { ...member, role: 'teacher', relationship: '协同教师' };
    return member;
  });
}

export type ClassMemberRemovalEligibility =
  | { allowed: true }
  | { allowed: false; reason: 'permission' | 'self' | 'headmaster' | 'blocking-lesson' };

export function getClassMemberRemovalEligibility(
  actorRole: ClassMemberRole,
  actorMemberId: string,
  target: ClassMember,
): ClassMemberRemovalEligibility {
  if (actorRole !== 'headmaster' || target.leftAt !== null) return { allowed: false, reason: 'permission' };
  if (target.id === actorMemberId) return { allowed: false, reason: 'self' };
  if (target.role === 'headmaster') return { allowed: false, reason: 'headmaster' };
  if (target.role === 'teacher' && target.hasBlockingLesson) return { allowed: false, reason: 'blocking-lesson' };
  return { allowed: true };
}

export function removeClassMembers(
  members: ReadonlyArray<ClassMember>,
  memberIds: ReadonlySet<string>,
  leftAt: string,
): ClassMember[] {
  return members.map((member) => memberIds.has(member.id) ? { ...member, leftAt } : member);
}

export function removeEligibleClassMembers(
  actorRole: ClassMemberRole,
  actorMemberId: string,
  members: ReadonlyArray<ClassMember>,
  memberIds: ReadonlySet<string>,
  leftAt: string,
): { removed: true; members: ClassMember[] } | { removed: false; members: ReadonlyArray<ClassMember>; blockedIds: string[] } {
  const targets = members.filter(({ id }) => memberIds.has(id));
  const blockedIds = targets
    .filter((target) => !getClassMemberRemovalEligibility(actorRole, actorMemberId, target).allowed)
    .map(({ id }) => id);
  if (targets.length !== memberIds.size || blockedIds.length > 0) {
    return { removed: false, members, blockedIds };
  }
  return { removed: true, members: removeClassMembers(members, memberIds, leftAt) };
}

export type ClassExitEligibility =
  | { allowed: true }
  | { allowed: false; reason: 'unfinished-lessons' | 'pro-retention-window' };

function hasUnfinishedClassLessons(record: ClassRecord): boolean {
  return record.courses.some((course) => [...(course.activities ?? []), ...course.units.flatMap(({ activities }) => activities)]
    .some((activity) => activity.type === 'lesson' && activity.status !== 'completed'));
}

export function getClassExitEligibility(
  record: ClassRecord,
  member: ClassMember,
  now: Date,
): ClassExitEligibility {
  if (member.plan === 'free') return { allowed: true };
  if (hasUnfinishedClassLessons(record)) return { allowed: false, reason: 'unfinished-lessons' };
  if (member.plan === 'trial') return { allowed: true };
  if (!record.lastLessonEndedAt) return { allowed: false, reason: 'pro-retention-window' };
  const elapsed = now.getTime() - new Date(record.lastLessonEndedAt).getTime();
  return elapsed >= 60 * 24 * 60 * 60 * 1000
    ? { allowed: true }
    : { allowed: false, reason: 'pro-retention-window' };
}

export function canCompleteClassCourse(course: ClassCourse): boolean {
  return [...(course.activities ?? []), ...course.units.flatMap(({ activities }) => activities)]
    .every((activity) => activity.type !== 'lesson' || activity.status === 'completed');
}

export function confirmClassAnnouncement(
  announcements: ReadonlyArray<ClassAnnouncement>,
  announcementId: string,
  memberId: string,
): ClassAnnouncement[] {
  return announcements.map((announcement) => {
    if (announcement.id !== announcementId || announcement.confirmedMemberIds.includes(memberId)) return announcement;
    return {
      ...announcement,
      confirmedMemberIds: [...announcement.confirmedMemberIds, memberId],
      unconfirmedMemberIds: announcement.unconfirmedMemberIds.filter((id) => id !== memberId),
      readByRole: { ...announcement.readByRole, 'student-family': true },
    };
  });
}

export function canManageOpenCourse(role: AppRole, course: OpenCourseRecord): boolean {
  return role === 'teacher' && course.ownerRoles.includes(role) && course.status === 'scheduled';
}

const CLASSROOM_ENTRY_WINDOW_MS = 30 * 60 * 1000;

export function getClassActivityActions(
  role: AppRole,
  activity: ClassActivity,
  now: Date,
): ClassActivityAction[] {
  if (activity.type === 'homework' && activity.homeworkId) {
    return [role === 'teacher'
      ? { id: 'open-homework', label: '去批改', feedback: '', priority: 'primary' }
      : { id: 'open-homework', label: '去做作业', feedback: '', priority: 'primary' }];
  }

  if (activity.type !== 'lesson') {
    return [{
      id: 'view-activity',
      label: activity.status === 'completed' ? '查看记录' : '查看活动',
      feedback: '活动详情入口已保留，本 Demo 不连接真实内容服务。',
      priority: 'primary',
    }];
  }

  if (activity.status === 'completed') {
    const historyAction: ClassActivityAction = activity.replayAvailability === 'available'
      ? { id: 'watch-replay', label: '看回放', feedback: '回放入口已保留，本 Demo 不连接真实回放服务。', priority: role === 'teacher' ? 'secondary' : 'primary' }
      : { id: 'view-classroom-record', label: '课堂记录', feedback: '课堂记录入口已保留，本 Demo 不连接真实课堂记录服务。', priority: role === 'teacher' ? 'secondary' : 'primary' };
    return role === 'teacher'
      ? [
          { id: 'view-classroom-report', label: '课堂报告', feedback: '课堂报告入口已保留，将在教学洞察 Feature 中实现。', priority: 'primary' },
          historyAction,
        ]
      : [historyAction];
  }

  const startsAt = activity.scheduledAt ? new Date(activity.scheduledAt).getTime() : Number.NaN;
  const withinEntryWindow = activity.status === 'active'
    || (!Number.isNaN(startsAt) && startsAt - now.getTime() <= CLASSROOM_ENTRY_WINDOW_MS);
  if (withinEntryWindow) {
    const primary: ClassActivityAction = { id: 'enter-classroom', label: '去上课', feedback: '课堂入口已保留，本 Demo 不连接真实课堂引擎。', priority: 'primary' };
    return role === 'teacher'
      ? [{ id: 'prepare-classroom', label: '去备课', feedback: '备课入口已保留，将在课堂工作区实现。', priority: 'secondary' }, primary]
      : [primary];
  }

  return [role === 'teacher'
    ? { id: 'prepare-classroom', label: '去备课', feedback: '备课入口已保留，将在课堂工作区实现。', priority: 'primary' }
    : { id: 'view-classroom-preparation', label: '课前准备', feedback: '课堂准备内容入口已保留，本 Demo 不提交真实学习记录。', priority: 'primary' }];
}

export function getClassActivityAction(role: AppRole, activity: ClassActivity, now: Date): ClassActivityAction {
  const actions = getClassActivityActions(role, activity, now);
  return actions.find(({ priority }) => priority === 'primary') ?? actions[0]!;
}

export function formatClassDate(iso: string, now: Date): string {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return '';
  const sameDay = value.toDateString() === now.toDateString();
  if (sameDay) return `今天 ${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
  return `${value.getMonth() + 1}月${value.getDate()}日 ${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}
