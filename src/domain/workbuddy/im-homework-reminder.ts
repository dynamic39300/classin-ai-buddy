import {
  isPublishedHomework,
  resolveHomeworkStatus,
  type Homework,
  type HomeworkStudent,
  type HomeworkSubmission,
} from '@domain/homework/homework';

export type HomeworkReminderFacts = Readonly<{
  classId: string;
  classLabel: string;
  homeworks: readonly Homework[];
  submissions: readonly HomeworkSubmission[];
  students: readonly HomeworkStudent[];
}>;

export type HomeworkReminderContextSnapshot = Readonly<{
  id: string;
  classId: string;
  classLabel: string;
  threadId: string;
  capturedAt: string;
  factVersion: string;
  truthLabel: '[模拟] ClassIn 作业与提交快照';
}>;

export type HomeworkReminderStudent = Readonly<{ id: string; name: string }>;

export type HomeworkReminderGroup = Readonly<{
  homeworkId: string;
  title: string;
  dueAt: string;
  students: readonly HomeworkReminderStudent[];
}>;

export type HomeworkReminderArtifactDraft = Readonly<{
  kind: 'homework-reminder';
  id: string;
  version: number;
  contextSnapshotId: string;
  originalGroups: readonly HomeworkReminderGroup[];
  groups: readonly HomeworkReminderGroup[];
  body: string;
  generatedAt: string;
  truthLabel: '[模拟] TeacherIn 作业催交草稿';
}>;

export type SendClassMessageProposedAction = Readonly<{
  id: string;
  kind: 'send-class-message';
  factSource: 'homework-submissions' | 'weekly-teaching-plan';
  runRef: string;
  status: 'proposed' | 'approved' | 'rejected' | 'expired';
  contextSnapshotId: string;
  draftRef: Readonly<{ id: string; version: number }>;
  target: Readonly<{ classId: string; threadId: string; label: string }>;
  actor: Readonly<{ teacherId: string; teacherName: string }>;
  body: string;
  expectedFactVersion: string;
  difference: string;
  impact: string;
  permission: 'allowed' | 'denied';
  risk: 'medium';
  reversible: false;
  expiresAt: string;
  idempotencyKey: string;
}>;

export type HomeworkReminderApproval = Readonly<{
  id: string;
  actionId: string;
  draftVersion: number;
  decision: 'approved' | 'rejected';
  decidedBy: string;
  decidedAt: string;
}>;

type ReminderReceiptBase = Readonly<{
  id: string;
  actionId: string;
  approvalId: string;
  idempotencyKey: string;
  executedAt: string;
  truthLabel: '[模拟] ClassIn 群消息执行回执';
}>;

export type HomeworkReminderExecutionReceipt =
  | ReminderReceiptBase & Readonly<{
    status: 'success';
    message: Readonly<{
      id: string;
      threadId: string;
      authorRole: 'teacher';
      authorName: string;
      body: string;
    }>;
    result: string;
  }>
  | ReminderReceiptBase & Readonly<{
    status: 'stale_context' | 'permission_denied' | 'recoverable_failure';
    result: string;
    recovery: 'refresh-and-reconfirm' | 'request-permission' | 'retry';
  }>;

export type HomeworkReminderPreparation =
  | Readonly<{
    kind: 'homework-reminder';
    status: 'empty';
    reason: 'no-active-homework' | 'all-submitted';
    contextSnapshot: HomeworkReminderContextSnapshot;
  }>
  | Readonly<{
    kind: 'homework-reminder';
    status: 'ready';
    contextSnapshot: HomeworkReminderContextSnapshot;
    draft: HomeworkReminderArtifactDraft;
    action: SendClassMessageProposedAction;
  }>;

export type HomeworkReminderFactSummary = Readonly<{
  activeHomeworkCount: number;
  activeHomeworkTitles: readonly string[];
  recipientStudentCount: number;
  unsubmittedAssignmentCount: number;
  reminderGroupCount: number;
}>;

export type PrepareHomeworkReminderInput = Readonly<{
  facts: HomeworkReminderFacts;
  threadId: string;
  teacherId: string;
  teacherName: string;
  now: Date;
}>;

function timestampVersion(values: readonly string[]): string {
  const normalized = [...values].sort().join('|');
  let hash = 2166136261;
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `facts-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function getHomeworkReminderFactVersion(facts: HomeworkReminderFacts): string {
  return timestampVersion([
    facts.classId,
    ...facts.homeworks.map((item) => `${item.id}:${item.updatedAt}:${item.publication.kind}:${item.startsAt ?? ''}:${item.dueAt ?? ''}:${item.recipientStudentIds.join(',')}:${item.endedAt ?? ''}`),
    ...facts.submissions.map((item) => `${item.id}:${item.homeworkId}:${item.studentId}:${item.status}:${item.updatedAt}`),
    ...facts.students.map((item) => `${item.id}:${item.name}:${item.classIds.join(',')}`),
  ]);
}

function formatDeadline(value: string): string {
  const date = new Date(value);
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function renderHomeworkReminderBody(groups: readonly HomeworkReminderGroup[]): string {
  if (groups.length === 0) return '';
  const groupCopy = groups.map((group) => (
    `【${group.title}】（${formatDeadline(group.dueAt)} 截止）\n${group.students.map(({ name }) => `@${name}`).join(' ')} 请按要求及时提交。`
  ));
  return `同学们好，以下作业尚未截止，请还未提交的同学及时完成：\n\n${groupCopy.join('\n\n')}\n\n如已完成，请忽略本提醒。`;
}

function isSubmitted(submission: HomeworkSubmission | undefined): boolean {
  return submission !== undefined && submission.status !== 'draft';
}

function buildGroups(facts: HomeworkReminderFacts, now: Date): readonly HomeworkReminderGroup[] {
  return facts.homeworks
    .filter(isPublishedHomework)
    .filter((homework) => homework.classId === facts.classId && resolveHomeworkStatus(homework, now) === 'active')
    .map((homework) => {
      const students = homework.recipientStudentIds.flatMap((studentId) => {
        const student = facts.students.find(({ id }) => id === studentId);
        if (!student || !student.classIds.includes(facts.classId)) return [];
        const submission = facts.submissions.find((item) => item.homeworkId === homework.id && item.studentId === studentId);
        return isSubmitted(submission) ? [] : [{ id: student.id, name: student.name }];
      });
      return Object.freeze({ homeworkId: homework.id, title: homework.title, dueAt: homework.dueAt, students: Object.freeze(students) });
    })
    .filter(({ students }) => students.length > 0);
}

export function summarizeHomeworkReminderFacts(facts: HomeworkReminderFacts, now: Date): HomeworkReminderFactSummary {
  const activeHomeworks = facts.homeworks
    .filter(isPublishedHomework)
    .filter((homework) => homework.classId === facts.classId && resolveHomeworkStatus(homework, now) === 'active');
  const groups = buildGroups(facts, now);
  const recipientStudentIds = new Set(activeHomeworks.flatMap(({ recipientStudentIds: ids }) => ids));
  return Object.freeze({
    activeHomeworkCount: activeHomeworks.length,
    activeHomeworkTitles: Object.freeze(activeHomeworks.map(({ title }) => title)),
    recipientStudentCount: recipientStudentIds.size,
    unsubmittedAssignmentCount: groups.reduce((total, group) => total + group.students.length, 0),
    reminderGroupCount: groups.length,
  });
}

function createAction(
  snapshot: HomeworkReminderContextSnapshot,
  draft: HomeworkReminderArtifactDraft,
  teacherId: string,
  teacherName: string,
): SendClassMessageProposedAction {
  return Object.freeze({
    id: `action-reminder-${snapshot.classId}-v${draft.version}`,
    kind: 'send-class-message',
    factSource: 'homework-submissions',
    runRef: `run-im-homework-reminder-${snapshot.classId}`,
    status: 'proposed',
    contextSnapshotId: snapshot.id,
    draftRef: Object.freeze({ id: draft.id, version: draft.version }),
    target: Object.freeze({ classId: snapshot.classId, threadId: snapshot.threadId, label: `${snapshot.classLabel}群聊` }),
    actor: Object.freeze({ teacherId, teacherName }),
    body: draft.body,
    expectedFactVersion: snapshot.factVersion,
    difference: '将在当前班级群新增 1 条按作业分组的催交消息',
    impact: '所有当前班级群成员可见；消息显示为教师本人发送',
    permission: 'allowed',
    risk: 'medium',
    reversible: false,
    expiresAt: new Date(new Date(draft.generatedAt).getTime() + 15 * 60 * 1000).toISOString(),
    idempotencyKey: `reminder:${snapshot.threadId}:${snapshot.factVersion}:v${draft.version}`,
  });
}

export function prepareHomeworkReminder(input: PrepareHomeworkReminderInput): HomeworkReminderPreparation {
  const factVersion = getHomeworkReminderFactVersion(input.facts);
  const now = input.now.toISOString();
  const snapshot: HomeworkReminderContextSnapshot = Object.freeze({
    id: `context-reminder-${input.facts.classId}-${factVersion}`,
    classId: input.facts.classId,
    classLabel: input.facts.classLabel,
    threadId: input.threadId,
    capturedAt: now,
    factVersion,
    truthLabel: '[模拟] ClassIn 作业与提交快照',
  });
  const { activeHomeworkCount } = summarizeHomeworkReminderFacts(input.facts, input.now);
  const groups = buildGroups(input.facts, input.now);
  if (groups.length === 0) {
    return Object.freeze({
      kind: 'homework-reminder',
      status: 'empty',
      reason: activeHomeworkCount === 0 ? 'no-active-homework' : 'all-submitted',
      contextSnapshot: snapshot,
    });
  }
  const draft: HomeworkReminderArtifactDraft = Object.freeze({
    kind: 'homework-reminder',
    id: `artifact-reminder-${input.facts.classId}`,
    version: 1,
    contextSnapshotId: snapshot.id,
    originalGroups: Object.freeze(groups),
    groups: Object.freeze(groups),
    body: renderHomeworkReminderBody(groups),
    generatedAt: now,
    truthLabel: '[模拟] TeacherIn 作业催交草稿',
  });
  return Object.freeze({
    kind: 'homework-reminder',
    status: 'ready',
    contextSnapshot: snapshot,
    draft,
    action: createAction(snapshot, draft, input.teacherId, input.teacherName),
  });
}

function groupScopeKey(groups: readonly HomeworkReminderGroup[]): string {
  return groups
    .map((group) => `${group.homeworkId}:${group.students.map((student) => student.id).join(',')}`)
    .join('|');
}

export function hasHomeworkReminderScopeChanges(draft: HomeworkReminderArtifactDraft): boolean {
  return groupScopeKey(draft.groups) !== groupScopeKey(draft.originalGroups);
}

export function reviseHomeworkReminder(
  preparation: Extract<HomeworkReminderPreparation, { status: 'ready' }>,
  revision: Readonly<{ groups?: readonly HomeworkReminderGroup[]; body?: string }>,
): Extract<HomeworkReminderPreparation, { status: 'ready' }> | null {
  const groups = revision.groups ?? preparation.draft.groups;
  if (groups.length === 0) return null;
  const draft = Object.freeze({
    ...preparation.draft,
    version: preparation.draft.version + 1,
    groups: Object.freeze(groups),
    body: revision.body ?? renderHomeworkReminderBody(groups),
  });
  return Object.freeze({
    kind: 'homework-reminder',
    status: 'ready',
    contextSnapshot: preparation.contextSnapshot,
    draft,
    action: createAction(
      preparation.contextSnapshot,
      draft,
      preparation.action.actor.teacherId,
      preparation.action.actor.teacherName,
    ),
  });
}

export function restoreHomeworkReminderScope(
  preparation: Extract<HomeworkReminderPreparation, { status: 'ready' }>,
): Extract<HomeworkReminderPreparation, { status: 'ready' }> {
  if (!hasHomeworkReminderScopeChanges(preparation.draft)) return preparation;
  return reviseHomeworkReminder(preparation, { groups: preparation.draft.originalGroups }) ?? preparation;
}

export function approveHomeworkReminder(
  action: SendClassMessageProposedAction,
  decidedBy: string,
  decidedAt: Date,
): Readonly<{ action: SendClassMessageProposedAction; approval: HomeworkReminderApproval }> | null {
  if (action.status !== 'proposed' || action.permission !== 'allowed' || decidedAt.getTime() >= new Date(action.expiresAt).getTime()) return null;
  const approval = Object.freeze({
    id: `${action.id}-approval`,
    actionId: action.id,
    draftVersion: action.draftRef.version,
    decision: 'approved' as const,
    decidedBy,
    decidedAt: decidedAt.toISOString(),
  });
  return Object.freeze({ action: Object.freeze({ ...action, status: 'approved' as const }), approval });
}
