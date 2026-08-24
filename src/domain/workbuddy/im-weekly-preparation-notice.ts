import type {
  HomeworkReminderApproval,
  HomeworkReminderExecutionReceipt,
  SendClassMessageProposedAction,
} from './im-homework-reminder';

export type WeeklyPreparationPlanItem = Readonly<{
  id: string;
  startsAt: string;
  topic: string;
  preparations: readonly string[];
}>;

export type WeeklyPreparationNoticeFacts = Readonly<{
  classId: string;
  classLabel: string;
  weekLabel: string;
  courseLabel: string;
  planItems: readonly WeeklyPreparationPlanItem[];
}>;

export type WeeklyPreparationNoticeContextSnapshot = Readonly<{
  id: string;
  classId: string;
  classLabel: string;
  threadId: string;
  capturedAt: string;
  factVersion: string;
  weekLabel: string;
  truthLabel: '[模拟] ClassIn 本周教学计划快照';
}>;

export type WeeklyPreparationNoticeArtifactDraft = Readonly<{
  kind: 'weekly-preparation-notice';
  id: string;
  version: number;
  contextSnapshotId: string;
  weekLabel: string;
  courseLabel: string;
  planItems: readonly WeeklyPreparationPlanItem[];
  body: string;
  generatedAt: string;
  truthLabel: '[模拟] WorkBuddy 课前准备通知草稿';
}>;

export type WeeklyPreparationNoticePreparation =
  | Readonly<{ kind: 'weekly-preparation-notice'; status: 'empty'; contextSnapshot: WeeklyPreparationNoticeContextSnapshot }>
  | Readonly<{
    kind: 'weekly-preparation-notice';
    status: 'ready';
    contextSnapshot: WeeklyPreparationNoticeContextSnapshot;
    draft: WeeklyPreparationNoticeArtifactDraft;
    action: SendClassMessageProposedAction;
  }>;

export type WeeklyPreparationNoticeApproval = HomeworkReminderApproval;
export type WeeklyPreparationNoticeExecutionReceipt = HomeworkReminderExecutionReceipt;

function timestampVersion(values: readonly string[]): string {
  const normalized = [...values].sort().join('|');
  let hash = 2166136261;
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `weekly-plan-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function getWeeklyPreparationNoticeFactVersion(facts: WeeklyPreparationNoticeFacts): string {
  return timestampVersion([
    facts.classId,
    facts.weekLabel,
    facts.courseLabel,
    ...facts.planItems.map((item) => `${item.id}:${item.startsAt}:${item.topic}:${item.preparations.join(',')}`),
  ]);
}

function formatSchedule(value: string): string {
  return new Date(value).toLocaleString('zh-CN', {
    month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export function renderWeeklyPreparationNoticeBody(facts: Pick<WeeklyPreparationNoticeFacts, 'weekLabel' | 'planItems'>): string {
  const sections = facts.planItems.map((item) => (
    `【${formatSchedule(item.startsAt)} · ${item.topic}】\n${item.preparations.map((text, index) => `${index + 1}. ${text}`).join('\n')}`
  ));
  return `同学们好，根据${facts.weekLabel}教学计划，请大家提前做好以下准备：\n\n${sections.join('\n\n')}\n\n请按对应课次提前完成，我们会在课堂上直接从这些内容开始。`;
}

function createAction(
  snapshot: WeeklyPreparationNoticeContextSnapshot,
  draft: WeeklyPreparationNoticeArtifactDraft,
  teacherId: string,
  teacherName: string,
): SendClassMessageProposedAction {
  return Object.freeze({
    id: `action-weekly-preparation-${snapshot.classId}-v${draft.version}`,
    kind: 'send-class-message',
    factSource: 'weekly-teaching-plan',
    runRef: `run-im-weekly-preparation-notice-${snapshot.classId}`,
    status: 'proposed',
    contextSnapshotId: snapshot.id,
    draftRef: Object.freeze({ id: draft.id, version: draft.version }),
    target: Object.freeze({ classId: snapshot.classId, threadId: snapshot.threadId, label: `${snapshot.classLabel}群聊` }),
    actor: Object.freeze({ teacherId, teacherName }),
    body: draft.body,
    expectedFactVersion: snapshot.factVersion,
    difference: '将在当前班级群新增 1 条本周课前准备通知',
    impact: '所有当前班级群成员可见；消息显示为教师本人发送',
    permission: 'allowed',
    risk: 'medium',
    reversible: false,
    expiresAt: new Date(new Date(draft.generatedAt).getTime() + 15 * 60 * 1000).toISOString(),
    idempotencyKey: `weekly-preparation:${snapshot.threadId}:${snapshot.factVersion}:v${draft.version}`,
  });
}

export function prepareWeeklyPreparationNotice(input: Readonly<{
  facts: WeeklyPreparationNoticeFacts;
  threadId: string;
  teacherId: string;
  teacherName: string;
  now: Date;
}>): WeeklyPreparationNoticePreparation {
  const factVersion = getWeeklyPreparationNoticeFactVersion(input.facts);
  const capturedAt = input.now.toISOString();
  const snapshot: WeeklyPreparationNoticeContextSnapshot = Object.freeze({
    id: `context-weekly-preparation-${input.facts.classId}-${factVersion}`,
    classId: input.facts.classId,
    classLabel: input.facts.classLabel,
    threadId: input.threadId,
    capturedAt,
    factVersion,
    weekLabel: input.facts.weekLabel,
    truthLabel: '[模拟] ClassIn 本周教学计划快照',
  });
  if (input.facts.planItems.length === 0) return Object.freeze({ kind: 'weekly-preparation-notice', status: 'empty', contextSnapshot: snapshot });
  const draft: WeeklyPreparationNoticeArtifactDraft = Object.freeze({
    kind: 'weekly-preparation-notice',
    id: `artifact-weekly-preparation-${input.facts.classId}`,
    version: 1,
    contextSnapshotId: snapshot.id,
    weekLabel: input.facts.weekLabel,
    courseLabel: input.facts.courseLabel,
    planItems: Object.freeze(input.facts.planItems),
    body: renderWeeklyPreparationNoticeBody(input.facts),
    generatedAt: capturedAt,
    truthLabel: '[模拟] WorkBuddy 课前准备通知草稿',
  });
  return Object.freeze({
    kind: 'weekly-preparation-notice',
    status: 'ready',
    contextSnapshot: snapshot,
    draft,
    action: createAction(snapshot, draft, input.teacherId, input.teacherName),
  });
}

export function reviseWeeklyPreparationNotice(
  preparation: Extract<WeeklyPreparationNoticePreparation, { status: 'ready' }>,
  body: string,
): Extract<WeeklyPreparationNoticePreparation, { status: 'ready' }> {
  const draft = Object.freeze({ ...preparation.draft, version: preparation.draft.version + 1, body: body.trim() });
  return Object.freeze({
    ...preparation,
    draft,
    action: createAction(preparation.contextSnapshot, draft, preparation.action.actor.teacherId, preparation.action.actor.teacherName),
  });
}
