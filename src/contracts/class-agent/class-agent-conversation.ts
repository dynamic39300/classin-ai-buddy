import type { ClassAgentReply, ClassAgentReplyRequest } from '@domain/class-agent/class-agent';

export class ClassAgentRecoverableError extends Error {
  readonly code = 'CLASS_AGENT_RECOVERABLE_FAILURE';
}

export interface ClassAgentConversationAdapter {
  reply(request: ClassAgentReplyRequest): Promise<ClassAgentReply>;
}
