import type {
  ClassInHomeworkReminderAdapter,
  HomeworkReminderAdapterScenario,
  HomeworkReminderAdapterScenarioController,
  HomeworkReminderQuery,
} from '@contracts/workbuddy/im-homework-reminder';
import {
  getHomeworkReminderFactVersion,
  type HomeworkReminderApproval,
  type HomeworkReminderExecutionReceipt,
  type HomeworkReminderFacts,
  type SendClassMessageProposedAction,
} from '@domain/workbuddy/im-homework-reminder';
import { getWeeklyPreparationNoticeFactVersion } from '@domain/workbuddy/im-weekly-preparation-notice';
import { createWeeklyPreparationNoticeFacts } from '@mocks/scenarios/workbuddy-im-weekly-plan';

type AdapterDependencies = Readonly<{
  readSnapshot: (query: HomeworkReminderQuery) => HomeworkReminderFacts;
  appendTeacherMessage: (message: Readonly<{
    id: string;
    threadId: string;
    authorName: string;
    body: string;
    sentAt: string;
  }>) => void;
  readWeeklyPreparationSnapshot?: (query: HomeworkReminderQuery) => ReturnType<typeof createWeeklyPreparationNoticeFacts>;
  executedAt?: string;
}>;

export class MockWorkBuddyImHomeworkReminderAdapter
implements ClassInHomeworkReminderAdapter, HomeworkReminderAdapterScenarioController {
  private scenario: HomeworkReminderAdapterScenario = 'success';
  private readonly receipts = new Map<string, HomeworkReminderExecutionReceipt>();
  private readonly attempts = new Map<string, number>();

  constructor(private readonly dependencies: AdapterDependencies) {}

  getScenario() {
    return this.scenario;
  }

  setScenario(scenario: HomeworkReminderAdapterScenario) {
    this.scenario = scenario;
    this.receipts.clear();
    this.attempts.clear();
  }

  async readFacts(query: HomeworkReminderQuery): Promise<HomeworkReminderFacts> {
    await Promise.resolve();
    if (this.scenario === 'read_failure') throw new Error('暂时无法读取作业与提交状态');
    return this.dependencies.readSnapshot(query);
  }

  async readWeeklyPreparationFacts(query: HomeworkReminderQuery) {
    await Promise.resolve();
    if (this.scenario === 'read_failure') throw new Error('暂时无法读取本周教学计划');
    return this.dependencies.readWeeklyPreparationSnapshot?.(query)
      ?? createWeeklyPreparationNoticeFacts(query.classId, query.classLabel);
  }

  async execute(
    action: SendClassMessageProposedAction,
    approval: HomeworkReminderApproval,
  ): Promise<HomeworkReminderExecutionReceipt> {
    await Promise.resolve();
    const existing = this.receipts.get(action.idempotencyKey);
    if (existing) return existing;
    if (
      action.status !== 'approved'
      || approval.decision !== 'approved'
      || approval.actionId !== action.id
      || approval.draftVersion !== action.draftRef.version
      || approval.decidedBy !== action.actor.teacherId
    ) throw new Error('发送请求缺少与当前草稿匹配的教师审批');

    const executedAt = this.dependencies.executedAt ?? '2026-08-09T10:02:00+08:00';
    const attempt = (this.attempts.get(action.idempotencyKey) ?? 0) + 1;
    const base = {
      id: `receipt-${action.id}-attempt-${attempt}`,
      actionId: action.id,
      approvalId: approval.id,
      idempotencyKey: action.idempotencyKey,
      executedAt,
      truthLabel: '[模拟] ClassIn 群消息执行回执' as const,
    };
    if (action.permission !== 'allowed' || this.scenario === 'permission_denied') {
      return Object.freeze({ ...base, status: 'permission_denied', result: '当前教师没有向目标班级群发送消息的权限。', recovery: 'request-permission' });
    }
    const query = { classId: action.target.classId, classLabel: action.target.label.replace(/群聊$/, '') };
    const latestFactVersion = action.factSource === 'weekly-teaching-plan'
      ? getWeeklyPreparationNoticeFactVersion(this.dependencies.readWeeklyPreparationSnapshot?.(query) ?? createWeeklyPreparationNoticeFacts(query.classId, query.classLabel))
      : getHomeworkReminderFactVersion(this.dependencies.readSnapshot(query));
    if (this.scenario === 'stale_context' || latestFactVersion !== action.expectedFactVersion) {
      return Object.freeze({
        ...base,
        status: 'stale_context',
        result: action.factSource === 'weekly-teaching-plan'
          ? '本周教学计划已经变化，请刷新后重新确认。'
          : '作业或提交状态已经变化，请刷新后重新确认。',
        recovery: 'refresh-and-reconfirm',
      });
    }
    if (this.scenario === 'recoverable_failure' && (this.attempts.get(action.idempotencyKey) ?? 0) === 0) {
      this.attempts.set(action.idempotencyKey, 1);
      return Object.freeze({ ...base, status: 'recoverable_failure', result: '消息服务暂时不可用，尚未产生群消息。', recovery: 'retry' });
    }

    const messageId = `${action.factSource === 'weekly-teaching-plan' ? 'workbuddy-weekly-preparation' : 'workbuddy-reminder'}-${action.target.classId}-v${action.draftRef.version}`;
    this.dependencies.appendTeacherMessage({
      id: messageId,
      threadId: action.target.threadId,
      authorName: action.actor.teacherName,
      body: action.body,
      sentAt: executedAt,
    });
    const receipt = Object.freeze({
      ...base,
      status: 'success' as const,
      message: Object.freeze({
        id: messageId,
        threadId: action.target.threadId,
        authorRole: 'teacher' as const,
        authorName: action.actor.teacherName,
        body: action.body,
      }),
      result: '已由教师本人向当前班级群发送 1 条消息',
    });
    this.receipts.set(action.idempotencyKey, receipt);
    return receipt;
  }
}
