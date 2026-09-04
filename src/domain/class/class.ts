import type { AppRole } from '@domain/account/role';

export type ClassCourseLifecycle = 'active' | 'completed';
export type ClassMemberRole = 'headmaster' | 'teacher' | 'student-family';
export type ClassAccountPlan = 'free' | 'trial' | 'pro';
export type ClassActivityType = 'lesson' | 'homework' | 'quiz' | 'reading' | 'exercise' | 'livestream';
export type ClassActivityStatus = 'completed' | 'active' | 'upcoming' | 'pending';
export type ClassActivityReplayAvailability = 'available' | 'unavailable';
export type ClassActivityPublication = 'draft' | 'published';
export type ClassQuizScoringScheme = 'score' | 'percentage' | 'excellent-good' | 'abcd' | 'unscored';
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
  publication?: ClassActivityPublication;
  homeworkId?: string;
  scheduledAt?: string;
  replayAvailability?: ClassActivityReplayAvailability;
  detail: string;
  quiz?: Readonly<{
    version: string;
    paperArtifactId: string;
    paperArtifactVersion: string;
    questionCount: number;
    totalScore: number;
    description: string;
    startAt: string;
    endAt: string;
    durationMinutes: number | null;
    scoring: ClassQuizScoringScheme;
    questions?: readonly Readonly<{
      id: string;
      type: string;
      prompt: string;
      options?: readonly string[];
      answer: string;
      explanation: string;
      difficulty: string;
      score: number;
    }>[];
    publicationEvidence?: Readonly<{
      idempotencyKey: string;
      requestFingerprint: string;
      receipt: QuizActivityPublicationReceipt;
    }>;
  }>;
};

export type QuizActivityPublicationAction = Readonly<{
  id: string;
  kind: 'publish-quiz-activity';
  status: 'proposed' | 'approved';
  courseId: string;
  unitId: string | null;
  activityId: string;
  expectedVersion: string;
  actorId: string;
  permission: 'allowed' | 'denied';
  risk: 'medium';
  reversible: false;
  idempotencyKey: string;
  requestedAt: string;
}>;

export type QuizActivityPublicationApproval = Readonly<{
  id: string;
  actionId: string;
  decision: 'approved';
  decidedBy: string;
  decidedAt: string;
}>;

export type QuizActivityPublicationReceipt = Readonly<{
  id: string;
  actionId: string;
  approvalId: string;
  idempotencyKey: string;
  activityId: string;
  actorId: string;
  objectVersion: string;
  executedAt: string;
  truthLabel: '[模拟] ClassIn 测验发布回执';
  result: string;
}> & (
  | Readonly<{ status: 'success'; publication: 'published' }>
  | Readonly<{ status: 'permission_denied' | 'target_not_found' | 'version_conflict' | 'validation_failed' | 'evidence_mismatch'; publication: 'draft' }>
);

export type ClassUnit = {
  id: string;
  sourceVersion?: string;
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
  const upsert = (activities: ReadonlyArray<ClassActivity>): ClassActivity[] => activities.some(({ id }) => id === activity.id)
    ? activities.map((current) => current.id === activity.id ? activity : current)
    : [...activities, activity];
  return courses.map((course) => {
    if (course.id !== courseId) return course;
    if (!unitId) return { ...course, activities: upsert(course.activities ?? []) };
    return {
      ...course,
      units: course.units.map((unit) => unit.id === unitId
        ? { ...unit, activities: upsert(unit.activities) }
        : unit),
    };
  });
}

function updateClassActivity(
  courses: ReadonlyArray<ClassCourse>,
  courseId: string,
  unitId: string | null,
  activityId: string,
  update: (activity: ClassActivity) => ClassActivity,
): ClassCourse[] {
  return courses.map((course) => {
    if (course.id !== courseId) return course;
    if (unitId === null) return { ...course, activities: course.activities?.map((activity) => activity.id === activityId ? update(activity) : activity) };
    return { ...course, units: course.units.map((unit) => unit.id === unitId ? { ...unit, activities: unit.activities.map((activity) => activity.id === activityId ? update(activity) : activity) } : unit) };
  });
}

export function editQuizActivityDraft(
  courses: ReadonlyArray<ClassCourse>,
  courseId: string,
  unitId: string | null,
  activityId: string,
  patch: Readonly<{
    title?: string;
    description?: string;
    startAt?: string;
    endAt?: string;
    durationMinutes?: number | null;
    scoring?: ClassQuizScoringScheme;
    questions?: NonNullable<NonNullable<ClassActivity['quiz']>['questions']>;
  }>,
): ClassCourse[] {
  return updateClassActivity(courses, courseId, unitId, activityId, (activity) => {
    if (activity.type !== 'quiz' || activity.publication !== 'draft' || !activity.quiz) return activity;
    const title = patch.title === undefined ? activity.title : patch.title.trim();
    if (!title) return activity;
    const startAt = patch.startAt ?? activity.quiz.startAt;
    const endAt = patch.endAt ?? activity.quiz.endAt;
    const questions = patch.questions ?? activity.quiz.questions;
    if (!Number.isFinite(new Date(startAt).getTime()) || !Number.isFinite(new Date(endAt).getTime()) || new Date(endAt).getTime() <= new Date(startAt).getTime()) return activity;
    if (patch.durationMinutes !== undefined && patch.durationMinutes !== null && (!Number.isInteger(patch.durationMinutes) || patch.durationMinutes <= 0)) return activity;
    if (questions && validateClassQuizQuestions(questions)) return activity;
    const totalScore = questions?.reduce((sum, question) => sum + question.score, 0) ?? activity.quiz.totalScore;
    return {
      ...activity,
      title,
      scheduledAt: startAt,
      detail: `测验 · 草稿 · ${questions?.length ?? activity.quiz.questionCount} 题 · ${totalScore} 分`,
      quiz: Object.freeze({
        ...activity.quiz,
        version: incrementObjectVersion(activity.quiz.version),
        description: patch.description === undefined ? activity.quiz.description : patch.description.trim(),
        startAt,
        endAt,
        durationMinutes: patch.durationMinutes === undefined ? activity.quiz.durationMinutes : patch.durationMinutes,
        scoring: patch.scoring ?? activity.quiz.scoring,
        questions,
        questionCount: questions?.length ?? activity.quiz.questionCount,
        totalScore,
      }),
    };
  });
}

function incrementObjectVersion(version: string): string {
  const revision = Number(version.match(/(\d+)$/)?.[1] ?? 0);
  return `v${revision + 1}`;
}

export function validateClassQuizQuestions(questions: NonNullable<NonNullable<ClassActivity['quiz']>['questions']>): string | null {
  for (const question of questions) {
    if (!question.prompt.trim() || !question.answer.trim() || !question.explanation.trim() || question.score <= 0) return '每道题都必须包含题干、答案、解析和正分值。';
    if (question.type === 'single-choice' && (!question.options?.length || !question.options.includes(question.answer))) return '单选题答案必须属于当前选项。';
    if (question.type === 'multiple-choice') {
      if (!question.options?.length) return '多选题必须包含选项。';
      const answers = question.answer.split(/[、,，;；]/).map((answer) => answer.trim()).filter(Boolean);
      if (answers.length < 2 || !answers.every((answer) => question.options!.includes(answer))) return '多选题答案必须由两个或以上当前选项组成。';
    }
    if (question.type === 'judgement' && !['正确', '错误', 'true', 'false'].includes(question.answer.trim().toLocaleLowerCase())) return '判断题答案必须是“正确”或“错误”。';
  }
  return null;
}

function findQuizActivity(courses: ReadonlyArray<ClassCourse>, input: Readonly<{ courseId: string; unitId: string | null; activityId: string }>): ClassActivity | undefined {
  const course = courses.find(({ id }) => id === input.courseId);
  return input.unitId === null
    ? course?.activities?.find(({ id }) => id === input.activityId)
    : course?.units.find(({ id }) => id === input.unitId)?.activities.find(({ id }) => id === input.activityId);
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, canonicalize(item)]));
}

export function proposeQuizActivityPublication(
  courses: ReadonlyArray<ClassCourse>,
  input: Readonly<{ courseId: string; unitId: string | null; activityId: string; actorId: string; canPublish: boolean; requestedAt: string }>,
): QuizActivityPublicationAction | null {
  const activity = findQuizActivity(courses, input);
  if (!activity || activity.type !== 'quiz' || activity.publication !== 'draft' || !activity.quiz) return null;
  return Object.freeze({
    id: `action-publish-${activity.id}-${activity.quiz.version}`,
    kind: 'publish-quiz-activity',
    status: 'proposed',
    courseId: input.courseId,
    unitId: input.unitId,
    activityId: input.activityId,
    expectedVersion: activity.quiz.version,
    actorId: input.actorId,
    permission: input.canPublish ? 'allowed' : 'denied',
    risk: 'medium',
    reversible: false,
    idempotencyKey: `publish-${activity.id}-${activity.quiz.version}`,
    requestedAt: input.requestedAt,
  });
}

export function approveQuizActivityPublication(action: QuizActivityPublicationAction, approverId: string, decidedAt: string): Readonly<{ action: QuizActivityPublicationAction; approval: QuizActivityPublicationApproval }> {
  const approvedAction = Object.freeze({ ...action, status: 'approved' as const });
  return Object.freeze({
    action: approvedAction,
    approval: Object.freeze({ id: `approval-${action.id}`, actionId: action.id, decision: 'approved' as const, decidedBy: approverId, decidedAt }),
  });
}

export function executeQuizActivityPublication(
  courses: ReadonlyArray<ClassCourse>,
  action: QuizActivityPublicationAction,
  approval: QuizActivityPublicationApproval,
): Readonly<{ courses: ClassCourse[]; receipt: QuizActivityPublicationReceipt }> {
  const activity = findQuizActivity(courses, action);
  const requestFingerprint = JSON.stringify(canonicalize({ action, approval }));
  const common = { id: `receipt-${action.id}`, actionId: action.id, approvalId: approval.id, idempotencyKey: action.idempotencyKey, activityId: action.activityId, actorId: action.actorId, objectVersion: action.expectedVersion, executedAt: approval.decidedAt, truthLabel: '[模拟] ClassIn 测验发布回执' as const };
  const existingEvidence = activity?.quiz?.publicationEvidence;
  if (existingEvidence?.idempotencyKey === action.idempotencyKey) {
    if (existingEvidence.requestFingerprint === requestFingerprint) return Object.freeze({ courses: [...courses], receipt: existingEvidence.receipt });
    return Object.freeze({ courses: [...courses], receipt: Object.freeze({ ...common, id: `${common.id}-evidence-mismatch`, status: 'evidence_mismatch', publication: 'draft', result: '同一幂等键已绑定到不同的发布请求，未重复执行。' }) });
  }
  if (action.kind !== 'publish-quiz-activity' || action.status !== 'approved' || approval.decision !== 'approved' || approval.actionId !== action.id || approval.decidedBy !== action.actorId) return Object.freeze({ courses: [...courses], receipt: Object.freeze({ ...common, status: 'evidence_mismatch', publication: 'draft', result: '发布审批证据与当前动作不一致，未执行发布。' }) });
  if (action.permission !== 'allowed') return Object.freeze({ courses: [...courses], receipt: Object.freeze({ ...common, status: 'permission_denied', publication: 'draft', result: '当前教师无权发布该测验。' }) });
  if (!activity || activity.type !== 'quiz' || !activity.quiz) return Object.freeze({ courses: [...courses], receipt: Object.freeze({ ...common, status: 'target_not_found', publication: 'draft', result: '待发布的测验草稿已不存在。' }) });
  if (activity.quiz.version !== action.expectedVersion) return Object.freeze({ courses: [...courses], receipt: Object.freeze({ ...common, status: 'version_conflict', publication: 'draft', result: '测验草稿版本已变化，请重新审阅并确认。' }) });
  if (activity.publication === 'published') return Object.freeze({ courses: [...courses], receipt: Object.freeze({ ...common, status: 'target_not_found', publication: 'draft', result: '测验已经发布，但当前请求没有匹配的幂等证据。' }) });
  if (!activity.quiz.questions || validateClassQuizQuestions(activity.quiz.questions)) return Object.freeze({ courses: [...courses], receipt: Object.freeze({ ...common, status: 'validation_failed', publication: 'draft', result: '测验题目或答案校验未通过，未执行发布。' }) });
  const receipt = Object.freeze({ ...common, status: 'success' as const, publication: 'published' as const, result: '测验已发布，学生课程目录现在可见。' });
  return Object.freeze({
    courses: publishQuizActivityDraft(courses, action.courseId, action.unitId, action.activityId, { idempotencyKey: action.idempotencyKey, requestFingerprint, receipt }),
    receipt,
  });
}

export function publishQuizActivityDraft(
  courses: ReadonlyArray<ClassCourse>,
  courseId: string,
  unitId: string | null,
  activityId: string,
  publicationEvidence?: NonNullable<NonNullable<ClassActivity['quiz']>['publicationEvidence']>,
): ClassCourse[] {
  return updateClassActivity(courses, courseId, unitId, activityId, (activity) => {
    if (activity.type !== 'quiz' || activity.publication !== 'draft' || !activity.quiz) return activity;
    return { ...activity, publication: 'published', detail: `测验 · 已发布 · ${activity.quiz.questionCount} 题 · ${activity.quiz.totalScore} 分`, quiz: { ...activity.quiz, publicationEvidence } };
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
      activities: (course.activities ?? []).filter(({ publication }) => publication !== 'draft'),
      units: course.units
        .filter(({ status }) => status === 'published')
        .map((unit) => ({
          ...unit,
          activities: unit.activities.filter(({ publication }) => publication !== 'draft'),
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
