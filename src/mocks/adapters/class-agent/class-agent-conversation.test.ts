import { describe, expect, it } from 'vitest';
import { ClassAgentRecoverableError } from '@contracts/class-agent/class-agent-conversation';
import type { ClassAgentReplyRequest } from '@domain/class-agent/class-agent';
import { CLASS_AGENT_DEFINITIONS, PHYSICS_CLASS_AGENT } from '@mocks/scenarios/class-agent';
import { MockClassAgentConversationAdapter } from './class-agent-conversation';

const request: ClassAgentReplyRequest = {
  id: 'request-1',
  threadId: 'class-physics-3',
  agentId: PHYSICS_CLASS_AGENT.id,
  channel: 'public-class',
  requesterRole: 'student-family',
  requesterName: '李明',
  body: '@班级 Agent 第 5 题方向怎么判断？',
  recentMessages: [],
  visibilityLabel: '当前班级群成员可见',
  truthLabel: 'SIMULATED',
};

describe('mock class agent conversation adapter', () => {
  it('returns a stable agent identity and simulated reply shape', async () => {
    const adapter = new MockClassAgentConversationAdapter({
      definitions: CLASS_AGENT_DEFINITIONS,
      delay: async () => undefined,
    });
    await expect(adapter.reply(request)).resolves.toMatchObject({
      agentId: PHYSICS_CLASS_AGENT.id,
      agentName: PHYSICS_CLASS_AGENT.name,
      channel: 'public-class',
      recipientRole: 'student-family',
      truthLabel: 'SIMULATED',
      visibilityLabel: '当前班级群成员可见',
    });
  });

  it('exposes a recoverable failure without fabricating a reply', async () => {
    const adapter = new MockClassAgentConversationAdapter({
      definitions: CLASS_AGENT_DEFINITIONS,
      delay: async () => undefined,
    });
    adapter.setScenario('recoverable-failure');
    await expect(adapter.reply(request)).rejects.toBeInstanceOf(ClassAgentRecoverableError);
  });

  it('resets one-shot failure state when the scenario is selected again', async () => {
    const adapter = new MockClassAgentConversationAdapter({
      definitions: CLASS_AGENT_DEFINITIONS,
      delay: async () => undefined,
    });
    adapter.setScenario('recoverable-failure-once');
    await expect(adapter.reply(request)).rejects.toBeInstanceOf(ClassAgentRecoverableError);
    await expect(adapter.reply(request)).resolves.toMatchObject({ agentId: PHYSICS_CLASS_AGENT.id });

    adapter.setScenario('recoverable-failure-once');
    await expect(adapter.reply(request)).rejects.toBeInstanceOf(ClassAgentRecoverableError);
  });
});
