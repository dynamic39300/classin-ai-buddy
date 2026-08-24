import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ClassAgentConversationAdapter } from '@contracts/class-agent/class-agent-conversation';
import {
  prepareClassAgentRequest,
  type ClassAgentDefinition,
  type ClassAgentReplyRequest,
} from '@domain/class-agent/class-agent';
import { AgentDiscoveryModule, type AgentDiscoveryRequest } from '@domain/class-agent/agent-discovery';
import {
  ClassAgentConversationContext,
  type ClassAgentReplyWriter,
  type ClassAgentThreadStatus,
  type SubmitClassAgentMessageOptions,
  type SubmitClassAgentMessageResult,
} from './class-agent-conversation-store';

type ClassAgentConversationProviderProps = Readonly<{
  adapter: ClassAgentConversationAdapter;
  children: ReactNode;
  definitions: readonly ClassAgentDefinition[];
  onReply: ClassAgentReplyWriter;
}>;

const IDLE_STATUS: ClassAgentThreadStatus = Object.freeze({ status: 'idle' });

export function ClassAgentConversationProvider({
  adapter,
  children,
  definitions,
  onReply,
}: ClassAgentConversationProviderProps) {
  const [statusByThread, setStatusByThread] = useState<Readonly<Record<string, ClassAgentThreadStatus>>>({});
  const requestSequence = useRef(0);
  const lastRequestByThread = useRef(new Map<string, ClassAgentReplyRequest>());
  const pendingThreadIds = useRef(new Set<string>());

  const execute = useCallback((request: ClassAgentReplyRequest) => {
    pendingThreadIds.current.add(request.threadId);
    setStatusByThread((current) => ({ ...current, [request.threadId]: { status: 'replying', agentId: request.agentId } }));
    void adapter.reply(request).then((reply) => {
      onReply(reply);
      pendingThreadIds.current.delete(request.threadId);
      setStatusByThread((current) => ({
        ...current,
        [request.threadId]: { status: 'replied', messageId: reply.id, agentId: request.agentId },
      }));
    }).catch((error: unknown) => {
      pendingThreadIds.current.delete(request.threadId);
      setStatusByThread((current) => ({
        ...current,
        [request.threadId]: {
          status: 'recoverable_failure',
          agentId: request.agentId,
          message: error instanceof Error ? error.message : '班级 Agent 暂时没有完成回复，请重试。',
        },
      }));
    });
  }, [adapter, onReply]);

  const getAgent = useCallback((agentId: string) => definitions.find(({ id }) => id === agentId) ?? null, [definitions]);
  const projectAgents = useCallback((request: Omit<AgentDiscoveryRequest, 'definitions'>) => (
    AgentDiscoveryModule.project({ ...request, definitions })
  ), [definitions]);
  const selectAgent = useCallback((options: Parameters<typeof AgentDiscoveryModule.select>[0]) => (
    AgentDiscoveryModule.select(options)
  ), []);
  const getThreadStatus = useCallback((threadId: string) => statusByThread[threadId] ?? IDLE_STATUS, [statusByThread]);

  const submit = useCallback((options: SubmitClassAgentMessageOptions): SubmitClassAgentMessageResult => {
    if (pendingThreadIds.current.has(options.threadId)) return { status: 'ignored', reason: 'busy' };
    const requestedAgentId = options.agentMention?.agentId ?? options.currentBindings[0]?.agentId;
    if (!requestedAgentId) return { status: 'ignored', reason: 'not-authorized' };
    const definition = getAgent(requestedAgentId);
    if (!definition) return { status: 'ignored', reason: 'not-authorized' };
    const binding = options.currentBindings.find((candidate) => (
      candidate.agentId === requestedAgentId
      && candidate.classId === definition.classId
      && (options.agentMention
        ? candidate.channel === 'public-class'
          && candidate.authorizationId === options.agentMention.authorizationId
        : candidate.channel === 'private-direct')
    ));
    if (!binding) return { status: 'ignored', reason: 'not-authorized' };
    requestSequence.current += 1;
    const prepared = prepareClassAgentRequest({
      ...options,
      binding,
      definition,
      requestId: `${options.threadId}-${requestSequence.current}`,
    });
    if (prepared.status === 'ignored') return prepared;
    lastRequestByThread.current.set(options.threadId, prepared.request);
    execute(prepared.request);
    return { status: 'accepted' };
  }, [execute, getAgent]);

  const retry = useCallback((threadId: string) => {
    if (pendingThreadIds.current.has(threadId)) return;
    const request = lastRequestByThread.current.get(threadId);
    if (request) execute(request);
  }, [execute]);

  const store = useMemo(() => ({ getAgent, getThreadStatus, projectAgents, retry, selectAgent, submit }), [getAgent, getThreadStatus, projectAgents, retry, selectAgent, submit]);
  return <ClassAgentConversationContext.Provider value={store}>{children}</ClassAgentConversationContext.Provider>;
}
