import { validateClassQuizQuestions, type ClassActivity, type ClassRecord } from '@domain/class/class';

const STORAGE_KEY = 'classin:class-workspace:v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

const APP_ROLES = new Set(['teacher', 'student-family']);
const MEMBER_ROLES = new Set(['headmaster', 'teacher', 'student-family']);
const ACTIVITY_TYPES = new Set(['lesson', 'homework', 'quiz', 'reading', 'exercise', 'livestream']);
const ACTIVITY_STATUSES = new Set(['completed', 'active', 'upcoming', 'pending']);
const QUESTION_TYPES = new Set(['single-choice', 'multiple-choice', 'judgement', 'fill-blank', 'short-answer', 'comprehensive']);
const QUESTION_DIFFICULTIES = new Set(['easy', 'relatively-easy', 'medium', 'relatively-hard', 'hard']);

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isDateString(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(new Date(value).getTime());
}

function hasOnlyRoleValues(value: unknown, valueGuard: (candidate: unknown) => boolean): boolean {
  return isRecord(value) && Object.entries(value).every(([role, candidate]) => APP_ROLES.has(role) && valueGuard(candidate));
}

function isQuizQuestion(value: unknown): boolean {
  return isRecord(value)
    && ['id', 'prompt', 'answer', 'explanation'].every((field) => isNonEmptyString(value[field]))
    && QUESTION_TYPES.has(String(value.type)) && QUESTION_DIFFICULTIES.has(String(value.difficulty))
    && typeof value.score === 'number' && value.score > 0
    && (value.options === undefined || isStringArray(value.options));
}

function isPublicationReceipt(value: unknown): boolean {
  if (!isRecord(value)
    || !['id', 'actionId', 'approvalId', 'idempotencyKey', 'activityId', 'actorId', 'objectVersion', 'result'].every((field) => isNonEmptyString(value[field]))
    || !isDateString(value.executedAt) || value.truthLabel !== '[模拟] ClassIn 测验发布回执') return false;
  if (value.status === 'success') return value.publication === 'published';
  return ['permission_denied', 'target_not_found', 'version_conflict', 'validation_failed', 'evidence_mismatch'].includes(String(value.status)) && value.publication === 'draft';
}

function isActivity(value: unknown): boolean {
  if (!isRecord(value) || !isNonEmptyString(value.id) || !isNonEmptyString(value.title) || typeof value.detail !== 'string'
    || !ACTIVITY_TYPES.has(String(value.type)) || !ACTIVITY_STATUSES.has(String(value.status))
    || (value.publication !== undefined && !['draft', 'published'].includes(String(value.publication)))
    || (value.scheduledAt !== undefined && !isDateString(value.scheduledAt))) return false;
  if (value.quiz === undefined) return true;
  if (value.publication !== 'draft' && value.publication !== 'published') return false;
  if (!isRecord(value.quiz)) return false;
  const quiz = value.quiz;
  if (!['version', 'paperArtifactId', 'paperArtifactVersion'].every((field) => isNonEmptyString(quiz[field])) || typeof quiz.description !== 'string' || typeof quiz.scoring !== 'string'
    || !Number.isInteger(quiz.questionCount) || Number(quiz.questionCount) < 1 || Number(quiz.questionCount) > 200 || typeof quiz.totalScore !== 'number' || quiz.totalScore <= 0
    || !['score', 'percentage', 'excellent-good', 'abcd', 'unscored'].includes(String(quiz.scoring))
    || !Number.isFinite(new Date(String(quiz.startAt)).getTime()) || !Number.isFinite(new Date(String(quiz.endAt)).getTime())
    || new Date(String(quiz.endAt)).getTime() <= new Date(String(quiz.startAt)).getTime()
    || (quiz.durationMinutes !== null && (!Number.isInteger(quiz.durationMinutes) || Number(quiz.durationMinutes) <= 0))
    || !Array.isArray(quiz.questions) || !quiz.questions.every(isQuizQuestion)) return false;
  if (quiz.questionCount !== quiz.questions.length || quiz.totalScore !== quiz.questions.reduce((sum, question) => sum + Number((question as Record<string, unknown>).score), 0)) return false;
  if (validateClassQuizQuestions(quiz.questions as NonNullable<NonNullable<ClassActivity['quiz']>['questions']>)) return false;
  if (quiz.publicationEvidence === undefined) return value.publication === 'draft';
  return isRecord(quiz.publicationEvidence)
    && typeof quiz.publicationEvidence.idempotencyKey === 'string'
    && typeof quiz.publicationEvidence.requestFingerprint === 'string'
    && isPublicationReceipt(quiz.publicationEvidence.receipt)
    && isRecord(quiz.publicationEvidence.receipt)
    && quiz.publicationEvidence.receipt.activityId === value.id
    && quiz.publicationEvidence.receipt.idempotencyKey === quiz.publicationEvidence.idempotencyKey
    && quiz.publicationEvidence.receipt.objectVersion === quiz.version
    && value.publication === 'published' && quiz.publicationEvidence.receipt.status === 'success';
}

function isCourse(value: unknown): boolean {
  return isRecord(value)
    && isNonEmptyString(value.id) && isNonEmptyString(value.name) && typeof value.description === 'string'
    && ['active', 'completed'].includes(String(value.status))
    && Array.isArray(value.units) && value.units.every((unit) => isRecord(unit)
      && isNonEmptyString(unit.id) && isNonEmptyString(unit.title) && typeof unit.description === 'string'
      && ['published', 'draft'].includes(String(unit.status))
      && (unit.sourceVersion === undefined || typeof unit.sourceVersion === 'string')
      && Array.isArray(unit.activities) && unit.activities.every(isActivity))
    && (value.activities === undefined || (Array.isArray(value.activities) && value.activities.every(isActivity)));
}

function isAnnouncement(value: unknown): boolean {
  return isRecord(value)
    && ['id', 'title', 'authorName'].every((field) => isNonEmptyString(value[field])) && typeof value.body === 'string' && isDateString(value.createdAt)
    && hasOnlyRoleValues(value.readByRole, (candidate) => typeof candidate === 'boolean')
    && isStringArray(value.confirmedMemberIds) && isStringArray(value.unconfirmedMemberIds);
}

function isMember(value: unknown): boolean {
  return isRecord(value)
    && ['id', 'name', 'relationship'].every((field) => isNonEmptyString(value[field])) && isDateString(value.joinedAt)
    && MEMBER_ROLES.has(String(value.role)) && ['free', 'trial', 'pro'].includes(String(value.plan))
    && (value.classNickname === undefined || typeof value.classNickname === 'string')
    && (value.leftAt === null || isDateString(value.leftAt))
    && (value.isCurrentUser === undefined || typeof value.isCurrentUser === 'boolean')
    && (value.hasBlockingLesson === undefined || typeof value.hasBlockingLesson === 'boolean');
}

function isSettings(value: unknown): boolean {
  return isRecord(value)
    && ['allowStudentInvite', 'allowViewAfterLeaveOrComplete', 'allowTeacherCreateLesson', 'allowStudentEditNickname'].every((field) => typeof value[field] === 'boolean')
    && typeof value.classIntro === 'string' && typeof value.coverColor === 'string';
}

function isClassRecord(value: unknown): value is ClassRecord {
  if (!isRecord(value)) return false;
  const nextActivityValid = value.nextActivity === undefined || (isRecord(value.nextActivity)
    && isNonEmptyString(value.nextActivity.title) && isDateString(value.nextActivity.startsAt) && typeof value.nextActivity.detail === 'string');
  return isNonEmptyString(value.id)
    && isNonEmptyString(value.name)
    && isDateString(value.updatedAt)
    && Array.isArray(value.visibleTo) && value.visibleTo.every((role) => APP_ROLES.has(String(role)))
    && hasOnlyRoleValues(value.roleByAppRole, (candidate) => MEMBER_ROLES.has(String(candidate)))
    && Number.isInteger(value.memberCount) && Number(value.memberCount) >= 0
    && hasOnlyRoleValues(value.pendingCountByRole, (candidate) => Number.isInteger(candidate) && Number(candidate) >= 0)
    && hasOnlyRoleValues(value.unreadCountByRole, (candidate) => Number.isInteger(candidate) && Number(candidate) >= 0)
    && ['green', 'blue', 'amber', 'ink'].includes(String(value.coverTone))
    && Array.isArray(value.courses) && value.courses.every(isCourse)
    && Array.isArray(value.announcements) && value.announcements.every(isAnnouncement)
    && Array.isArray(value.members) && value.members.every(isMember)
    && isSettings(value.settings)
    && (value.lastLessonEndedAt === undefined || isDateString(value.lastLessonEndedAt))
    && nextActivityValid;
}

export function loadClassWorkspaceSession(fallback: ReadonlyArray<ClassRecord>): ReadonlyArray<ClassRecord> {
  if (typeof window === 'undefined') return fallback;
  try {
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? 'null');
    return Array.isArray(parsed) && parsed.length > 0 && parsed.every(isClassRecord) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function saveClassWorkspaceSession(classes: ReadonlyArray<ClassRecord>): void {
  if (typeof window !== 'undefined') window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(classes));
}
