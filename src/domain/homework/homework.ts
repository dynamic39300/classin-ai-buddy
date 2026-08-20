export type HomeworkStatus = 'draft' | 'scheduled' | 'active' | 'ended';
export type SubmissionStatus = 'draft' | 'submitted' | 'returned' | 'resubmitted' | 'graded';
export type TeacherSubmissionGroup = 'not_submitted' | 'pending' | 'returned' | 'graded';
export type HomeworkEditorMode = 'first' | 'late' | 'modify' | 'correction';

export type HomeworkEntrySource =
  | 'teacher_home'
  | 'teacher_schedule'
  | 'task_center'
  | 'class_unit'
  | 'student_home'
  | 'student_schedule'
  | 'notification'
  | 'growth';

type HomeworkBase = {
  id: string;
  activityId: string;
  teacherId: string;
  title: string;
  instructions: string;
  allowLateSubmission: boolean;
  maxScore: 100;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HomeworkDraft = HomeworkBase & {
  publication: { kind: 'draft' };
  classId: string | null;
  courseId: string | null;
  unitId: string | null;
  recipientStudentIds: readonly [];
  startsAt: string | null;
  dueAt: string | null;
};

export type PublishedHomework = HomeworkBase & {
  publication: { kind: 'published'; publishedAt: string };
  classId: string;
  courseId: string;
  unitId: string | null;
  recipientStudentIds: readonly string[];
  startsAt: string;
  dueAt: string;
};

export type Homework = HomeworkDraft | PublishedHomework;

export type GradedFeedback = {
  decision: 'graded';
  score: number;
  comment: string;
  reviewedAt: string;
};

export type ReturnedFeedback = {
  decision: 'returned';
  score: null;
  comment: string;
  reviewedAt: string;
};

export type HomeworkFeedback = GradedFeedback | ReturnedFeedback;

export type HomeworkSubmission = {
  id: string;
  homeworkId: string;
  studentId: string;
  answerText: string;
  status: SubmissionStatus;
  submittedAt: string | null;
  draftSavedAt: string | null;
  isLate: boolean;
  revision: number;
  feedback: HomeworkFeedback | null;
  updatedAt: string;
};

export type HomeworkStudent = {
  id: string;
  name: string;
  avatarInitial: string;
  classIds: readonly string[];
};

export type HomeworkUnitOption = { id: string; name: string };
export type HomeworkCourseOption = {
  id: string;
  name: string;
  units: readonly HomeworkUnitOption[];
};
export type HomeworkClassOption = {
  id: string;
  name: string;
  courses: readonly HomeworkCourseOption[];
};

export type HomeworkFormValues = {
  title: string;
  instructions: string;
  startsAt: string | null;
  dueAt: string | null;
  classId: string | null;
  courseId: string | null;
  unitId: string | null;
  allowLateSubmission: boolean;
};

export type HomeworkFormErrors = Partial<Record<keyof HomeworkFormValues, string>>;

export type HomeworkError = {
  code:
    | 'not_found'
    | 'invalid_form'
    | 'invalid_transition'
    | 'submission_closed'
    | 'late_submission_disabled'
    | 'already_reviewed';
  message: string;
  field?: keyof HomeworkFormValues | 'answerText' | 'score' | 'comment';
};

export type CommandResult<T = undefined> =
  | { ok: true; value: T }
  | { ok: false; error: HomeworkError };

export type HomeworkStatistics = {
  totalCount: number;
  submittedCount: number;
  submissionRate: number;
  pendingCount: number;
  returnedCount: number;
  gradedCount: number;
  highestScore: number | null;
  averageScore: number | null;
  excellentCount: null;
};

export const EMPTY_HOMEWORK_FORM: HomeworkFormValues = {
  title: '',
  instructions: '',
  startsAt: null,
  dueAt: null,
  classId: null,
  courseId: null,
  unitId: null,
  allowLateSubmission: false,
};

export function homeworkToFormValues(homework: Homework): HomeworkFormValues {
  return {
    title: homework.title,
    instructions: homework.instructions,
    startsAt: homework.startsAt,
    dueAt: homework.dueAt,
    classId: homework.classId,
    courseId: homework.courseId,
    unitId: homework.unitId,
    allowLateSubmission: homework.allowLateSubmission,
  };
}

export function isPublishedHomework(homework: Homework): homework is PublishedHomework {
  return homework.publication.kind === 'published';
}

export function resolveHomeworkStatus(homework: Homework, now: Date): HomeworkStatus {
  if (!isPublishedHomework(homework)) return 'draft';
  const current = now.getTime();
  if (current < new Date(homework.startsAt).getTime()) return 'scheduled';
  if (homework.endedAt !== null || current >= new Date(homework.dueAt).getTime()) return 'ended';
  return 'active';
}

export function validateHomeworkForm(values: HomeworkFormValues): HomeworkFormErrors {
  const errors: HomeworkFormErrors = {};
  const startsAt = values.startsAt;
  const dueAt = values.dueAt;
  if (values.title.trim().length === 0) errors.title = '请输入作业标题';
  if (values.instructions.trim().length === 0) errors.instructions = '请输入作业要求';
  if (startsAt === null || Number.isNaN(new Date(startsAt).getTime())) {
    errors.startsAt = '请选择有效的开始时间';
  }
  if (dueAt === null || Number.isNaN(new Date(dueAt).getTime())) {
    errors.dueAt = '请选择有效的截止时间';
  }
  if (
    startsAt !== null &&
    dueAt !== null &&
    !Number.isNaN(new Date(startsAt).getTime()) &&
    !Number.isNaN(new Date(dueAt).getTime()) &&
    new Date(startsAt).getTime() >= new Date(dueAt).getTime()
  ) {
    errors.dueAt = '截止时间必须晚于开始时间';
  }
  if (values.classId === null) errors.classId = '请选择接收班级';
  if (values.courseId === null) errors.courseId = '请选择课程';
  return errors;
}

export function validateAnswer(answerText: string): HomeworkError | null {
  return answerText.trim().length === 0
    ? { code: 'invalid_form', message: '请填写作业内容', field: 'answerText' }
    : null;
}

export function validateScore(score: number): HomeworkError | null {
  return Number.isInteger(score) && score >= 0 && score <= 100
    ? null
    : { code: 'invalid_form', message: '请输入 0-100 的整数', field: 'score' };
}

export function validateReturnComment(comment: string): HomeworkError | null {
  return comment.trim().length === 0
    ? { code: 'invalid_form', message: '请填写明确的订正要求', field: 'comment' }
    : null;
}

function firstFormError(errors: HomeworkFormErrors): HomeworkError {
  const field = (Object.keys(errors) as Array<keyof HomeworkFormValues>)[0];
  return {
    code: 'invalid_form',
    message: field ? errors[field] ?? '请先完善必填信息' : '请先完善必填信息',
    field,
  };
}

export function saveHomeworkDraft(
  values: HomeworkFormValues,
  id: string,
  teacherId: string,
  now: Date,
  existing?: Homework,
): HomeworkDraft {
  const timestamp = now.toISOString();
  return {
    id,
    activityId: existing?.activityId ?? `activity-${id}`,
    teacherId,
    title: values.title.trim(),
    instructions: values.instructions.trim(),
    allowLateSubmission: values.allowLateSubmission,
    maxScore: 100,
    endedAt: null,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    publication: { kind: 'draft' },
    classId: values.classId,
    courseId: values.courseId,
    unitId: values.unitId,
    recipientStudentIds: [],
    startsAt: values.startsAt,
    dueAt: values.dueAt,
  };
}

export function publishHomework(
  values: HomeworkFormValues,
  id: string,
  teacherId: string,
  recipientStudentIds: readonly string[],
  now: Date,
  existing?: Homework,
): CommandResult<PublishedHomework> {
  const errors = validateHomeworkForm(values);
  if (Object.keys(errors).length > 0) return { ok: false, error: firstFormError(errors) };
  if (values.classId === null || values.courseId === null || values.startsAt === null || values.dueAt === null) {
    return { ok: false, error: { code: 'invalid_form', message: '请先完善必填信息' } };
  }
  const timestamp = now.toISOString();
  return {
    ok: true,
    value: {
      id,
      activityId: existing?.activityId ?? `activity-${id}`,
      teacherId,
      title: values.title.trim(),
      instructions: values.instructions.trim(),
      allowLateSubmission: values.allowLateSubmission,
      maxScore: 100,
      endedAt: null,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
      publication: { kind: 'published', publishedAt: timestamp },
      classId: values.classId,
      courseId: values.courseId,
      unitId: values.unitId,
      recipientStudentIds,
      startsAt: values.startsAt,
      dueAt: values.dueAt,
    },
  };
}

export function getSubmissionGroup(submission?: HomeworkSubmission): TeacherSubmissionGroup {
  if (submission === undefined || submission.status === 'draft') return 'not_submitted';
  if (submission.status === 'returned') return 'returned';
  if (submission.status === 'graded') return 'graded';
  return 'pending';
}

export function groupSubmissions(
  homework: Homework,
  submissions: readonly HomeworkSubmission[],
): Record<TeacherSubmissionGroup, readonly string[]> {
  const recipients = homework.publication.kind === 'published' ? homework.recipientStudentIds : [];
  const byStudent = new Map(submissions.map((submission) => [submission.studentId, submission]));
  const groups: Record<TeacherSubmissionGroup, string[]> = {
    not_submitted: [], pending: [], returned: [], graded: [],
  };
  for (const studentId of recipients) groups[getSubmissionGroup(byStudent.get(studentId))].push(studentId);
  return groups;
}

export function calculateHomeworkStatistics(
  homework: Homework,
  submissions: readonly HomeworkSubmission[],
): HomeworkStatistics {
  const groups = groupSubmissions(homework, submissions);
  const scores = submissions
    .filter((submission) => submission.status === 'graded' && submission.feedback?.decision === 'graded')
    .map((submission) => submission.feedback?.score)
    .filter((score): score is number => score !== undefined && score !== null);
  const totalCount = homework.publication.kind === 'published' ? homework.recipientStudentIds.length : 0;
  const submittedCount = groups.pending.length + groups.returned.length + groups.graded.length;
  return {
    totalCount,
    submittedCount,
    submissionRate: totalCount === 0 ? 0 : Math.round((submittedCount / totalCount) * 100),
    pendingCount: groups.pending.length,
    returnedCount: groups.returned.length,
    gradedCount: groups.graded.length,
    highestScore: scores.length === 0 ? null : Math.max(...scores),
    averageScore: scores.length === 0
      ? null
      : Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10,
    excellentCount: null,
  };
}

export function saveAnswerDraft(
  homework: Homework,
  studentId: string,
  answerText: string,
  now: Date,
  existing?: HomeworkSubmission,
): CommandResult<HomeworkSubmission> {
  if (!isPublishedHomework(homework)) {
    return { ok: false, error: { code: 'not_found', message: '未找到该作业' } };
  }
  if (!homework.recipientStudentIds.includes(studentId)) {
    return { ok: false, error: { code: 'not_found', message: '当前学生无权访问该作业' } };
  }
  if (existing?.status === 'graded') {
    return { ok: false, error: { code: 'already_reviewed', message: '该作业已批阅，不能修改' } };
  }
  const timestamp = now.toISOString();
  return {
    ok: true,
    value: {
      id: existing?.id ?? `submission-${homework.id}-${studentId}`,
      homeworkId: homework.id,
      studentId,
      answerText,
      status: existing?.status === 'returned' ? 'returned' : 'draft',
      submittedAt: existing?.submittedAt ?? null,
      draftSavedAt: timestamp,
      isLate: existing?.isLate ?? false,
      revision: existing?.revision ?? 0,
      feedback: existing?.feedback ?? null,
      updatedAt: timestamp,
    },
  };
}

export function submitHomeworkAnswer(
  homework: Homework,
  studentId: string,
  answerText: string,
  mode: HomeworkEditorMode,
  now: Date,
  existing?: HomeworkSubmission,
): CommandResult<HomeworkSubmission> {
  const answerError = validateAnswer(answerText);
  if (answerError !== null) return { ok: false, error: answerError };
  if (!isPublishedHomework(homework)) {
    return { ok: false, error: { code: 'not_found', message: '未找到该作业' } };
  }
  if (!homework.recipientStudentIds.includes(studentId)) {
    return { ok: false, error: { code: 'not_found', message: '当前学生无权访问该作业' } };
  }
  const status = resolveHomeworkStatus(homework, now);
  const first = mode === 'first' && (existing === undefined || existing.status === 'draft');
  const late = mode === 'late' && (existing === undefined || existing.status === 'draft');
  const modify = mode === 'modify' && (existing?.status === 'submitted' || existing?.status === 'resubmitted');
  const correction = mode === 'correction' && existing?.status === 'returned';

  if (late && (!homework.allowLateSubmission || status !== 'ended')) {
    return {
      ok: false,
      error: homework.allowLateSubmission
        ? { code: 'submission_closed', message: '当前不在补交时间内' }
        : { code: 'late_submission_disabled', message: '该作业不允许补交' },
    };
  }
  if (first && status !== 'active') {
    return { ok: false, error: { code: 'submission_closed', message: '当前不在作业提交时间内' } };
  }
  if (!first && !late && !modify && !correction) {
    return {
      ok: false,
      error: existing?.status === 'graded'
        ? { code: 'already_reviewed', message: '该作业已批阅，不能修改' }
        : { code: 'invalid_transition', message: '当前状态不能提交' },
    };
  }

  const timestamp = now.toISOString();
  return {
    ok: true,
    value: {
      id: existing?.id ?? `submission-${homework.id}-${studentId}`,
      homeworkId: homework.id,
      studentId,
      answerText: answerText.trim(),
      status: correction ? 'resubmitted' : 'submitted',
      submittedAt: timestamp,
      draftSavedAt: existing?.draftSavedAt ?? null,
      isLate: late || existing?.isLate === true,
      revision: modify || correction ? (existing?.revision ?? 0) + 1 : 1,
      feedback: correction ? existing?.feedback ?? null : null,
      updatedAt: timestamp,
    },
  };
}

export function gradeHomeworkSubmission(
  submission: HomeworkSubmission,
  score: number,
  comment: string,
  now: Date,
): CommandResult<HomeworkSubmission> {
  const scoreError = validateScore(score);
  if (scoreError !== null) return { ok: false, error: scoreError };
  if (submission.status !== 'submitted' && submission.status !== 'resubmitted') {
    return { ok: false, error: { code: 'already_reviewed', message: '该作业已处理' } };
  }
  const timestamp = now.toISOString();
  return {
    ok: true,
    value: {
      ...submission,
      status: 'graded',
      feedback: { decision: 'graded', score, comment: comment.trim(), reviewedAt: timestamp },
      updatedAt: timestamp,
    },
  };
}

export function returnHomeworkSubmission(
  submission: HomeworkSubmission,
  comment: string,
  now: Date,
): CommandResult<HomeworkSubmission> {
  const commentError = validateReturnComment(comment);
  if (commentError !== null) return { ok: false, error: commentError };
  if (submission.status !== 'submitted' && submission.status !== 'resubmitted') {
    return { ok: false, error: { code: 'already_reviewed', message: '该作业已处理' } };
  }
  const timestamp = now.toISOString();
  return {
    ok: true,
    value: {
      ...submission,
      status: 'returned',
      feedback: { decision: 'returned', score: null, comment: comment.trim(), reviewedAt: timestamp },
      updatedAt: timestamp,
    },
  };
}

export type StudentHomeworkAction =
  | { kind: 'edit'; mode: HomeworkEditorMode; label: string }
  | { kind: 'submission'; label: string }
  | { kind: 'result'; label: string }
  | { kind: 'disabled'; label: string };

export function resolveStudentHomeworkAction(
  homework: Homework,
  submission: HomeworkSubmission | undefined,
  now: Date,
): StudentHomeworkAction {
  if (submission?.status === 'graded') return { kind: 'result', label: '查看批阅结果' };
  if (submission?.status === 'returned') return { kind: 'edit', mode: 'correction', label: '订正并重新提交' };
  if (submission?.status === 'submitted' || submission?.status === 'resubmitted') {
    return { kind: 'submission', label: '查看我的提交' };
  }
  const status = resolveHomeworkStatus(homework, now);
  if (status === 'active') return { kind: 'edit', mode: 'first', label: '开始作答' };
  if (status === 'ended' && homework.publication.kind === 'published' && homework.allowLateSubmission) {
    return { kind: 'edit', mode: 'late', label: '补交作业' };
  }
  if (status === 'scheduled') return { kind: 'disabled', label: '尚未开始' };
  return { kind: 'disabled', label: '已截止' };
}

export function canStudentAccessHomework(homework: Homework, studentId: string): boolean {
  return isPublishedHomework(homework) && homework.recipientStudentIds.includes(studentId);
}
