import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ClassAgentConversationAdapter } from '@contracts/class-agent/class-agent-conversation';
import {
  hasCurrentClassAgentAuthorization,
  prepareClassAgentRequest,
  type ClassAgentDefinition,
  type ClassAgentReplyRequest,
  type ClassAgentThreadBinding,
} from '@domain/class-agent/class-agent';
import { AgentDiscoveryModule, type AgentDiscoveryRequest } from '@domain/class-agent/agent-discovery';
import { DirectConversationDirectoryModule } from '@domain/message/direct-conversation-directory';
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
  directAuthorizationBindings: readonly ClassAgentThreadBinding[];
  onReply: ClassAgentReplyWriter;
  responsePhaseDelayMs?: number;
}>;

const IDLE_STATUS: ClassAgentThreadStatus = Object.freeze({ status: 'idle' });

type RetryableClassAgentRequest = Readonly<{
  request: ClassAgentReplyRequest;
  binding: ClassAgentThreadBinding;
}>;

export function ClassAgentConversationProvider({
  adapter,
  children,
  definitions,
  directAuthorizationBindings,
  onReply,
  responsePhaseDelayMs = 700,
}: ClassAgentConversationProviderProps) {
  const [statusByThread, setStatusByThread] = useState<Readonly<Record<string, ClassAgentThreadStatus>>>({});
  const requestSequence = useRef(0);
  const lastRequestByThread = useRef(new Map<string, RetryableClassAgentRequest>());
  const pendingThreadIds = useRef(new Set<string>());
  const phaseTimerByThread = useRef(new Map<string, ReturnType<typeof globalThis.setTimeout>>());

  useEffect(() => () => {
    phaseTimerByThread.current.forEach((timer) => globalThis.clearTimeout(timer));
    phaseTimerByThread.current.clear();
  }, []);

  const execute = useCallback((request: ClassAgentReplyRequest) => {
    pendingThreadIds.current.add(request.threadId);
    const previousTimer = phaseTimerByThread.current.get(request.threadId);
    if (previousTimer) globalThis.clearTimeout(previousTimer);
    setStatusByThread((current) => ({
      ...current,
      [request.threadId]: { status: 'replying', agentId: request.agentId, phase: 'understanding' },
    }));
    const phaseTimer = globalThis.setTimeout(() => {
      setStatusByThread((current) => current[request.threadId]?.status === 'replying'
        ? {
          ...current,
          [request.threadId]: { status: 'replying', agentId: request.agentId, phase: 'composing' },
        }
        : current);
    }, responsePhaseDelayMs);
    phaseTimerByThread.current.set(request.threadId, phaseTimer);
    void adapter.reply(request).then((reply) => {
      onReply(reply);
      pendingThreadIds.current.delete(request.threadId);
      globalThis.clearTimeout(phaseTimer);
      phaseTimerByThread.current.delete(request.threadId);
      setStatusByThread((current) => ({
        ...current,
        [request.threadId]: { status: 'replied', messageId: reply.id, agentId: request.agentId },
      }));
    }).catch((error: unknown) => {
      pendingThreadIds.current.delete(request.threadId);
      globalThis.clearTimeout(phaseTimer);
      phaseTimerByThread.current.delete(request.threadId);
      setStatusByThread((current) => ({
        ...current,
        [request.threadId]: {
          status: 'recoverable_failure',
          agentId: request.agentId,
          message: error instanceof Error ? error.message : '班级 Agent 暂时没有完成回复，请重试。',
        },
      }));
    });
  }, [adapter, onReply, responsePhaseDelayMs]);

  const getAgent = useCallback((agentId: string) => definitions.find(({ id }) => id === agentId) ?? null, [definitions]);
  const projectAgents = useCallback((request: Omit<AgentDiscoveryRequest, 'definitions'>) => (
    AgentDiscoveryModule.project({
      ...request,
      definitions,
      bindings: request.channel === 'private-direct'
        ? request.bindings.filter((binding) => hasCurrentClassAgentAuthorization(binding, directAuthorizationBindings))
        : request.bindings,
    })
  ), [definitions, directAuthorizationBindings]);
  const projectDirectDirectory = useCallback((request: Omit<Parameters<typeof DirectConversationDirectoryModule.project>[0], 'definitions' | 'authoritativeBindings'>) => (
    DirectConversationDirectoryModule.project({ ...request, definitions, authoritativeBindings: directAuthorizationBindings })
  ), [definitions, directAuthorizationBindings]);
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
    if (binding.channel === 'private-direct'
      && !hasCurrentClassAgentAuthorization(binding, directAuthorizationBindings)) {
      return { status: 'ignored', reason: 'stale-authorization' };
    }
    requestSequence.current += 1;
    const prepared = prepareClassAgentRequest({
      ...options,
      binding,
      definition,
      requestId: `${options.threadId}-${requestSequence.current}`,
    });
    if (prepared.status === 'ignored') return prepared;
    lastRequestByThread.current.set(options.threadId, { request: prepared.request, binding });
    execute(prepared.request);
    return { status: 'accepted' };
  }, [directAuthorizationBindings, execute, getAgent]);

  const retry = useCallback((threadId: string) => {
    if (pendingThreadIds.current.has(threadId)) return;
    const retryable = lastRequestByThread.current.get(threadId);
    if (!retryable) return;
    if (retryable.binding.channel === 'private-direct'
      && !hasCurrentClassAgentAuthorization(retryable.binding, directAuthorizationBindings)) {
      setStatusByThread((current) => ({
        ...current,
        [threadId]: {
          status: 'authorization_failure',
          agentId: retryable.request.agentId,
          message: '该 Agent 的班级授权已更新，不能继续重试。请重新选择当前可用的 Agent。',
        },
      }));
      return;
    }
    execute(retryable.request);
  }, [directAuthorizationBindings, execute]);

  const store = useMemo(() => ({
    getAgent,
    getThreadStatus,
    projectAgents,
    projectDirectDirectory,
    retry,
    selectAgent,
    submit,
  }), [getAgent, getThreadStatus, projectAgents, projectDirectDirectory, retry, selectAgent, submit]);
  return <ClassAgentConversationContext.Provider value={store}>{children}</ClassAgentConversationContext.Provider>;
}
