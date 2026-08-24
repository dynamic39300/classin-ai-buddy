import { createContext, useContext } from 'react';
import type { AppRole } from '@domain/account/role';
import type {
  AgentMentionEntity,
  ClassAgentDefinition,
  ClassAgentReply,
  ClassAgentThreadBinding,
} from '@domain/class-agent/class-agent';
import type {
  AgentDiscoveryProjection,
  AgentDiscoveryRequest,
  AgentDiscoverySelection,
} from '@domain/class-agent/agent-discovery';

export type ClassAgentThreadStatus =
  | Readonly<{ status: 'idle' }>
  | Readonly<{ status: 'replying'; agentId: string }>
  | Readonly<{ status: 'replied'; messageId: string; agentId: string }>
  | Readonly<{ status: 'recoverable_failure'; message: string; agentId: string }>;

export type SubmitClassAgentMessageResult =
  | Readonly<{ status: 'accepted' }>
  | Readonly<{ status: 'ignored'; reason: 'missing-mention' | 'not-authorized' | 'stale-authorization' | 'empty-message' | 'busy' }>;

export type SubmitClassAgentMessageOptions = Readonly<{
  currentBindings: readonly ClassAgentThreadBinding[];
  threadId: string;
  requesterRole: AppRole;
  requesterName: string;
  body: string;
  recentMessages: ReadonlyArray<{ authorName: string; body: string }>;
  agentMention?: AgentMentionEntity;
}>;

export type ClassAgentConversationStore = Readonly<{
  getAgent: (agentId: string) => ClassAgentDefinition | null;
  projectAgents: (request: Omit<AgentDiscoveryRequest, 'definitions'>) => AgentDiscoveryProjection;
  selectAgent: (options: Readonly<{
    projection: AgentDiscoveryProjection;
    agentId: string;
    currentBindings: readonly ClassAgentThreadBinding[];
  }>) => AgentDiscoverySelection;
  getThreadStatus: (threadId: string) => ClassAgentThreadStatus;
  submit: (options: SubmitClassAgentMessageOptions) => SubmitClassAgentMessageResult;
  retry: (threadId: string) => void;
}>;

export type ClassAgentReplyWriter = (reply: ClassAgentReply) => void;

export const ClassAgentConversationContext = createContext<ClassAgentConversationStore | null>(null);

export function useOptionalClassAgentConversation(): ClassAgentConversationStore | null {
  return useContext(ClassAgentConversationContext);
}
