import {
  ClassAgentRecoverableError,
  type ClassAgentConversationAdapter,
} from '@contracts/class-agent/class-agent-conversation';
import type { ClassAgentDefinition, ClassAgentReplyRequest } from '@domain/class-agent/class-agent';
import { GuidedTutoringModule } from '@domain/class-agent/guided-tutoring';

export type MockClassAgentConversationScenario = 'success' | 'recoverable-failure' | 'recoverable-failure-once';

type MockClassAgentConversationAdapterOptions = Readonly<{
  definitions: readonly ClassAgentDefinition[];
  delay?: (milliseconds: number) => Promise<void>;
  delayMs?: number;
  now?: () => string;
}>;

export class MockClassAgentConversationAdapter implements ClassAgentConversationAdapter {
  private scenario: MockClassAgentConversationScenario = 'success';
  private hasFailedOnce = false;

  constructor(private readonly options: MockClassAgentConversationAdapterOptions) {}

  setScenario(scenario: MockClassAgentConversationScenario) {
    this.scenario = scenario;
    this.hasFailedOnce = false;
  }

  async reply(request: ClassAgentReplyRequest) {
    await (this.options.delay ?? ((milliseconds) => new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds))))(
      this.options.delayMs ?? 1_800,
    );
    if (this.scenario === 'recoverable-failure'
      || (this.scenario === 'recoverable-failure-once' && !this.hasFailedOnce)) {
      this.hasFailedOnce = true;
      throw new ClassAgentRecoverableError('班级 Agent 暂时没有完成回复，请重试。');
    }

    const definition = this.options.definitions.find(({ id }) => id === request.agentId);
    if (!definition) throw new ClassAgentRecoverableError('当前会话的班级 Agent 配置不可用。');

    const channelLead = request.channel === 'public-class'
      ? `@${request.requesterName} `
      : '';
    const answerByCapability: Record<string, string> = {
      'explain-physics-reasoning': GuidedTutoringModule.projectReply(request.channel),
      'homework-correction-guidance': '先把原答案与条件逐项对照，标出“研究对象、正方向、初末状态”三处证据，再只修改发生偏差的步骤。订正时保留原错误旁注，方便复盘。',
      'experiment-inquiry-guidance': '先明确自变量、因变量和需要保持不变的条件，再设计至少三组可比较数据。记录测量误差来源后，再判断结论是否由数据充分支持。',
      'learning-plan-guidance': '可以按“概念复习—典型题—错题复盘”拆成三个 20 分钟单元，每个单元只设一个可检查结果，完成后再决定是否进入下一步。',
    };
    const answer = answerByCapability[definition.capabilityIds[0] ?? '']
      ?? '我会在当前班级已授权范围内，根据你的问题给出可检查的步骤建议。';
    return {
      id: `class-agent-reply-${request.id}`,
      requestId: request.id,
      threadId: request.threadId,
      agentId: definition.id,
      agentName: definition.name,
      channel: request.channel,
      recipientRole: request.requesterRole,
      body: `${channelLead}${answer}`,
      sentAt: this.options.now?.() ?? '2026-08-08T14:15:02+08:00',
      visibilityLabel: request.visibilityLabel,
      truthLabel: request.truthLabel,
    } as const;
  }
}
